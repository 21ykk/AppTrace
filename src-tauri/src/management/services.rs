use super::models::ServiceInfo;
use std::process::Command;

pub struct ServicesManager;

impl ServicesManager {
    pub fn list_services() -> Vec<ServiceInfo> {
        #[cfg(target_os = "windows")]
        {
            Self::list_windows_services()
        }
        #[cfg(not(target_os = "windows"))]
        {
            Self::list_linux_services()
        }
    }

    #[cfg(target_os = "windows")]
    fn list_windows_services() -> Vec<ServiceInfo> {
        // Query services via powershell Get-CimInstance or sc.exe for comprehensive metadata
        let mut services = Vec::new();

        let output = Command::new("powershell")
            .args([
                "-NoProfile",
                "-Command",
                "Get-Service | Select-Object -First 200 Name, DisplayName, Status, StartType | ConvertTo-Json -Compress",
            ])
            .output();

        if let Ok(out) = output {
            if out.status.success() {
                let stdout = String::from_utf8_lossy(&out.stdout);
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&stdout) {
                    let items = if let Some(arr) = val.as_array() {
                        arr.clone()
                    } else if val.is_object() {
                        vec![val]
                    } else {
                        vec![]
                    };

                    for it in items {
                        let name = it.get("Name").and_then(|v| v.as_str()).unwrap_or_default().to_string();
                        let display_name = it.get("DisplayName").and_then(|v| v.as_str()).unwrap_or(&name).to_string();
                        let status_code = it.get("Status").and_then(|v| v.as_i64()).unwrap_or(1);
                        let start_type_code = it.get("StartType").and_then(|v| v.as_i64()).unwrap_or(2);

                        let status = match status_code {
                            4 => "Running",
                            1 => "Stopped",
                            7 => "Paused",
                            _ => "Unknown",
                        };

                        let startup_type = match start_type_code {
                            2 => "Automatic",
                            3 => "Manual",
                            4 => "Disabled",
                            _ => "Unknown",
                        };

                        let critical_services = [
                            "rpcss", "dcomlaunch", "lsm", "samss", "plugplay", "cryptsvc",
                            "eventlog", "lsass", "csrss", "winlogon", "gpsvc", "brokerinfrastructure",
                            "lanmanworkstation", "lanmanserver", "systemd-journald", "systemd-logind", "dbus"
                        ];
                        let is_critical = critical_services.contains(&name.to_lowercase().as_str());

                        services.push(ServiceInfo {
                            name,
                            display_name,
                            status: status.to_string(),
                            startup_type: startup_type.to_string(),
                            bin_path: None,
                            account: None,
                            can_control: !is_critical,
                        });
                    }
                }
            }
        }

        services
    }

    #[cfg(not(target_os = "windows"))]
    fn list_linux_services() -> Vec<ServiceInfo> {
        let mut services = Vec::new();

        if let Ok(out) = Command::new("systemctl")
            .args(["list-units", "--type=service", "--all", "--no-pager", "--no-legend"])
            .output()
        {
            if out.status.success() {
                let stdout = String::from_utf8_lossy(&out.stdout);
                for line in stdout.lines() {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() >= 4 {
                        let unit_name = parts[0].trim_end_matches(".service").to_string();
                        let active_state = parts[2];
                        let status = if active_state == "active" { "Running" } else { "Stopped" };

                        let desc = parts[4..].join(" ");
                        let display_name = if desc.is_empty() { unit_name.clone() } else { desc };

                        services.push(ServiceInfo {
                            name: unit_name,
                            display_name,
                            status: status.to_string(),
                            startup_type: "Automatic".to_string(),
                            bin_path: None,
                            account: None,
                            can_control: true,
                        });
                    }
                }
            }
        }

        services
    }

    pub fn start_service(name: &str) -> Result<(), String> {
        #[cfg(target_os = "windows")]
        {
            let out = Command::new("net")
                .args(["start", name])
                .output()
                .map_err(|e| e.to_string())?;
            if out.status.success() {
                Ok(())
            } else {
                Err(String::from_utf8_lossy(&out.stderr).to_string())
            }
        }
        #[cfg(not(target_os = "windows"))]
        {
            let out = Command::new("systemctl")
                .args(["start", name])
                .output()
                .map_err(|e| e.to_string())?;
            if out.status.success() {
                Ok(())
            } else {
                Err(String::from_utf8_lossy(&out.stderr).to_string())
            }
        }
    }

    pub fn stop_service(name: &str) -> Result<(), String> {
        let critical = [
            "rpcss", "dcomlaunch", "lsm", "samss", "plugplay", "cryptsvc",
            "eventlog", "lsass", "csrss", "winlogon", "gpsvc", "brokerinfrastructure",
            "lanmanworkstation", "lanmanserver", "systemd-journald", "systemd-logind", "dbus"
        ];
        if critical.contains(&name.to_lowercase().as_str()) {
            return Err(format!("Operation blocked: '{}' is a critical operating system service", name));
        }

        #[cfg(target_os = "windows")]
        {
            let out = Command::new("net")
                .args(["stop", name, "/y"])
                .output()
                .map_err(|e| e.to_string())?;
            if out.status.success() {
                Ok(())
            } else {
                Err(String::from_utf8_lossy(&out.stderr).to_string())
            }
        }
        #[cfg(not(target_os = "windows"))]
        {
            let out = Command::new("systemctl")
                .args(["stop", name])
                .output()
                .map_err(|e| e.to_string())?;
            if out.status.success() {
                Ok(())
            } else {
                Err(String::from_utf8_lossy(&out.stderr).to_string())
            }
        }
    }
}

pub fn get_system_services() -> Result<Vec<ServiceInfo>, String> {
    Ok(ServicesManager::list_services())
}

pub fn start_system_service(service_name: &str) -> Result<(), String> {
    ServicesManager::start_service(service_name)
}

pub fn stop_system_service(service_name: &str) -> Result<(), String> {
    ServicesManager::stop_service(service_name)
}


