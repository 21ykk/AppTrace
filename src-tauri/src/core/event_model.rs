use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CollectorCategory {
    Process,
    Network,
    Filesystem,
    SystemMetrics,
    Health,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "status", content = "details")]
pub enum SupportLevel {
    Full,
    Degraded { reason: String },
    PermissionRequired { missing_permission: String },
    Unavailable { reason: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CapabilityStatus {
    pub category: CollectorCategory,
    pub level: SupportLevel,
    pub collection_mechanism: String,
    pub is_elevated: bool,
    pub limitations: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemTelemetryStatus {
    pub os_name: String,
    pub os_version: String,
    pub kernel_version: Option<String>,
    pub architecture: String,
    pub is_elevated: bool,
    pub active_backend: String,
    pub capabilities: Vec<CapabilityStatus>,
    pub event_drop_count: u64,
    pub buffer_utilization_pct: f32,
    pub collection_active: bool,
    pub monitored_fs_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskMetric {
    pub name: String,
    pub mount_point: String,
    pub total_bytes: u64,
    pub available_bytes: u64,
    pub is_removable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkInterfaceMetric {
    pub name: String,
    pub mac_address: String,
    pub rx_bytes: u64,
    pub tx_bytes: u64,
    pub rx_packets: u64,
    pub tx_packets: u64,
    pub rx_errors: u64,
    pub tx_errors: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemMetrics {
    pub timestamp_ns: u64,
    pub cpu_usage_pct: f32,
    pub per_core_cpu: Vec<f32>,
    pub memory_used_bytes: u64,
    pub memory_total_bytes: u64,
    pub memory_available_bytes: u64,
    pub swap_used_bytes: u64,
    pub swap_total_bytes: u64,
    pub disks: Vec<DiskMetric>,
    pub interfaces: Vec<NetworkInterfaceMetric>,
    pub net_bytes_rx_sec: u64,
    pub net_bytes_tx_sec: u64,
    pub total_processes: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub ppid: Option<u32>,
    pub name: String,
    pub exe_path: String,
    pub cmd: Vec<String>,
    pub cpu_usage: f32,
    pub memory_bytes: u64,
    pub virtual_memory_bytes: u64,
    pub status: String,
    pub start_time: u64,
    pub user_id: Option<String>,
    pub thread_count: Option<u32>,
    pub disk_read_bytes: u64,
    pub disk_written_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkConnection {
    pub protocol: String,
    pub local_addr: String,
    pub local_port: u16,
    pub remote_addr: String,
    pub remote_port: u16,
    pub state: String,
    pub pid: Option<u32>,
    pub process_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilesystemEventRecord {
    pub id: String,
    pub timestamp_ns: u64,
    pub path: String,
    pub action: String,
    pub is_directory: bool,
    pub details: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NormalizedEvent {
    pub event_id: String,
    pub timestamp_ns: u64,
    pub category: String,
    pub severity: String,
    pub pid: Option<u32>,
    pub process_name: Option<String>,
    pub summary: String,
    pub payload_json: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertRecord {
    pub id: String,
    pub timestamp_ns: u64,
    pub severity: String,
    pub category: String,
    pub title: String,
    pub message: String,
    pub source: String,
    pub acknowledged: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WidgetConfig {
    pub id: String,
    pub type_id: String,
    pub title: String,
    pub x: u32,
    pub y: u32,
    pub w: u32,
    pub h: u32,
    pub visible: bool,
    pub settings: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardConfig {
    pub id: String,
    pub name: String,
    pub description: String,
    pub is_default: bool,
    pub created_at: u64,
    pub updated_at: u64,
    pub widgets: Vec<WidgetConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupRecord {
    pub filename: String,
    pub size_bytes: u64,
    pub created_at_secs: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseStats {
    pub file_size_bytes: u64,
    pub total_events: u64,
    pub total_snapshots: u64,
    pub total_alerts: u64,
    pub db_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemDiagnostics {
    pub db_stats: DatabaseStats,
    #[serde(default)]
    pub database: Option<DatabaseStats>,
    pub db_integrity_status: String,
    pub dispatcher_queue_capacity: usize,
    pub dispatcher_drop_count: u64,
    #[serde(default)]
    pub event_drop_count: Option<u64>,
    pub app_memory_rss_bytes: u64,
    pub active_threads_count: u32,
    pub uptime_seconds: u64,
    #[serde(default)]
    pub persistence_failures_count: u64,
}
