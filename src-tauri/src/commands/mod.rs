use crate::core::TelemetryEngine;
use crate::core::app_paths::{AppPaths, AppPathsInfo};
use crate::core::event_model::{
    AlertRecord, BackupRecord, DashboardConfig, FilesystemEventRecord, NetworkConnection,
    NormalizedEvent, ProcessInfo, SystemDiagnostics, SystemMetrics, SystemTelemetryStatus,
};
use crate::core::settings::{AppSettings, SettingsManager};
use crate::database::DatabaseManager;
use crate::management::models::*;
use crate::platform::autostart::{AutostartStatus, get_autostart_status, set_autostart};
use std::sync::Arc;
use tauri::State;

pub struct AppState {
    pub db: Arc<DatabaseManager>,
    pub telemetry: Arc<TelemetryEngine>,
    pub settings: Arc<SettingsManager>,
    pub paths: Arc<AppPaths>,
}

#[tauri::command]
pub fn get_app_settings(state: State<'_, AppState>) -> AppSettings {
    state.settings.get()
}

#[tauri::command]
pub fn save_app_settings(settings: AppSettings, state: State<'_, AppState>) -> Result<(), String> {
    let old = state.settings.get();

    // Check if autostart was toggled
    if settings.autostart_enabled != old.autostart_enabled {
        let _ = set_autostart(settings.autostart_enabled);
    }

    state.settings.update(settings)
}

#[tauri::command]
pub fn get_app_paths(state: State<'_, AppState>) -> AppPathsInfo {
    state.paths.to_info()
}

#[tauri::command]
pub fn get_autostart_info() -> AutostartStatus {
    get_autostart_status()
}

#[tauri::command]
pub fn set_autostart_enabled(enable: bool, state: State<'_, AppState>) -> Result<(), String> {
    set_autostart(enable)?;
    let mut s = state.settings.get();
    s.autostart_enabled = enable;
    let _ = state.settings.update(s);
    Ok(())
}

#[tauri::command]
pub fn create_database_backup(state: State<'_, AppState>) -> Result<String, String> {
    state.db.create_backup(&state.paths.backups_dir)
}

#[tauri::command]
pub fn restore_database_backup(
    backup_filename: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let backup_path = state.paths.backups_dir.join(&backup_filename);
    state.db.restore_backup(&backup_path)
}

#[tauri::command]
pub fn list_database_backups(state: State<'_, AppState>) -> Result<Vec<BackupRecord>, String> {
    DatabaseManager::list_backups(&state.paths.backups_dir)
}

#[tauri::command]
pub fn clear_cache_data(state: State<'_, AppState>) -> Result<u64, String> {
    DatabaseManager::clear_cache_data(&state.paths.cache_dir)
}

#[tauri::command]
pub fn clear_telemetry_history(state: State<'_, AppState>) -> Result<(usize, usize), String> {
    state.db.clear_historical_data().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn check_webview_runtime() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        tauri::webview_version().map_err(|_| {
            "Microsoft Edge WebView2 runtime is missing. AppTrace requires WebView2 on Windows 10/11. Download the evergreen Bootstrapper from Microsoft."
                .to_string()
        })
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok("Native Linux WebKitGTK / WebEngine active".to_string())
    }
}

#[tauri::command]
pub fn get_telemetry_status(state: State<'_, AppState>) -> SystemTelemetryStatus {
    state.telemetry.get_status()
}

#[tauri::command]
pub fn get_system_metrics(state: State<'_, AppState>) -> Option<SystemMetrics> {
    state.telemetry.get_metrics()
}

#[tauri::command]
pub fn get_processes(state: State<'_, AppState>) -> Vec<ProcessInfo> {
    state.telemetry.get_processes()
}

#[tauri::command]
pub fn get_network_connections(state: State<'_, AppState>) -> Vec<NetworkConnection> {
    state.telemetry.get_connections()
}

#[tauri::command]
pub fn get_filesystem_events(
    limit: Option<usize>,
    state: State<'_, AppState>,
) -> Vec<FilesystemEventRecord> {
    state.telemetry.get_fs_events(limit.unwrap_or(100))
}

