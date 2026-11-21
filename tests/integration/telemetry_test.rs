use app_lib::core::event_model::{
    AlertRecord, DashboardConfig, NormalizedEvent, SystemMetrics, WidgetConfig,
};
use app_lib::database::DatabaseManager;
use std::path::PathBuf;

fn create_temp_db() -> (DatabaseManager, PathBuf) {
    let temp_dir = std::env::temp_dir().join(format!("apptrace_test_{}", uuid::Uuid::now_v7()));
    let _ = std::fs::create_dir_all(&temp_dir);
    let manager = DatabaseManager::new(Some(temp_dir.clone())).expect("Failed to init test database");
    (manager, temp_dir)
}

#[test]
fn test_database_initialization_and_integrity() {
    let (db, temp_dir) = create_temp_db();
    let integrity = db.run_integrity_check().expect("Integrity check failed");
    assert_eq!(integrity, "ok");

    let stats = db.get_storage_stats().expect("Stats failed");
    assert!(stats.file_size_bytes > 0);
    assert_eq!(stats.total_events, 0);

    let _ = std::fs::remove_dir_all(&temp_dir);
}

#[test]
fn test_database_batch_events_and_queries() {
    let (db, temp_dir) = create_temp_db();

    let mut events = Vec::new();
    for i in 0..100 {
        events.push(NormalizedEvent {
            event_id: format!("test-ev-{}", i),
            timestamp_ns: 1000 + i,
            category: if i % 2 == 0 { "process".to_string() } else { "network".to_string() },
            severity: "info".to_string(),
            pid: Some(100 + i as u32),
            process_name: Some(format!("proc_{}", i)),
            summary: format!("Test event summary {}", i),
            payload_json: "{}".to_string(),
        });
    }

    let inserted = db.insert_events_batch(&events).expect("Batch insert failed");
    assert_eq!(inserted, 100);

    // Query all
    let all = db.query_events(50, 0, None).expect("Query failed");
    assert_eq!(all.len(), 50);

    // Query category
    let proc_events = db.query_events(100, 0, Some("process")).expect("Query failed");
    assert_eq!(proc_events.len(), 50);
    assert_eq!(proc_events[0].category, "process");

    // CSV export
    let csv = db.export_events_csv(Some("process"), 10).expect("CSV export failed");
    assert!(csv.contains("event_id,timestamp_ns"));
    assert!(csv.contains("proc_"));

    let _ = std::fs::remove_dir_all(&temp_dir);
}

#[test]
fn test_database_retention_purge() {
    let (db, temp_dir) = create_temp_db();

    let old_event = NormalizedEvent {
        event_id: "old-event".to_string(),
        timestamp_ns: 100, // Very old
        category: "process".to_string(),
        severity: "info".to_string(),
        pid: None,
        process_name: None,
        summary: "Old event".to_string(),
        payload_json: "{}".to_string(),
    };
    db.insert_event(&old_event).expect("Insert failed");

    // Purge data older than 1 second (1_000_000_000 ns)
    let (deleted_events, _) = db.purge_old_data(1_000_000_000).expect("Purge failed");
    assert_eq!(deleted_events, 1);

    let remaining = db.query_events(10, 0, None).expect("Query failed");
    assert_eq!(remaining.len(), 0);

    let _ = std::fs::remove_dir_all(&temp_dir);
}

#[test]
fn test_database_alerts_and_acknowledgement() {
    let (db, temp_dir) = create_temp_db();

    let alert = AlertRecord {
        id: "alert-1".to_string(),
        timestamp_ns: 5000,
        severity: "warning".to_string(),
        category: "system".to_string(),
        title: "High Memory Load".to_string(),
        message: "Memory usage exceeded 90%".to_string(),
        source: "Collector:Metrics".to_string(),
        acknowledged: false,
    };

    db.insert_alert(&alert).expect("Insert alert failed");
    let list = db.get_alerts().expect("Get alerts failed");
    assert_eq!(list.len(), 1);
    assert!(!list[0].acknowledged);

    db.acknowledge_alert("alert-1").expect("Ack failed");
    let updated_list = db.get_alerts().expect("Get alerts failed");
    assert!(updated_list[0].acknowledged);

    let _ = std::fs::remove_dir_all(&temp_dir);
}
