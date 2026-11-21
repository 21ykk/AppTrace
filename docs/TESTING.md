# AppTrace Testing Guide

## Overview

AppTrace employs an automated integration verification suite (`src-tauri/src/bin/test_runner.rs`) designed to test real operating system integrations against disposable, isolated fixtures.

## Automated Verification Suite

To execute the test suite:
```bash
cargo run --manifest-path src-tauri/Cargo.toml --bin test_runner
```

### Covered Test Areas:
1. **Database & Migrations (`test_database_subsystem`):**
   - Initializes a fresh, temporary SQLite database in `%TEMP%`.
   - Runs `SCHEMA_V2` migrations and verifies `PRAGMA integrity_check == "ok"`.
   - Tests `record_operation` and history retrieval.
2. **Uninstaller Safety & Command Parsing (`test_uninstaller_safety_and_parser`):**
   - Asserts that OS roots (`C:\Windows`, `System32`, `C:\Program Files`, `C:\Users\<user>\Documents`, `C:\`) are strictly protected.
   - Tests path traversal (`..`) rejection.
   - Tests command line parsing for quoted and unquoted executable paths.
3. **Disk Analyzer (`test_disk_analyzer_subsystem`):**
   - Creates a temporary directory tree with known file sizes (500 KB, 200 KB, 50 KB).
   - Verifies recursive size aggregation and largest file ranking.
4. **Duplicate Finder (`test_duplicate_finder_subsystem`):**
   - Creates identical 8 KB files and a file with an identical first 4 KB header but a different body.
   - Proves that the 3-stage hashing pipeline rejects header collisions and eliminates false positives.
5. **Deep Cleaner (`test_cleaner_subsystem`):**
   - Verifies category detection (Temp, Crash Dumps, Browser Caches, System Logs).
6. **Win32 Registry Manager (`test_registry_manager_subsystem`):**
   - Uses an isolated test key: `HKCU\Software\AppTraceTests\UnitTesting`.
   - Creates, reads, edits, and deletes `REG_SZ`, `REG_DWORD`, and `REG_BINARY` values using native Win32 APIs.
   - Proves that safety guards block attempts to delete `HKLM` or `HKLM\SOFTWARE`.
7. **Applications Discovery (`test_applications_discovery_subsystem`):**
   - Enumerates host applications across 64-bit, 32-bit, and user registry hives.
8. **Startup Manager (`test_startup_manager_subsystem`):**
   - Discovers Run key entries and startup folder items.
9. **Services Manager (`test_services_manager_and_protection`):**
   - Queries system services and verifies critical service lockdown (`rpcss`, `samss`, `lsass`).
10. **System Health & Optimizer (`test_health_and_optimizer_subsystems`):**
    - Verifies 0–100 health index calculation and actionable recommendation generation.
11. **Universal Resource Hunter (`test_universal_hunter_subsystem`):**
    - Executes cross-subsystem search across applications, processes, files, and registry.

## Portable Release Smoke Verification

To verify that the compiled portable binary starts, initializes its UI, and runs without errors:
```powershell
powershell.exe -ExecutionPolicy Bypass -File scripts\verify-release.ps1
```
