use crate::management::models::{HealthCheckItem, SystemHealthReport};
use sysinfo::{Disks, System};

pub fn get_system_health_report() -> Result<SystemHealthReport, String> {
    let mut checks = Vec::new();
    let mut score = 100i32;

    // 1. Storage Health
    let disks = Disks::new_with_refreshed_list();
    let mut lowest_free_pct = 100.0f64;
    let mut drive_info = String::new();

    for disk in &disks {
        let total = disk.total_space();
        let available = disk.available_space();
        if total > 0 {
            let free_pct = (available as f64 / total as f64) * 100.0;
            if free_pct < lowest_free_pct {
                lowest_free_pct = free_pct;
            }
            let mount = disk.mount_point().to_string_lossy();
            drive_info.push_str(&format!("{}: {:.1}% free ({:.1} GB / {:.1} GB); ", mount, free_pct, available as f64 / 1e9, total as f64 / 1e9));
        }
    }

    if lowest_free_pct < 10.0 {
        score -= 20;
        checks.push(HealthCheckItem {
            id: "storage_critical".to_string(),
            title: "Storage Capacity Critical".to_string(),
            category: "Storage".to_string(),
            status: "Fail".to_string(),
            details: format!("Drive space is below 10% on at least one partition. {}", drive_info),
            actionable: true,
        });
    } else if lowest_free_pct < 20.0 {
        score -= 8;
        checks.push(HealthCheckItem {
            id: "storage_warn".to_string(),
            title: "Storage Space Low".to_string(),
            category: "Storage".to_string(),
            status: "Warn".to_string(),
            details: format!("Drive space is low (<20%). {}", drive_info),
            actionable: true,
        });
    } else {
        checks.push(HealthCheckItem {
            id: "storage_ok".to_string(),
            title: "Disk Capacity Healthy".to_string(),
            category: "Storage".to_string(),
            status: "Pass".to_string(),
            details: format!("Sufficient free storage available. {}", drive_info),
            actionable: false,
        });
    }

    // 2. Memory Health
    let mut sys = System::new();
    sys.refresh_memory();
    let total_ram = sys.total_memory();
    let used_ram = sys.used_memory();
    let ram_pct = if total_ram > 0 {
        (used_ram as f64 / total_ram as f64) * 100.0
    } else {
        0.0
    };

    if ram_pct > 92.0 {
        score -= 20;
        checks.push(HealthCheckItem {
            id: "memory_critical".to_string(),
            title: "Extreme Memory Pressure".to_string(),
            category: "Memory".to_string(),
            status: "Fail".to_string(),
            details: format!("{:.1}% RAM committed ({:.1} GB / {:.1} GB). Risk of thrashing.", ram_pct, used_ram as f64 / 1e9, total_ram as f64 / 1e9),
            actionable: true,
        });
    } else if ram_pct > 80.0 {
        score -= 10;
        checks.push(HealthCheckItem {
            id: "memory_warn".to_string(),
            title: "Elevated Memory Usage".to_string(),
            category: "Memory".to_string(),
            status: "Warn".to_string(),
            details: format!("{:.1}% RAM in use ({:.1} GB / {:.1} GB).", ram_pct, used_ram as f64 / 1e9, total_ram as f64 / 1e9),
            actionable: true,
        });
    } else {
        checks.push(HealthCheckItem {
            id: "memory_ok".to_string(),
            title: "Memory Allocation Optimal".to_string(),
            category: "Memory".to_string(),
            status: "Pass".to_string(),
            details: format!("{:.1}% RAM utilized ({:.1} GB available).", ram_pct, (total_ram - used_ram) as f64 / 1e9),
            actionable: false,
        });
    }

    // 3. Process Health
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
    let mut runaway_count = 0;
    for (_pid, proc_) in sys.processes() {
        if proc_.cpu_usage() > 80.0 {
            runaway_count += 1;
        }
    }

    if runaway_count > 0 {
        score -= 12;
        checks.push(HealthCheckItem {
            id: "process_cpu_warn".to_string(),
            title: "High CPU Load Detected".to_string(),
            category: "Process".to_string(),
            status: "Warn".to_string(),
            details: format!("{} process(es) are consuming >80% CPU.", runaway_count),
            actionable: true,
        });
    } else {
        checks.push(HealthCheckItem {
            id: "process_cpu_ok".to_string(),
            title: "Process CPU Utilization Normal".to_string(),
            category: "Process".to_string(),
            status: "Pass".to_string(),
            details: "No runaway processes exceeding safe CPU utilization thresholds.".to_string(),
            actionable: false,
        });
    }

    // 4. Security & Privileges
    let is_admin = check_if_admin();
    checks.push(HealthCheckItem {
        id: "security_privilege".to_string(),
        title: if is_admin { "Elevated Privileges (Administrator / Root)" } else { "Standard User Session" }.to_string(),
        category: "Security".to_string(),
        status: "Pass".to_string(),
        details: if is_admin {
            "AppTrace is running with elevated administrative privileges. Full system service and registry control enabled.".to_string()
        } else {
            "Running in standard user context. Some service modifications and system registry writes may require elevation.".to_string()
        },
        actionable: !is_admin,
    });

    // 5. Automatic Services Check
    let services = crate::management::services::ServicesManager::list_services();
    let stopped_auto: Vec<_> = services.iter().filter(|s| s.startup_type == "Automatic" && s.status != "Running").collect();
    if stopped_auto.len() > 3 {
        score -= 5;
        checks.push(HealthCheckItem {
            id: "services_stopped_auto".to_string(),
            title: format!("{} Automatic Services Not Running", stopped_auto.len()),
            category: "Service".to_string(),
            status: "Warn".to_string(),
            details: format!("Services configured for Automatic startup are currently stopped (e.g. {}).", stopped_auto[0].display_name),
            actionable: true,
        });
    } else {
        checks.push(HealthCheckItem {
            id: "services_ok".to_string(),
            title: "System Services Consistent".to_string(),
            category: "Service".to_string(),
            status: "Pass".to_string(),
            details: "Automatic services are operating normally.".to_string(),
            actionable: false,
        });
    }

    let final_score = score.clamp(10, 100) as u32;
    let status = if final_score >= 85 {
        "Healthy"
    } else if final_score >= 65 {
        "Attention"
    } else {
        "Degraded"
    }.to_string();

    let now_ns = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos() as u64;

    Ok(SystemHealthReport {
        overall_score: final_score,
        status,
        timestamp_ns: now_ns,
        checks,
    })
}

fn check_if_admin() -> bool {
    #[cfg(target_os = "windows")]
    {
        let mut cmd = std::process::Command::new("whoami");
        cmd.arg("/groups");
        #[cfg(target_os = "windows")]
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000);
        if let Ok(out) = cmd.output() {
            let s = String::from_utf8_lossy(&out.stdout);
            return s.contains("S-1-16-12288") || s.contains("S-1-5-32-544");
        }
        false
    }
    #[cfg(not(target_os = "windows"))]
    {
        unsafe { libc::geteuid() == 0 }
    }
}
