use super::applications::ApplicationsManager;
use super::models::{LeftoverItem, UninstallPlan};
use std::path::Path;
use std::process::Command;

pub struct UninstallerEngine;

impl UninstallerEngine {
    pub fn create_plan(app_id: &str) -> Result<UninstallPlan, String> {
        let details = ApplicationsManager::get_app_details(app_id)
            .ok_or_else(|| format!("Application not found: {}", app_id))?;

        let mut warnings = Vec::new();
        let mut safety_level = "Safe".to_string();

        let app_name = &details.app.name;

        // Check if application is critical or system-protected
        let protected_names = ["windows", "system", "microsoft edge webview2", "directx", "vcredist", "c++ redistributable"];
        if protected_names.iter().any(|p| app_name.to_lowercase().contains(p)) {
            warnings.push("This component appears to be an essential operating system runtime or system dependency.".to_string());
            safety_level = "Warning".to_string();
        }

        if !details.related_processes.is_empty() {
            warnings.push(format!(
                "Application has {} active running process(es). They will need to be closed before proceeding.",
                details.related_processes.len()
            ));
        }

        let cmd = details.app.uninstall_string.clone();
        let is_quiet = details.app.quiet_uninstall_string.is_some();

        let potential_leftovers = Self::scan_leftovers(&details.app.name, details.app.install_location.as_deref());

        Ok(UninstallPlan {
            app_id: app_id.to_string(),
            app_name: app_name.clone(),
            uninstall_command: cmd,
            is_quiet_supported: is_quiet,
            processes_to_kill: details.related_processes,
            potential_leftovers,
            safety_level,
            warnings,
        })
    }

    pub fn scan_leftovers(app_name: &str, install_loc: Option<&str>) -> Vec<LeftoverItem> {
        let mut items = Vec::new();
        let clean_name = app_name.trim();
        if clean_name.is_empty() {
            return items;
        }

        // 1. Primary Install Location
        if let Some(loc) = install_loc {
            let p = Path::new(loc);
            if p.exists() && Self::is_safe_directory(p) {
                let size = Self::calculate_dir_size(p);
                items.push(LeftoverItem {
                    id: format!("dir-install-{}", items.len()),
                    item_type: "Directory".to_string(),
                    path: loc.to_string(),
                    size_bytes: Some(size),
                    confidence: "Verified".to_string(),
                    is_shared: false,
                    is_safe_to_delete: true,
                    selected: true,
                });
            }
        }

        // 2. Windows-specific user data locations
        #[cfg(target_os = "windows")]
        {
            let env_dirs = ["APPDATA", "LOCALAPPDATA", "ProgramData"];
            for var in env_dirs {
                if let Ok(dir_str) = std::env::var(var) {
                    let base = Path::new(&dir_str);
                    let candidate = base.join(clean_name);
                    if candidate.exists() && Self::is_safe_directory(&candidate) {
                        let size = Self::calculate_dir_size(&candidate);
                        items.push(LeftoverItem {
                            id: format!("dir-{}-{}", var, items.len()),
                            item_type: "Directory".to_string(),
                            path: candidate.display().to_string(),
                            size_bytes: Some(size),
                            confidence: "Likely".to_string(),
                            is_shared: false,
                            is_safe_to_delete: true,
                            selected: true,
                        });
                    }
                }
            }

            // Registry keys
            items.push(LeftoverItem {
                id: format!("reg-hkcu-{}", items.len()),
                item_type: "RegistryKey".to_string(),
                path: format!(r"HKEY_CURRENT_USER\Software\{}", clean_name),
                size_bytes: None,
                confidence: "Likely".to_string(),
                is_shared: false,
                is_safe_to_delete: true,
                selected: true,
            });
            items.push(LeftoverItem {
                id: format!("reg-hklm-{}", items.len()),
                item_type: "RegistryKey".to_string(),
                path: format!(r"HKEY_LOCAL_MACHINE\Software\{}", clean_name),
                size_bytes: None,
                confidence: "Likely".to_string(),
                is_shared: false,
                is_safe_to_delete: true,
                selected: true,
            });
        }

        // 3. Linux-specific user configuration locations
        #[cfg(not(target_os = "windows"))]
        {
            if let Some(home) = dirs::home_dir() {
                let config_dir = home.join(".config").join(clean_name.to_lowercase());
                if config_dir.exists() && Self::is_safe_directory(&config_dir) {
                    let size = Self::calculate_dir_size(&config_dir);
                    items.push(LeftoverItem {
                        id: format!("dir-cfg-{}", items.len()),
                        item_type: "Directory".to_string(),
                        path: config_dir.display().to_string(),
                        size_bytes: Some(size),
                        confidence: "Likely".to_string(),
                        is_shared: false,
                        is_safe_to_delete: true,
                        selected: true,
                    });
                }
                let cache_dir = home.join(".cache").join(clean_name.to_lowercase());
                if cache_dir.exists() && Self::is_safe_directory(&cache_dir) {
                    let size = Self::calculate_dir_size(&cache_dir);
                    items.push(LeftoverItem {
                        id: format!("dir-cache-{}", items.len()),
                        item_type: "Directory".to_string(),
                        path: cache_dir.display().to_string(),
                        size_bytes: Some(size),
                        confidence: "Likely".to_string(),
                        is_shared: false,
                        is_safe_to_delete: true,
                        selected: true,
                    });
                }
            }
        }

        items
    }

