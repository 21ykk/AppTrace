// AppTrace Core Desktop Runtime Library
pub mod collectors;
pub mod commands;
pub mod core;
pub mod database;
pub mod helpers;
pub mod management;
pub mod platform;
pub mod security;

use commands::AppState;
use core::TelemetryEngine;
use core::app_paths::AppPaths;
use core::settings::SettingsManager;
use database::DatabaseManager;
use std::sync::Arc;
use tauri::Manager;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 1. Initialize AppData directories
    let paths = Arc::new(AppPaths::resolve());
    paths
        .ensure_directories()
        .expect("Failed to initialize AppData directories");

    // 2. Load persistent settings from %LOCALAPPDATA%\AppTrace\settings.json
    let settings = Arc::new(SettingsManager::new(&paths));

    // 3. Initialize SQLite Database in %LOCALAPPDATA%\AppTrace\database\apptrace.db
    let db = Arc::new(
        DatabaseManager::new(Some(paths.database_dir.clone()))
            .expect("Failed to initialize SQLite database in AppData"),
    );

    // 4. Initialize Telemetry Engine with settings
    let telemetry = Arc::new(TelemetryEngine::new(Arc::clone(&db), Arc::clone(&settings)));
    telemetry.start_background_loop();

    let state = AppState {
        db,
        telemetry,
        settings,
        paths,
    };

    tauri::Builder::default()
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            commands::get_telemetry_status,
            commands::get_system_metrics,
            commands::get_processes,
            commands::get_network_connections,
            commands::get_filesystem_events,
            commands::get_event_timeline,
            commands::get_alerts,
            commands::acknowledge_alert,
            commands::start_monitoring,
            commands::stop_monitoring,
            commands::is_monitoring_active,
            commands::set_fs_watch_path,
            commands::get_dashboards,
            commands::save_dashboard,
            commands::delete_dashboard,
            commands::export_dashboard,
            commands::import_dashboard,
            commands::get_system_diagnostics,
            commands::export_telemetry_csv,
            commands::purge_retention_data,
            commands::get_app_settings,
            commands::save_app_settings,
            commands::get_app_paths,
            commands::get_autostart_info,
            commands::set_autostart_enabled,
            commands::create_database_backup,
            commands::restore_database_backup,
            commands::list_database_backups,
            commands::clear_cache_data,
            commands::clear_telemetry_history,
            commands::check_webview_runtime,
            commands::terminate_process,
            commands::open_process_directory,
            commands::get_installed_apps,
            commands::get_app_details,
            commands::get_uninstall_plan,
            commands::execute_uninstall_plan,
            commands::scan_app_leftovers,
            commands::delete_leftovers,
            commands::get_startup_entries,
            commands::set_startup_entry_enabled,
            commands::get_system_services,
            commands::start_system_service,
            commands::stop_system_service,
            commands::get_scheduled_tasks,
            commands::set_scheduled_task_enabled,
            commands::get_registry_key_node,
            commands::search_registry,
            commands::export_registry_key,
            commands::set_registry_value,
            commands::delete_registry_item,
            commands::scan_cleanable_categories,
            commands::execute_cleaning,
            commands::analyze_disk_space,
            commands::get_largest_files,
            commands::scan_duplicate_files,
            commands::delete_duplicate_files,
            commands::delete_duplicate_candidates,
            commands::get_optimization_recommendations,
            commands::execute_optimization_action,
            commands::get_system_health_report,
            commands::hunt_software_resources,
            commands::get_management_capabilities,
            commands::record_operation_history,
            commands::get_operation_history,
        ])
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                let state = window.state::<AppState>();
                let current_settings = state.settings.get();
                if current_settings.close_to_tray {
                    api.prevent_close();
                    let _ = window.hide();
                } else {
                    state.telemetry.shutdown();
                }
            }
            tauri::WindowEvent::Destroyed => {
                let state = window.state::<AppState>();
                state.telemetry.shutdown();
            }
            _ => {}
        })
        .setup(|app| {
            let state = app.state::<AppState>();
            let current_settings = state.settings.get();

            // Setup System Tray
            let open_i = MenuItem::with_id(app, "open", "Open AppTrace", true, None::<&str>)?;
            let start_mon_i =
                MenuItem::with_id(app, "start_mon", "Start Monitoring", true, None::<&str>)?;
            let stop_mon_i =
                MenuItem::with_id(app, "stop_mon", "Stop Monitoring", true, None::<&str>)?;
            let settings_i = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
            let exit_i = MenuItem::with_id(app, "exit", "Exit AppTrace", true, None::<&str>)?;

            let menu = Menu::with_items(
                app,
                &[&open_i, &start_mon_i, &stop_mon_i, &settings_i, &exit_i],
            )?;

            if let Some(icon) = app.default_window_icon() {
                let _tray = TrayIconBuilder::new()
                    .icon(icon.clone())
                    .tooltip("AppTrace — System Observability")
                    .menu(&menu)
                    .show_menu_on_left_click(false)
                    .on_menu_event(|app, event| match event.id.as_ref() {
                        "open" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                        "start_mon" => {
                            let state = app.state::<AppState>();
                            state.telemetry.set_monitoring_active(true);
                        }
                        "stop_mon" => {
                            let state = app.state::<AppState>();
                            state.telemetry.set_monitoring_active(false);
                        }
                        "settings" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                                let _ = window.eval("window.location.hash = '#/settings'");
                            }
                        }
                        "exit" => {
                            let state = app.state::<AppState>();
                            state.telemetry.shutdown();
                            app.exit(0);
                        }
                        _ => {}
                    })
                    .on_tray_icon_event(|tray, event| {
                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } = event
                        {
                            let app = tray.app_handle();
                            if let Some(window) = app.get_webview_window("main") {
                                let is_visible = window.is_visible().unwrap_or(false);
                                if is_visible {
                                    let _ = window.hide();
                                } else {
                                    let _ = window.show();
                                    let _ = window.unminimize();
                                    let _ = window.set_focus();
                                }
                            }
                        }
                    })
                    .build(app)?;
            }

            if let Some(window) = app.get_webview_window("main") {
                if current_settings.start_minimized {
                    let _ = window.hide();
                } else {
                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
