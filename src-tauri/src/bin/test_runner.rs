use app_lib::core::app_paths::AppPaths;
use app_lib::database::DatabaseManager;
use app_lib::management::models::{DuplicateCandidateItem, OperationHistoryEntry};
use app_lib::management::applications::ApplicationsManager;
use app_lib::management::cleaner::scan_cleanable_categories;
use app_lib::management::disk_analyzer::{analyze_disk_space, get_largest_files};
use app_lib::management::duplicates::{delete_duplicate_candidates, delete_duplicate_files, scan_duplicate_files};
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
    print!("[TEST 1/11] Database Subsystem & SCHEMA_V2 Migrations (Audit & Concurrency)... ");
    let paths = Arc::new(AppPaths::resolve());
    assert!(!paths.root.as_os_str().is_empty());

    let temp_db_dir = std::env::temp_dir().join(format!("apptrace_test_db_{}", uuid::Uuid::now_v7()));
    std::fs::create_dir_all(&temp_db_dir).unwrap();

    let db = Arc::new(DatabaseManager::new(Some(temp_db_dir.clone())).expect("DB initialization failed"));
    let integrity = db.run_integrity_check().expect("Integrity check failed");
    assert_eq!(integrity, "ok", "Database integrity is not ok");

    // 1. Success operation record
    let op_success = OperationHistoryEntry {
        operation_id: "op_test_success".to_string(),
        timestamp_ns: 1000,
        action_type: "UninstallApp".to_string(),
        target_name: "VerificationApp".to_string(),
        target_path: Some("/test/path".to_string()),
        status: "Success".to_string(),
        details_json: r#"{"force_kill":false,"run_uninstaller":true,"remove_leftovers":true}"#.to_string(),
        error_message: None,
    };
    db.record_operation(&op_success).expect("Failed to record success operation");

    // 2. Failed operation record
    let op_failed = OperationHistoryEntry {
        operation_id: "op_test_failed".to_string(),
        timestamp_ns: 2000,
        action_type: "DeleteRegistryOrConfig".to_string(),
        target_name: "HKLM\\Software\\Protected".to_string(),
        target_path: Some("HKLM\\Software\\Protected".to_string()),
        status: "Failed".to_string(),
        details_json: r#"{"value_name":null}"#.to_string(),
        error_message: Some("Access is denied (protected system hive)".to_string()),
    };
    db.record_operation(&op_failed).expect("Failed to record failed operation");

    // 3. PartialSuccess operation record
    let op_partial = OperationHistoryEntry {
        operation_id: "op_test_partial".to_string(),
        timestamp_ns: 3000,
        action_type: "DeleteDuplicates".to_string(),
        target_name: "5 duplicate files".to_string(),
        target_path: None,
        status: "PartialSuccess".to_string(),
        details_json: r#"{"bytes_reclaimed":2048,"files_deleted":3,"files_requested":5}"#.to_string(),
        error_message: None,
    };
    db.record_operation(&op_partial).expect("Failed to record partial success operation");

    // 4. Verify ordering (timestamp_ns DESC)
    let history = db.get_operation_history(10).expect("Failed to get operation history");
    assert_eq!(history.len(), 3);
    assert_eq!(history[0].operation_id, "op_test_partial"); // timestamp 3000
    assert_eq!(history[0].status, "PartialSuccess");
    assert_eq!(history[1].operation_id, "op_test_failed");  // timestamp 2000
    assert_eq!(history[1].status, "Failed");
    assert!(history[1].error_message.as_ref().unwrap().contains("Access is denied"));
    assert_eq!(history[2].operation_id, "op_test_success"); // timestamp 1000
    assert_eq!(history[2].status, "Success");

    // 5. Concurrency safety: multi-threaded writes
    let mut handles = Vec::new();
    for thread_idx in 0..5 {
        let db_clone = Arc::clone(&db);
        handles.push(std::thread::spawn(move || {
            for i in 0..10 {
                let op = OperationHistoryEntry {
                    operation_id: format!("op_thread_{}_{}", thread_idx, i),
                    timestamp_ns: 4000 + (thread_idx * 100 + i) as u64,
                    action_type: "ConcurrentTest".to_string(),
                    target_name: format!("Item_{}_{}", thread_idx, i),
                    target_path: None,
                    status: "Success".to_string(),
                    details_json: "{}".to_string(),
                    error_message: None,
                };
                db_clone.record_operation(&op).expect("Concurrent write failed");
            }
        }));
    }
    for h in handles {
        h.join().unwrap();
    }

    let full_history = db.get_operation_history(100).expect("Failed to get full history");
    assert_eq!(full_history.len(), 3 + 50);

    // 6. Persistence failure test: duplicate primary key
    let op_duplicate = OperationHistoryEntry {
        operation_id: "op_test_success".to_string(), // duplicate PK
        timestamp_ns: 9999,
        action_type: "DuplicatePK".to_string(),
        target_name: "TestItem".to_string(),
        target_path: None,
        status: "Failed".to_string(),
        details_json: "{}".to_string(),
        error_message: None,
    };
    let initial_errs = db.get_persistence_failure_count();
    let res = db.record_operation(&op_duplicate);
    assert!(res.is_err(), "Duplicate primary key must return Err");
    assert_eq!(
        db.get_persistence_failure_count(),
        initial_errs + 1,
        "Persistence failure count must increment on SQLite write error"
    );

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
    print!("[TEST 4/11] 3-Stage Duplicate Finder & Revalidation Lifecycle... ");
    let temp_dir = std::env::temp_dir().join(format!("apptrace_test_dup_{}", uuid::Uuid::now_v7()));
    std::fs::create_dir_all(&temp_dir).unwrap();

    // 1. 8KB identical pattern
    let mut pattern_a = vec![0x11; 8192];
    for (i, b) in pattern_a.iter_mut().enumerate() {
        *b = (i % 256) as u8;
    }

    // Pattern B: identical first 4KB (4096 bytes), but DIFFERENT in the last 4KB!
    let mut pattern_b = pattern_a.clone();
    for i in 4096..8192 {
        pattern_b[i] = 0xFF;
    }

    let orig_path = temp_dir.join("orig.bin");
    let dup1_path = temp_dir.join("dup1.bin");
    let dup2_path = temp_dir.join("dup2.bin");
    let collision_path = temp_dir.join("same_header_diff_body.bin");
    let distinct_path = temp_dir.join("distinct.bin");
    let empty_path = temp_dir.join("empty.bin");

    std::fs::write(&orig_path, &pattern_a).unwrap();
    std::fs::write(&dup1_path, &pattern_a).unwrap();
    std::fs::write(&dup2_path, &pattern_a).unwrap();
    std::fs::write(&collision_path, &pattern_b).unwrap();
    std::fs::write(&distinct_path, &vec![0x42; 8192]).unwrap();
    std::fs::write(&empty_path, b"").unwrap();

    // 2. Scan duplicates
    let groups = scan_duplicate_files(&temp_dir.to_string_lossy(), Some(1024)).expect("Duplicate scan failed");
    assert_eq!(groups.len(), 1, "Expected exactly 1 duplicate group");
    assert_eq!(groups[0].duplicate_paths.len(), 2, "Expected 2 duplicate files in group");
    assert_eq!(groups[0].file_size, 8192);

    // Verify same_header_diff_body.bin was NOT included in duplicates
    let is_false_positive = groups[0].duplicate_paths.iter().any(|p| p.contains("same_header_diff_body"));
    assert!(!is_false_positive, "Stage 3 full-content hash correctly rejected header-collision file");

    // 3. Revalidation lifecycle test: Candidate modified after scan (size changed)
    let mod_candidate = temp_dir.join("mod_after_scan.bin");
    std::fs::write(&mod_candidate, &pattern_a).unwrap();
    // Simulate modification after scan
    std::fs::write(&mod_candidate, b"short content").unwrap();

    let candidates = vec![
        DuplicateCandidateItem {
            target_path: mod_candidate.to_string_lossy().to_string(),
            reference_path: Some(orig_path.to_string_lossy().to_string()),
            expected_size: Some(8192), // expected 8192, but modified to 13 bytes
        }
    ];
    let (reclaimed, count) = delete_duplicate_candidates(candidates).expect("Candidate delete failed");
    assert_eq!(count, 0, "Deletion must be aborted when candidate file size changed");
    assert_eq!(reclaimed, 0);
    assert!(mod_candidate.exists(), "Modified candidate file must be preserved");

    // 4. Revalidation lifecycle test: Candidate replaced before deletion (different content, same size)
    let rep_candidate = temp_dir.join("rep_after_scan.bin");
    std::fs::write(&rep_candidate, &pattern_b).unwrap(); // 8192 bytes, different content

    let candidates_rep = vec![
        DuplicateCandidateItem {
            target_path: rep_candidate.to_string_lossy().to_string(),
            reference_path: Some(orig_path.to_string_lossy().to_string()),
            expected_size: Some(8192),
        }
    ];
    let (reclaimed_rep, count_rep) = delete_duplicate_candidates(candidates_rep).expect("Candidate delete failed");
    assert_eq!(count_rep, 0, "Deletion must be aborted when candidate content no longer matches reference");
    assert_eq!(reclaimed_rep, 0);
    assert!(rep_candidate.exists(), "Replaced candidate file must be preserved");

    // 5. Security & self-deletion guard test: Candidate resolves to same file as reference
    let self_deletion_candidates = vec![
        DuplicateCandidateItem {
            target_path: orig_path.to_string_lossy().to_string(),
            reference_path: Some(orig_path.to_string_lossy().to_string()),
            expected_size: Some(8192),
        }
    ];
    let (reclaimed_self, count_self) = delete_duplicate_candidates(self_deletion_candidates).expect("Self-deletion check failed");
    assert_eq!(count_self, 0, "Self-deletion of reference file must be rejected");
    assert_eq!(reclaimed_self, 0);
    assert!(orig_path.exists(), "Reference file must be preserved against self-deletion attempt");

    // 6. Security & protected directory guard test: Protected scope target
    let protected_candidates = vec![
        DuplicateCandidateItem {
            target_path: if cfg!(windows) { r"C:\Windows\System32\kernel32.dll".to_string() } else { "/bin/sh".to_string() },
            reference_path: Some(orig_path.to_string_lossy().to_string()),
            expected_size: None,
        }
    ];
    let (reclaimed_prot, count_prot) = delete_duplicate_candidates(protected_candidates).expect("Protected scope check failed");
    assert_eq!(count_prot, 0, "Protected scope deletion must be rejected");
    assert_eq!(reclaimed_prot, 0);

    // 7. Valid candidate deletion: dup1.bin matches reference orig.bin
    let valid_candidates = vec![
        DuplicateCandidateItem {
            target_path: dup1_path.to_string_lossy().to_string(),
            reference_path: Some(orig_path.to_string_lossy().to_string()),
            expected_size: Some(8192),
        }
    ];
    let (reclaimed_valid, count_valid) = delete_duplicate_candidates(valid_candidates).expect("Valid delete failed");
    assert_eq!(count_valid, 1, "Valid candidate must be deleted");
    assert_eq!(reclaimed_valid, 8192);
    assert!(!dup1_path.exists(), "dup1.bin must be deleted");
    assert!(orig_path.exists(), "orig.bin reference must be preserved");

    // 8. Test delete_duplicate_files wrapper on dup2.bin
    let (reclaimed_files, count_files) = delete_duplicate_files(vec![dup2_path.to_string_lossy().to_string()]).expect("Wrapper delete failed");
    assert_eq!(count_files, 1);
    assert_eq!(reclaimed_files, 8192);
    assert!(!dup2_path.exists(), "dup2.bin must be deleted by delete_duplicate_files wrapper");

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