    pub fn execute_uninstaller(cmd_string: &str) -> Result<u32, String> {
        let trimmed = cmd_string.trim();
        if trimmed.is_empty() {
            return Err("Uninstall command string is empty".to_string());
        }

        // Parse program and arguments safely
        let (prog, args) = Self::parse_command_line(trimmed)?;

        #[cfg(target_os = "windows")]
        {
            let mut cmd = Command::new(&prog);
            cmd.args(&args);
            let child = cmd.spawn().map_err(|e| format!("Failed to spawn uninstaller '{}': {}", prog, e))?;
            Ok(child.id())
        }

        #[cfg(not(target_os = "windows"))]
        {
            let mut cmd = Command::new(&prog);
            cmd.args(&args);
            let child = cmd.spawn().map_err(|e| format!("Failed to run command '{}': {}", prog, e))?;
            Ok(child.id())
        }
    }

    pub fn delete_leftover_item(item: &LeftoverItem) -> Result<(), String> {
        if !item.is_safe_to_delete {
            return Err(format!("Item {} is marked system-protected and cannot be deleted", item.path));
        }

        match item.item_type.as_str() {
            "Directory" => {
                let p = Path::new(&item.path);
                if p.exists() {
                    if !Self::is_safe_directory(p) {
                        return Err(format!("Safety violation: path {} is a protected system directory", item.path));
                    }
                    std::fs::remove_dir_all(p)
                        .map_err(|e| format!("Failed to delete directory {}: {}", item.path, e))?;
                }
                Ok(())
            }
            "File" => {
                let p = Path::new(&item.path);
                if p.exists() {
                    if !Self::is_safe_directory(p) {
                        return Err(format!("Safety violation: file {} is protected", item.path));
                    }
                    std::fs::remove_file(p)
                        .map_err(|e| format!("Failed to delete file {}: {}", item.path, e))?;
                }
                Ok(())
            }
            #[cfg(target_os = "windows")]
            "RegistryKey" => {
                super::registry::delete_registry_value_or_key(&item.path, None)
            }
            _ => Ok(()),
        }
    }

