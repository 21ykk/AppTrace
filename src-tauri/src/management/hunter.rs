use crate::management::models::HunterResult;
use sysinfo::System;
use std::path::PathBuf;

pub fn hunt_software_resources(query: &str) -> Result<HunterResult, String> {
    let q = query.trim().to_lowercase();
    if q.is_empty() {
        return Ok(HunterResult {
            query: query.to_string(),
            installed_matches: Vec::new(),
            running_matches: Vec::new(),
            filesystem_matches: Vec::new(),
            registry_matches: Vec::new(),
            service_matches: Vec::new(),
            startup_matches: Vec::new(),
        });
    }

    // 1. Installed Applications
    let installed = crate::management::applications::get_installed_applications().unwrap_or_default();
    let installed_matches: Vec<_> = installed.into_iter().filter(|app| {
        app.name.to_lowercase().contains(&q)
            || app.publisher.as_ref().map(|p| p.to_lowercase().contains(&q)).unwrap_or(false)
            || app.install_location.as_ref().map(|l| l.to_lowercase().contains(&q)).unwrap_or(false)
    }).collect();

    // 2. Running Processes
    let mut sys = System::new();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
    let mut running_matches = Vec::new();
    for (pid, proc_) in sys.processes() {
        let name = proc_.name().to_string_lossy().to_lowercase();
        let exe = proc_.exe().map(|e| e.to_string_lossy().to_lowercase()).unwrap_or_default();
        if name.contains(&q) || exe.contains(&q) {
            running_matches.push(pid.as_u32());
        }
    }

    // 3. Filesystem Matches in common program roots
    let mut filesystem_matches = Vec::new();
    let mut search_dirs = Vec::new();

    #[cfg(target_os = "windows")]
    {
        if let Ok(pf) = std::env::var("ProgramFiles") {
            search_dirs.push(PathBuf::from(pf));
        }
        if let Ok(pf86) = std::env::var("ProgramFiles(x86)") {
            search_dirs.push(PathBuf::from(pf86));
        }
        if let Ok(local) = std::env::var("LOCALAPPDATA") {
            search_dirs.push(PathBuf::from(local));
        }
        if let Ok(roaming) = std::env::var("APPDATA") {
            search_dirs.push(PathBuf::from(roaming));
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        search_dirs.push(PathBuf::from("/usr/bin"));
        search_dirs.push(PathBuf::from("/opt"));
        if let Ok(home) = std::env::var("HOME") {
            search_dirs.push(PathBuf::from(home).join(".config"));
        }
    }

    for base in search_dirs {
        if base.exists() && base.is_dir() {
            if let Ok(entries) = std::fs::read_dir(&base) {
                for entry in entries.flatten() {
                    let name = entry.file_name().to_string_lossy().to_string();
                    if name.to_lowercase().contains(&q) {
                        filesystem_matches.push(entry.path().to_string_lossy().to_string());
                    }
                }
            }
        }
    }

    // 4. Registry Matches
    let mut registry_matches = Vec::new();
    #[cfg(target_os = "windows")]
    {
        if let Ok(reg_res) = crate::management::registry::search_registry(&q, Some("HKCU:\\Software")) {
            registry_matches.extend(reg_res);
        }
    }

    // 5. Service Matches
    let mut service_matches = Vec::new();
    if let Ok(services) = crate::management::services::get_system_services() {
        for s in services {
            if s.name.to_lowercase().contains(&q) || s.display_name.to_lowercase().contains(&q) {
                service_matches.push(format!("{} ({})", s.display_name, s.name));
            }
        }
    }

    // 6. Startup Matches
    let mut startup_matches = Vec::new();
    if let Ok(startups) = crate::management::startup::get_startup_entries() {
        for s in startups {
            if s.name.to_lowercase().contains(&q) || s.command.to_lowercase().contains(&q) {
                startup_matches.push(format!("{} [{}]", s.name, s.location));
            }
        }
    }

    Ok(HunterResult {
        query: query.to_string(),
        installed_matches,
        running_matches,
        filesystem_matches,
        registry_matches,
        service_matches,
        startup_matches,
    })
}
