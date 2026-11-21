use crate::management::models::ScheduledTaskInfo;
use std::process::Command;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

pub fn get_scheduled_tasks() -> Result<Vec<ScheduledTaskInfo>, String> {
    #[cfg(target_os = "windows")]
    {
        get_windows_scheduled_tasks()
    }
    #[cfg(not(target_os = "windows"))]
    {
        get_linux_scheduled_tasks()
    }
}

#[cfg(target_os = "windows")]
fn get_windows_scheduled_tasks() -> Result<Vec<ScheduledTaskInfo>, String> {
    // Run schtasks /query /fo csv /v or PowerShell Get-ScheduledTask
    let mut cmd = Command::new("powershell");
    cmd.args([
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        r#"Get-ScheduledTask | Select-Object TaskName, TaskPath, State, @{Name='Author';Expression={$_.Author}}, @{Name='Actions';Expression={($_.Actions | ForEach-Object { $_.Execute + ' ' + $_.Arguments }) -join '; '}}, @{Name='Triggers';Expression={($_.Triggers | ForEach-Object { $_.ToString() }) -join '; '}} | ConvertTo-Json -Compress"#,
    ]);
    cmd.creation_flags(CREATE_NO_WINDOW);

    let output = match cmd.output() {
        Ok(out) => out,
        Err(_) => {
            // Fallback to schtasks.exe
            return get_windows_schtasks_fallback();
        }
    };

    if !output.status.success() {
        return get_windows_schtasks_fallback();
    }

    let json_str = String::from_utf8_lossy(&output.stdout);
    if json_str.trim().is_empty() {
        return Ok(Vec::new());
    }

    // Try parsing as JSON array or single object
    let parsed: serde_json::Value = match serde_json::from_str(&json_str) {
        Ok(v) => v,
        Err(_) => return get_windows_schtasks_fallback(),
    };

    let items = match parsed {
        serde_json::Value::Array(arr) => arr,
        serde_json::Value::Object(_) => vec![parsed],
        _ => return Ok(Vec::new()),
    };

    let mut tasks = Vec::new();
    for item in items {
        let name = item["TaskName"].as_str().unwrap_or("Unknown").to_string();
        let path = item["TaskPath"].as_str().unwrap_or("\\").to_string();
        let state_val = item["State"].as_i64().unwrap_or(0);
        let state = match state_val {
            0 => "Unknown",
            1 => "Disabled",
            2 => "Queued",
            3 => "Ready",
            4 => "Running",
            _ => "Unknown",
        }.to_string();

        let author = item["Author"].as_str().map(|s| s.to_string());
        let actions = item["Actions"].as_str().unwrap_or("").to_string();
        let triggers = item["Triggers"].as_str().unwrap_or("").to_string();

        tasks.push(ScheduledTaskInfo {
            name,
            path,
            state,
            trigger_summary: if triggers.is_empty() { "Manual / Triggered".to_string() } else { triggers },
            action_summary: if actions.is_empty() { "None".to_string() } else { actions },
            next_run_time: None,
            author,
        });
    }

    Ok(tasks)
}

#[cfg(target_os = "windows")]
fn get_windows_schtasks_fallback() -> Result<Vec<ScheduledTaskInfo>, String> {
    let mut cmd = Command::new("schtasks.exe");
    cmd.args(["/query", "/fo", "csv", "/nh"]);
    cmd.creation_flags(CREATE_NO_WINDOW);

    let output = cmd.output().map_err(|e| format!("Failed to run schtasks: {}", e))?;
    if !output.status.success() {
        return Err("schtasks returned error".to_string());
    }

    let text = String::from_utf8_lossy(&output.stdout);
    let mut tasks = Vec::new();

    for line in text.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        // CSV line format: "TaskName","Next Run Time","Status"
        let parts: Vec<&str> = line.split(',').map(|s| s.trim_matches('"').trim()).collect();
        if parts.len() >= 3 {
            let full_name = parts[0].to_string();
            let next_run = if parts[1] != "N/A" { Some(parts[1].to_string()) } else { None };
            let state = parts[2].to_string();

            let (path, name) = if let Some(idx) = full_name.rfind('\\') {
                (&full_name[..=idx], &full_name[idx + 1..])
            } else {
                ("\\", full_name.as_str())
            };

            tasks.push(ScheduledTaskInfo {
                name: name.to_string(),
                path: path.to_string(),
                state,
                trigger_summary: "Registered Task".to_string(),
                action_summary: "".to_string(),
                next_run_time: next_run,
                author: None,
            });
        }
    }

    Ok(tasks)
}

#[cfg(not(target_os = "windows"))]
fn get_linux_scheduled_tasks() -> Result<Vec<ScheduledTaskInfo>, String> {
    let mut tasks = Vec::new();

    // 1. Check systemd timers: systemctl list-timers --all --no-pager
    if let Ok(out) = Command::new("systemctl")
        .args(["list-timers", "--all", "--no-pager"])
        .output()
    {
        if out.status.success() {
            let text = String::from_utf8_lossy(&out.stdout);
            for line in text.lines().skip(1) {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 6 {
                    let unit = parts[parts.len() - 2];
                    let activates = parts[parts.len() - 1];
                    tasks.push(ScheduledTaskInfo {
                        name: unit.to_string(),
                        path: "/lib/systemd/system/".to_string(),
                        state: "Active".to_string(),
                        trigger_summary: format!("Activates: {}", activates),
                        action_summary: format!("Timer for {}", activates),
                        next_run_time: Some(parts[0..3].join(" ")),
                        author: Some("systemd".to_string()),
                    });
                }
            }
        }
    }

    // 2. Check user crontab
    if let Ok(out) = Command::new("crontab").arg("-l").output() {
        if out.status.success() {
            let text = String::from_utf8_lossy(&out.stdout);
            for (idx, line) in text.lines().enumerate() {
                let trimmed = line.trim();
                if trimmed.is_empty() || trimmed.starts_with('#') {
                    continue;
                }
                tasks.push(ScheduledTaskInfo {
                    name: format!("Cron Job #{}", idx + 1),
                    path: "crontab".to_string(),
                    state: "Active".to_string(),
                    trigger_summary: trimmed.to_string(),
                    action_summary: trimmed.to_string(),
                    next_run_time: None,
                    author: Some("current_user".to_string()),
                });
            }
        }
    }

    Ok(tasks)
}

pub fn set_scheduled_task_enabled(task_path: &str, task_name: &str, enable: bool) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let full_name = if task_path.ends_with('\\') {
            format!("{}{}", task_path, task_name)
        } else {
            format!("{}\\{}", task_path, task_name)
        };

        let flag = if enable { "/enable" } else { "/disable" };

        let mut cmd = Command::new("schtasks.exe");
        cmd.args(["/change", "/tn", &full_name, flag]);
        cmd.creation_flags(CREATE_NO_WINDOW);

        let out = cmd.output().map_err(|e| format!("Failed to change scheduled task: {}", e))?;
        if out.status.success() {
            Ok(())
        } else {
            let err = String::from_utf8_lossy(&out.stderr);
            Err(format!("schtasks failed: {}", err.trim()))
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        let action = if enable { "start" } else { "stop" };
        let out = Command::new("systemctl")
            .args([action, task_name])
            .output()
            .map_err(|e| format!("Failed to control timer: {}", e))?;
        if out.status.success() {
            Ok(())
        } else {
            Err("Failed to toggle systemd timer".to_string())
        }
    }
}
