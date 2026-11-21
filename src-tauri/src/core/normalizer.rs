use crate::core::event_model::NormalizedEvent;
use std::time::{SystemTime, UNIX_EPOCH};

pub struct EventNormalizer;

impl EventNormalizer {
    pub fn create_event(
        category: &str,
        severity: &str,
        pid: Option<u32>,
        process_name: Option<String>,
        summary: String,
        payload_json: String,
    ) -> NormalizedEvent {
        let now_ns = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos() as u64;

        NormalizedEvent {
            event_id: uuid::Uuid::now_v7().to_string(),
            timestamp_ns: now_ns,
            category: category.to_string(),
            severity: severity.to_string(),
            pid,
            process_name,
            summary,
            payload_json,
        }
    }
}
