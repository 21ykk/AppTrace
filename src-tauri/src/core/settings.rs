use crate::core::app_paths::AppPaths;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AppSettings {
    // General Settings
    pub start_minimized: bool,
    pub minimize_to_tray: bool,
    pub close_to_tray: bool,
    pub autostart_enabled: bool,
    pub auto_start_monitoring: bool,
    pub confirm_exit: bool,
    pub theme: String,    // "dark", "light", "system"
    pub language: String, // "en", "pl", etc.

    // Monitoring Collectors
    pub process_monitoring: bool,
    pub network_monitoring: bool,
    pub filesystem_monitoring: bool,
    pub metrics_monitoring: bool,
    pub polling_interval_ms: u64,
    pub retention_days: u32,
    pub enable_redaction: bool,
    pub fs_watch_path: String,
    pub high_cpu_threshold: f32,
    pub high_memory_threshold: f32,
    pub max_timeline_events: usize,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            start_minimized: false,
            minimize_to_tray: false,
            close_to_tray: false,
            autostart_enabled: false,
            auto_start_monitoring: true,
            confirm_exit: false,
            theme: "dark".to_string(),
            language: "en".to_string(),

            process_monitoring: true,
            network_monitoring: true,
            filesystem_monitoring: true,
            metrics_monitoring: true,
            polling_interval_ms: 1000,
            retention_days: 7,
            enable_redaction: true,
            fs_watch_path: String::new(),
            high_cpu_threshold: 90.0,
            high_memory_threshold: 90.0,
            max_timeline_events: 200,
        }
    }
}

pub struct SettingsManager {
    settings: RwLock<AppSettings>,
    file_path: PathBuf,
}

impl SettingsManager {
    pub fn new(paths: &AppPaths) -> Self {
        let file_path = paths.settings_file.clone();
        let loaded = Self::load_or_default(&file_path);
        Self {
            settings: RwLock::new(loaded),
            file_path,
        }
    }

    fn load_or_default(path: &PathBuf) -> AppSettings {
        if !path.exists() {
            let defaults = AppSettings::default();
            let _ = Self::save_atomic(path, &defaults);
            return defaults;
        }

        match fs::read_to_string(path) {
            Ok(content) => match serde_json::from_str::<AppSettings>(&content) {
                Ok(s) => s,
                Err(err) => {
                    log::warn!(
                        "Corrupted settings.json ({}), creating backup and resetting to defaults",
                        err
                    );
                    let now = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs();
                    let corrupt_path = path.with_extension(format!("corrupted.{}.json", now));
                    let _ = fs::rename(path, corrupt_path);
                    let defaults = AppSettings::default();
                    let _ = Self::save_atomic(path, &defaults);
                    defaults
                }
            },
            Err(e) => {
                log::warn!("Failed to read settings.json ({}), using defaults", e);
                AppSettings::default()
            }
        }
    }

    fn save_atomic(path: &PathBuf, settings: &AppSettings) -> Result<(), String> {
        let json_str = serde_json::to_string_pretty(settings)
            .map_err(|e| format!("Serialization error: {}", e))?;

        let tmp_path = path.with_extension("tmp");
        fs::write(&tmp_path, json_str)
            .map_err(|e| format!("Failed to write temporary settings: {}", e))?;

        fs::rename(&tmp_path, path).map_err(|e| format!("Atomic settings rename failed: {}", e))?;

        Ok(())
    }

    pub fn get(&self) -> AppSettings {
        self.settings.read().clone()
    }

    pub fn update(&self, new_settings: AppSettings) -> Result<(), String> {
        Self::save_atomic(&self.file_path, &new_settings)?;
        *self.settings.write() = new_settings;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_settings_serialization_roundtrip() {
        let defaults = AppSettings::default();
        let json = serde_json::to_string(&defaults).expect("Serialization failed");
        let parsed: AppSettings = serde_json::from_str(&json).expect("Deserialization failed");
        assert_eq!(defaults, parsed);
    }

    #[test]
    fn test_settings_persistence_and_update() {
        let temp_dir =
            std::env::temp_dir().join(format!("apptrace_settings_test_{}", uuid::Uuid::new_v4()));
        let _ = std::fs::create_dir_all(&temp_dir);

        let paths = AppPaths {
            root: temp_dir.clone(),
            database_dir: temp_dir.join("database"),
            database_file: temp_dir.join("database").join("apptrace.db"),
            logs_dir: temp_dir.join("logs"),
            log_file: temp_dir.join("logs").join("app.log"),
            cache_dir: temp_dir.join("cache"),
            exports_dir: temp_dir.join("exports"),
            backups_dir: temp_dir.join("backups"),
            diagnostics_dir: temp_dir.join("diagnostics"),
            settings_file: temp_dir.join("settings.json"),
        };

        let manager = SettingsManager::new(&paths);
        assert_eq!(manager.get().polling_interval_ms, 1000);
        assert!(paths.settings_file.exists());

        // Update settings
        let mut modified = manager.get();
        modified.polling_interval_ms = 2500;
        modified.retention_days = 14;
        modified.theme = "light".to_string();
        manager
            .update(modified.clone())
            .expect("Failed to update settings");

        assert_eq!(manager.get().polling_interval_ms, 2500);

        // Re-read with new manager instance from disk
        let manager2 = SettingsManager::new(&paths);
        assert_eq!(manager2.get().polling_interval_ms, 2500);
        assert_eq!(manager2.get().retention_days, 14);
        assert_eq!(manager2.get().theme, "light");

        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_settings_corrupted_file_recovery() {
        let temp_dir =
            std::env::temp_dir().join(format!("apptrace_corrupt_test_{}", uuid::Uuid::new_v4()));
        let _ = std::fs::create_dir_all(&temp_dir);

        let paths = AppPaths {
            root: temp_dir.clone(),
            database_dir: temp_dir.join("database"),
            database_file: temp_dir.join("database").join("apptrace.db"),
            logs_dir: temp_dir.join("logs"),
            log_file: temp_dir.join("logs").join("app.log"),
            cache_dir: temp_dir.join("cache"),
            exports_dir: temp_dir.join("exports"),
            backups_dir: temp_dir.join("backups"),
            diagnostics_dir: temp_dir.join("diagnostics"),
            settings_file: temp_dir.join("settings.json"),
        };

        // Write corrupt JSON
        std::fs::write(&paths.settings_file, "{ invalid json content: 123 }").unwrap();

        // Loading should not crash; should create a backup and restore defaults
        let manager = SettingsManager::new(&paths);
        assert_eq!(manager.get().polling_interval_ms, 1000);

        // settings.json should now be valid JSON
        let content = std::fs::read_to_string(&paths.settings_file).unwrap();
        let parsed: Result<AppSettings, _> = serde_json::from_str(&content);
        assert!(parsed.is_ok());

        let _ = std::fs::remove_dir_all(&temp_dir);
    }
}
