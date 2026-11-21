use crate::management::models::{RegistryKeyNode, RegistryValueItem};

#[cfg(target_os = "windows")]
use std::process::Command;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
use windows_sys::Win32::Foundation::ERROR_SUCCESS;
#[cfg(target_os = "windows")]
use windows_sys::Win32::System::Registry::{
    HKEY, HKEY_CLASSES_ROOT, HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE, HKEY_USERS,
    KEY_READ, KEY_SET_VALUE, KEY_WRITE,
    REG_BINARY, REG_DWORD, REG_EXPAND_SZ, REG_QWORD, REG_SZ,
    RegCloseKey, RegCreateKeyExW, RegDeleteKeyW, RegDeleteValueW,
    RegEnumKeyExW, RegEnumValueW, RegOpenKeyExW, RegSetValueExW,
};

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

pub fn get_registry_key_node(path: &str) -> Result<RegistryKeyNode, String> {
    #[cfg(target_os = "windows")]
    {
        get_windows_registry_node(path)
    }
    #[cfg(not(target_os = "windows"))]
    {
        get_linux_config_node(path)
    }
}

#[cfg(target_os = "windows")]
pub fn parse_hive_and_subkey(path: &str) -> Result<(HKEY, String), String> {
    let normalized = path.trim().replace('/', "\\");
    let parts: Vec<&str> = normalized.splitn(2, '\\').collect();
    let root_str = parts[0].to_uppercase();
    let root = match root_str.as_str() {
        "HKEY_CURRENT_USER" | "HKCU" => HKEY_CURRENT_USER,
        "HKEY_LOCAL_MACHINE" | "HKLM" => HKEY_LOCAL_MACHINE,
        "HKEY_CLASSES_ROOT" | "HKCR" => HKEY_CLASSES_ROOT,
        "HKEY_USERS" | "HKU" => HKEY_USERS,
        _ => return Err(format!("Unrecognized registry hive: '{}'", parts[0])),
    };
    let subkey = if parts.len() > 1 { parts[1].to_string() } else { String::new() };
    Ok((root, subkey))
}

#[cfg(target_os = "windows")]
fn get_windows_registry_node(path: &str) -> Result<RegistryKeyNode, String> {
    let path = path.trim();
    if path.is_empty() || path == "ROOT" {
        return Ok(RegistryKeyNode {
            key_path: "".to_string(),
            name: "Registry Root".to_string(),
            subkeys: vec![
                "HKEY_CURRENT_USER".to_string(),
                "HKEY_LOCAL_MACHINE".to_string(),
                "HKEY_CLASSES_ROOT".to_string(),
                "HKEY_USERS".to_string(),
            ],
            values: Vec::new(),
            can_write: false,
        });
    }

    let (root, subkey) = parse_hive_and_subkey(path)?;
    let subkey_clean = subkey.trim_matches('\\');

    let mut hkey: HKEY = std::ptr::null_mut();
    let open_res = if subkey_clean.is_empty() {
        hkey = root;
        ERROR_SUCCESS
    } else {
        let subkey_w: Vec<u16> = subkey_clean.encode_utf16().chain(std::iter::once(0)).collect();
        unsafe {
            RegOpenKeyExW(root, subkey_w.as_ptr(), 0, KEY_READ, &mut hkey)
        }
    };

    if open_res != ERROR_SUCCESS {
        return Err(format!("Registry path '{}' not accessible or not found (code: {})", path, open_res));
    }

    let mut subkeys = Vec::new();
    let mut index = 0;
    loop {
        let mut name_buf = [0u16; 256];
        let mut name_len = name_buf.len() as u32;
        let res = unsafe {
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
        if res != ERROR_SUCCESS {
            break;
        }
        subkeys.push(String::from_utf16_lossy(&name_buf[..name_len as usize]));
        index += 1;
    }
    subkeys.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));

    let mut values = Vec::new();
    let mut val_index = 0;
    loop {
        let mut name_buf = [0u16; 256];
        let mut name_len = name_buf.len() as u32;
        let mut val_type = 0u32;
        let mut data_buf = [0u8; 4096];
        let mut data_len = data_buf.len() as u32;

        let res = unsafe {
            RegEnumValueW(
                hkey,
                val_index,
                name_buf.as_mut_ptr(),
                &mut name_len,
                std::ptr::null_mut(),
                &mut val_type,
                data_buf.as_mut_ptr(),
                &mut data_len,
            )
        };
        if res != ERROR_SUCCESS {
            break;
        }
        val_index += 1;

        let val_name = if name_len == 0 {
            "(Default)".to_string()
        } else {
            String::from_utf16_lossy(&name_buf[..name_len as usize])
        };

        let (type_str, preview) = format_reg_value(val_type, &data_buf[..data_len as usize]);
        values.push(RegistryValueItem {
            name: val_name,
            val_type: type_str,
            data_preview: preview,
            size_bytes: data_len as usize,
        });
    }

    if !subkey_clean.is_empty() {
        unsafe { RegCloseKey(hkey) };
    }

    let node_name = if let Some(last) = path.split('\\').filter(|s| !s.is_empty()).last() {
        last.to_string()
    } else {
        path.to_string()
    };

    Ok(RegistryKeyNode {
        key_path: path.to_string(),
        name: node_name,
        subkeys,
        values,
        can_write: !path.to_uppercase().starts_with("HKEY_LOCAL_MACHINE\\SYSTEM"),
    })
}

