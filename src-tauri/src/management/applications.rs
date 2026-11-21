use super::models::{AppDetails, AppRelationship, InstalledApp};
use std::collections::HashSet;
use std::path::Path;

pub struct ApplicationsManager;

impl ApplicationsManager {
    pub fn list_installed_apps() -> Vec<InstalledApp> {
        #[cfg(target_os = "windows")]
        {
            Self::list_windows_apps()
        }
        #[cfg(not(target_os = "windows"))]
        {
            Self::list_linux_apps()
        }
    }

    #[cfg(target_os = "windows")]
    fn list_windows_apps() -> Vec<InstalledApp> {
        use windows_sys::Win32::Foundation::ERROR_SUCCESS;
        use windows_sys::Win32::System::Registry::{
            HKEY, HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE, KEY_READ, KEY_WOW64_32KEY, KEY_WOW64_64KEY,
            RegCloseKey, RegEnumKeyExW, RegOpenKeyExW,
        };

        let mut apps = Vec::new();
        let mut seen_names = HashSet::new();

        let registry_roots = [
            (HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall", KEY_WOW64_64KEY, "Machine", "x86_64"),
            (HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall", KEY_WOW64_32KEY, "Machine", "x86"),
            (HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall", 0, "User", "x86_64"),
        ];

        for &(hroot, subkey_path, view_flags, scope, arch) in &registry_roots {
            let subkey_w: Vec<u16> = subkey_path.encode_utf16().chain(std::iter::once(0)).collect();
            let mut hkey: HKEY = std::ptr::null_mut();

            let res = unsafe {
                RegOpenKeyExW(
                    hroot,
                    subkey_w.as_ptr(),
                    0,
                    KEY_READ | view_flags,
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

                let enum_res = unsafe {
                    RegEnumKeyExW(
                        hkey,
                        index,
                        name_buf.as_mut_ptr(),
                        &mut name_len,
                        std::ptr::null_mut(),
                        std::ptr::null_mut(),
                        std::ptr::null_mut(),
                        std::ptr::null_mut(),
                    )
                };

                if enum_res != ERROR_SUCCESS {
                    break;
                }

                index += 1;
                let subkey_name = String::from_utf16_lossy(&name_buf[..name_len as usize]);

                // Open individual application subkey
                let mut app_hkey: HKEY = std::ptr::null_mut();
                let sub_app_w: Vec<u16> = subkey_name.encode_utf16().chain(std::iter::once(0)).collect();
                let app_res = unsafe {
                    RegOpenKeyExW(
                        hkey,
                        sub_app_w.as_ptr(),
                        0,
                        KEY_READ | view_flags,
                        &mut app_hkey,
                    )
                };

                if app_res == ERROR_SUCCESS {
                    if let Some(app) = Self::read_app_entry(app_hkey, &subkey_name, scope, arch) {
                        let dedupe_key = format!("{}-{}", app.name.to_lowercase(), app.version.as_deref().unwrap_or(""));
                        if !seen_names.contains(&dedupe_key) {
                            seen_names.insert(dedupe_key);
                            apps.push(app);
                        }
                    }
                    unsafe { RegCloseKey(app_hkey) };
                }
            }

            unsafe { RegCloseKey(hkey) };
        }

        // Sort alphabetically by application name
        apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
        apps
    }

    #[cfg(target_os = "windows")]
    fn read_app_entry(
        hkey: windows_sys::Win32::System::Registry::HKEY,
        key_id: &str,
        scope: &str,
        arch: &str,
    ) -> Option<InstalledApp> {
        let display_name = Self::query_reg_string(hkey, "DisplayName")?;
        if display_name.trim().is_empty() {
            return None;
        }

        // Filter system components, updates, and hotfixes
        if let Some(sys_comp) = Self::query_reg_dword(hkey, "SystemComponent") {
            if sys_comp == 1 {
                return None;
            }
        }
        if display_name.starts_with("KB") && display_name.chars().skip(2).take(6).all(|c| c.is_ascii_digit()) {
            return None;
        }

        let publisher = Self::query_reg_string(hkey, "Publisher");
        let version = Self::query_reg_string(hkey, "DisplayVersion");
        let install_date = Self::query_reg_string(hkey, "InstallDate");
        let install_location = Self::query_reg_string(hkey, "InstallLocation");
        let uninstall_string = Self::query_reg_string(hkey, "UninstallString");
        let quiet_uninstall_string = Self::query_reg_string(hkey, "QuietUninstallString");
        let icon_path = Self::query_reg_string(hkey, "DisplayIcon");

        let estimated_size = Self::query_reg_dword(hkey, "EstimatedSize").map(|kb| (kb as u64) * 1024);

        Some(InstalledApp {
            id: format!("win-{}-{}", scope.to_lowercase(), key_id),
            name: display_name,
            publisher,
            version,
            install_date,
            install_location,
            uninstall_string,
            quiet_uninstall_string,
            estimated_size_bytes: estimated_size,
            scope: scope.to_string(),
            source: "Registry".to_string(),
            architecture: arch.to_string(),
            icon_path,
            is_running: false,
            running_pids: vec![],
        })
    }

    #[cfg(target_os = "windows")]
    fn query_reg_string(
        hkey: windows_sys::Win32::System::Registry::HKEY,
        name: &str,
    ) -> Option<String> {
        use windows_sys::Win32::Foundation::ERROR_SUCCESS;
        use windows_sys::Win32::System::Registry::{REG_EXPAND_SZ, REG_SZ, RegQueryValueExW};

        let name_w: Vec<u16> = name.encode_utf16().chain(std::iter::once(0)).collect();
        let mut val_type: u32 = 0;
        let mut buf_size: u32 = 0;

        let res = unsafe {
            RegQueryValueExW(
                hkey,
                name_w.as_ptr(),
                std::ptr::null_mut(),
                &mut val_type,
                std::ptr::null_mut(),
                &mut buf_size,
            )
        };

        if res != ERROR_SUCCESS || (val_type != REG_SZ && val_type != REG_EXPAND_SZ) || buf_size == 0 {
            return None;
        }

        let mut buf = vec![0u16; (buf_size as usize / 2) + 1];
        let res = unsafe {
            RegQueryValueExW(
                hkey,
                name_w.as_ptr(),
                std::ptr::null_mut(),
                &mut val_type,
                buf.as_mut_ptr() as *mut u8,
                &mut buf_size,
            )
        };

        if res == ERROR_SUCCESS {
            let len = buf.iter().position(|&c| c == 0).unwrap_or(buf.len());
            let s = String::from_utf16_lossy(&buf[..len]);
            if !s.is_empty() {
                return Some(s);
            }
        }
        None
    }

    #[cfg(target_os = "windows")]
    fn query_reg_dword(
        hkey: windows_sys::Win32::System::Registry::HKEY,
        name: &str,
    ) -> Option<u32> {
        use windows_sys::Win32::Foundation::ERROR_SUCCESS;
        use windows_sys::Win32::System::Registry::{REG_DWORD, RegQueryValueExW};

        let name_w: Vec<u16> = name.encode_utf16().chain(std::iter::once(0)).collect();
        let mut val_type: u32 = 0;
        let mut val: u32 = 0;
        let mut val_size: u32 = std::mem::size_of::<u32>() as u32;

        let res = unsafe {
            RegQueryValueExW(
                hkey,
                name_w.as_ptr(),
                std::ptr::null_mut(),
                &mut val_type,
                &mut val as *mut u32 as *mut u8,
                &mut val_size,
            )
        };

        if res == ERROR_SUCCESS && val_type == REG_DWORD {
            Some(val)
        } else {
            None
        }
    }

    #[cfg(not(target_os = "windows"))]
    fn list_linux_apps() -> Vec<InstalledApp> {
        let mut apps = Vec::new();

        // 1. DPKG (Debian / Ubuntu)
        if let Ok(output) = std::process::Command::new("dpkg-query")
            .args(["-W", "-f=${Package}\t${Version}\t${Installed-Size}\t${Maintainer}\n"])
            .output()
        {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                for line in stdout.lines() {
                    let parts: Vec<&str> = line.split('\t').collect();
                    if parts.len() >= 2 {
                        let name = parts[0].trim().to_string();
                        let version = Some(parts[1].trim().to_string());
                        let size_bytes = parts.get(2).and_then(|s| s.parse::<u64>().ok()).map(|kb| kb * 1024);
                        let publisher = parts.get(3).map(|s| s.trim().to_string());

                        apps.push(InstalledApp {
                            id: format!("dpkg-{}", name),
                            name: name.clone(),
                            publisher,
                            version,
                            install_date: None,
                            install_location: Some(format!("/usr/share/{}", name)),
                            uninstall_string: Some(format!("apt remove -y {}", name)),
                            quiet_uninstall_string: Some(format!("apt remove -y -q {}", name)),
                            estimated_size_bytes: size_bytes,
                            scope: "Machine".to_string(),
                            source: "Package (APT)".to_string(),
                            architecture: "x86_64".to_string(),
                            icon_path: None,
                            is_running: false,
                            running_pids: vec![],
                        });
                    }
                }
            }
        }

        // 2. RPM (Fedora / RHEL / openSUSE)
        if apps.is_empty() {
            if let Ok(output) = std::process::Command::new("rpm")
                .args(["-qa", "--qf", "%{NAME}\t%{VERSION}\t%{SIZE}\t%{VENDOR}\n"])
                .output()
            {
                if output.status.success() {
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    for line in stdout.lines() {
                        let parts: Vec<&str> = line.split('\t').collect();
                        if parts.len() >= 2 {
                            let name = parts[0].trim().to_string();
                            let version = Some(parts[1].trim().to_string());
                            let size_bytes = parts.get(2).and_then(|s| s.parse::<u64>().ok());
                            let publisher = parts.get(3).map(|s| s.trim().to_string());

                            apps.push(InstalledApp {
                                id: format!("rpm-{}", name),
                                name: name.clone(),
                                publisher,
                                version,
                                install_date: None,
                                install_location: None,
                                uninstall_string: Some(format!("rpm -e {}", name)),
                                quiet_uninstall_string: Some(format!("rpm -e --nodeps {}", name)),
                                estimated_size_bytes: size_bytes,
                                scope: "Machine".to_string(),
                                source: "Package (RPM)".to_string(),
                                architecture: "x86_64".to_string(),
                                icon_path: None,
                                is_running: false,
                                running_pids: vec![],
                            });
                        }
                    }
                }
            }
        }

        // 3. Flatpak
        if let Ok(output) = std::process::Command::new("flatpak")
            .args(["list", "--app", "--columns=application,name,version,size,branch"])
            .output()
        {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                for line in stdout.lines() {
                    let parts: Vec<&str> = line.split('\t').collect();
                    if parts.len() >= 2 {
                        let app_id = parts[0].trim();
                        let name = parts[1].trim();
                        let version = parts.get(2).map(|s| s.trim().to_string());

                        apps.push(InstalledApp {
                            id: format!("flatpak-{}", app_id),
                            name: if name.is_empty() { app_id.to_string() } else { name.to_string() },
                            publisher: Some("Flatpak Hub".to_string()),
                            version,
                            install_date: None,
                            install_location: Some(format!("/var/lib/flatpak/app/{}", app_id)),
                            uninstall_string: Some(format!("flatpak uninstall -y {}", app_id)),
                            quiet_uninstall_string: Some(format!("flatpak uninstall -y --noninteractive {}", app_id)),
                            estimated_size_bytes: None,
                            scope: "User".to_string(),
                            source: "Flatpak".to_string(),
                            architecture: "x86_64".to_string(),
                            icon_path: None,
                            is_running: false,
                            running_pids: vec![],
                        });
                    }
                }
            }
        }

        apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
        apps
    }

    pub fn get_app_details(app_id: &str) -> Option<AppDetails> {
        let apps = Self::list_installed_apps();
        let app = apps.into_iter().find(|a| a.id == app_id)?;

        let mut relationships = Vec::new();
        let mut related_processes = Vec::new();
        let related_services = Vec::new();
        let related_startup_entries = Vec::new();
        let mut related_directories = Vec::new();
        let mut related_registry_keys = Vec::new();

        // 1. Identify related directories
        if let Some(ref loc) = app.install_location {
            if Path::new(loc).exists() {
                related_directories.push(loc.clone());
                relationships.push(AppRelationship {
                    resource_type: "File".to_string(),
                    identifier: loc.clone(),
                    details: "Primary installation directory".to_string(),
                    confidence: "Confirmed".to_string(),
                });
            }
        }

        // Check AppData / ProgramData for Windows
        #[cfg(target_os = "windows")]
        {
            let _clean_name = app.name.replace(' ', "");
            if let Ok(appdata) = std::env::var("APPDATA") {
                let p = Path::new(&appdata).join(&app.name);
                if p.exists() {
                    let s = p.display().to_string();
                    related_directories.push(s.clone());
                    relationships.push(AppRelationship {
                        resource_type: "File".to_string(),
                        identifier: s,
                        details: "User Roaming AppData configuration folder".to_string(),
                        confidence: "High".to_string(),
                    });
                }
            }
            if let Ok(local_appdata) = std::env::var("LOCALAPPDATA") {
                let p = Path::new(&local_appdata).join(&app.name);
                if p.exists() {
                    let s = p.display().to_string();
                    related_directories.push(s.clone());
                    relationships.push(AppRelationship {
                        resource_type: "File".to_string(),
                        identifier: s,
                        details: "User Local AppData cache and state storage".to_string(),
                        confidence: "High".to_string(),
                    });
                }
            }
            if let Ok(progdata) = std::env::var("ProgramData") {
                let p = Path::new(&progdata).join(&app.name);
                if p.exists() {
                    let s = p.display().to_string();
                    related_directories.push(s.clone());
                    relationships.push(AppRelationship {
                        resource_type: "File".to_string(),
                        identifier: s,
                        details: "System-wide ProgramData shared assets".to_string(),
                        confidence: "High".to_string(),
                    });
                }
            }

            // Related registry keys
            if let Some(ref publ) = app.publisher {
                related_registry_keys.push(format!(r"HKEY_CURRENT_USER\Software\{}", publ));
                related_registry_keys.push(format!(r"HKEY_LOCAL_MACHINE\Software\{}", publ));
                relationships.push(AppRelationship {
                    resource_type: "Registry".to_string(),
                    identifier: format!(r"HKCU\Software\{}", publ),
                    details: "Publisher registry configuration tree".to_string(),
                    confidence: "Probable".to_string(),
                });
            }
            related_registry_keys.push(format!(r"HKEY_CURRENT_USER\Software\{}", app.name));
            related_registry_keys.push(format!(r"HKEY_LOCAL_MACHINE\Software\{}", app.name));
        }

        // 2. Identify running processes by executable match
        let mut sys = sysinfo::System::new();
        sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

        let app_tokens: Vec<String> = app.name.to_lowercase()
            .split_whitespace()
            .map(|s| s.to_string())
            .collect();

        for (pid, proc) in sys.processes() {
            let proc_name = proc.name().to_string_lossy().to_lowercase();
            let proc_exe = proc.exe().map(|p| p.to_string_lossy().to_lowercase()).unwrap_or_default();

            let mut matched = false;
            if let Some(ref loc) = app.install_location {
                if !loc.is_empty() && proc_exe.starts_with(&loc.to_lowercase()) {
                    matched = true;
                }
            }
            if !matched && !app_tokens.is_empty() && app_tokens.iter().any(|t| t.len() >= 4 && proc_name.contains(t)) {
                matched = true;
            }

            if matched {
                let pid_u32 = pid.as_u32();
                related_processes.push(pid_u32);
                relationships.push(AppRelationship {
                    resource_type: "Process".to_string(),
                    identifier: format!("PID {} ({})", pid_u32, proc.name().to_string_lossy()),
                    details: format!("Active running executable: {}", proc.exe().map(|e| e.display().to_string()).unwrap_or_default()),
                    confidence: "Confirmed".to_string(),
                });
            }
        }

        Some(AppDetails {
            app,
            relationships,
            related_processes,
            related_services,
            related_startup_entries,
            related_directories,
            related_registry_keys,
        })
    }
}

pub fn get_installed_applications() -> Result<Vec<InstalledApp>, String> {
    Ok(ApplicationsManager::list_installed_apps())
}

pub fn get_app_details(app_id: &str) -> Result<AppDetails, String> {
    ApplicationsManager::get_app_details(app_id).ok_or_else(|| format!("Application not found: {}", app_id))
}


