use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppPathsInfo {
    pub root_dir: String,
    pub database_dir: String,
    pub database_file: String,
    pub logs_dir: String,
    pub log_file: String,
    pub cache_dir: String,
    pub exports_dir: String,
    pub backups_dir: String,
    pub diagnostics_dir: String,
    pub settings_file: String,
}

#[derive(Debug, Clone)]
pub struct AppPaths {
    pub root: PathBuf,
    pub database_dir: PathBuf,
    pub database_file: PathBuf,
    pub logs_dir: PathBuf,
    pub log_file: PathBuf,
    pub cache_dir: PathBuf,
    pub exports_dir: PathBuf,
    pub backups_dir: PathBuf,
    pub diagnostics_dir: PathBuf,
    pub settings_file: PathBuf,
}

impl AppPaths {
    pub fn resolve() -> Self {
        // Under Windows: %LOCALAPPDATA%\AppTrace
        // Under Linux: ~/.local/share/AppTrace
        let root = dirs::data_local_dir()
            .map(|p| p.join("AppTrace"))
            .unwrap_or_else(|| PathBuf::from("AppTraceData"));

        let database_dir = root.join("database");
        let database_file = database_dir.join("apptrace.db");
        let logs_dir = root.join("logs");
        let log_file = logs_dir.join("app.log");
        let cache_dir = root.join("cache");
        let exports_dir = root.join("exports");
        let backups_dir = root.join("backups");
        let diagnostics_dir = root.join("diagnostics");
        let settings_file = root.join("settings.json");

        Self {
            root,
            database_dir,
            database_file,
            logs_dir,
            log_file,
            cache_dir,
            exports_dir,
            backups_dir,
            diagnostics_dir,
            settings_file,
        }
    }

    pub fn ensure_directories(&self) -> std::io::Result<()> {
        std::fs::create_dir_all(&self.root)?;
        std::fs::create_dir_all(&self.database_dir)?;
        std::fs::create_dir_all(&self.logs_dir)?;
        std::fs::create_dir_all(&self.cache_dir)?;
        std::fs::create_dir_all(&self.exports_dir)?;
        std::fs::create_dir_all(&self.backups_dir)?;
        std::fs::create_dir_all(&self.diagnostics_dir)?;
        Ok(())
    }

    pub fn to_info(&self) -> AppPathsInfo {
        AppPathsInfo {
            root_dir: self.root.to_string_lossy().to_string(),
            database_dir: self.database_dir.to_string_lossy().to_string(),
            database_file: self.database_file.to_string_lossy().to_string(),
            logs_dir: self.logs_dir.to_string_lossy().to_string(),
            log_file: self.log_file.to_string_lossy().to_string(),
            cache_dir: self.cache_dir.to_string_lossy().to_string(),
            exports_dir: self.exports_dir.to_string_lossy().to_string(),
            backups_dir: self.backups_dir.to_string_lossy().to_string(),
            diagnostics_dir: self.diagnostics_dir.to_string_lossy().to_string(),
            settings_file: self.settings_file.to_string_lossy().to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_app_paths_resolve() {
        let paths = AppPaths::resolve();
        assert!(!paths.root.as_os_str().is_empty());
        assert_eq!(paths.database_file, paths.database_dir.join("apptrace.db"));
        assert_eq!(paths.settings_file, paths.root.join("settings.json"));
    }

    #[test]
    fn test_app_paths_ensure_directories() {
        let temp =
            std::env::temp_dir().join(format!("apptrace_test_paths_{}", uuid::Uuid::new_v4()));
        let paths = AppPaths {
            root: temp.clone(),
            database_dir: temp.join("database"),
            database_file: temp.join("database").join("apptrace.db"),
            logs_dir: temp.join("logs"),
            log_file: temp.join("logs").join("app.log"),
            cache_dir: temp.join("cache"),
            exports_dir: temp.join("exports"),
            backups_dir: temp.join("backups"),
            diagnostics_dir: temp.join("diagnostics"),
            settings_file: temp.join("settings.json"),
        };

        paths.ensure_directories().expect("Failed to create dirs");
        assert!(paths.database_dir.is_dir());
        assert!(paths.logs_dir.is_dir());
        assert!(paths.cache_dir.is_dir());
        assert!(paths.exports_dir.is_dir());
        assert!(paths.backups_dir.is_dir());
        assert!(paths.diagnostics_dir.is_dir());

        let info = paths.to_info();
        assert_eq!(info.root_dir, temp.to_string_lossy());

        let _ = std::fs::remove_dir_all(&temp);
    }
}
