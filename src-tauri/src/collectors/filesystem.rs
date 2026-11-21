use crate::core::event_model::FilesystemEventRecord;
use crate::security::redaction::is_sensitive_path;
use crossbeam_channel::Sender;
use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

pub struct FilesystemCollector {
    _watcher: Option<RecommendedWatcher>,
    pub current_path: Option<PathBuf>,
}

impl FilesystemCollector {
    pub fn new() -> Self {
        Self {
            _watcher: None,
            current_path: None,
        }
    }

    pub fn start_watching(
        &mut self,
        path: PathBuf,
        event_tx: Sender<FilesystemEventRecord>,
    ) -> Result<(), String> {
        if !path.exists() {
            return Err(format!("Path does not exist: {}", path.display()));
        }

        let mut watcher = RecommendedWatcher::new(
            move |res: Result<Event, notify::Error>| {
                if let Ok(event) = res {
                    let now_ns = SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_nanos() as u64;

                    let action = match event.kind {
                        EventKind::Create(_) => "CREATE",
                        EventKind::Modify(_) => "MODIFY",
                        EventKind::Remove(_) => "DELETE",
                        _ => "OTHER",
                    };

                    for path in event.paths {
                        let path_str = path.to_string_lossy().to_string();
                        if is_sensitive_path(&path_str) {
                            continue;
                        }

                        let is_dir = path.is_dir();
                        let record = FilesystemEventRecord {
                            id: uuid::Uuid::now_v7().to_string(),
                            timestamp_ns: now_ns,
                            path: path_str,
                            action: action.to_string(),
                            is_directory: is_dir,
                            details: Some(format!("{:?}", event.kind)),
                        };
                        let _ = event_tx.try_send(record);
                    }
                }
            },
            Config::default(),
        )
        .map_err(|e| format!("Failed to create filesystem watcher: {}", e))?;

        watcher
            .watch(path.as_path(), RecursiveMode::Recursive)
            .map_err(|e| format!("Failed to watch filesystem path: {}", e))?;

        self._watcher = Some(watcher);
        self.current_path = Some(path);
        Ok(())
    }

    pub fn stop(&mut self) {
        self._watcher = None;
        self.current_path = None;
    }
}

impl Default for FilesystemCollector {
    fn default() -> Self {
        Self::new()
    }
}
