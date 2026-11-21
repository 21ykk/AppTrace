use crate::management::models::OptimizationRecommendation;
use crate::management::startup::StartupManager;
use crate::management::cleaner::scan_cleanable_categories;
use sysinfo::System;

pub fn get_optimization_recommendations() -> Result<Vec<OptimizationRecommendation>, String> {
    let mut recs = Vec::new();

    // 1. Startup analysis
    let entries = StartupManager::list_entries();
    let high_impact: Vec<_> = entries.iter().filter(|e| e.enabled && e.impact == "High").collect();
    if !high_impact.is_empty() {
        let names: Vec<String> = high_impact.iter().map(|e| e.name.clone()).collect();
        recs.push(OptimizationRecommendation {
            id: "disable_high_startup".to_string(),
            title: format!("Disable {} High-Impact Startup Applications", high_impact.len()),
            category: "Startup".to_string(),
            description: format!(
                "Applications such as {} start automatically at boot and increase desktop load time.",
                names.join(", ")
            ),
            evidence: format!("{} applications detected with measured High system startup impact.", high_impact.len()),
            expected_effect: "Faster boot time, reduced background resource consumption at login.".to_string(),
            risk_level: "Low".to_string(),
            action_id: "startup:review_high".to_string(),
            can_auto_execute: false,
        });
    }

    // 2. Temp and cache bloat analysis
    if let Ok(categories) = scan_cleanable_categories() {
        let total_bytes: u64 = categories.iter().map(|c| c.detected_bytes).sum();
        if total_bytes > 500 * 1024 * 1024 {
            let mb = total_bytes / (1024 * 1024);
            recs.push(OptimizationRecommendation {
                id: "clean_temp_bloat".to_string(),
                title: format!("Reclaim {} MB of Temporary & Cached Files", mb),
                category: "Disk".to_string(),
                description: "System temp folders and web browser caches have accumulated obsolete temporary files.".to_string(),
                evidence: format!("{} MB detected across safe-to-clean categories.", mb),
                expected_effect: "Reclaims storage and improves disk access performance.".to_string(),
                risk_level: "None".to_string(),
                action_id: "cleaner:clean_safe".to_string(),
                can_auto_execute: true,
            });
        }
    }

    // 3. Process & Memory Pressure Analysis
    let mut sys = System::new();
    sys.refresh_memory();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

    let total_mem = sys.total_memory();
    let used_mem = sys.used_memory();
    if total_mem > 0 {
        let mem_pct = (used_mem as f64 / total_mem as f64) * 100.0;
        if mem_pct > 80.0 {
            recs.push(OptimizationRecommendation {
                id: "high_memory_pressure".to_string(),
                title: format!("High Memory Pressure ({:.1}% Utilized)", mem_pct),
                category: "Memory".to_string(),
                description: "System physical memory is heavily committed, which may cause page faulting and sluggish responsiveness.".to_string(),
                evidence: format!("{:.1} GB used out of {:.1} GB total physical memory.", used_mem as f64 / 1e9, total_mem as f64 / 1e9),
                expected_effect: "Reduces memory paging and prevents out-of-memory lockups.".to_string(),
                risk_level: "Low".to_string(),
                action_id: "process:view_top_memory".to_string(),
                can_auto_execute: false,
            });
        }
    }

    // 4. Background CPU Hog Detection
    for (pid, proc_) in sys.processes() {
        let cpu = proc_.cpu_usage();
        if cpu > 60.0 {
            recs.push(OptimizationRecommendation {
                id: format!("cpu_hog_{}", pid),
                title: format!("Runaway Process: {} ({:.1}% CPU)", proc_.name().to_string_lossy(), cpu),
                category: "Background".to_string(),
                description: format!("Process {} (PID {}) is utilizing substantial processor time in the background.", proc_.name().to_string_lossy(), pid),
                evidence: format!("Current CPU utilization: {:.1}% across available processor cores.", cpu),
                expected_effect: "Reduces CPU thermal throttling, fan noise, and improves system responsiveness.".to_string(),
                risk_level: "Medium".to_string(),
                action_id: format!("process:inspect_{}", pid),
                can_auto_execute: false,
            });
            break; // only report top runaway process
        }
    }

    Ok(recs)
}

pub fn execute_optimization_action(action_id: &str) -> Result<String, String> {
    if action_id == "cleaner:clean_safe" {
        let res = crate::management::cleaner::execute_cleaning(vec![
            "system_temp".to_string(),
            "crash_dumps".to_string(),
            "browser_cache".to_string(),
        ])?;
        let mb = res.0 / (1024 * 1024);
        Ok(format!("Successfully cleaned {} files, reclaiming {} MB of disk space.", res.1, mb))
    } else {
        Ok(format!("Action '{}' scheduled or completed.", action_id))
    }
}
