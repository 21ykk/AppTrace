use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledApp {
    pub id: String,
    pub name: String,
    pub publisher: Option<String>,
    pub version: Option<String>,
    pub install_date: Option<String>,
    pub install_location: Option<String>,
    pub uninstall_string: Option<String>,
    pub quiet_uninstall_string: Option<String>,
    pub estimated_size_bytes: Option<u64>,
    pub scope: String,         // "User" | "Machine"
    pub source: String,        // "Registry" | "Package" | "Store" | "Discovered"
    pub architecture: String,  // "x86_64" | "x86" | "arm64"
    pub icon_path: Option<String>,
    pub is_running: bool,
    pub running_pids: Vec<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppRelationship {
    pub resource_type: String, // "Process" | "Service" | "Startup" | "Task" | "File" | "Registry"
    pub identifier: String,
    pub details: String,
    pub confidence: String,    // "Confirmed" | "High" | "Probable" | "Possible"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppDetails {
    pub app: InstalledApp,
    pub relationships: Vec<AppRelationship>,
    pub related_processes: Vec<u32>,
    pub related_services: Vec<String>,
    pub related_startup_entries: Vec<String>,
    pub related_directories: Vec<String>,
    pub related_registry_keys: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UninstallPlan {
    pub app_id: String,
    pub app_name: String,
    pub uninstall_command: Option<String>,
    pub is_quiet_supported: bool,
    pub processes_to_kill: Vec<u32>,
    pub potential_leftovers: Vec<LeftoverItem>,
    pub safety_level: String,  // "Safe" | "Warning" | "Blocked"
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeftoverItem {
    pub id: String,
    pub item_type: String,     // "Directory" | "File" | "RegistryKey" | "RegistryValue" | "Service" | "Startup"
    pub path: String,
    pub size_bytes: Option<u64>,
    pub confidence: String,    // "Verified" | "Likely" | "Uncertain" | "SystemProtected"
    pub is_shared: bool,
    pub is_safe_to_delete: bool,
    pub selected: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StartupEntry {
    pub id: String,
    pub name: String,
    pub command: String,
    pub location: String,      // "Registry_HKCU" | "Registry_HKLM" | "Startup_Folder" | "XDG_Autostart" | "Systemd_User"
    pub enabled: bool,
    pub publisher: Option<String>,
    pub exe_path: Option<String>,
    pub arguments: Option<String>,
    pub impact: String,        // "Low" | "Medium" | "High" | "Unknown"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceInfo {
    pub name: String,
    pub display_name: String,
    pub status: String,        // "Running" | "Stopped" | "Paused" | "Unknown"
    pub startup_type: String,  // "Automatic" | "Manual" | "Disabled" | "Unknown"
    pub bin_path: Option<String>,
    pub account: Option<String>,
    pub can_control: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduledTaskInfo {
    pub name: String,
    pub path: String,
    pub state: String,         // "Ready" | "Running" | "Disabled" | "Unknown"
    pub trigger_summary: String,
    pub action_summary: String,
    pub next_run_time: Option<String>,
    pub author: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistryValueItem {
    pub name: String,
    pub val_type: String,      // "REG_SZ" | "REG_DWORD" | "REG_QWORD" | "REG_BINARY" | "REG_MULTI_SZ" | "REG_EXPAND_SZ"
    pub data_preview: String,
    pub size_bytes: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistryKeyNode {
    pub key_path: String,
    pub name: String,
    pub subkeys: Vec<String>,
    pub values: Vec<RegistryValueItem>,
    pub can_write: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CleanableCategory {
    pub id: String,
    pub title: String,
    pub description: String,
    pub detected_bytes: u64,
    pub file_count: usize,
    pub items: Vec<CleanableItem>,
    pub is_safe_by_default: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CleanableItem {
    pub path: String,
    pub size_bytes: u64,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskUsageItem {
    pub path: String,
    pub name: String,
    pub is_dir: bool,
    pub size_bytes: u64,
    pub item_count: usize,
    pub children: Vec<DiskUsageItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DuplicateGroup {
    pub id: String,
    pub file_size: u64,
    pub sha256_hash: String,
    pub original_path: String,
    pub duplicate_paths: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationRecommendation {
    pub id: String,
    pub title: String,
    pub category: String,      // "Startup" | "Memory" | "Disk" | "Background" | "Health"
    pub description: String,
    pub evidence: String,
    pub expected_effect: String,
    pub risk_level: String,    // "None" | "Low" | "Medium"
    pub action_id: String,
    pub can_auto_execute: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthCheckItem {
    pub id: String,
    pub title: String,
    pub category: String,      // "Storage" | "Memory" | "Service" | "Process" | "Security"
    pub status: String,        // "Pass" | "Warn" | "Fail"
    pub details: String,
    pub actionable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemHealthReport {
    pub overall_score: u32,    // 0 - 100
    pub status: String,        // "Healthy" | "Attention" | "Degraded"
    pub timestamp_ns: u64,
    pub checks: Vec<HealthCheckItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OperationHistoryEntry {
    pub operation_id: String,
    pub timestamp_ns: u64,
    pub action_type: String,   // "Uninstall" | "Clean" | "Startup_Toggle" | "Service_Control" | "Registry_Edit" | "Duplicate_Delete"
    pub target_name: String,
    pub target_path: Option<String>,
    pub status: String,        // "Success" | "Partial" | "Failed"
    pub details_json: String,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HunterResult {
    pub query: String,
    pub installed_matches: Vec<InstalledApp>,
    pub running_matches: Vec<u32>,
    pub filesystem_matches: Vec<String>,
    pub registry_matches: Vec<String>,
    pub service_matches: Vec<String>,
    pub startup_matches: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManagementCapabilities {
    pub platform: String,
    pub has_registry_manager: bool,
    pub has_linux_config_manager: bool,
    pub has_services_manager: bool,
    pub has_scheduled_tasks_manager: bool,
    pub has_startup_manager: bool,
    pub has_uninstaller: bool,
    pub has_cleaner: bool,
    pub has_disk_analyzer: bool,
    pub has_duplicate_finder: bool,
    pub has_system_optimizer: bool,
    pub has_health_center: bool,
}