#[cfg(target_os = "windows")]
fn format_reg_value(val_type: u32, data: &[u8]) -> (String, String) {
    match val_type {
        1 /* REG_SZ */ | 2 /* REG_EXPAND_SZ */ => {
            let u16_slice = unsafe {
                std::slice::from_raw_parts(data.as_ptr() as *const u16, data.len() / 2)
            };
            let s = String::from_utf16_lossy(u16_slice).trim_matches('\0').to_string();
            let type_str = if val_type == 1 { "REG_SZ" } else { "REG_EXPAND_SZ" };
            (type_str.to_string(), s)
        }
        4 /* REG_DWORD */ => {
            let val = if data.len() >= 4 {
                u32::from_le_bytes(data[..4].try_into().unwrap_or_default())
            } else {
                0
            };
            ("REG_DWORD".to_string(), format!("0x{:08X} ({})", val, val))
        }
        11 /* REG_QWORD */ => {
            let val = if data.len() >= 8 {
                u64::from_le_bytes(data[..8].try_into().unwrap_or_default())
            } else {
                0
            };
            ("REG_QWORD".to_string(), format!("0x{:016X} ({})", val, val))
        }
        3 /* REG_BINARY */ => {
            let preview: String = data.iter().take(32).map(|b| format!("{:02X} ", b)).collect();
            ("REG_BINARY".to_string(), preview.trim_end().to_string())
        }
        7 /* REG_MULTI_SZ */ => {
            let u16_slice = unsafe {
                std::slice::from_raw_parts(data.as_ptr() as *const u16, data.len() / 2)
            };
            let s = String::from_utf16_lossy(u16_slice).replace('\0', " ");
            ("REG_MULTI_SZ".to_string(), s.trim().to_string())
        }
        _ => (format!("REG_TYPE_{}", val_type), format!("{} bytes", data.len())),
    }
}

#[cfg(not(target_os = "windows"))]
fn get_linux_config_node(path: &str) -> Result<RegistryKeyNode, String> {
    let root_path = if path.is_empty() || path == "ROOT" {
        "/etc"
    } else {
        path
    };

    let p = std::path::Path::new(root_path);
    if !p.exists() {
        return Err(format!("Path {} does not exist", root_path));
    }

    let mut subkeys = Vec::new();
    let mut values = Vec::new();

    if let Ok(entries) = std::fs::read_dir(p) {
        for entry in entries.flatten() {
            let file_name = entry.file_name().to_string_lossy().to_string();
            if let Ok(ft) = entry.file_type() {
                if ft.is_dir() {
                    subkeys.push(file_name);
                } else if ft.is_file() {
                    let meta = entry.metadata().ok();
                    let size = meta.map(|m| m.len()).unwrap_or(0) as usize;
                    values.push(RegistryValueItem {
                        name: file_name,
                        val_type: "FILE".to_string(),
                        data_preview: format!("{} bytes", size),
                        size_bytes: size,
                    });
                }
            }
        }
    }

    subkeys.sort();
    values.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(RegistryKeyNode {
        key_path: root_path.to_string(),
        name: p.file_name().map(|s| s.to_string_lossy().to_string()).unwrap_or_else(|| root_path.to_string()),
        subkeys,
        values,
        can_write: !root_path.starts_with("/etc"),
    })
}

