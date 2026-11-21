use crate::collectors::filesystem::FilesystemCollector;
use crate::collectors::metrics::MetricsCollector;
use crate::collectors::network::NetworkCollector;
use crate::collectors::process::ProcessCollector;
use crate::core::capabilities::probe_system_capabilities;
use crate::core::dispatcher::EventDispatcher;
use crate::core::event_model::{
    AlertRecord, FilesystemEventRecord, NetworkConnection, ProcessInfo, SystemDiagnostics,
    SystemMetrics, SystemTelemetryStatus,
};
use crate::core::normalizer::EventNormalizer;
use crate::core::settings::SettingsManager;
use crate::database::DatabaseManager;
use crossbeam_channel::{Receiver, Sender, bounded};
use parking_lot::RwLock;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};
use sysinfo::{Disks, Networks, System};

pub struct TelemetryEngine {
    db: Arc<DatabaseManager>,
    dispatcher: Arc<EventDispatcher>,
    settings: Arc<SettingsManager>,
    collection_active: AtomicBool,
    shutdown_signal: Arc<AtomicBool>,
    start_time: Instant,
    latest_metrics: Arc<RwLock<Option<SystemMetrics>>>,
    latest_processes: Arc<RwLock<Vec<ProcessInfo>>>,
    latest_connections: Arc<RwLock<Vec<NetworkConnection>>>,
    latest_fs_events: Arc<RwLock<Vec<FilesystemEventRecord>>>,
    fs_watcher: Arc<RwLock<FilesystemCollector>>,
    fs_event_tx: Sender<FilesystemEventRecord>,
    fs_event_rx: Receiver<FilesystemEventRecord>,
    monitored_fs_path: Arc<RwLock<Option<String>>>,
}

impl TelemetryEngine {
    pub fn new(db: Arc<DatabaseManager>, settings: Arc<SettingsManager>) -> Self {
        let (fs_tx, fs_rx) = bounded(1000);
        let dispatcher = Arc::new(EventDispatcher::new(100_000));
        let initial_active = settings.get().auto_start_monitoring;

        let engine = Self {
            db,
            dispatcher,
            settings,
            collection_active: AtomicBool::new(initial_active),
            shutdown_signal: Arc::new(AtomicBool::new(false)),
            start_time: Instant::now(),
            latest_metrics: Arc::new(RwLock::new(None)),
            latest_processes: Arc::new(RwLock::new(Vec::new())),
            latest_connections: Arc::new(RwLock::new(Vec::new())),
            latest_fs_events: Arc::new(RwLock::new(Vec::new())),
            fs_watcher: Arc::new(RwLock::new(FilesystemCollector::new())),
            fs_event_tx: fs_tx,
            fs_event_rx: fs_rx,
            monitored_fs_path: Arc::new(RwLock::new(None)),
        };

        let default_watch_path = std::env::current_dir()
            .ok()
            .or_else(|| std::env::temp_dir().into());

        if let Some(path) = default_watch_path {
            let path_str = path.to_string_lossy().to_string();
            let mut watcher = engine.fs_watcher.write();
            if watcher
                .start_watching(path, engine.fs_event_tx.clone())
                .is_ok()
            {
                *engine.monitored_fs_path.write() = Some(path_str);
            }
        }

        engine
    }

