use super::models::StartupEntry;
use std::path::Path;

pub struct StartupManager;

impl StartupManager {
    pub fn list_entries() -> Vec<StartupEntry> {
        #[cfg(target_os = "windows")]
        {
            Self::list_windows_startup()
        }
        #[cfg(not(target_os = "windows"))]
        {
            Self::list_linux_startup()
        }
    }

    #[cfg(target_os = "windows")]
    fn list_windows_startup() -> Vec<StartupEntry> {
        use windows_sys::Win32::Foundation::ERROR_SUCCESS;
        use windows_sys::Win32::System::Registry::{
            HKEY, HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE, KEY_READ,
            RegCloseKey, RegEnumValueW, RegOpenKeyExW,
        };

        let mut entries = Vec::new();

        let roots = [
            (HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Run", "Registry_HKCU"),
            (HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Run", "Registry_HKLM"),
        ];

        for &(hroot, subkey_path, loc_name) in &roots {
            let subkey_w: Vec<u16> = subkey_path.encode_utf16().chain(std::iter::once(0)).collect();
            let mut hkey: HKEY = std::ptr::null_mut();

            let res = unsafe {
                RegOpenKeyExW(
                    hroot,
                    subkey_w.as_ptr(),
                    0,
                    KEY_READ,
                    &mut hkey,
                )
            };

            if res != ERROR_SUCCESS {
                continue;
            }

            let mut index = 0;
            loop {
                let mut name_buf = [0u16; 256];
                let mut name_len = name_buf.len() as u32;
                let mut val_type = 0u32;
                let mut data_buf = [0u8; 1024];
                let mut data_len = data_buf.len() as u32;

                let enum_res = unsafe {
                    RegEnumValueW(
                        hkey,
                        index,
                        name_buf.as_mut_ptr(),
                        &mut name_len,
                        std::ptr::null_mut(),
                        &mut val_type,
                        data_buf.as_mut_ptr(),
                        &mut data_len,
                    )
                };

                if enum_res != ERROR_SUCCESS {
                    break;
                }

                index += 1;
                let name = String::from_utf16_lossy(&name_buf[..name_len as usize]);
                let data_u16 = unsafe {
                    std::slice::from_raw_parts(
                        data_buf.as_ptr() as *const u16,
                        (data_len as usize) / 2,
                    )
                };
                let raw_val = String::from_utf16_lossy(data_u16);
                let command = raw_val.trim_matches('\0').trim().to_string();

                let is_disabled = name.starts_with("AppTrace_Disabled_");
                let display_name = if is_disabled {
                    name.trim_start_matches("AppTrace_Disabled_").to_string()
                } else {
                    name.clone()
                };

                let exe_path = command.split(".exe").next().map(|s| format!("{}.exe", s.trim_matches('"')));

                entries.push(StartupEntry {
                    id: format!("{}-{}", loc_name, name),
                    name: display_name,
                    command,
                    location: loc_name.to_string(),
                    enabled: !is_disabled,
                    publisher: None,
                    exe_path,
                    arguments: None,
                    impact: "Medium".to_string(),
                });
            }

            unsafe { RegCloseKey(hkey) };
        }

        // Check user startup folder
        if let Ok(appdata) = std::env::var("APPDATA") {
            let startup_dir = Path::new(&appdata).join(r"Microsoft\Windows\Start Menu\Programs\Startup");
            if let Ok(dir_entries) = std::fs::read_dir(startup_dir) {
                for entry in dir_entries.flatten() {
                    let path = entry.path();
                    if path.is_file() {
                        let name = path.file_stem().unwrap_or_default().to_string_lossy().to_string();
                        let ext = path.extension().unwrap_or_default().to_string_lossy().to_lowercase();
                        if ext == "lnk" || ext == "bat" || ext == "cmd" || ext == "exe" {
                            entries.push(StartupEntry {
                                id: format!("Startup_Folder-{}", name),
                                name: name.clone(),
                                command: path.display().to_string(),
                                location: "Startup_Folder".to_string(),
                                enabled: true,
                                publisher: None,
                                exe_path: Some(path.display().to_string()),
                                arguments: None,
                                impact: "Medium".to_string(),
                            });
                        }
                    }
                }
            }
        }

        entries
    }

    #[cfg(not(target_os = "windows"))]
    fn list_linux_startup() -> Vec<StartupEntry> {
        let mut entries = Vec::new();
        let mut search_paths = Vec::new();

        if let Some(home) = dirs::home_dir() {
            search_paths.push((home.join(".config/autostart"), "XDG_Autostart"));
        }
        search_paths.push((std::path::PathBuf::from("/etc/xdg/autostart"), "XDG_Autostart_System"));

        for (dir, loc) in search_paths {
            if let Ok(files) = std::fs::read_dir(dir) {
                for file in files.flatten() {
                    let path = file.path();
                    if path.extension().map(|e| e == "desktop").unwrap_or(false) {
                        if let Ok(content) = std::fs::read_to_string(&path) {
                            let mut name = path.file_stem().unwrap_or_default().to_string_lossy().to_string();
                            let mut exec = String::new();
                            let mut hidden = false;

                            for line in content.lines() {
                                if line.starts_with("Name=") {
                                    name = line.trim_start_matches("Name=").trim().to_string();
                                } else if line.starts_with("Exec=") {
                                    exec = line.trim_start_matches("Exec=").trim().to_string();
                                } else if line.starts_with("Hidden=true") || line.starts_with("X-GNOME-Autostart-enabled=false") {
                                    hidden = true;
                                }
                            }

                            if !exec.is_empty() {
                                entries.push(StartupEntry {
                                    id: format!("{}-{}", loc, name),
                                    name,
                                    command: exec,
                                    location: loc.to_string(),
                                    enabled: !hidden,
                                    publisher: None,
                                    exe_path: None,
                                    arguments: None,
                                    impact: "Low".to_string(),
                                });
                            }
                        }
                    }
                }
            }
        }

        entries
    }

    pub fn set_enabled(entry_id: &str, enable: bool) -> Result<(), String> {
        #[cfg(target_os = "windows")]
        {
            use windows_sys::Win32::Foundation::ERROR_SUCCESS;
            use windows_sys::Win32::System::Registry::{
                HKEY, HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE, KEY_READ, KEY_WRITE,
                REG_SZ, RegCloseKey, RegDeleteValueW, RegOpenKeyExW, RegQueryValueExW, RegSetValueExW,
            };

            let parts: Vec<&str> = entry_id.splitn(2, '-').collect();
            if parts.len() < 2 {
                return Err("Invalid startup entry identifier".to_string());
            }

            let loc = parts[0];
            let name = parts[1];

            let hroot = match loc {
                "Registry_HKCU" => HKEY_CURRENT_USER,
                "Registry_HKLM" => HKEY_LOCAL_MACHINE,
                _ => return Err(format!("Modification not supported for location: {}", loc)),
            };

            let subkey_path = r"SOFTWARE\Microsoft\Windows\CurrentVersion\Run";
            let subkey_w: Vec<u16> = subkey_path.encode_utf16().chain(std::iter::once(0)).collect();
            let mut hkey: HKEY = std::ptr::null_mut();

            let res = unsafe {
                RegOpenKeyExW(
                    hroot,
                    subkey_w.as_ptr(),
                    0,
                    KEY_READ | KEY_WRITE,
                    &mut hkey,
                )
            };

            if res != ERROR_SUCCESS {
                return Err("Failed to open registry Run key with write access (elevation may be required)".to_string());
            }

            // Read existing value
            let name_w: Vec<u16> = name.encode_utf16().chain(std::iter::once(0)).collect();
            let mut val_type = 0u32;
            let mut data_buf = [0u8; 1024];
            let mut data_len = data_buf.len() as u32;

            let query_res = unsafe {
                RegQueryValueExW(
                    hkey,
                    name_w.as_ptr(),
                    std::ptr::null_mut(),
                    &mut val_type,
                    data_buf.as_mut_ptr(),
                    &mut data_len,
                )
            };

            if query_res != ERROR_SUCCESS {
                unsafe { RegCloseKey(hkey) };
                return Err(format!("Startup value '{}' not found in registry", name));
            }

            let target_name = if enable {
                name.trim_start_matches("AppTrace_Disabled_").to_string()
            } else {
                format!("AppTrace_Disabled_{}", name)
            };

            let target_name_w: Vec<u16> = target_name.encode_utf16().chain(std::iter::once(0)).collect();

            // Set new value and delete old value if name changed
            unsafe {
                RegSetValueExW(
                    hkey,
                    target_name_w.as_ptr(),
                    0,
                    REG_SZ,
                    data_buf.as_ptr(),
                    data_len,
                );
                if target_name != name {
                    RegDeleteValueW(hkey, name_w.as_ptr());
                }
                RegCloseKey(hkey);
            }

            Ok(())
        }

        #[cfg(not(target_os = "windows"))]
        {
            // Linux desktop file toggle
            Ok(())
        }
    }
}

pub fn get_startup_entries() -> Result<Vec<StartupEntry>, String> {
    Ok(StartupManager::list_entries())
}

pub fn set_startup_entry_enabled(entry_id: &str, enabled: bool) -> Result<(), String> {
    StartupManager::set_enabled(entry_id, enabled)
}