pub fn search_registry(query: &str, start_path: Option<&str>) -> Result<Vec<String>, String> {
    let query_lower = query.to_lowercase();
    #[cfg(target_os = "windows")]
    {
        let root = start_path.unwrap_or("HKCU:\\Software");
        let script = format!(
            r#"$q = '{q}';
$root = '{root}';
Get-ChildItem -LiteralPath $root -Recurse -Depth 2 -ErrorAction SilentlyContinue |
    Where-Object {{ $_.PSChildName -like "*$q*" }} |
    Select-Object -First 30 -ExpandProperty Name"#,
            q = query_lower.replace('\'', "''"),
            root = root.replace('\'', "''")
        );

        let mut cmd = Command::new("powershell");
        cmd.args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", &script]);
        cmd.creation_flags(CREATE_NO_WINDOW);

        let out = cmd.output().map_err(|e| format!("Search failed: {}", e))?;
        let text = String::from_utf8_lossy(&out.stdout);
        let matches: Vec<String> = text.lines().map(|s| s.trim().to_string()).filter(|s| !s.is_empty()).collect();
        Ok(matches)
    }
    #[cfg(not(target_os = "windows"))]
    {
        let root = start_path.unwrap_or("/etc");
        let mut results = Vec::new();
        if let Ok(entries) = std::fs::read_dir(root) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.to_lowercase().contains(&query_lower) {
                    results.push(entry.path().to_string_lossy().to_string());
                }
            }
        }
        Ok(results)
    }
}

pub fn export_registry_key(key_path: &str) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        let temp_file = std::env::temp_dir().join(format!("apptrace_export_{}.reg", uuid::Uuid::new_v4()));
        let temp_str = temp_file.to_string_lossy().to_string();

        let mut cmd = Command::new("reg.exe");
        cmd.args(["export", key_path, &temp_str, "/y"]);
        cmd.creation_flags(CREATE_NO_WINDOW);

        let out = cmd.output().map_err(|e| format!("Failed to export registry: {}", e))?;
        if !out.status.success() {
            let err = String::from_utf8_lossy(&out.stderr);
            return Err(format!("reg export failed: {}", err.trim()));
        }

        let content = std::fs::read_to_string(&temp_file)
            .map_err(|e| format!("Failed to read exported reg file: {}", e))?;
        let _ = std::fs::remove_file(temp_file);
        Ok(content)
    }
    #[cfg(not(target_os = "windows"))]
    {
        let p = std::path::Path::new(key_path);
        if p.is_file() {
            std::fs::read_to_string(p).map_err(|e| format!("Failed to read file: {}", e))
        } else {
            Err("Export is only supported for files on Linux".to_string())
        }
    }
}

pub fn set_registry_value(key_path: &str, value_name: &str, value_data: &str, val_type: &str) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let upper = key_path.to_uppercase();
        if upper.contains(r"SYSTEM\CURRENTCONTROLSET") || upper.contains(r"\SAM") || upper.contains(r"\SECURITY") {
            return Err("Modification of critical system security hives is restricted for safety".to_string());
        }

        let (root, subkey) = parse_hive_and_subkey(key_path)?;
        let subkey_clean = subkey.trim_matches('\\');
        if subkey_clean.is_empty() {
            return Err("Cannot set value on registry root hive directly".to_string());
        }

        let subkey_w: Vec<u16> = subkey_clean.encode_utf16().chain(std::iter::once(0)).collect();
        let mut hkey: HKEY = std::ptr::null_mut();

        let create_res = unsafe {
            RegCreateKeyExW(
                root,
                subkey_w.as_ptr(),
                0,
                std::ptr::null_mut(),
                0,
                KEY_WRITE,
                std::ptr::null_mut(),
                &mut hkey,
                std::ptr::null_mut(),
            )
        };
        if create_res != ERROR_SUCCESS {
            return Err(format!("Failed to open/create registry key '{}' (code: {})", key_path, create_res));
        }

        let val_name_w: Vec<u16> = if value_name == "(Default)" || value_name.is_empty() {
            vec![0]
        } else {
            value_name.encode_utf16().chain(std::iter::once(0)).collect()
        };

        let (type_code, bytes): (u32, Vec<u8>) = match val_type.to_uppercase().as_str() {
            "REG_DWORD" => {
                let n: u32 = value_data.parse().unwrap_or(0);
                (REG_DWORD, n.to_le_bytes().to_vec())
            }
            "REG_QWORD" => {
                let n: u64 = value_data.parse().unwrap_or(0);
                (REG_QWORD, n.to_le_bytes().to_vec())
            }
            "REG_BINARY" => {
                let clean = value_data.replace(' ', "").replace('-', "");
                let mut b = Vec::new();
                for i in (0..clean.len()).step_by(2) {
                    if i + 2 <= clean.len() {
                        if let Ok(byte) = u8::from_str_radix(&clean[i..i+2], 16) {
                            b.push(byte);
                        }
                    }
                }
                (REG_BINARY, b)
            }
            "REG_EXPAND_SZ" => {
                let w: Vec<u16> = value_data.encode_utf16().chain(std::iter::once(0)).collect();
                let b = unsafe { std::slice::from_raw_parts(w.as_ptr() as *const u8, w.len() * 2) };
                (REG_EXPAND_SZ, b.to_vec())
            }
            _ => { // REG_SZ default
                let w: Vec<u16> = value_data.encode_utf16().chain(std::iter::once(0)).collect();
                let b = unsafe { std::slice::from_raw_parts(w.as_ptr() as *const u8, w.len() * 2) };
                (REG_SZ, b.to_vec())
            }
        };

        let set_res = unsafe {
            RegSetValueExW(
                hkey,
                val_name_w.as_ptr(),
                0,
                type_code,
                bytes.as_ptr(),
                bytes.len() as u32,
            )
        };
        unsafe { RegCloseKey(hkey) };

        if set_res == ERROR_SUCCESS {
            Ok(())
        } else {
            Err(format!("RegSetValueExW failed with code {}", set_res))
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        let p = std::path::Path::new(key_path);
        if p.is_file() && !key_path.starts_with("/etc") {
            std::fs::write(p, value_data).map_err(|e| format!("Failed to write file: {}", e))
        } else {
            Err("Cannot write to protected system file".to_string())
        }
    }
}