    pub fn start_background_loop(self: &Arc<Self>) {
        let engine = Arc::clone(self);

        // 1. Spawn high-throughput batched SQLite drainer thread
        let db_drain = Arc::clone(&engine.db);
        let rx = engine.dispatcher.receiver();
        let shutdown_drain = Arc::clone(&engine.shutdown_signal);

        std::thread::spawn(move || {
            let mut batch = Vec::with_capacity(256);
            let mut last_flush = Instant::now();

            while !shutdown_drain.load(Ordering::Relaxed) {
                match rx.recv_timeout(Duration::from_millis(100)) {
                    Ok(event) => {
                        batch.push(event);
                        if batch.len() >= 256 || last_flush.elapsed() >= Duration::from_millis(200)
                        {
                            let _ = db_drain.insert_events_batch(&batch);
                            batch.clear();
                            last_flush = Instant::now();
                        }
                    }
                    Err(_) => {
                        if !batch.is_empty() {
                            let _ = db_drain.insert_events_batch(&batch);
                            batch.clear();
                            last_flush = Instant::now();
                        }
                    }
                }
            }

            // Flush remaining buffer on orderly shutdown
            if !batch.is_empty() {
                let _ = db_drain.insert_events_batch(&batch);
            }
        });

        // 2. Spawn periodic telemetry collection & anomaly detection loop
        let engine_collector = Arc::clone(self);
        let shutdown_collector = Arc::clone(&engine.shutdown_signal);

        std::thread::spawn(move || {
            let mut sys = System::new_all();
            let mut disks = Disks::new_with_refreshed_list();
            let mut networks = Networks::new_with_refreshed_list();

            let mut last_snapshot_save = Instant::now();
            let mut last_connection_poll = Instant::now();
            let mut last_retention_purge = Instant::now();

            while !shutdown_collector.load(Ordering::Relaxed) {
                let current_settings = engine_collector.settings.get();

                if engine_collector.collection_active.load(Ordering::Relaxed) {
                    // A. Collect System Metrics if enabled
                    if current_settings.metrics_monitoring {
                        let metrics =
                            MetricsCollector::collect(&mut sys, &mut disks, &mut networks);

                        // Threshold & anomaly detection
                        if metrics.cpu_usage_pct > current_settings.high_cpu_threshold {
                            let _ = engine_collector.db.insert_alert(&AlertRecord {
                                id: uuid::Uuid::now_v7().to_string(),
                                timestamp_ns: metrics.timestamp_ns,
                                severity: "warning".to_string(),
                                category: "system".to_string(),
                                title: "Sustained High CPU Load".to_string(),
                                message: format!(
                                    "Total CPU utilization exceeded threshold at {:.1}%",
                                    metrics.cpu_usage_pct
                                ),
                                source: "Collector:Metrics".to_string(),
                                acknowledged: false,
                            });
                        }

                        let mem_pct = (metrics.memory_used_bytes as f64
                            / metrics.memory_total_bytes.max(1) as f64)
                            * 100.0;
                        if (mem_pct as f32) > current_settings.high_memory_threshold {
                            let _ = engine_collector.db.insert_alert(&AlertRecord {
                                id: uuid::Uuid::now_v7().to_string(),
                                timestamp_ns: metrics.timestamp_ns,
                                severity: "warning".to_string(),
                                category: "system".to_string(),
                                title: "Critical Memory Allocation".to_string(),
                                message: format!("Physical RAM pressure at {:.1}%", mem_pct),
                                source: "Collector:Metrics".to_string(),
                                acknowledged: false,
                            });
                        }

                        // Snapshot persistence every 5s
                        if last_snapshot_save.elapsed() >= Duration::from_secs(5) {
                            let _ = engine_collector.db.insert_snapshot(&metrics);
                            last_snapshot_save = Instant::now();
                        }

                        *engine_collector.latest_metrics.write() = Some(metrics);
                    }

                    // Automated retention purge every 15 minutes based on configured retention_days
                    if last_retention_purge.elapsed() >= Duration::from_secs(900) {
                        let retention_days_ns = (current_settings.retention_days as u64).max(1)
                            * 86400
                            * 1_000_000_000u64;
                        let _ = engine_collector.db.purge_old_data(retention_days_ns);
                        last_retention_purge = Instant::now();
                    }

                    let mut proc_map = HashMap::new();

                    // B. Collect Processes if enabled
                    if current_settings.process_monitoring {
                        let processes = ProcessCollector::collect(&mut sys);

                        for p in &processes {
                            proc_map.insert(p.pid, p.name.clone());
                        }

                        // Anomaly detection: flag top process if consuming severe CPU
                        if let Some(top_p) = processes.first()
                            && top_p.cpu_usage > 60.0
                        {
                            let event = EventNormalizer::create_event(
                                "process",
                                "warning",
                                Some(top_p.pid),
                                Some(top_p.name.clone()),
                                format!(
                                    "High workload process: {} ({:.1}%)",
                                    top_p.name, top_p.cpu_usage
                                ),
                                serde_json::to_string(&top_p).unwrap_or_default(),
                            );
                            engine_collector.dispatcher.dispatch(event);
                        }

                        *engine_collector.latest_processes.write() = processes;
                    }

                    // C. Collect Network Sockets if enabled (polled every 1.5s to minimize CPU overhead)
                    if current_settings.network_monitoring
                        && last_connection_poll.elapsed() >= Duration::from_millis(1500)
                    {
                        let connections = NetworkCollector::collect(&proc_map);
                        *engine_collector.latest_connections.write() = connections;
                        last_connection_poll = Instant::now();
                    }

                    // D. Drain Filesystem Events if enabled
                    if current_settings.filesystem_monitoring {
                        let mut new_fs = Vec::new();
                        let mut fs_churn_count = 0;
                        while let Ok(fs_ev) = engine_collector.fs_event_rx.try_recv() {
                            fs_churn_count += 1;
                            let event = EventNormalizer::create_event(
                                "filesystem",
                                "info",
                                None,
                                None,
                                format!("{} on {}", fs_ev.action, fs_ev.path),
                                serde_json::to_string(&fs_ev).unwrap_or_default(),
                            );
                            engine_collector.dispatcher.dispatch(event);
                            new_fs.push(fs_ev);
                        }

                        // Anomaly detection: rapid filesystem churn (> 30 modifications in interval)
                        if fs_churn_count > 30 {
                            let now_ns = std::time::SystemTime::now()
                                .duration_since(std::time::UNIX_EPOCH)
                                .unwrap_or_default()
                                .as_nanos() as u64;
                            let _ = engine_collector.db.insert_alert(&AlertRecord {
                                id: uuid::Uuid::now_v7().to_string(),
                                timestamp_ns: now_ns,
                                severity: "info".to_string(),
                                category: "filesystem".to_string(),
                                title: "Rapid Filesystem Churn".to_string(),
                                message: format!(
                                    "Observed {} file events in monitoring interval",
                                    fs_churn_count
                                ),
                                source: "Collector:Filesystem".to_string(),
                                acknowledged: false,
                            });
                        }

                        if !new_fs.is_empty() {
                            let mut stored = engine_collector.latest_fs_events.write();
                            stored.extend(new_fs);
                            if stored.len() > 500 {
                                let excess = stored.len() - 500;
                                stored.drain(0..excess);
                            }
                        }
                    }
                }

                let interval_ms = current_settings.polling_interval_ms.clamp(250, 10000);
                std::thread::sleep(Duration::from_millis(interval_ms));
            }
        });
    }