    pub fn is_safe_directory(path: &Path) -> bool {
        let s = path.to_string_lossy().to_lowercase().replace('/', "\\");
        
        // Disallow root drives or invalid short paths
        if s.len() <= 3 {
            return false;
        }

        // Disallow path traversal attempts e.g. "..\.."
        if s.contains("..") {
            return false;
        }

        // Check canonicalized path if path exists to resolve symlinks and relative components
        if let Ok(canon) = std::fs::canonicalize(path) {
            let canon_s = canon.to_string_lossy().to_lowercase().replace('/', "\\");
            let clean_canon = canon_s.trim_start_matches(r"\\?\");
            if clean_canon.starts_with(r"c:\windows") || clean_canon.contains(r"\windows\system32") {
                return false;
            }
        }

        #[cfg(target_os = "windows")]
        {
            // Absolute prohibition on anything inside Windows system directories
            if s.starts_with(r"c:\windows") || s.contains(r"\windows\system32") || s.contains(r"\windows\syswow64") {
                return false;
            }

            // Prohibit top-level OS and user container roots directly
            let exact_roots = [
                r"c:\program files",
                r"c:\program files (x86)",
                r"c:\programdata",
                r"c:\users",
                r"c:\program files\common files",
                r"c:\program files (x86)\common files",
                r"c:\recovery",
                r"c:\$recycle.bin",
                r"c:\system volume information",
            ];
            if exact_roots.iter().any(|r| s == *r || s == format!("{}\\", r)) {
                return false;
            }

            // Prohibit bare user profile roots, e.g. "C:\Users\John" directly without subfolder
            if s.starts_with(r"c:\users\") {
                let parts: Vec<&str> = s.split('\\').filter(|p| !p.is_empty()).collect();
                if parts.len() <= 3 {
                    return false;
                }
                if parts.len() == 4 && (parts[3] == "desktop" || parts[3] == "documents" || parts[3] == "downloads" || parts[3] == "appdata") {
                    return false;
                }
            }
        }

        #[cfg(not(target_os = "windows"))]
        {
            let unix_forbidden_prefixes = ["/etc", "/boot", "/bin", "/sbin", "/lib", "/usr/bin", "/usr/sbin", "/usr/lib", "/sys", "/proc", "/dev", "/root"];
            let s_unix = path.to_string_lossy();
            if unix_forbidden_prefixes.iter().any(|p| s_unix == *p || s_unix.starts_with(&format!("{}/", p))) {
                return false;
            }
            if s_unix == "/" || s_unix == "/usr" || s_unix == "/var" || s_unix == "/home" {
                return false;
            }
        }

        true
    }

    fn calculate_dir_size(path: &Path) -> u64 {
        let mut total = 0;
        if let Ok(entries) = std::fs::read_dir(path) {
            for entry in entries.flatten() {
                if let Ok(meta) = entry.metadata() {
                    if meta.is_file() {
                        total += meta.len();
                    } else if meta.is_dir() {
                        total += Self::calculate_dir_size(&entry.path());
                    }
                }
            }
        }
        total
    }

    pub fn parse_command_line(cmd: &str) -> Result<(String, Vec<String>), String> {
        let trimmed = cmd.trim();
        if trimmed.is_empty() {
            return Err("Empty command line".to_string());
        }

        // 1. Quoted executable path e.g. "C:\Program Files\App\unins000.exe" /SILENT
        if trimmed.starts_with('"') {
            if let Some(end_quote) = trimmed[1..].find('"') {
                let prog = trimmed[1..=end_quote].to_string();
                let remainder = trimmed[end_quote + 2..].trim();
                let args = Self::tokenize_arguments(remainder);
                return Ok((prog, args));
            }
        }

        // 2. Unquoted executable with .exe case-insensitively
        let lower = trimmed.to_lowercase();
        if let Some(exe_idx) = lower.find(".exe") {
            let potential_exe = &trimmed[..exe_idx + 4];
            let remainder = trimmed[exe_idx + 4..].trim();
            if potential_exe.contains('\\') || potential_exe.contains('/') || Path::new(potential_exe).exists() {
                let args = Self::tokenize_arguments(remainder);
                return Ok((potential_exe.to_string(), args));
            }
        }

        // 3. Fallback standard tokenizer
        let tokens = Self::tokenize_arguments(trimmed);
        if tokens.is_empty() {
            return Err("Empty command line".to_string());
        }

        let prog = tokens[0].clone();
        let args = tokens[1..].to_vec();
        Ok((prog, args))
    }

    fn tokenize_arguments(cmd: &str) -> Vec<String> {
        let mut tokens = Vec::new();
        let mut current = String::new();
        let mut in_quotes = false;

        for ch in cmd.chars() {
            match ch {
                '"' => in_quotes = !in_quotes,
                ' ' | '\t' if !in_quotes => {
                    if !current.is_empty() {
                        tokens.push(current);
                        current = String::new();
                    }
                }
                _ => current.push(ch),
            }
        }
        if !current.is_empty() {
            tokens.push(current);
        }
        tokens
    }
}

pub fn get_uninstall_plan(app_id: &str) -> Result<UninstallPlan, String> {
    UninstallerEngine::create_plan(app_id)
}

pub fn execute_uninstall_plan(
    app_id: &str,
    force_kill_processes: bool,
    run_original_uninstaller: bool,
    remove_leftovers: bool,
) -> Result<String, String> {
    let plan = UninstallerEngine::create_plan(app_id)?;

    if force_kill_processes {
        let mut sys = sysinfo::System::new();
        sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
        for pid_val in &plan.processes_to_kill {
            let pid = sysinfo::Pid::from_u32(*pid_val);
            if let Some(proc_) = sys.process(pid) {
                proc_.kill();
            }
        }
    }

    if run_original_uninstaller {
        if let Some(ref cmd) = plan.uninstall_command {
            UninstallerEngine::execute_uninstaller(cmd)?;
        }
    }

    if remove_leftovers {
        for it in &plan.potential_leftovers {
            let _ = UninstallerEngine::delete_leftover_item(it);
        }
    }

    Ok(format!("Uninstall routine completed for {}", plan.app_name))
}

pub fn scan_app_leftovers(app_id: &str) -> Result<Vec<LeftoverItem>, String> {
    let details = ApplicationsManager::get_app_details(app_id)
        .ok_or_else(|| format!("Application not found: {}", app_id))?;
    Ok(UninstallerEngine::scan_leftovers(&details.app.name, details.app.install_location.as_deref()))
}

pub fn delete_leftovers(items: Vec<LeftoverItem>) -> Result<(u64, usize), String> {
    let mut total_bytes = 0u64;
    let mut count = 0usize;
    for it in &items {
        if it.selected {
            if let Some(size) = it.size_bytes {
                total_bytes += size;
            }
            UninstallerEngine::delete_leftover_item(it)?;
            count += 1;
        }
    }
    Ok((total_bytes, count))
}