pub fn delete_registry_value_or_key(key_path: &str, value_name: Option<&str>) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let upper = key_path.to_uppercase();
        // Guard against deleting roots or critical keys
        if upper == "HKEY_LOCAL_MACHINE" || upper == "HKLM" || upper == "HKEY_CURRENT_USER" || upper == "HKCU" 
            || upper.contains(r"SYSTEM\CURRENTCONTROLSET") || upper.contains(r"\SAM") || upper.contains(r"\SECURITY")
            || upper == r"HKEY_LOCAL_MACHINE\SOFTWARE" || upper == r"HKEY_CURRENT_USER\SOFTWARE" {
            return Err("Cannot delete root or core system registry keys for safety".to_string());
        }

        let (root, subkey) = parse_hive_and_subkey(key_path)?;
        let subkey_clean = subkey.trim_matches('\\');
        if subkey_clean.is_empty() {
            return Err("Cannot delete root hive directly".to_string());
        }

        if let Some(val) = value_name {
            let subkey_w: Vec<u16> = subkey_clean.encode_utf16().chain(std::iter::once(0)).collect();
            let mut hkey: HKEY = std::ptr::null_mut();
            let open_res = unsafe {
                RegOpenKeyExW(root, subkey_w.as_ptr(), 0, KEY_SET_VALUE, &mut hkey)
            };
            if open_res != ERROR_SUCCESS {
                return Err(format!("Failed to open registry key for value deletion (code: {})", open_res));
            }
            let val_w: Vec<u16> = if val == "(Default)" || val.is_empty() {
                vec![0]
            } else {
                val.encode_utf16().chain(std::iter::once(0)).collect()
            };
            let del_res = unsafe { RegDeleteValueW(hkey, val_w.as_ptr()) };
            unsafe { RegCloseKey(hkey) };
            if del_res == ERROR_SUCCESS {
                Ok(())
            } else {
                Err(format!("RegDeleteValueW failed with code {}", del_res))
            }
        } else {
            let subkey_w: Vec<u16> = subkey_clean.encode_utf16().chain(std::iter::once(0)).collect();
            let del_res = unsafe { RegDeleteKeyW(root, subkey_w.as_ptr()) };
            if del_res == ERROR_SUCCESS {
                Ok(())
            } else {
                Err(format!("RegDeleteKeyW failed with code {}", del_res))
            }
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        let p = std::path::Path::new(key_path);
        if key_path.starts_with("/etc") {
            return Err("Cannot delete /etc files for safety".to_string());
        }
        if p.is_file() {
            std::fs::remove_file(p).map_err(|e| format!("Failed to remove file: {}", e))
        } else if p.is_dir() {
            std::fs::remove_dir_all(p).map_err(|e| format!("Failed to remove directory: {}", e))
        } else {
            Err("Item does not exist".to_string())
        }
    }
}
