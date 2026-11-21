use crate::core::event_model::{
    AlertRecord, BackupRecord, DashboardConfig, DatabaseStats, NormalizedEvent, SystemMetrics,
    WidgetConfig,
};
use rusqlite::{Connection, params};
use std::path::PathBuf;
use std::sync::Mutex;

pub type SnapshotRecord = (u64, f32, u64, u64, u32);

pub struct DatabaseRepository {
    conn: Mutex<Connection>,
    db_path: PathBuf,
    persistence_failures_count: std::sync::atomic::AtomicU64,
}

impl DatabaseRepository {
    pub fn new(data_dir: Option<PathBuf>) -> Result<Self, rusqlite::Error> {
        let db_dir = data_dir.unwrap_or_else(|| {
            dirs::data_local_dir()
                .map(|p| p.join("AppTrace"))
                .unwrap_or_else(|| PathBuf::from("."))
        });

        let _ = std::fs::create_dir_all(&db_dir);
        let db_path = db_dir.join("apptrace.db");

        let conn = Connection::open(&db_path)?;
        crate::database::migrations::run_migrations(&conn)?;

        let repo = Self {
            conn: Mutex::new(conn),
            db_path,
            persistence_failures_count: std::sync::atomic::AtomicU64::new(0),
        };

        repo.seed_default_dashboards()?;
        Ok(repo)
    }

    pub fn get_db_path(&self) -> &PathBuf {
        &self.db_path
    }