    pub fn shutdown(&self) {
        self.shutdown_signal.store(true, Ordering::Relaxed);
    }

    pub fn get_status(&self) -> SystemTelemetryStatus {
        let drops = self.dispatcher.drop_count();
        let active = self.collection_active.load(Ordering::Relaxed);
        let fs_path = self.monitored_fs_path.read().clone();
        probe_system_capabilities(drops, 0.05, active, fs_path)
    }

    pub fn get_metrics(&self) -> Option<SystemMetrics> {
        self.latest_metrics.read().clone()
    }

    pub fn get_processes(&self) -> Vec<ProcessInfo> {
        self.latest_processes.read().clone()
    }

    pub fn get_connections(&self) -> Vec<NetworkConnection> {
        self.latest_connections.read().clone()
    }

    pub fn get_fs_events(&self, limit: usize) -> Vec<FilesystemEventRecord> {
        let events = self.latest_fs_events.read();
        events.iter().rev().take(limit).cloned().collect()
    }

    pub fn set_monitoring_active(&self, active: bool) {
        self.collection_active.store(active, Ordering::Relaxed);
    }

    pub fn is_monitoring_active(&self) -> bool {
        self.collection_active.load(Ordering::Relaxed)
    }

    pub fn set_fs_watch_path(&self, path_str: String) -> Result<(), String> {
        let path = PathBuf::from(&path_str);
        let mut watcher = self.fs_watcher.write();
        watcher.stop();
        watcher.start_watching(path, self.fs_event_tx.clone())?;
        *self.monitored_fs_path.write() = Some(path_str);
        Ok(())
    }

    pub fn get_diagnostics(&self) -> SystemDiagnostics {
        let db_stats =
            self.db
                .get_storage_stats()
                .unwrap_or(crate::core::event_model::DatabaseStats {
                    file_size_bytes: 0,
                    total_events: 0,
                    total_snapshots: 0,
                    total_alerts: 0,
                    db_path: String::new(),
                });
        let db_integrity = self
            .db
            .run_integrity_check()
            .unwrap_or_else(|e| format!("Error: {}", e));

        let current_pid = sysinfo::get_current_pid().ok();
        let mut app_rss = 0u64;
        let mut app_threads = 1u32;

        if let Some(pid) = current_pid {
            let mut s = System::new();
            s.refresh_processes(sysinfo::ProcessesToUpdate::Some(&[pid]), true);
            if let Some(proc) = s.process(pid) {
                app_rss = proc.memory();
                app_threads = proc.tasks().map(|t| t.len() as u32).unwrap_or(4);
            }
        }

        let drop_count = self.dispatcher.drop_count();
        SystemDiagnostics {
            database: Some(db_stats.clone()),
            db_stats,
            db_integrity_status: db_integrity,
            dispatcher_queue_capacity: 100_000,
            dispatcher_drop_count: drop_count,
            event_drop_count: Some(drop_count),
            app_memory_rss_bytes: app_rss,
            active_threads_count: app_threads,
            uptime_seconds: self.start_time.elapsed().as_secs(),
        }
    }
}
