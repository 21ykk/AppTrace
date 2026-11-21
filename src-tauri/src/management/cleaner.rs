use crate::management::models::{CleanableCategory, CleanableItem};
use std::path::{Path, PathBuf};

pub fn scan_cleanable_categories() -> Result<Vec<CleanableCategory>, String> {
    let mut categories = Vec::new();

    // 1. System Temp
    let mut temp_paths = Vec::new();
    let user_temp = std::env::temp_dir();
    if user_temp.exists() {
        temp_paths.push(user_temp);
    }
    #[cfg(target_os = "windows")]
    {
        let win_temp = PathBuf::from(r"C:\Windows\Temp");
        if win_temp.exists() {
            temp_paths.push(win_temp);
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        let var_tmp = PathBuf::from("/var/tmp");
        if var_tmp.exists() {
            temp_paths.push(var_tmp);
        }
    }

    let temp_cat = scan_directory_group(
        "system_temp",
        "System & User Temp Files",
        "Temporary files left behind by applications and system processes.",
        &temp_paths,
        true,
    );
    categories.push(temp_cat);

    // 2. Crash Dumps & Error Reports
    let mut dump_paths = Vec::new();
    #[cfg(target_os = "windows")]
    {
        if let Ok(local_appdata) = std::env::var("LOCALAPPDATA") {
            let crash_dumps = PathBuf::from(&local_appdata).join("CrashDumps");
            if crash_dumps.exists() {
                dump_paths.push(crash_dumps);
            }
        }
        let minidump = PathBuf::from(r"C:\Windows\Minidump");
        if minidump.exists() {
            dump_paths.push(minidump);
        }
        let wer = PathBuf::from(r"C:\ProgramData\Microsoft\Windows\WER");
        if wer.exists() {
            dump_paths.push(wer);
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        let coredumps = PathBuf::from("/var/lib/systemd/coredump");
        if coredumps.exists() {
            dump_paths.push(coredumps);
        }
    }

    let dumps_cat = scan_directory_group(
        "crash_dumps",
        "Crash Dumps & Error Reports",
        "Memory crash dumps (.dmp) and Windows Error Reporting diagnostic logs.",
        &dump_paths,
        true,
    );
    categories.push(dumps_cat);

    // 3. Browser Caches
    let mut browser_paths = Vec::new();
    #[cfg(target_os = "windows")]
    {
        if let Ok(local_appdata) = std::env::var("LOCALAPPDATA") {
            let p = PathBuf::from(&local_appdata);
            let chrome = p.join(r"Google\Chrome\User Data\Default\Cache");
            if chrome.exists() {
                browser_paths.push(chrome);
            }
            let edge = p.join(r"Microsoft\Edge\User Data\Default\Cache");
            if edge.exists() {
                browser_paths.push(edge);
            }
            let brave = p.join(r"BraveSoftware\Brave-Browser\User Data\Default\Cache");
            if brave.exists() {
                browser_paths.push(brave);
            }
            let mozilla = p.join(r"Mozilla\Firefox\Profiles");
            if mozilla.exists() {
                if let Ok(entries) = std::fs::read_dir(&mozilla) {
                    for entry in entries.flatten() {
                        let cache2 = entry.path().join("cache2");
                        if cache2.exists() {
                            browser_paths.push(cache2);
                        }
                    }
                }
            }
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        if let Ok(home) = std::env::var("HOME") {
            let h = PathBuf::from(home);
            let chrome = h.join(".cache/google-chrome");
            if chrome.exists() {
                browser_paths.push(chrome);
            }
            let mozilla = h.join(".cache/mozilla/firefox");
            if mozilla.exists() {
                browser_paths.push(mozilla);
            }
        }
    }

    let browser_cat = scan_directory_group(
        "browser_cache",
        "Web Browser Caches",
        "Cached images, scripts, and temporary web pages from Chrome, Edge, Brave, and Firefox.",
        &browser_paths,
        true,
    );
    categories.push(browser_cat);

    // 4. System Logs & Cache
    let mut log_paths = Vec::new();
    #[cfg(target_os = "windows")]
    {
        let cbs = PathBuf::from(r"C:\Windows\Logs\CBS");
        if cbs.exists() {
            log_paths.push(cbs);
        }
        let dism = PathBuf::from(r"C:\Windows\Logs\DISM");
        if dism.exists() {
            log_paths.push(dism);
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        let logs = PathBuf::from("/var/log");
        if logs.exists() {
            log_paths.push(logs);
        }
    }

    let logs_cat = scan_directory_group(
        "system_logs",
        "System Log Files",
        "Historical system diagnostic logs and package manager logs.",
        &log_paths,
        false,
    );
    categories.push(logs_cat);

    Ok(categories)
}

fn scan_directory_group(
    id: &str,
    title: &str,
    description: &str,
    paths: &[PathBuf],
    is_safe: bool,
) -> CleanableCategory {
    let mut total_bytes = 0u64;
    let mut file_count = 0usize;
    let mut items = Vec::new();

    for dir in paths {
        scan_folder_recursive(dir, &mut total_bytes, &mut file_count, &mut items);
    }

    CleanableCategory {
        id: id.to_string(),
        title: title.to_string(),
        description: description.to_string(),
        detected_bytes: total_bytes,
        file_count,
        items,
        is_safe_by_default: is_safe,
    }
}

fn scan_folder_recursive(
    dir: &Path,
    total_bytes: &mut u64,
    file_count: &mut usize,
    sample_items: &mut Vec<CleanableItem>,
) {
    if !dir.exists() || !dir.is_dir() {
        return;
    }

    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let p = entry.path();
        if let Ok(meta) = entry.metadata() {
            if meta.is_file() {
                let size = meta.len();
                *total_bytes += size;
                *file_count += 1;

                if sample_items.len() < 25 {
                    sample_items.push(CleanableItem {
                        path: p.to_string_lossy().to_string(),
                        size_bytes: size,
                        description: p.file_name().unwrap_or_default().to_string_lossy().to_string(),
                    });
                }
            } else if meta.is_dir() {
                // Avoid recursing indefinitely or traversing symlinks
                if let Ok(ft) = entry.file_type() {
                    if !ft.is_symlink() {
                        scan_folder_recursive(&p, total_bytes, file_count, sample_items);
                    }
                }
            }
        }
    }
}

pub fn execute_cleaning(category_ids: Vec<String>) -> Result<(u64, usize), String> {
    let mut total_reclaimed = 0u64;
    let mut files_deleted = 0usize;

    for cat_id in category_ids {
        let paths = match cat_id.as_str() {
            "system_temp" => {
                let mut v = vec![std::env::temp_dir()];
                #[cfg(target_os = "windows")]
                {
                    v.push(PathBuf::from(r"C:\Windows\Temp"));
                }
                v
            }
            "crash_dumps" => {
                let mut v = Vec::new();
                #[cfg(target_os = "windows")]
                {
                    if let Ok(l) = std::env::var("LOCALAPPDATA") {
                        v.push(PathBuf::from(l).join("CrashDumps"));
                    }
                    v.push(PathBuf::from(r"C:\Windows\Minidump"));
                }
                v
            }
            "browser_cache" => {
                let mut v = Vec::new();
                #[cfg(target_os = "windows")]
                {
                    if let Ok(l) = std::env::var("LOCALAPPDATA") {
                        let p = PathBuf::from(l);
                        v.push(p.join(r"Google\Chrome\User Data\Default\Cache"));
                        v.push(p.join(r"Microsoft\Edge\User Data\Default\Cache"));
                        v.push(p.join(r"BraveSoftware\Brave-Browser\User Data\Default\Cache"));
                    }
                }
                v
            }
            "system_logs" => {
                let mut v = Vec::new();
                #[cfg(target_os = "windows")]
                {
                    v.push(PathBuf::from(r"C:\Windows\Logs\CBS"));
                }
                v
            }
            _ => Vec::new(),
        };

        for base_dir in paths {
            if base_dir.exists() && base_dir.is_dir() {
                // Clean contents of base_dir, not base_dir itself!
                if let Ok(entries) = std::fs::read_dir(&base_dir) {
                    for entry in entries.flatten() {
                        let path = entry.path();
                        if let Ok(meta) = entry.metadata() {
                            let size = if meta.is_file() {
                                meta.len()
                            } else {
                                0
                            };
                            if meta.is_file() {
                                if std::fs::remove_file(&path).is_ok() {
                                    total_reclaimed += size;
                                    files_deleted += 1;
                                }
                            } else if meta.is_dir() {
                                let dir_sz = get_dir_size_recursive(&path);
                                if std::fs::remove_dir_all(&path).is_ok() {
                                    total_reclaimed += dir_sz;
                                    files_deleted += 1;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Ok((total_reclaimed, files_deleted))
}

fn get_dir_size_recursive(path: &Path) -> u64 {
    let mut total = 0;
    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.flatten() {
            if let Ok(m) = entry.metadata() {
                if m.is_file() {
                    total += m.len();
                } else if m.is_dir() {
                    total += get_dir_size_recursive(&entry.path());
                }
            }
        }
    }
    total
}
