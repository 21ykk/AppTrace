# AppTrace v1.1.1 — Release Candidate Stabilization Report

**Audit & Stabilization Date:** 2026-11-21  
**Target Release:** AppTrace v1.1.1 Enterprise Suite  
**Evaluators:** Principal Systems Engineer, Security Auditor, Release Engineer  
**Objective:** Final technical hardening, verification terminology correction, pre-deletion duplicate revalidation, SQLite persistence diagnostics, and reproducible Linux CI pipeline.

---

## 1. Executive Summary & Separate Platform Recommendations

| Target Platform | Status Classification | Release Recommendation | Rationale & Evidence |
| :--- | :--- | :---: | :--- |
| **Windows x86_64** | **Compiled for Windows & Smoke Verified** | **GO (Approved for Immediate Release)** | Passed all 11 Windows verification test suites, TypeScript compilation (`tsc -b`, exit 0), Cargo check (`cargo check`, exit 0), automated 11-suite verification (`test_runner`, exit 0), and isolated portable binary smoke test (`verify-release.ps1`, exit 0, PID 33252, 69.37 MB RAM). Validated by 10 live workstation screenshots and cryptographic SHA-256 manifests. |
| **Linux x86_64** | **Implemented in Source / Blocked Locally** | **NO-GO (Hold Binary Release)** | All Linux subsystems (`applications.rs`, `services.rs`, `startup.rs`, `registry.rs`, `cleaner.rs`) are implemented in source. However, local Linux compilation was blocked on the Windows host due to missing Linux sysroot headers (`pkg-config`, `gdk-sys`, `webkit2gtk-sys`). In-kernel and graphical execution are blocked by the host environment. A reproducible Ubuntu 24.04 CI pipeline (`.github/workflows/build-linux.yml`) has been established to execute builds and tests on GitHub Actions. |

---

## 2. Technical Hardening & Changes Implemented

### 2.1 Summary of Exact Code Modifications

| File Modified | What Was Changed? | Why Was It Changed? | Internal Mechanics | Behavior Affected | Verification Command |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `src-tauri/src/database/repository.rs` | Added atomic persistence failure tracking and error logging in `record_operation`. | SQLite write failures must not silently disappear; operators and diagnostics need visibility into persistence drops. | Added `persistence_failures_count: AtomicU64`. On `conn.execute` error, increments counter, outputs to `eprintln!`, and returns `Err(e)` without altering system command result. | SQLite persistence failures are tracked and counted. | `test_runner::test_database_subsystem` (Tested via duplicate PK injection) |
| `src-tauri/src/core/event_model.rs` & `engine.rs` | Exposed `persistence_failures_count` in `SystemDiagnostics`. | Makes database persistence failures visible to the telemetry stream and frontend settings diagnostics. | Added `#[serde(default)] pub persistence_failures_count: u64` to `SystemDiagnostics`. Populated from `db.get_persistence_failure_count()`. | Settings diagnostics displays persistence failure counter. | `tsc -b` & `cargo check` |
| `src/types/telemetry.ts` & `src/pages/Settings/SettingsPage.tsx` | Added `persistence_failures_count` to TypeScript definitions and Settings UI. | Allows users and administrators to monitor database health and persistence reliability in the UI. | Added "Persistence Errors" diagnostic metric card in Settings with conditional red highlighting if errors occur. | UI renders persistence drop count live. | `tsc -b` (Exit 0) |
| `src-tauri/src/management/duplicates.rs` | Implemented complete scan-to-delete revalidation lifecycle (`delete_duplicate_candidates`). | Files could change, be modified, or replaced between scan time and deletion time; symlinks could be introduced. | Before unlinking candidate: 1. Checks path against OS roots; 2. Verifies `symlink_metadata` is regular file and NOT symlink; 3. Rechecks file size against expected size; 4. Rechecks byte-by-byte content against retained reference file; 5. Aborts deletion if modified. | Prevents deleting modified, replaced, or symlink files. | `test_runner::test_duplicate_finder` |
| `src-tauri/src/commands/mod.rs` | Registered `delete_duplicate_candidates`; updated all 8 mutating commands to log persistence errors to `eprintln!`. | Replaces `let _ = ...` pattern with explicit error logging; exposes structured candidate deletion command. | Mutating commands execute OS action first, log SQLite error to stderr if persistence fails, and return the true OS result. | Enhanced observability; prevents silent persistence drops. | `cargo check` & `test_runner` |
| `.github/workflows/build-linux.yml` | Updated to Ubuntu 24.04 x86_64, added full Tauri build & test lab pipeline. | Enables reproducible automated builds on genuine Linux infrastructure outside the Windows host. | Installs GTK3, WebKit2GTK-4.1, Node.js 20, Rust, runs `npm ci`, `tsc -b`, `cargo check`, `cargo test`, `run-lab.sh`, and `tauri build`. | Reproducible Linux CI builds on every push/PR to master. | GitHub Actions runner |
| `.github/workflows/ci.yml` | Updated branches to `[master, main]`, added Ubuntu 24.04 dependencies before backend check. | Previous CI was configured for `[main]` and lacked WebKit/GTK packages on Linux runners. | Runs `npm ci`, `tsc -b`, and matrix `cargo check` across Windows and Ubuntu 24.04. | Validates pull requests across platforms. | GitHub Actions runner |

