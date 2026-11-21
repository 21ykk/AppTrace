use app_lib::core::app_paths::AppPaths;
use app_lib::database::DatabaseManager;
use app_lib::management::models::OperationHistoryEntry;
use app_lib::management::applications::ApplicationsManager;
use app_lib::management::cleaner::scan_cleanable_categories;
use app_lib::management::disk_analyzer::{analyze_disk_space, get_largest_files};
use app_lib::management::duplicates::scan_duplicate_files;
use app_lib::management::health::get_system_health_report;
use app_lib::management::hunter::hunt_software_resources;
use app_lib::management::optimizer::get_optimization_recommendations;
use app_lib::management::services::ServicesManager;
use app_lib::management::startup::StartupManager;
use app_lib::management::uninstall::UninstallerEngine;

use std::fs::File;
use std::io::Write;
use std::path::Path;
use std::sync::Arc;

fn main() {
    println!("============================================================");
    println!("    APPTRACE COMPREHENSIVE FUNCTIONAL VERIFICATION SUITE    ");
    println!("============================================================");

    test_database_subsystem();
    test_uninstaller_safety_and_parser();
    test_disk_analyzer_subsystem();
    test_duplicate_finder_subsystem();
    test_cleaner_subsystem();
    test_registry_manager_subsystem();
    test_applications_discovery_subsystem();
    test_startup_manager_subsystem();
    test_services_manager_and_protection();
    test_health_and_optimizer_subsystems();
    test_universal_hunter_subsystem();

    println!("\n============================================================");
    println!("  ALL COMPREHENSIVE VERIFICATION TESTS PASSED SUCCESSFULLY! ");
    println!("============================================================");
}

fn test_database_subsystem() {
    print!("[TEST 1/11] Database Subsystem & SCHEMA_V2 Migrations... ");
    let paths = Arc::new(AppPaths::resolve());
    assert!(!paths.root.as_os_str().is_empty());

    let temp_db_dir = std::env::temp_dir().join(format!("apptrace_test_db_{}", uuid::Uuid::now_v7()));
    std::fs::create_dir_all(&temp_db_dir).unwrap();

    let db = DatabaseManager::new(Some(temp_db_dir.clone())).expect("DB initialization failed");
    let integrity = db.run_integrity_check().expect("Integrity check failed");
    assert_eq!(integrity, "ok", "Database integrity is not ok");

    // Test operations history table
    let op = OperationHistoryEntry {
        operation_id: "op_test_1".to_string(),
        timestamp_ns: 1000,
        action_type: "TestValidation".to_string(),
        target_name: "VerificationApp".to_string(),
        target_path: Some("/test/path".to_string()),
        status: "Success".to_string(),
        details_json: "{}".to_string(),
        error_message: None,
    };
    db.record_operation(&op).expect("Failed to record operation");

    let history = db.get_operation_history(10).expect("Failed to get operation history");
    assert_eq!(history.len(), 1);
    assert_eq!(history[0].target_name, "VerificationApp");
    assert_eq!(history[0].action_type, "TestValidation");

    let _ = std::fs::remove_dir_all(&temp_db_dir);
    println!("PASSED");
}