#[tauri::command]
pub fn get_event_timeline(
    limit: Option<usize>,
    offset: Option<usize>,
    category: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<NormalizedEvent>, String> {
    state
        .db
        .query_events(
            limit.unwrap_or(100),
            offset.unwrap_or(0),
            category.as_deref(),
        )
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_alerts(state: State<'_, AppState>) -> Result<Vec<AlertRecord>, String> {
    state.db.get_alerts().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn acknowledge_alert(alert_id: String, state: State<'_, AppState>) -> Result<(), String> {
    state
        .db
        .acknowledge_alert(&alert_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn start_monitoring(state: State<'_, AppState>) -> bool {
    state.telemetry.set_monitoring_active(true);
    true
}

#[tauri::command]
pub fn stop_monitoring(state: State<'_, AppState>) -> bool {
    state.telemetry.set_monitoring_active(false);
    false
}

#[tauri::command]
pub fn is_monitoring_active(state: State<'_, AppState>) -> bool {
    state.telemetry.is_monitoring_active()
}

#[tauri::command]
pub fn set_fs_watch_path(path: String, state: State<'_, AppState>) -> Result<(), String> {
    state.telemetry.set_fs_watch_path(path)
}

#[tauri::command]
pub fn get_dashboards(state: State<'_, AppState>) -> Result<Vec<DashboardConfig>, String> {
    state.db.get_dashboards().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_dashboard(config: DashboardConfig, state: State<'_, AppState>) -> Result<(), String> {
    state.db.save_dashboard(&config).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_dashboard(id: String, state: State<'_, AppState>) -> Result<(), String> {
    state.db.delete_dashboard(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn export_dashboard(id: String, state: State<'_, AppState>) -> Result<String, String> {
    let dashboards = state.db.get_dashboards().map_err(|e| e.to_string())?;
    let found = dashboards
        .into_iter()
        .find(|d| d.id == id)
        .ok_or_else(|| format!("Dashboard {} not found", id))?;
    serde_json::to_string_pretty(&found).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn import_dashboard(
    json: String,
    state: State<'_, AppState>,
) -> Result<DashboardConfig, String> {
    let mut config: DashboardConfig = serde_json::from_str(&json)
        .map_err(|e| format!("Invalid dashboard JSON configuration: {}", e))?;

    config.id = format!("dash-imported-{}", uuid::Uuid::now_v7());
    config.is_default = false;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    config.created_at = now;
    config.updated_at = now;

    state
        .db
        .save_dashboard(&config)
        .map_err(|e| e.to_string())?;
    Ok(config)
}

#[tauri::command]
pub fn get_system_diagnostics(state: State<'_, AppState>) -> SystemDiagnostics {
    state.telemetry.get_diagnostics()
}

#[tauri::command]
pub fn export_telemetry_csv(
    category: Option<String>,
    limit: Option<usize>,
    state: State<'_, AppState>,
) -> Result<String, String> {
    state
        .db
        .export_events_csv(category.as_deref(), limit.unwrap_or(5000))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn purge_retention_data(
    max_age_hours: Option<u64>,
    state: State<'_, AppState>,
) -> Result<(usize, usize), String> {
    let hours = max_age_hours.unwrap_or(24 * 7);
    let max_age_ns = hours * 3600 * 1_000_000_000u64;
    state
        .db
        .purge_old_data(max_age_ns)
        .map_err(|e| e.to_string())
}


#[tauri::command]
pub fn terminate_process(pid: u32) -> Result<(), String> {
    if pid <= 4 {
        return Err("Cannot terminate core system processes (PID <= 4)".to_string());
    }
    #[cfg(target_os = "windows")]
    {
        use windows_sys::Win32::Foundation::{CloseHandle, FALSE};
        use windows_sys::Win32::System::Threading::{OpenProcess, TerminateProcess, PROCESS_TERMINATE};
        unsafe {
            let handle = OpenProcess(PROCESS_TERMINATE, FALSE, pid);
            if handle.is_null() {
                return Err(format!("Access denied or process {} not found", pid));
            }
            let res = TerminateProcess(handle, 1);
            CloseHandle(handle);
            if res == 0 {
                return Err(format!("Failed to terminate process {}", pid));
            }
        }
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        let res = unsafe { libc::kill(pid as i32, libc::SIGTERM) };
        if res != 0 {
            return Err(format!("Failed to terminate PID {}", pid));
        }
        Ok(())
    }
}

#[tauri::command]
pub fn open_process_directory(exe_path: String) -> Result<(), String> {
    if exe_path.is_empty() {
        return Err("Executable path is empty".to_string());
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer.exe")
            .arg(format!("/select,{}", exe_path))
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        let parent = std::path::Path::new(&exe_path)
            .parent()
            .unwrap_or(std::path::Path::new("/"));
        std::process::Command::new("xdg-open")
            .arg(parent)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}

// ==========================================
// SYSTEM MANAGEMENT & OBSERVABILITY SUITE COMMANDS
// ==========================================

#[tauri::command]
pub fn get_installed_apps() -> Result<Vec<InstalledApp>, String> {
    crate::management::applications::get_installed_applications()
}

#[tauri::command]
pub fn get_app_details(app_id: String) -> Result<AppDetails, String> {
    crate::management::applications::get_app_details(&app_id)
}

#[tauri::command]
pub fn get_uninstall_plan(app_id: String) -> Result<UninstallPlan, String> {
    crate::management::uninstall::get_uninstall_plan(&app_id)
}

#[tauri::command]
pub fn execute_uninstall_plan(
    app_id: String,
    force_kill_processes: bool,
    run_original_uninstaller: bool,
    remove_leftovers: bool,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let res = crate::management::uninstall::execute_uninstall_plan(
        &app_id,
        force_kill_processes,
        run_original_uninstaller,
        remove_leftovers,
    );
    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_nanos() as u64;
    let op = crate::management::models::OperationHistoryEntry {
        operation_id: format!("op-uninst-{}", uuid::Uuid::now_v7()),
        timestamp_ns: now,
        action_type: "UninstallApp".to_string(),
        target_name: app_id,
        target_path: None,
        status: if res.is_ok() { "Success".to_string() } else { "Failed".to_string() },
        details_json: format!(r#"{{"force_kill":{},"run_uninstaller":{},"remove_leftovers":{}}}"#, force_kill_processes, run_original_uninstaller, remove_leftovers),
        error_message: res.as_ref().err().cloned(),
    };
    if let Err(e) = state.db.record_operation(&op) {
        eprintln!(
            "[AppTrace Diagnostics] Operation history persistence failure for {}: {}",
            op.operation_id, e
        );
    }
    res
}

#[tauri::command]
pub fn scan_app_leftovers(app_id: String) -> Result<Vec<LeftoverItem>, String> {
    crate::management::uninstall::scan_app_leftovers(&app_id)
}

#[tauri::command]
pub fn delete_leftovers(items: Vec<LeftoverItem>, state: State<'_, AppState>) -> Result<(u64, usize), String> {
    let selected_count = items.iter().filter(|i| i.selected).count();
    let res = crate::management::uninstall::delete_leftovers(items);
    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_nanos() as u64;
    let (bytes, deleted) = res.as_ref().copied().unwrap_or((0, 0));
    let status = match &res {
        Ok(_) if selected_count > 0 && deleted == 0 => "Failed".to_string(),
        Ok(_) if selected_count > 0 && deleted < selected_count => "PartialSuccess".to_string(),
        Ok(_) => "Success".to_string(),
        Err(_) => "Failed".to_string(),
    };
    let op = crate::management::models::OperationHistoryEntry {
        operation_id: format!("op-leftover-{}", uuid::Uuid::now_v7()),
        timestamp_ns: now,
        action_type: "DeleteLeftovers".to_string(),
        target_name: format!("{} leftover items", selected_count),
        target_path: None,
        status,
        details_json: format!(r#"{{"bytes_reclaimed":{},"files_deleted":{},"items_requested":{}}}"#, bytes, deleted, selected_count),
        error_message: res.as_ref().err().cloned(),
    };
    if let Err(e) = state.db.record_operation(&op) {
        eprintln!(
            "[AppTrace Diagnostics] Operation history persistence failure for {}: {}",
            op.operation_id, e
        );
    }
    res
}

#[tauri::command]
pub fn get_startup_entries() -> Result<Vec<StartupEntry>, String> {
    crate::management::startup::get_startup_entries()
}

#[tauri::command]
pub fn set_startup_entry_enabled(entry_id: String, enabled: bool, state: State<'_, AppState>) -> Result<(), String> {
    let res = crate::management::startup::set_startup_entry_enabled(&entry_id, enabled);
    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_nanos() as u64;
    let op = crate::management::models::OperationHistoryEntry {
        operation_id: format!("op-startup-{}", uuid::Uuid::now_v7()),
        timestamp_ns: now,
        action_type: if enabled { "EnableStartup".to_string() } else { "DisableStartup".to_string() },
        target_name: entry_id,
        target_path: None,
        status: if res.is_ok() { "Success".to_string() } else { "Failed".to_string() },
        details_json: format!(r#"{{"enabled":{}}}"#, enabled),
        error_message: res.as_ref().err().cloned(),
    };
    if let Err(e) = state.db.record_operation(&op) {
        eprintln!(
            "[AppTrace Diagnostics] Operation history persistence failure for {}: {}",
            op.operation_id, e
        );
    }
    res
}

#[tauri::command]
pub fn get_system_services() -> Result<Vec<ServiceInfo>, String> {
    crate::management::services::get_system_services()
}

#[tauri::command]
pub fn start_system_service(service_name: String, state: State<'_, AppState>) -> Result<(), String> {
    let res = crate::management::services::start_system_service(&service_name);
    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_nanos() as u64;
    let op = crate::management::models::OperationHistoryEntry {
        operation_id: format!("op-svcstart-{}", uuid::Uuid::now_v7()),
        timestamp_ns: now,
        action_type: "StartService".to_string(),
        target_name: service_name,
        target_path: None,
        status: if res.is_ok() { "Success".to_string() } else { "Failed".to_string() },
        details_json: "{}".to_string(),
        error_message: res.as_ref().err().cloned(),
    };
    if let Err(e) = state.db.record_operation(&op) {
        eprintln!(
            "[AppTrace Diagnostics] Operation history persistence failure for {}: {}",
            op.operation_id, e
        );
    }
    res
}

#[tauri::command]
pub fn stop_system_service(service_name: String, state: State<'_, AppState>) -> Result<(), String> {
    let res = crate::management::services::stop_system_service(&service_name);
    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_nanos() as u64;
    let op = crate::management::models::OperationHistoryEntry {
        operation_id: format!("op-svcstop-{}", uuid::Uuid::now_v7()),
        timestamp_ns: now,
        action_type: "StopService".to_string(),
        target_name: service_name,
        target_path: None,
        status: if res.is_ok() { "Success".to_string() } else { "Failed".to_string() },
        details_json: "{}".to_string(),
        error_message: res.as_ref().err().cloned(),
    };
    if let Err(e) = state.db.record_operation(&op) {
        eprintln!(
            "[AppTrace Diagnostics] Operation history persistence failure for {}: {}",
            op.operation_id, e
        );
    }
    res
}

#[tauri::command]
pub fn get_scheduled_tasks() -> Result<Vec<ScheduledTaskInfo>, String> {
    crate::management::scheduled_tasks::get_scheduled_tasks()
}

#[tauri::command]
pub fn set_scheduled_task_enabled(task_path: String, task_name: String, enabled: bool) -> Result<(), String> {
    crate::management::scheduled_tasks::set_scheduled_task_enabled(&task_path, &task_name, enabled)
}

#[tauri::command]
pub fn get_registry_key_node(path: String) -> Result<RegistryKeyNode, String> {
    crate::management::registry::get_registry_key_node(&path)
}

#[tauri::command]
pub fn search_registry(query: String, start_path: Option<String>) -> Result<Vec<String>, String> {
    crate::management::registry::search_registry(&query, start_path.as_deref())
}

#[tauri::command]
pub fn export_registry_key(key_path: String) -> Result<String, String> {
    crate::management::registry::export_registry_key(&key_path)
}

#[tauri::command]
pub fn set_registry_value(key_path: String, value_name: String, value_data: String, val_type: String) -> Result<(), String> {
    crate::management::registry::set_registry_value(&key_path, &value_name, &value_data, &val_type)
}

#[tauri::command]
pub fn delete_registry_item(key_path: String, value_name: Option<String>, state: State<'_, AppState>) -> Result<(), String> {
    let res = crate::management::registry::delete_registry_value_or_key(&key_path, value_name.as_deref());
    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_nanos() as u64;
    let op = crate::management::models::OperationHistoryEntry {
        operation_id: format!("op-regdel-{}", uuid::Uuid::now_v7()),
        timestamp_ns: now,
        action_type: "DeleteRegistryOrConfig".to_string(),
        target_name: key_path.clone(),
        target_path: Some(key_path),
        status: if res.is_ok() { "Success".to_string() } else { "Failed".to_string() },
        details_json: format!(r#"{{"value_name":{:?}}}"#, value_name),
        error_message: res.as_ref().err().cloned(),
    };
    if let Err(e) = state.db.record_operation(&op) {
        eprintln!(
            "[AppTrace Diagnostics] Operation history persistence failure for {}: {}",
            op.operation_id, e
        );
    }
    res
}

#[tauri::command]
pub fn scan_cleanable_categories() -> Result<Vec<CleanableCategory>, String> {
    crate::management::cleaner::scan_cleanable_categories()
}

#[tauri::command]
pub fn execute_cleaning(category_ids: Vec<String>, state: State<'_, AppState>) -> Result<(u64, usize), String> {
    let cat_count = category_ids.len();
    let res = crate::management::cleaner::execute_cleaning(category_ids);
    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_nanos() as u64;
    let (bytes, files) = res.as_ref().copied().unwrap_or((0, 0));
    let op = crate::management::models::OperationHistoryEntry {
        operation_id: format!("op-clean-{}", uuid::Uuid::now_v7()),
        timestamp_ns: now,
        action_type: "SystemClean".to_string(),
        target_name: format!("{} cleanable categories", cat_count),
        target_path: None,
        status: if res.is_ok() { "Success".to_string() } else { "Failed".to_string() },
        details_json: format!(r#"{{"bytes_reclaimed":{},"files_deleted":{}}}"#, bytes, files),
        error_message: res.as_ref().err().cloned(),
    };
    if let Err(e) = state.db.record_operation(&op) {
        eprintln!(
            "[AppTrace Diagnostics] Operation history persistence failure for {}: {}",
            op.operation_id, e
        );
    }
    res
}

#[tauri::command]
pub fn analyze_disk_space(target_path: String, max_depth: Option<usize>) -> Result<DiskUsageItem, String> {
    crate::management::disk_analyzer::analyze_disk_space(&target_path, max_depth)
}

#[tauri::command]
pub fn get_largest_files(target_path: String, limit: Option<usize>) -> Result<Vec<CleanableItem>, String> {
    crate::management::disk_analyzer::get_largest_files(&target_path, limit)
}

#[tauri::command]
pub fn scan_duplicate_files(target_path: String, min_size_bytes: Option<u64>) -> Result<Vec<DuplicateGroup>, String> {
    crate::management::duplicates::scan_duplicate_files(&target_path, min_size_bytes)
}

#[tauri::command]
pub fn delete_duplicate_files(file_paths: Vec<String>, state: State<'_, AppState>) -> Result<(u64, usize), String> {
    let count = file_paths.len();
    let res = crate::management::duplicates::delete_duplicate_files(file_paths);
    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_nanos() as u64;
    let (bytes, files) = res.as_ref().copied().unwrap_or((0, 0));
    let status = match &res {
        Ok(_) if count > 0 && files == 0 => "Failed".to_string(),
        Ok(_) if count > 0 && files < count => "PartialSuccess".to_string(),
        Ok(_) => "Success".to_string(),
        Err(_) => "Failed".to_string(),
    };
    let op = crate::management::models::OperationHistoryEntry {
        operation_id: format!("op-dupdel-{}", uuid::Uuid::now_v7()),
        timestamp_ns: now,
        action_type: "DeleteDuplicates".to_string(),
        target_name: format!("{} duplicate files", count),
        target_path: None,
        status,
        details_json: format!(r#"{{"bytes_reclaimed":{},"files_deleted":{},"files_requested":{}}}"#, bytes, files, count),
        error_message: res.as_ref().err().cloned(),
    };
    if let Err(e) = state.db.record_operation(&op) {
        eprintln!(
            "[AppTrace Diagnostics] Operation history persistence failure for {}: {}",
            op.operation_id, e
        );
    }
    res
}

#[tauri::command]
pub fn delete_duplicate_candidates(
    candidates: Vec<DuplicateCandidateItem>,
    state: State<'_, AppState>,
) -> Result<(u64, usize), String> {
    let count = candidates.len();
    let res = crate::management::duplicates::delete_duplicate_candidates(candidates);
    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_nanos() as u64;
    let (bytes, files) = res.as_ref().copied().unwrap_or((0, 0));
    let status = match &res {
        Ok(_) if count > 0 && files == 0 => "Failed".to_string(),
        Ok(_) if count > 0 && files < count => "PartialSuccess".to_string(),
        Ok(_) => "Success".to_string(),
        Err(_) => "Failed".to_string(),
    };
    let op = crate::management::models::OperationHistoryEntry {
        operation_id: format!("op-dupdel-cand-{}", uuid::Uuid::now_v7()),
        timestamp_ns: now,
        action_type: "DeleteDuplicates".to_string(),
        target_name: format!("{} duplicate candidates", count),
        target_path: None,
        status,
        details_json: format!(r#"{{"bytes_reclaimed":{},"files_deleted":{},"candidates_requested":{}}}"#, bytes, files, count),
        error_message: res.as_ref().err().cloned(),
    };
    if let Err(e) = state.db.record_operation(&op) {
        eprintln!(
            "[AppTrace Diagnostics] Operation history persistence failure for {}: {}",
            op.operation_id, e
        );
    }
    res
}

#[tauri::command]
pub fn get_optimization_recommendations() -> Result<Vec<OptimizationRecommendation>, String> {
    crate::management::optimizer::get_optimization_recommendations()
}

#[tauri::command]
pub fn execute_optimization_action(action_id: String) -> Result<String, String> {
    crate::management::optimizer::execute_optimization_action(&action_id)
}

#[tauri::command]
pub fn get_system_health_report() -> Result<SystemHealthReport, String> {
    crate::management::health::get_system_health_report()
}

#[tauri::command]
pub fn hunt_software_resources(query: String) -> Result<HunterResult, String> {
    crate::management::hunter::hunt_software_resources(&query)
}

#[tauri::command]
pub fn get_management_capabilities() -> Result<ManagementCapabilities, String> {
    #[cfg(target_os = "windows")]
    {
        Ok(ManagementCapabilities {
            platform: "windows".to_string(),
            has_registry_manager: true,
            has_linux_config_manager: false,
            has_services_manager: true,
            has_scheduled_tasks_manager: true,
            has_startup_manager: true,
            has_uninstaller: true,
            has_cleaner: true,
            has_disk_analyzer: true,
            has_duplicate_finder: true,
            has_system_optimizer: true,
            has_health_center: true,
        })
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(ManagementCapabilities {
            platform: "linux".to_string(),
            has_registry_manager: false,
            has_linux_config_manager: true,
            has_services_manager: true,
            has_scheduled_tasks_manager: true,
            has_startup_manager: true,
            has_uninstaller: true,
            has_cleaner: true,
            has_disk_analyzer: true,
            has_duplicate_finder: true,
            has_system_optimizer: true,
            has_health_center: true,
        })
    }
}

#[tauri::command]
pub fn record_operation_history(
    action_type: String,
    target_name: String,
    target_path: Option<String>,
    status: String,
    details_json: String,
    error_message: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos() as u64;
    let entry = crate::management::models::OperationHistoryEntry {
        operation_id: format!("op-manual-{}", uuid::Uuid::now_v7()),
        timestamp_ns: now,
        action_type,
        target_name,
        target_path,
        status,
        details_json,
        error_message,
    };
    state.db.record_operation(&entry).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_operation_history(
    limit: Option<usize>,
    state: State<'_, AppState>,
) -> Result<Vec<crate::management::models::OperationHistoryEntry>, String> {
    state
        .db
        .get_operation_history(limit.unwrap_or(100))
        .map_err(|e| e.to_string())
}