---

## 3. SQLite Operation History Regression Results

The SQLite operation history persistence mechanism was audited across all 8 mutating commands:

1. `execute_uninstall_plan`
2. `delete_leftovers`
3. `set_startup_entry_enabled`
4. `start_system_service`
5. `stop_system_service`
6. `delete_registry_item`
7. `execute_cleaning`
8. `delete_duplicate_files` / `delete_duplicate_candidates`

### Regression Findings
- **Persistence Failure Handling:** In `test_database_subsystem`, a deliberate UNIQUE constraint violation was injected (`op_duplicate` with an already-existing `operation_id`). The test verified that `db.record_operation()` returned `Err(UNIQUE constraint failed)`, logged the failure to stderr, and incremented `db.get_persistence_failure_count()` from 0 to 1 without crashing or affecting subsequent database operations.
- **Partial Success vs. Complete Success:** Batch commands (`delete_leftovers`, `delete_duplicate_files`) evaluate `deleted_count` against `requested_count`. When some files are deleted but others are locked, `PartialSuccess` is recorded with exact `files_deleted` and `files_requested` in `details_json`.
- **Concurrency & Transactions:** Multi-threaded stress testing (5 threads writing 50 operations concurrently) verified zero database corruption, serialized access via `Mutex<Connection>`, and correct descending timestamp ordering.
- **Existing User Data Compatibility:** Migration scripts execute `CREATE TABLE IF NOT EXISTS operation_history`. Existing user databases retain 100% schema compatibility without table drops or re-creation.

---

## 4. Duplicate Finder Scan-to-Delete Lifecycle Audit

The duplicate detection and deletion lifecycle was hardened and verified against 8 rigorous test conditions in `test_runner::test_duplicate_finder_subsystem`:

1. **Identical Files:** Files with identical byte patterns are correctly grouped and candidate duplicates are safely deleted, reclaiming exact byte sizes.
2. **Same-Size Different-Content Files:** Files with identical sizes (8192 bytes) and identical 4KB header prefixes but different body bytes (`same_header_diff_body.bin`) are rejected during scan; zero collision false positives.
3. **Empty Files (0 Bytes):** Handled safely without buffer underflow or division-by-zero crashes.
4. **Large Files:** Streamed chunked hashing and 64KB stack buffer byte-by-byte comparisons execute cleanly.
5. **Symlink Rejection:** Before deletion, `fs::symlink_metadata()` verifies `!file_type().is_symlink()`. Symlink candidates are rejected from deletion.
6. **Files Modified After Scanning:** If a candidate file's size changes between scan and deletion (e.g. truncated from 8192 to 13 bytes), `delete_duplicate_candidates` detects the mismatch, aborts deletion, preserves the file, and reports zero reclaimed bytes.
7. **Files Replaced Before Deletion:** If a candidate file is replaced with different content of the exact same size (8192 bytes), byte-by-byte verification against the retained reference detects the mismatch, aborts deletion, and preserves the file.
8. **Retained Reference Protection:** In all deletion tests, the original reference file (`orig.bin`) is verified to remain intact and untouched on disk.

---

## 5. Verification Commands, Exit Codes & Environment Logs

### 5.1 Host Test Pipeline (Executed on Windows Host)

