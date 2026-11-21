use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutostartStatus {
    pub enabled: bool,
    pub registered_path: Option<String>,
    pub current_executable: String,
    pub path_mismatch: bool,
}

#[cfg(target_os = "windows")]
pub fn get_autostart_status() -> AutostartStatus {
    use std::ffi::OsString;
    use std::os::windows::ffi::OsStringExt;
    use windows_sys::Win32::Foundation::ERROR_SUCCESS;
    use windows_sys::Win32::System::Registry::{
        HKEY, HKEY_CURRENT_USER, KEY_READ, REG_SZ, RegCloseKey, RegOpenKeyExW, RegQueryValueExW,
    };

    let current_exe = std::env::current_exe()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();

    let subkey: Vec<u16> = "Software\\Microsoft\\Windows\\CurrentVersion\\Run\0"
        .encode_utf16()
        .collect();
    let value_name: Vec<u16> = "AppTrace\0".encode_utf16().collect();

    let mut hkey: HKEY = std::ptr::null_mut();
    let res = unsafe { RegOpenKeyExW(HKEY_CURRENT_USER, subkey.as_ptr(), 0, KEY_READ, &mut hkey) };

    if res != ERROR_SUCCESS {
        return AutostartStatus {
            enabled: false,
            registered_path: None,
            current_executable: current_exe,
            path_mismatch: false,
        };
    }

    let mut val_type = 0;
    let mut buf_len: u32 = 2048;
    let mut buffer = vec![0u8; 2048];

    let query_res = unsafe {
        RegQueryValueExW(
            hkey,
            value_name.as_ptr(),
            std::ptr::null_mut(),
            &mut val_type,
            buffer.as_mut_ptr(),
            &mut buf_len,
        )
    };

    unsafe { RegCloseKey(hkey) };

    if query_res == ERROR_SUCCESS && val_type == REG_SZ {
        let u16_slice = unsafe {
            std::slice::from_raw_parts(buffer.as_ptr() as *const u16, (buf_len / 2) as usize)
        };
        let registered = OsString::from_wide(u16_slice)
            .to_string_lossy()
            .trim_end_matches('\0')
            .to_string();

        let clean_registered = registered
            .trim()
            .trim_matches('"')
            .split(" --")
            .next()
            .unwrap_or(&registered)
            .to_string();

        let path_mismatch = !clean_registered.eq_ignore_ascii_case(&current_exe);

        AutostartStatus {
            enabled: true,
            registered_path: Some(registered),
            current_executable: current_exe,
            path_mismatch,
        }
    } else {
        AutostartStatus {
            enabled: false,
            registered_path: None,
            current_executable: current_exe,
            path_mismatch: false,
        }
    }
}

#[cfg(target_os = "windows")]
pub fn set_autostart(enable: bool) -> Result<(), String> {
    use windows_sys::Win32::Foundation::ERROR_SUCCESS;
    use windows_sys::Win32::System::Registry::{
        HKEY, HKEY_CURRENT_USER, KEY_WRITE, REG_SZ, RegCloseKey, RegDeleteValueW, RegOpenKeyExW,
        RegSetValueExW,
    };

    let subkey: Vec<u16> = "Software\\Microsoft\\Windows\\CurrentVersion\\Run\0"
        .encode_utf16()
        .collect();
    let value_name: Vec<u16> = "AppTrace\0".encode_utf16().collect();

    let mut hkey: HKEY = std::ptr::null_mut();
    let res = unsafe { RegOpenKeyExW(HKEY_CURRENT_USER, subkey.as_ptr(), 0, KEY_WRITE, &mut hkey) };

    if res != ERROR_SUCCESS {
        return Err(format!(
            "Failed to open HKCU Run registry key (code {})",
            res
        ));
    }

    if enable {
        let current_exe = std::env::current_exe()
            .map_err(|e| format!("Failed to get current executable path: {}", e))?;
        let cmd = format!("\"{}\" --minimized\0", current_exe.display());
        let val_data: Vec<u16> = cmd.encode_utf16().collect();
        let bytes_len = (val_data.len() * 2) as u32;

        let set_res = unsafe {
            RegSetValueExW(
                hkey,
                value_name.as_ptr(),
                0,
                REG_SZ,
                val_data.as_ptr() as *const u8,
                bytes_len,
            )
        };
        unsafe { RegCloseKey(hkey) };

        if set_res != ERROR_SUCCESS {
            return Err(format!("Failed to write HKCU Run value (code {})", set_res));
        }
    } else {
        let _ = unsafe { RegDeleteValueW(hkey, value_name.as_ptr()) };
        unsafe { RegCloseKey(hkey) };
    }

    Ok(())
}

#[cfg(not(target_os = "windows"))]
pub fn get_autostart_status() -> AutostartStatus {
    let current_exe = std::env::current_exe()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();
    let autostart_dir = dirs::config_dir()
        .map(|p| p.join("autostart"))
        .unwrap_or_default();
    let desktop_file = autostart_dir.join("apptrace.desktop");

    let enabled = desktop_file.exists();
    AutostartStatus {
        enabled,
        registered_path: if enabled {
            Some(desktop_file.to_string_lossy().to_string())
        } else {
            None
        },
        current_executable: current_exe,
        path_mismatch: false,
    }
}

#[cfg(not(target_os = "windows"))]
pub fn set_autostart(enable: bool) -> Result<(), String> {
    let autostart_dir = dirs::config_dir()
        .ok_or_else(|| "Could not determine XDG config directory".to_string())?
        .join("autostart");
    let desktop_file = autostart_dir.join("apptrace.desktop");

    if enable {
        std::fs::create_dir_all(&autostart_dir).map_err(|e| e.to_string())?;
        let current_exe = std::env::current_exe().map_err(|e| e.to_string())?;
        let content = format!(
            "[Desktop Entry]\nType=Application\nName=AppTrace\nExec=\"{}\" --minimized\nIcon=apptrace\nTerminal=false\nCategories=System;Monitor;\n",
            current_exe.display()
        );
        std::fs::write(&desktop_file, content).map_err(|e| e.to_string())?;
    } else if desktop_file.exists() {
        let _ = std::fs::remove_file(&desktop_file);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_autostart_status_query() {
        let status = get_autostart_status();
        assert!(!status.current_executable.is_empty());
    }

    #[test]
    fn test_autostart_serialization() {
        let status = AutostartStatus {
            enabled: true,
            registered_path: Some("C:\\AppTrace\\AppTrace.exe".to_string()),
            current_executable: "C:\\AppTrace\\AppTrace.exe".to_string(),
            path_mismatch: false,
        };
        let json = serde_json::to_string(&status).expect("Serialization failed");
        let parsed: AutostartStatus = serde_json::from_str(&json).expect("Deserialization failed");
        assert!(parsed.enabled);
        assert_eq!(
            parsed.registered_path,
            Some("C:\\AppTrace\\AppTrace.exe".to_string())
        );
        assert!(!parsed.path_mismatch);
    }
}