    fn seed_default_dashboards(&self) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let count: i64 = conn.query_row("SELECT COUNT(*) FROM saved_dashboards", [], |row| {
            row.get(0)
        })?;
        if count == 0 {
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64;

            let default_widgets = vec![
                WidgetConfig {
                    id: "w-cpu".to_string(),
                    type_id: "cpu_monitor".to_string(),
                    title: "CPU Monitor".to_string(),
                    x: 0,
                    y: 0,
                    w: 4,
                    h: 2,
                    visible: true,
                    settings: serde_json::json!({}),
                },
                WidgetConfig {
                    id: "w-mem".to_string(),
                    type_id: "memory_monitor".to_string(),
                    title: "Memory Monitor".to_string(),
                    x: 4,
                    y: 0,
                    w: 4,
                    h: 2,
                    visible: true,
                    settings: serde_json::json!({}),
                },
                WidgetConfig {
                    id: "w-net-traffic".to_string(),
                    type_id: "network_traffic".to_string(),
                    title: "Network Traffic".to_string(),
                    x: 8,
                    y: 0,
                    w: 4,
                    h: 2,
                    visible: true,
                    settings: serde_json::json!({}),
                },
                WidgetConfig {
                    id: "w-sys-health".to_string(),
                    type_id: "system_health".to_string(),
                    title: "System Telemetry Health".to_string(),
                    x: 0,
                    y: 2,
                    w: 6,
                    h: 2,
                    visible: true,
                    settings: serde_json::json!({}),
                },
                WidgetConfig {
                    id: "w-storage".to_string(),
                    type_id: "storage_monitor".to_string(),
                    title: "Storage Volumes".to_string(),
                    x: 6,
                    y: 2,
                    w: 6,
                    h: 2,
                    visible: true,
                    settings: serde_json::json!({}),
                },
                WidgetConfig {
                    id: "w-proc-top".to_string(),
                    type_id: "top_applications".to_string(),
                    title: "Top Resource Consumers".to_string(),
                    x: 0,
                    y: 4,
                    w: 6,
                    h: 3,
                    visible: true,
                    settings: serde_json::json!({}),
                },
                WidgetConfig {
                    id: "w-conn".to_string(),
                    type_id: "connection_monitor".to_string(),
                    title: "Active Connections".to_string(),
                    x: 6,
                    y: 4,
                    w: 6,
                    h: 3,
                    visible: true,
                    settings: serde_json::json!({}),
                },
                WidgetConfig {
                    id: "w-timeline".to_string(),
                    type_id: "event_timeline".to_string(),
                    title: "Event Timeline Feed".to_string(),
                    x: 0,
                    y: 7,
                    w: 12,
                    h: 3,
                    visible: true,
                    settings: serde_json::json!({}),
                },
            ];

            let layout_json = serde_json::to_string(&default_widgets).unwrap_or_default();
            conn.execute(
                "INSERT INTO saved_dashboards (id, name, description, is_default, created_at, updated_at, layout_json)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    "dash-default",
                    "Overview Dashboard",
                    "Standard system telemetry dashboard combining CPU, memory, network, and event feed",
                    1,
                    now,
                    now,
                    layout_json
                ],
            )?;
        }
        Ok(())
    }

    /// High-throughput batched multi-row transaction writer for events.
    pub fn insert_events_batch(
        &self,
        events: &[NormalizedEvent],
    ) -> Result<usize, rusqlite::Error> {
        if events.is_empty() {
            return Ok(0);
        }

        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;
        {
            let mut stmt = tx.prepare_cached(
                "INSERT OR IGNORE INTO telemetry_events (event_id, timestamp_ns, category, severity, pid, process_name, summary, payload_json)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)"
            )?;

            for event in events {
                stmt.execute(params![
                    event.event_id,
                    event.timestamp_ns as i64,
                    event.category,
                    event.severity,
                    event.pid,
                    event.process_name,
                    event.summary,
                    event.payload_json
                ])?;
            }
        }
        tx.commit()?;
        Ok(events.len())
    }

    pub fn insert_event(&self, event: &NormalizedEvent) -> Result<(), rusqlite::Error> {
        self.insert_events_batch(std::slice::from_ref(event))?;
        Ok(())
    }

    pub fn insert_snapshot(&self, metrics: &SystemMetrics) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO system_snapshots (timestamp_ns, cpu_pct, memory_used, memory_total, net_rx, net_tx, process_count)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                metrics.timestamp_ns as i64,
                metrics.cpu_usage_pct,
                metrics.memory_used_bytes as i64,
                metrics.memory_total_bytes as i64,
                metrics.net_bytes_rx_sec as i64,
                metrics.net_bytes_tx_sec as i64,
                metrics.total_processes
            ],
        )?;
        Ok(())
    }

    pub fn query_snapshots(&self, limit: usize) -> Result<Vec<SnapshotRecord>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT timestamp_ns, cpu_pct, memory_used, memory_total, process_count
             FROM system_snapshots
             ORDER BY timestamp_ns DESC
             LIMIT ?1",
        )?;
        let rows = stmt.query_map(params![limit as i64], |row| {
            Ok((
                row.get::<_, i64>(0)? as u64,
                row.get::<_, f64>(1)? as f32,
                row.get::<_, i64>(2)? as u64,
                row.get::<_, i64>(3)? as u64,
                row.get::<_, i64>(4)? as u32,
            ))
        })?;
        let mut list = Vec::new();
        for r in rows {
            list.push(r?);
        }
        Ok(list)
    }

    pub fn purge_old_data(&self, max_age_nanos: u64) -> Result<(usize, usize), rusqlite::Error> {
        let now_ns = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos() as u64;
        let cutoff = (now_ns.saturating_sub(max_age_nanos)) as i64;

        let conn = self.conn.lock().unwrap();
        let deleted_events = conn.execute(
            "DELETE FROM telemetry_events WHERE timestamp_ns < ?1",
            params![cutoff],
        )?;
        let deleted_snapshots = conn.execute(
            "DELETE FROM system_snapshots WHERE timestamp_ns < ?1",
            params![cutoff],
        )?;

        // Execute passive WAL checkpoint and page maintenance
        let _ = conn.execute_batch("PRAGMA wal_checkpoint(PASSIVE);");
        Ok((deleted_events, deleted_snapshots))
    }

    pub fn run_integrity_check(&self) -> Result<String, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("PRAGMA quick_check(100);")?;
        let mut rows = stmt.query([])?;
        let mut messages = Vec::new();
        while let Some(row) = rows.next()? {
            let msg: String = row.get(0)?;
            messages.push(msg);
        }
        Ok(messages.join("; "))
    }

    pub fn get_storage_stats(&self) -> Result<DatabaseStats, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let page_count: i64 = conn.query_row("PRAGMA page_count;", [], |r| r.get(0))?;
        let page_size: i64 = conn.query_row("PRAGMA page_size;", [], |r| r.get(0))?;
        let event_count: i64 =
            conn.query_row("SELECT COUNT(*) FROM telemetry_events;", [], |r| r.get(0))?;
        let snapshot_count: i64 =
            conn.query_row("SELECT COUNT(*) FROM system_snapshots;", [], |r| r.get(0))?;
        let alert_count: i64 = conn.query_row("SELECT COUNT(*) FROM alerts;", [], |r| r.get(0))?;

        let file_size_bytes = (page_count * page_size) as u64;
        Ok(DatabaseStats {
            file_size_bytes,
            total_events: event_count as u64,
            total_snapshots: snapshot_count as u64,
            total_alerts: alert_count as u64,
            db_path: self.db_path.to_string_lossy().to_string(),
        })
    }

    pub fn query_events(
        &self,
        limit: usize,
        offset: usize,
        category: Option<&str>,
    ) -> Result<Vec<NormalizedEvent>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut results = Vec::new();

        if let Some(cat) = category {
            let mut stmt = conn.prepare(
                "SELECT event_id, timestamp_ns, category, severity, pid, process_name, summary, payload_json
                 FROM telemetry_events
                 WHERE category = ?1
                 ORDER BY timestamp_ns DESC
                 LIMIT ?2 OFFSET ?3"
            )?;
            let rows = stmt.query_map(params![cat, limit as i64, offset as i64], |row| {
                Ok(NormalizedEvent {
                    event_id: row.get(0)?,
                    timestamp_ns: row.get::<_, i64>(1)? as u64,
                    category: row.get(2)?,
                    severity: row.get(3)?,
                    pid: row.get(4)?,
                    process_name: row.get(5)?,
                    summary: row.get(6)?,
                    payload_json: row.get(7)?,
                })
            })?;
            for r in rows {
                results.push(r?);
            }
        } else {
            let mut stmt = conn.prepare(
                "SELECT event_id, timestamp_ns, category, severity, pid, process_name, summary, payload_json
                 FROM telemetry_events
                 ORDER BY timestamp_ns DESC
                 LIMIT ?1 OFFSET ?2"
            )?;
            let rows = stmt.query_map(params![limit as i64, offset as i64], |row| {
                Ok(NormalizedEvent {
                    event_id: row.get(0)?,
                    timestamp_ns: row.get::<_, i64>(1)? as u64,
                    category: row.get(2)?,
                    severity: row.get(3)?,
                    pid: row.get(4)?,
                    process_name: row.get(5)?,
                    summary: row.get(6)?,
                    payload_json: row.get(7)?,
                })
            })?;
            for r in rows {
                results.push(r?);
            }
        }

        Ok(results)
    }

    pub fn export_events_csv(
        &self,
        category: Option<&str>,
        limit: usize,
    ) -> Result<String, rusqlite::Error> {
        let events = self.query_events(limit, 0, category)?;
        let mut csv =
            String::from("event_id,timestamp_ns,category,severity,pid,process_name,summary\n");
        for e in events {
            let escaped_summary = e.summary.replace('"', "\"\"");
            let proc_name = e.process_name.unwrap_or_default();
            csv.push_str(&format!(
                "\"{}\",{},\"{}\",\"{}\",{},\"{}\",\"{}\"\n",
                e.event_id,
                e.timestamp_ns,
                e.category,
                e.severity,
                e.pid.map(|p| p.to_string()).unwrap_or_default(),
                proc_name,
                escaped_summary
            ));
        }
        Ok(csv)
    }

    pub fn get_dashboards(&self) -> Result<Vec<DashboardConfig>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, description, is_default, created_at, updated_at, layout_json
             FROM saved_dashboards
             ORDER BY is_default DESC, updated_at DESC",
        )?;

        let rows = stmt.query_map([], |row| {
            let layout_json: String = row.get(6)?;
            let widgets: Vec<WidgetConfig> = serde_json::from_str(&layout_json).unwrap_or_default();
            Ok(DashboardConfig {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                is_default: row.get::<_, i64>(3)? == 1,
                created_at: row.get::<_, i64>(4)? as u64,
                updated_at: row.get::<_, i64>(5)? as u64,
                widgets,
            })
        })?;

        let mut dashboards = Vec::new();
        for r in rows {
            dashboards.push(r?);
        }
        Ok(dashboards)
    }

    pub fn save_dashboard(&self, dash: &DashboardConfig) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let layout_json = serde_json::to_string(&dash.widgets).unwrap_or_default();
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        conn.execute(
            "INSERT INTO saved_dashboards (id, name, description, is_default, created_at, updated_at, layout_json)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
             ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                description = excluded.description,
                is_default = excluded.is_default,
                updated_at = excluded.updated_at,
                layout_json = excluded.layout_json",
            params![
                dash.id,
                dash.name,
                dash.description,
                if dash.is_default { 1 } else { 0 },
                dash.created_at,
                now as i64,
                layout_json
            ],
        )?;
        Ok(())
    }

    pub fn delete_dashboard(&self, id: &str) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "DELETE FROM saved_dashboards WHERE id = ?1 AND is_default = 0",
            params![id],
        )?;
        Ok(())
    }

    pub fn insert_alert(&self, alert: &AlertRecord) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO alerts (id, timestamp_ns, severity, category, title, message, source, acknowledged)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                alert.id,
                alert.timestamp_ns as i64,
                alert.severity,
                alert.category,
                alert.title,
                alert.message,
                alert.source,
                if alert.acknowledged { 1 } else { 0 }
            ],
        )?;
        Ok(())
    }

    pub fn get_alerts(&self) -> Result<Vec<AlertRecord>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, timestamp_ns, severity, category, title, message, source, acknowledged
             FROM alerts
             ORDER BY timestamp_ns DESC
             LIMIT 100",
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(AlertRecord {
                id: row.get(0)?,
                timestamp_ns: row.get::<_, i64>(1)? as u64,
                severity: row.get(2)?,
                category: row.get(3)?,
                title: row.get(4)?,
                message: row.get(5)?,
                source: row.get(6)?,
                acknowledged: row.get::<_, i64>(7)? == 1,
            })
        })?;

        let mut alerts = Vec::new();
        for r in rows {
            alerts.push(r?);
        }
        Ok(alerts)
    }

    pub fn acknowledge_alert(&self, id: &str) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE alerts SET acknowledged = 1 WHERE id = ?1",
            params![id],
        )?;
        Ok(())
    }

    pub fn create_backup(&self, backups_dir: &std::path::Path) -> Result<String, String> {
        let now_secs = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        let backup_filename = format!("apptrace_backup_{}.db", now_secs);
        let backup_path = backups_dir.join(&backup_filename);

        let conn = self.conn.lock().unwrap();
        let _ = conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);");

        let escaped = backup_path.to_string_lossy().replace('\'', "''");
        conn.execute(&format!("VACUUM INTO '{}';", escaped), [])
            .map_err(|e| format!("VACUUM INTO backup failed: {}", e))?;

        Ok(backup_filename)
    }

    pub fn restore_backup(&self, backup_file: &std::path::Path) -> Result<(), String> {
        if !backup_file.exists() {
            return Err(format!(
                "Backup file does not exist: {}",
                backup_file.display()
            ));
        }
        let backup_conn =
            Connection::open_with_flags(backup_file, rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY)
                .map_err(|e| format!("Cannot open backup file: {}", e))?;

        let integrity: String = backup_conn
            .query_row("PRAGMA quick_check(10);", [], |r| r.get(0))
            .map_err(|e| format!("Backup integrity check failed: {}", e))?;
        if integrity != "ok" {
            return Err(format!("Backup file is corrupted: {}", integrity));
        }
        drop(backup_conn);

        let mut conn_guard = self.conn.lock().unwrap();
        let _ = conn_guard.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);");

        // Swap to in-memory connection to cleanly release file locks on self.db_path
        if let Ok(mem_conn) = Connection::open_in_memory() {
            *conn_guard = mem_conn;
        }

        // Clean up WAL and SHM files to prevent stale WAL replay over restored file
        let wal_path = self.db_path.with_extension("db-wal");
        let shm_path = self.db_path.with_extension("db-shm");
        let _ = std::fs::remove_file(&wal_path);
        let _ = std::fs::remove_file(&shm_path);

        std::fs::copy(backup_file, &self.db_path)
            .map_err(|e| format!("Failed to overwrite database with backup: {}", e))?;

        let new_conn = Connection::open(&self.db_path)
            .map_err(|e| format!("Failed to reopen database: {}", e))?;
        crate::database::migrations::run_migrations(&new_conn)
            .map_err(|e| format!("Failed to verify migrations on restored db: {}", e))?;

        *conn_guard = new_conn;
        Ok(())
    }

    pub fn list_backups(backups_dir: &std::path::Path) -> Result<Vec<BackupRecord>, String> {
        let mut list = Vec::new();
        if let Ok(entries) = std::fs::read_dir(backups_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() && path.extension().is_some_and(|ext| ext == "db") {
                    let filename = entry.file_name().to_string_lossy().to_string();
                    let size_bytes = entry.metadata().map(|m| m.len()).unwrap_or(0);
                    let created_at_secs = entry
                        .metadata()
                        .and_then(|m| m.created().or_else(|_| m.modified()))
                        .ok()
                        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                        .map(|d| d.as_secs())
                        .unwrap_or(0);
                    list.push(BackupRecord {
                        filename,
                        size_bytes,
                        created_at_secs,
                    });
                }
            }
        }
        list.sort_by_key(|a| std::cmp::Reverse(a.created_at_secs));
        Ok(list)
    }

    pub fn clear_historical_data(&self) -> Result<(usize, usize), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let deleted_events = conn.execute("DELETE FROM telemetry_events;", [])?;
        let deleted_snapshots = conn.execute("DELETE FROM system_snapshots;", [])?;
        let _ = conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);");
        Ok((deleted_events, deleted_snapshots))
    }

    pub fn clear_cache_data(cache_dir: &std::path::Path) -> Result<u64, String> {
        let mut bytes_freed = 0;
        if let Ok(entries) = std::fs::read_dir(cache_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    let len = entry.metadata().map(|m| m.len()).unwrap_or(0);
                    if std::fs::remove_file(path).is_ok() {
                        bytes_freed += len;
                    }
                }
            }
        }
        Ok(bytes_freed)
    }

    pub fn record_operation(
        &self,
        entry: &crate::management::models::OperationHistoryEntry,
    ) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        match conn.execute(
            "INSERT INTO operation_history (operation_id, timestamp_ns, action_type, target_name, target_path, status, details_json, error_message)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                entry.operation_id,
                entry.timestamp_ns,
                entry.action_type,
                entry.target_name,
                entry.target_path,
                entry.status,
                entry.details_json,
                entry.error_message,
            ],
        ) {
            Ok(_) => Ok(()),
            Err(e) => {
                self.persistence_failures_count
                    .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                eprintln!(
                    "[AppTrace Database Persistence Error] Failed to persist operation history ({}): {}",
                    entry.operation_id, e
                );
                Err(e)
            }
        }
    }

    pub fn get_persistence_failure_count(&self) -> u64 {
        self.persistence_failures_count
            .load(std::sync::atomic::Ordering::Relaxed)
    }

    pub fn increment_persistence_failure_count(&self) {
        self.persistence_failures_count
            .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    }

    pub fn get_operation_history(
        &self,
        limit: usize,
    ) -> Result<Vec<crate::management::models::OperationHistoryEntry>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT operation_id, timestamp_ns, action_type, target_name, target_path, status, details_json, error_message
             FROM operation_history ORDER BY timestamp_ns DESC LIMIT ?1",
        )?;

        let rows = stmt.query_map(params![limit as i64], |row| {
            Ok(crate::management::models::OperationHistoryEntry {
                operation_id: row.get(0)?,
                timestamp_ns: row.get(1)?,
                action_type: row.get(2)?,
                target_name: row.get(3)?,
                target_path: row.get(4)?,
                status: row.get(5)?,
                details_json: row.get(6)?,
                error_message: row.get(7)?,
            })
        })?;

        let mut results = Vec::new();
        for r in rows {
            results.push(r?);
        }
        Ok(results)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn create_temp_db() -> (DatabaseRepository, PathBuf) {
        let temp_dir =
            std::env::temp_dir().join(format!("apptrace_test_db_{}", uuid::Uuid::now_v7()));
        let _ = std::fs::create_dir_all(&temp_dir);
        let manager =
            DatabaseRepository::new(Some(temp_dir.clone())).expect("Failed to init test database");
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
                timestamp_ns: 1_000_000 + i,
                category: if i % 2 == 0 {
                    "process".to_string()
                } else {
                    "network".to_string()
                },
                severity: "info".to_string(),
                pid: Some(100 + i as u32),
                process_name: Some(format!("proc_{}", i)),
                summary: format!("Test event summary {}", i),
                payload_json: "{}".to_string(),
            });
        }

        let inserted = db
            .insert_events_batch(&events)
            .expect("Batch insert failed");
        assert_eq!(inserted, 100);

        // Query all
        let all = db.query_events(50, 0, None).expect("Query failed");
        assert_eq!(all.len(), 50);

        // Query category
        let proc_events = db
            .query_events(100, 0, Some("process"))
            .expect("Query failed");
        assert_eq!(proc_events.len(), 50);
        assert_eq!(proc_events[0].category, "process");

        // CSV export
        let csv = db
            .export_events_csv(Some("process"), 10)
            .expect("CSV export failed");
        assert!(csv.contains("event_id,timestamp_ns"));
        assert!(csv.contains("proc_"));

        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_database_retention_purge() {
        let (db, temp_dir) = create_temp_db();

        let old_event = NormalizedEvent {
            event_id: "old-event-1".to_string(),
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
            id: "alert-101".to_string(),
            timestamp_ns: 5000,
            severity: "warning".to_string(),
            category: "system".to_string(),
            title: "High Memory Load".to_string(),
            message: "System RAM usage reached 92%".to_string(),
            source: "metrics_collector".to_string(),
            acknowledged: false,
        };

        db.insert_alert(&alert).expect("Failed to insert alert");
        let alerts = db.get_alerts().expect("Failed to get alerts");
        assert_eq!(alerts.len(), 1);
        assert!(!alerts[0].acknowledged);

        db.acknowledge_alert("alert-101")
            .expect("Failed to acknowledge alert");
        let updated_alerts = db.get_alerts().expect("Failed to get updated alerts");
        assert_eq!(updated_alerts.len(), 1);
        assert!(updated_alerts[0].acknowledged);

        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_database_snapshot_insertion() {
        let (db, temp_dir) = create_temp_db();

        let snapshot = SystemMetrics {
            timestamp_ns: 10_000,
            cpu_usage_pct: 14.5,
            per_core_cpu: vec![14.5],
            memory_used_bytes: 8 * 1024 * 1024 * 1024,
            memory_available_bytes: 8 * 1024 * 1024 * 1024,
            memory_total_bytes: 16 * 1024 * 1024 * 1024,
            swap_used_bytes: 0,
            swap_total_bytes: 0,
            net_bytes_rx_sec: 1024,
            net_bytes_tx_sec: 2048,
            disks: vec![],
            interfaces: vec![],
            total_processes: 120,
        };

        db.insert_snapshot(&snapshot)
            .expect("Snapshot insertion failed");
        let snapshots = db.query_snapshots(10).expect("Snapshot query failed");
        assert_eq!(snapshots.len(), 1);
        assert!((snapshots[0].1 - 14.5).abs() < 0.01);

        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_database_backup_and_restore() {
        let (db, temp_dir) = create_temp_db();
        let backups_dir = temp_dir.join("backups");
        std::fs::create_dir_all(&backups_dir).unwrap();

        // 1. Insert an event
        let event = NormalizedEvent {
            event_id: "evt-backup-1".to_string(),
            timestamp_ns: 1_000_000,
            category: "process".to_string(),
            severity: "info".to_string(),
            pid: Some(1234),
            process_name: Some("test_proc.exe".to_string()),
            summary: "Process started".to_string(),
            payload_json: "{}".to_string(),
        };
        db.insert_event(&event).expect("Failed to insert event");

        // 2. Create backup
        let backup_filename = db
            .create_backup(&backups_dir)
            .expect("Failed to create backup");
        assert!(backup_filename.ends_with(".db"));

        // 3. Verify backup listed
        let list = DatabaseRepository::list_backups(&backups_dir).expect("Failed to list backups");
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].filename, backup_filename);
        assert!(list[0].size_bytes > 0);

        // 4. Clear historical data in active DB
        let (del_evt, _) = db.clear_historical_data().expect("Clear failed");
        assert_eq!(del_evt, 1);
        let remaining = db.query_events(10, 0, None).expect("Query failed");
        assert_eq!(remaining.len(), 0);

        // 5. Restore backup
        let backup_file = backups_dir.join(&backup_filename);
        db.restore_backup(&backup_file)
            .expect("Failed to restore backup");

        // 6. Verify restored data
        let restored_events = db
            .query_events(10, 0, None)
            .expect("Query after restore failed");
        assert_eq!(restored_events.len(), 1);
        assert_eq!(restored_events[0].event_id, "evt-backup-1");

        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_database_clear_historical_data() {
        let (db, temp_dir) = create_temp_db();

        let event = NormalizedEvent {
            event_id: "evt-clear-1".to_string(),
            timestamp_ns: 2_000_000,
            category: "system".to_string(),
            severity: "info".to_string(),
            pid: None,
            process_name: None,
            summary: "System boot".to_string(),
            payload_json: "{}".to_string(),
        };
        db.insert_event(&event).expect("Insert event failed");

        let snapshot = SystemMetrics {
            timestamp_ns: 20_000,
            cpu_usage_pct: 25.0,
            per_core_cpu: vec![25.0],
            memory_used_bytes: 4 * 1024 * 1024 * 1024,
            memory_available_bytes: 12 * 1024 * 1024 * 1024,
            memory_total_bytes: 16 * 1024 * 1024 * 1024,
            swap_used_bytes: 0,
            swap_total_bytes: 0,
            net_bytes_rx_sec: 0,
            net_bytes_tx_sec: 0,
            disks: vec![],
            interfaces: vec![],
            total_processes: 50,
        };
        db.insert_snapshot(&snapshot)
            .expect("Insert snapshot failed");

        let (del_events, del_snaps) = db.clear_historical_data().expect("Clear failed");
        assert_eq!(del_events, 1);
        assert_eq!(del_snaps, 1);

        assert_eq!(db.query_events(10, 0, None).unwrap().len(), 0);
        assert_eq!(db.query_snapshots(10).unwrap().len(), 0);

        let _ = std::fs::remove_dir_all(&temp_dir);
    }
}