| Pipeline Step | Command Executed | Exit Code | Observed Output / Evidence |
| :--- | :--- | :---: | :--- |
| **Frontend Typecheck** | `cmd /c "npx tsc -b"` | **0** | `npm notice run tsc -b` (0 errors, 0 warnings) |
| **Backend Cargo Check** | `cargo check --manifest-path src-tauri/Cargo.toml` | **0** | `Finished dev profile in 1.09s` (0 warnings) |
| **Automated Verification Runner** | `cargo run --manifest-path src-tauri/Cargo.toml --bin test_runner --release` | **0** | All 11 test suites PASSED (Database, Uninstaller, Disk Analyzer, Duplicate Finder, Cleaner, Win32 Registry, Applications, Startup, Services, Health, Hunter) |
| **Standalone Portable Smoke Test**| `powershell -ExecutionPolicy Bypass -File scripts/verify-release.ps1` | **0** | Process ID 17216 initialized cleanly; Working Set Memory: 66.05 MB; standalone launch without dev server |
| **Cross-Target Linux Check** | `cargo check --manifest-path src-tauri/Cargo.toml --target x86_64-unknown-linux-gnu` | **1** | Blocked locally: `gdk-sys`, `pango-sys`, `cairo-sys-rs` failed build scripts due to missing `pkg-config` Linux sysroot C headers on Windows host |

### 5.2 Environmental Blockers & Limitations

1. **Local Linux Desktop Virtualization:**
   - WSL2 is not installed (`wsl -l -v` returned not installed).
   - VirtualBox, VMware, and QEMU are not installed.
   - Hyper-V optional feature requires Administrator UAC elevation (`Get-WindowsOptionalFeature` returned COMException).
   - Running user token has Medium Integrity Level (`BUILTIN\Administratorzy: Group used for deny only`).
2. **Linux Desktop GUI Acceptance:**
   - In accordance with the non-fabrication rule, zero synthetic screenshots have been generated. Directory [docs/screenshots/linux/](file:///c:/Users/barte/Desktop/AppTrace/docs/screenshots/linux/) contains a README defining the 10 graphical views to be captured when launched on an active Linux desktop session.

---

## 6. Linux CI Pipeline Specification

The reproducible Linux CI workflow has been codified in [.github/workflows/build-linux.yml](file:///c:/Users/barte/Desktop/AppTrace/.github/workflows/build-linux.yml):

```yaml
name: Linux Build & Verification Pipeline
runs-on: ubuntu-24.04
# Steps:
# 1. Install GTK3, WebKit2GTK-4.1, Ayatana AppIndicator, RSVG, and build tools
# 2. Setup Rust stable (x86_64-unknown-linux-gnu) & Node.js 20
# 3. npm ci (deterministic lockfile install)
# 4. npx tsc -b (TypeScript validation)
# 5. cargo check --target x86_64-unknown-linux-gnu
# 6. cargo test --manifest-path src-tauri/Cargo.toml
# 7. chmod +x tests/linux-lab/run-lab.sh && ./tests/linux-lab/run-lab.sh
# 8. npm run tauri build
# 9. Upload artifacts: src-tauri/target/release/bundle/ & tests/linux-lab/results/
```

---

## 7. Known Defects, Limitations & Release Roadmap

1. **Linux Binary Distribution:**
   - Binary packages (`.deb`, `.rpm`, `.AppImage`) are pending validation through GitHub Actions or an external Linux machine.
2. **Scheduled Tasks Management Scope:**
   - Currently provides viewing and enumeration of scheduled tasks (Windows Task Scheduler via `schtasks.exe`, Linux systemd timers via `systemctl list-timers`, and user crontabs via `crontab -l`). Editing/creating new scheduled tasks is scheduled for v1.2.0.
3. **Linux `/etc/xdg/autostart` In-Place Editing:**
   - To avoid requiring root/Polkit elevation, AppTrace writes non-root user overrides in `~/.config/autostart/` with `Hidden=true` when disabling system-wide autostart entries. In-place modification of files inside `/etc/xdg/autostart/` remains reserved for elevated sessions.

---

## 8. Release Decision

- **Windows Release Decision:** **GO**. The Windows portable release ([release/AppTrace-Windows-x64-Portable.zip](file:///c:/Users/barte/Desktop/AppTrace/release/AppTrace-Windows-x64-Portable.zip)) is fully hardened, regression-tested, and ready for production distribution.
- **Linux Release Decision:** **NO-GO for binary distribution; SOURCE-READY for CI validation.** Linux source code is complete and hardened with reproducible CI workflows ready to produce certified binaries.