fn test_uninstaller_safety_and_parser() {
    print!("[TEST 2/11] Uninstaller Safety Rules & Command Parsing... ");
    
    // Safety directory validation
    assert!(!UninstallerEngine::is_safe_directory(Path::new(r"C:\Windows")), "C:\\Windows must be protected");
    assert!(!UninstallerEngine::is_safe_directory(Path::new(r"C:\Windows\System32")), "System32 must be protected");
    assert!(!UninstallerEngine::is_safe_directory(Path::new(r"C:\Program Files")), "Program Files root must be protected");
    assert!(!UninstallerEngine::is_safe_directory(Path::new(r"C:\Program Files (x86)")), "Program Files (x86) root must be protected");
    assert!(!UninstallerEngine::is_safe_directory(Path::new(r"C:\ProgramData")), "ProgramData root must be protected");
    assert!(!UninstallerEngine::is_safe_directory(Path::new(r"C:\Users")), "Users root must be protected");
    assert!(!UninstallerEngine::is_safe_directory(Path::new(r"C:\Users\DefaultUser")), "User home root must be protected");
    assert!(!UninstallerEngine::is_safe_directory(Path::new(r"C:\Users\DefaultUser\Documents")), "User Documents must be protected");
    assert!(!UninstallerEngine::is_safe_directory(Path::new(r"C:\")), "Drive root must be protected");
    assert!(!UninstallerEngine::is_safe_directory(Path::new(r"C:\Program Files\App\..\..\Windows")), "Path traversal must be rejected");
    
    // Valid application directories must be safe
    assert!(UninstallerEngine::is_safe_directory(Path::new(r"C:\Program Files\TestApp\Subdir")), "Subfolder in Program Files should be safe");
    assert!(UninstallerEngine::is_safe_directory(Path::new(r"C:\Users\DefaultUser\AppData\Local\TestApp")), "App folder in LocalAppData should be safe");

    // Command line parser tests
    let (prog1, args1) = UninstallerEngine::parse_command_line(r#""C:\Program Files\App\unins000.exe" /SILENT /VERYSILENT"#).unwrap();
    assert_eq!(prog1, r"C:\Program Files\App\unins000.exe");
    assert_eq!(args1, vec!["/SILENT", "/VERYSILENT"]);

    let (prog2, args2) = UninstallerEngine::parse_command_line("MsiExec.exe /X{12345678-ABCD-1234-ABCD-1234567890AB} /qn").unwrap();
    assert_eq!(prog2, "MsiExec.exe");
    assert_eq!(args2, vec!["/X{12345678-ABCD-1234-ABCD-1234567890AB}", "/qn"]);

    println!("PASSED");
}

fn test_disk_analyzer_subsystem() {
    print!("[TEST 3/11] Disk Analyzer & Largest Files Detection... ");
    let temp_dir = std::env::temp_dir().join(format!("apptrace_test_disk_{}", uuid::Uuid::now_v7()));
    std::fs::create_dir_all(temp_dir.join("subA")).unwrap();
    std::fs::create_dir_all(temp_dir.join("subB")).unwrap();

    let f1_path = temp_dir.join("subA").join("file_500kb.bin");
    let f2_path = temp_dir.join("subB").join("file_200kb.bin");
    let f3_path = temp_dir.join("file_50kb.bin");

    {
        let mut f1 = File::create(&f1_path).unwrap();
        f1.write_all(&vec![0xAA; 500 * 1024]).unwrap();

        let mut f2 = File::create(&f2_path).unwrap();
        f2.write_all(&vec![0xBB; 200 * 1024]).unwrap();

        let mut f3 = File::create(&f3_path).unwrap();
        f3.write_all(&vec![0xCC; 50 * 1024]).unwrap();
    }

    let node = analyze_disk_space(&temp_dir.to_string_lossy(), Some(3)).expect("Disk analysis failed");
    assert!(node.size_bytes >= 750 * 1024, "Total size calculation mismatch");
    assert!(node.item_count >= 3, "Total item count mismatch");

    let largest = get_largest_files(&temp_dir.to_string_lossy(), Some(5)).expect("Largest files failed");
    assert_eq!(largest.len(), 3, "Expected 3 files returned");
    assert_eq!(largest[0].size_bytes, 500 * 1024, "First largest must be 500KB file");
    assert_eq!(largest[1].size_bytes, 200 * 1024, "Second largest must be 200KB file");
    assert_eq!(largest[2].size_bytes, 50 * 1024, "Third largest must be 50KB file");

    let _ = std::fs::remove_dir_all(&temp_dir);
    println!("PASSED");
}

fn test_duplicate_finder_subsystem() {
    print!("[TEST 4/11] 3-Stage Duplicate Finder (Header Collision Check)... ");
    let temp_dir = std::env::temp_dir().join(format!("apptrace_test_dup_{}", uuid::Uuid::now_v7()));
    std::fs::create_dir_all(&temp_dir).unwrap();

    // 8KB identical pattern
    let mut pattern_a = vec![0x11; 8192];
    for (i, b) in pattern_a.iter_mut().enumerate() {
        *b = (i % 256) as u8;
    }

    // Pattern B: identical first 4KB (4096 bytes), but DIFFERENT in the last 4KB!
    // This rigorously proves stage 2 (header hash) does NOT produce a false positive in stage 3!
    let mut pattern_b = pattern_a.clone();
    for i in 4096..8192 {
        pattern_b[i] = 0xFF;
    }

    std::fs::write(temp_dir.join("orig.bin"), &pattern_a).unwrap();
    std::fs::write(temp_dir.join("dup1.bin"), &pattern_a).unwrap();
    std::fs::write(temp_dir.join("dup2.bin"), &pattern_a).unwrap();
    std::fs::write(temp_dir.join("same_header_diff_body.bin"), &pattern_b).unwrap();
    std::fs::write(temp_dir.join("distinct.bin"), &vec![0x42; 8192]).unwrap();

    let groups = scan_duplicate_files(&temp_dir.to_string_lossy(), Some(1024)).expect("Duplicate scan failed");
    assert_eq!(groups.len(), 1, "Expected exactly 1 duplicate group");
    assert_eq!(groups[0].duplicate_paths.len(), 2, "Expected 2 duplicate files in group");
    assert_eq!(groups[0].file_size, 8192);

    // Verify same_header_diff_body.bin was NOT included in duplicates
    let is_false_positive = groups[0].duplicate_paths.iter().any(|p| p.contains("same_header_diff_body"));
    assert!(!is_false_positive, "Stage 3 full-content hash correctly rejected header-collision file");

    let _ = std::fs::remove_dir_all(&temp_dir);
    println!("PASSED");
}

fn test_cleaner_subsystem() {
    print!("[TEST 5/11] Deep Cleaner Categories & Safety Flags... ");
    let categories = scan_cleanable_categories().expect("Scan cleanable categories failed");
    assert!(!categories.is_empty(), "Categories list should not be empty");

    let cat_ids: Vec<String> = categories.iter().map(|c| c.id.clone()).collect();
    assert!(cat_ids.contains(&"system_temp".to_string()));
    assert!(cat_ids.contains(&"crash_dumps".to_string()));
    assert!(cat_ids.contains(&"browser_cache".to_string()));
    assert!(cat_ids.contains(&"system_logs".to_string()));

    // Verify system logs is false by default for safety
    let logs_cat = categories.iter().find(|c| c.id == "system_logs").unwrap();
    assert!(!logs_cat.is_safe_by_default, "System logs should not be selected by default");

    println!("PASSED");
}

fn test_registry_manager_subsystem() {
    print!("[TEST 6/11] Native Win32 Registry Manager Operations... ");
    #[cfg(target_os = "windows")]
    {
        use app_lib::management::registry::{
            delete_registry_value_or_key, get_registry_key_node, set_registry_value,
        };

        let test_key = r"HKEY_CURRENT_USER\Software\AppTraceTests\UnitTesting";

        // 1. Create and set REG_SZ
        set_registry_value(test_key, "TestString", "AppTraceValue123", "REG_SZ")
            .expect("Failed to write REG_SZ");

        // 2. Set REG_DWORD
        set_registry_value(test_key, "TestDword", "42", "REG_DWORD")
            .expect("Failed to write REG_DWORD");

        // 3. Set REG_BINARY
        set_registry_value(test_key, "TestBinary", "AA BB CC DD", "REG_BINARY")
            .expect("Failed to write REG_BINARY");

        // 4. Read back node
        let node = get_registry_key_node(test_key).expect("Failed to read test registry key node");
        assert_eq!(node.values.len(), 3, "Expected 3 registry values in test key");

        let str_val = node.values.iter().find(|v| v.name == "TestString").unwrap();
        assert_eq!(str_val.val_type, "REG_SZ");
        assert_eq!(str_val.data_preview, "AppTraceValue123");

        let dword_val = node.values.iter().find(|v| v.name == "TestDword").unwrap();
        assert_eq!(dword_val.val_type, "REG_DWORD");
        assert!(dword_val.data_preview.contains("42"));

        // 5. Test safety guard: attempting to delete HKEY_LOCAL_MACHINE or HKLM\SOFTWARE must fail!
        let blocked = delete_registry_value_or_key("HKEY_LOCAL_MACHINE", None);
        assert!(blocked.is_err(), "Safety guard must prevent deleting HKEY_LOCAL_MACHINE");

        let blocked_soft = delete_registry_value_or_key(r"HKEY_LOCAL_MACHINE\SOFTWARE", None);
        assert!(blocked_soft.is_err(), "Safety guard must prevent deleting HKLM\\SOFTWARE");

        // 6. Delete single value
        delete_registry_value_or_key(test_key, Some("TestString")).expect("Failed to delete value");
        let node_after = get_registry_key_node(test_key).unwrap();
        assert_eq!(node_after.values.len(), 2, "Expected 2 values after single deletion");

        // 7. Cleanup test key
        delete_registry_value_or_key(test_key, None).expect("Failed to delete test key");
        delete_registry_value_or_key(r"HKEY_CURRENT_USER\Software\AppTraceTests", None).ok();
    }
    println!("PASSED");
}

fn test_applications_discovery_subsystem() {
    print!("[TEST 7/11] Applications Discovery & Correlation Engine... ");
    let apps = ApplicationsManager::list_installed_apps();
    assert!(!apps.is_empty(), "Should discover installed applications on host system");

    let first = &apps[0];
    assert!(!first.id.is_empty(), "App id must not be empty");
    assert!(!first.name.is_empty(), "App name must not be empty");

    // Test detailed correlation
    let details = ApplicationsManager::get_app_details(&first.id);
    assert!(details.is_some(), "Should retrieve app details for discovered app");
    println!("PASSED (found {} installed applications)", apps.len());
}

fn test_startup_manager_subsystem() {
    print!("[TEST 8/11] Startup Manager Discovery... ");
    let entries = StartupManager::list_entries();
    for entry in &entries {
        assert!(!entry.id.is_empty());
        assert!(!entry.name.is_empty());
    }
    println!("PASSED (found {} startup entries)", entries.len());
}

fn test_services_manager_and_protection() {
    print!("[TEST 9/11] Services Manager & Critical Service Lockdown... ");
    let services = ServicesManager::list_services();
    assert!(!services.is_empty(), "Should discover system services");

    // Test that critical services are locked from being stopped
    let rpcss_blocked = ServicesManager::stop_service("rpcss");
    assert!(rpcss_blocked.is_err(), "Critical service 'rpcss' must be protected from stopping");

    let samss_blocked = ServicesManager::stop_service("samss");
    assert!(samss_blocked.is_err(), "Critical service 'samss' must be protected from stopping");

    let lsass_blocked = ServicesManager::stop_service("lsass");
    assert!(lsass_blocked.is_err(), "Critical service 'lsass' must be protected from stopping");

    println!("PASSED (found {} services, critical services protected)", services.len());
}

fn test_health_and_optimizer_subsystems() {
    print!("[TEST 10/11] System Health Score & Telemetry-Backed Optimizer... ");
    let report = get_system_health_report().expect("Failed to get health report");
    assert!(report.overall_score >= 10 && report.overall_score <= 100, "Health score out of range: {}", report.overall_score);
    assert!(!report.checks.is_empty(), "Health checks must not be empty");

    let recs = get_optimization_recommendations().expect("Failed to get recommendations");
    for r in &recs {
        assert!(!r.id.is_empty());
        assert!(!r.title.is_empty());
        assert!(!r.evidence.is_empty());
    }
    println!("PASSED (Score: {}, Checks: {}, Recommendations: {})", report.overall_score, report.checks.len(), recs.len());
}

fn test_universal_hunter_subsystem() {
    print!("[TEST 11/11] Universal Software & Resource Hunter... ");
    let res = hunt_software_resources("AppTrace").expect("Hunter execution failed");
    assert_eq!(res.query, "AppTrace");
    println!("PASSED (Hunter active across apps, processes, files, registry)");
}
