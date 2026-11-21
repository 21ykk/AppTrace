use crate::core::event_model::NormalizedEvent;
use crossbeam_channel::{Receiver, Sender, bounded};
use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};

pub struct EventDispatcher {
    sender: Sender<NormalizedEvent>,
    receiver: Receiver<NormalizedEvent>,
    drop_counter: Arc<AtomicU64>,
}

impl EventDispatcher {
    pub fn new(capacity: usize) -> Self {
        let (sender, receiver) = bounded(capacity);
        Self {
            sender,
            receiver,
            drop_counter: Arc::new(AtomicU64::new(0)),
        }
    }

    pub fn dispatch(&self, event: NormalizedEvent) -> bool {
        match self.sender.try_send(event) {
            Ok(_) => true,
            Err(_) => {
                self.drop_counter.fetch_add(1, Ordering::Relaxed);
                false
            }
        }
    }

    pub fn receiver(&self) -> Receiver<NormalizedEvent> {
        self.receiver.clone()
    }

    pub fn drop_count(&self) -> u64 {
        self.drop_counter.load(Ordering::Relaxed)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dispatcher_capacity_and_drop_tracking() {
        let dispatcher = EventDispatcher::new(2);
        let event1 = NormalizedEvent {
            event_id: "e1".to_string(),
            timestamp_ns: 100,
            category: "process".to_string(),
            severity: "info".to_string(),
            pid: Some(1),
            process_name: Some("test".to_string()),
            summary: "event 1".to_string(),
            payload_json: "{}".to_string(),
        };
        let event2 = event1.clone();
        let event3 = event1.clone();

        assert!(dispatcher.dispatch(event1));
        assert!(dispatcher.dispatch(event2));
        // Capacity is 2, third event must trigger drop tracking
        assert!(!dispatcher.dispatch(event3));
        assert_eq!(dispatcher.drop_count(), 1);

        // Receive one, queue now has space
        let rx = dispatcher.receiver();
        assert!(rx.recv().is_ok());
        assert!(dispatcher.dispatch(NormalizedEvent {
            event_id: "e4".to_string(),
            timestamp_ns: 200,
            category: "network".to_string(),
            severity: "info".to_string(),
            pid: None,
            process_name: None,
            summary: "event 4".to_string(),
            payload_json: "{}".to_string(),
        }));
    }
}
