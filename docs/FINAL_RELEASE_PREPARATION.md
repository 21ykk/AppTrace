# AppTrace v1.1.1 — Repository Cleanup & Release Preparation Report

**Document Date:** November 21, 2026  
**Target Release:** AppTrace v1.1.1  
**Repository:** [https://github.com/21ykk/AppTrace](https://github.com/21ykk/AppTrace)  
**Lead Release Engineer:** Principal Software Architect, Release Engineer & Systems Auditor  

---

## 1. Executive Release Overview

AppTrace v1.1.1 has reached full production readiness on Windows x64. The documentation portal has been reorganized, factual consistency enforced across all guides, and cryptographic release checksums recalculated directly from disk.

### Dual-Platform Release Channels:
- **Windows x64 — Stable:** Approved for release (**GO**). Fully self-contained portable distribution (`AppTrace-Windows-x64-Portable.zip`, 7.98 MB). Tested and verified on Windows 11 Pro x64 (Build 26300) host workstation with zero dev-server dependency. Target requirements: Windows 10 (1809+) and Windows 11 (x64) with Microsoft Edge WebView2.
- **Linux x64 — Public Beta:** Evaluation channel (**NO-GO for binary release; Source Evaluation Only**). Native Linux compilation has not yet been verified on a Linux build machine, and interactive Linux desktop GUI behavior has not yet been tested. Build instructions are provided for developer evaluation only and are not certified as a tested installation procedure. Packaged binary distributions (.deb, .rpm, .AppImage) are currently unavailable. The Linux Beta status does not affect Windows Stable availability.

---

## 2. Git Review & Working Tree Status

A comprehensive review of the active working tree was conducted:
- `git diff --check` executed with **exit code 0** (0 whitespace errors).
- All compiler checks (`cargo check --manifest-path src-tauri/Cargo.toml`) pass with **exit code 0** (0 errors, 0 warnings).
- Frontend type checking (`npx tsc -b`) passes with **exit code 0** (0 errors).
- Automated test harness (`cargo run --bin test_runner --release`) passes with **exit code 0** (11/11 test suites passed).

### A. Working Tree File Classifications:
1. **Core Backend Changes (`src-tauri/`):**
   - `src-tauri/src/management/duplicates.rs`: Multi-stage candidate revalidation, self-deletion prevention (`canonical_target == canonical_ref`), symlink rejection, pre/post metadata re-verification.
   - `src-tauri/src/management/scheduled_tasks.rs`: Enumeration and state toggling for Windows Task Scheduler and Linux systemd timers / crontab.
   - `src-tauri/src/management/startup.rs`: Startup entry enumeration and user-space XDG autostart masking overrides (`~/.config/autostart`).
   - `src-tauri/src/management/services.rs`: Service listing and user-session service controls with critical OS service lockouts.
   - `src-tauri/src/database/repository.rs`: Thread-safe `persistence_failures_count: AtomicU64` and decoupled SQLite error propagation.
   - `src-tauri/src/commands/mod.rs`: Registered management IPC commands with decoupled error handling.
   - `src-tauri/src/bin/test_runner.rs`: Comprehensive 11-suite integration test harness.
2. **Frontend Workstation Changes (`src/`):**
   - `src/pages/Settings/SettingsPage.tsx`: Live persistence failure indicator with safe fallback (`diagnostics.persistence_failures_count ?? 0`).
   - `src/pages/ScheduledTasks/ScheduledTasksPage.tsx`: Scheduled tasks and systemd timer table with search and state toggling.
   - `src/types/telemetry.ts`: Optional typing for persistence failure diagnostics.
   - Design system polish: Strictly neutral **Dark Graphite** enterprise theme across all modules.
3. **CI / CD Pipeline Changes (`.github/workflows/`):**
   - `.github/workflows/build-linux.yml`: Codified Ubuntu 24.04 automated CI pipeline with WebKit2GTK 4.1, GTK 3, and disposable Linux test lab.
   - `.github/workflows/ci.yml`: Multi-OS check matrix.
4. **Documentation System (`docs/` & `README.md`):**
   - `README.md`: Restructured into 12 standardized landing page sections with repository-relative asset links.
   - `docs/README.md`: Central documentation navigation portal.
   - `docs/installation/WINDOWS.md`: Step-by-step Windows Portable guide.
   - `docs/installation/LINUX.md`: LINUX — PUBLIC BETA guide (clarifying unverified native build status and non-root execution).
   - `docs/installation/TROUBLESHOOTING.md`: Practical non-destructive troubleshooting.
   - `docs/guides/FIRST-START.md`: User onboarding guide.
   - `docs/guides/FEATURES.md`: Comprehensive module specifications including Scheduled Tasks.
   - `docs/guides/UNINSTALLATION.md`: Clean removal guide.
   - `docs/development/BUILDING.md`: Build instructions for developers.
   - `docs/development/CONTRIBUTING.md`: Contribution and verification standards.
   - `docs/DOCUMENTATION_AUDIT.md`: Formal quality and link verification audit.

---

## 3. Verified Release Artifacts & Recalculated Checksums

All release files were inspected directly on disk and re-hashed using `Get-FileHash -Algorithm SHA256`:

```text
release/
├── AppTrace-Windows-x64-Portable.zip    # Standalone portable archive (8,370,456 bytes / ~7.98 MB)
├── checksums/
│   └── SHA256SUMS.txt                   # Cryptographic SHA-256 hash manifest
└── portable/
    └── AppTrace/
        ├── AppTrace.exe                 # Standalone release binary (27,290,400 bytes / ~26.03 MB)
        ├── WebView2Loader.dll           # WebView2 connector library (160,880 bytes / ~157 KB)
        ├── PORTABLE_README.md           # Portable launch instructions (2,782 bytes)
        ├── README.txt                   # Release overview (3,955 bytes)
        └── LICENSE.txt                  # MIT License (389 bytes)
```

### Authoritative Recalculated SHA-256 Checksums:
```text
SHA256 (release/AppTrace-Windows-x64-Portable.zip) =
e35ff28dbfc926fcbcf836fde3e13415c8537be2c3f9bc19f32ed7df2df246cb

SHA256 (release/portable/AppTrace/AppTrace.exe) =
f511a673bf0b3bc0d3cae1094fb05ee2d31e7c1e05da70064fe4cac88ef22cd9

SHA256 (release/portable/AppTrace/WebView2Loader.dll) =
86545b66cdb0603bc26b626fb9ad610cb6e71f28d468f5ea66df23b03dda96d5
```

### Checksum Consistency Audit:
- All documentation files (`README.md`, `docs/installation/WINDOWS.md`, `docs/RELEASE_READINESS_REPORT.md`, and `release/checksums/SHA256SUMS.txt`) strictly reference these exact recalculated hashes.
- Zero outdated or conflicting hashes remain in the project.

---

## 4. Platform Readiness Evaluation

### Windows x64 — Stable (Release Verified):
- **Readiness Decision:** **GO**
- **Platform Compatibility Distinctions:**
  - **Actual Tested Environment:** Windows 11 Pro x64 (Build 26300) with Microsoft Edge WebView2 Evergreen Runtime.
  - **Supported Platform Requirements:** Windows 10 x64 (Version 1809 / Build 17763 or higher) and Windows 11 x64, with Microsoft Edge WebView2 Runtime. Broad compatibility across all individual Windows 10/11 revisions is based on standard Win32 / Tauri 2 API targets; individual testing was executed on the Windows 11 Pro test workstation.
  - **Automated Validation Results:**
    - TypeScript validation: `npx tsc -b` -> Exit code 0 (0 errors).
    - Rust compiler checks: `cargo check` -> Exit code 0 (0 errors, 0 warnings).
    - Integration test harness: `cargo run --bin test_runner --release` -> Exit code 0 (11/11 suites passed).
    - Standalone smoke launch: `verify-release.ps1` -> Exit code 0 (PID 33252, 69.37 MB RAM, zero dev-server dependency).
    - UI verification: 10 live workstation screenshots corroborating telemetry and management views on the tested Windows 11 Pro host.

### Linux x64 — Public Beta (Unverified Native Build):
- **Readiness Decision:** **NO-GO for Packaged Binary Release; Source Evaluation Only**
- **Status & Evidence Scope:**
  - Linux source modules are implemented and checked against Windows target builds.
  - Native Linux compilation has not yet been verified on a genuine Linux build host.
  - Linux GUI behavior has not yet been tested in a live desktop environment.
  - Automated CI workflow `.github/workflows/build-linux.yml` is codified with WebKit2GTK 4.1 and GTK 3 dependencies.
  - Build instructions are provided for developer evaluation only and are not certified as a tested installation procedure.
  - Pre-compiled packages (.deb, .rpm, .AppImage) are withheld.
  - Linux Beta status does not affect Windows Stable availability.

---

## 5. Technical Feature Audits & Factual Policy

### A. Privacy and Telemetry Scope
- **Application Codebase Finding:** Source code inspection of `src-tauri/` and `src/` confirms that AppTrace implements no outbound analytics, tracking beacons, error reporting telemetry, or update-checking client.
- **Third-Party Dependency Boundary:** Third-party platform runtime components (specifically Microsoft Edge WebView2 on Windows or WebKit2GTK on Linux) and operating system components may generate standard network traffic (such as SmartScreen reputation queries, certificate revocation checks, or runtime telemetry) that is external to and unmanaged by AppTrace application code.
- **Authoritative Wording:**
  > "AppTrace is designed as a local-first application. Application data and operation history are stored locally. No intentional analytics or telemetry service is documented."

### B. Scheduled Tasks Implementation Scope
- **Windows Task Scheduler:** Enumeration and state toggling are implemented. Enumerates registered tasks via PowerShell `Get-ScheduledTask` (with `schtasks.exe /query` fallback) and toggles task state (`/enable` / `/disable`) via `schtasks.exe`. Creating new scheduled tasks, defining schedules, or editing existing triggers/actions is not implemented. State toggling performs an active state modification.
- **Linux systemd Timers & Crontab:** Implemented in source for enumeration (`systemctl list-timers`, `crontab -l`) and timer toggling (`systemctl start/stop`). Untested in live Linux desktop sessions. User crontab entries are enumeration-only (toggling and editing crontabs are not supported). Creating new timers or editing crontab entries is not implemented.
- **Policy:** State toggling is not described as read-only. Unimplemented task creation and editing features are not advertised. No unapproved roadmap promises are included.

### C. Linux Privilege & Autostart Scope
- **Autostart Modifications:** Operates exclusively within user-owned locations (`~/.config/autostart`). For system-wide entries (`/etc/xdg/autostart`), AppTrace writes a masking user desktop entry with `Hidden=true` per the XDG desktop specification. It does not modify system directories in `/etc`.
- **Systemd Service Operations:** Commands execute directly under the current user's unprivileged session (`systemctl start/stop`). AppTrace has no Polkit integration, no `pkexec` wrapper, and does not support privileged operations.
- **Execution Policy:** Running AppTrace as root (`sudo apptrace`) is strictly prohibited.

---

## 6. Suggested Git Commit Message

When committing these changes, the following standardized commit message is recommended:

```text
chore(release): finalize AppTrace v1.1.1 Windows Stable and Linux Beta release notes

- Enforce conservative local-first privacy statement distinguishing application scope from WebView2 runtime.
- Update Linux Public Beta status: mark native build and GUI behavior unverified, withhold packaged binaries.
- Define Scheduled Tasks scope: document enumeration and state toggling; omit unimplemented editing.
- Clarify Linux autostart: document user-owned XDG override behavior and remove unsupported Polkit claims.
- Purge local file URLs from public-facing documentation and synchronize repository-relative links.
- Re-verify SHA-256 manifests across portable archive and release binaries.
```

---

## 7. Suggested GitHub Release Notes

The following release notes are prepared for publishing the v1.1.1 release on GitHub:

```markdown
# AppTrace v1.1.1 — Windows Stable

AppTrace v1.1.1 is an open-source, local-first desktop system observability and management workstation built with Tauri 2, Rust, React 19, and SQLite.

## Overview & Release Channels

- **Windows x64 — Stable:** Primary stable release channel. Distributed as a standalone, zero-install portable ZIP archive. Verified on Windows 11 Pro x64 test host; target platform requirements: Windows 10 (1809+) and Windows 11 (x64) with Microsoft Edge WebView2.
- **Linux x64 — Public Beta:** Evaluation channel. Native Linux compilation and GUI behavior have not yet been tested or verified. Build instructions are provided for evaluation only and are not certified as a tested installation procedure. Packaged binary distributions (.deb, .rpm, .AppImage) are unavailable. The Linux Beta status does not affect Windows Stable availability.

---

## Key Highlights

### 🪟 Windows Stable Highlights
- **Zero-Install Portable Distribution:** Packaged as a single standalone ZIP archive (`AppTrace-Windows-x64-Portable.zip`, 7.98 MB) containing `AppTrace.exe` (26.03 MB) and `WebView2Loader.dll` with embedded frontend assets. Zero local development servers or runtime installers required.
- **Hierarchical Process Tree:** Real-time process exploration with parent/child trees, flat lists, PIDs, CPU%, Private Working Set RAM, disk I/O, status, and full executable path resolution.
- **Native Win32 Subsystems:** Direct Win32 API integration for Registry browsing and editing (`RegOpenKeyExW`, `RegEnumValueW`, `RegSetValueExW`) and Service Control Manager (SCM) inspection and toggling.
- **Storage & System Cleaning:** Multi-category cleaner for temporary files, WER error reports, crash dumps, and browser caches; directory size allocation analyzer; and 3-stage duplicate file detection.
- **Local-First Architecture:** AppTrace is designed as a local-first application. Application data and operation history are stored locally in an embedded SQLite database (`WAL` mode). No intentional analytics or telemetry service is documented. (Third-party runtime components, such as Microsoft Edge WebView2, may perform standard platform queries outside application control.)

### 🐧 Linux Public Beta Status
- **Public Beta Status:** Linux x64 support is in Public Beta.
- **Native Compilation Unverified:** Native Linux compilation has not yet been verified on a Linux build host.
- **GUI Behavior Untested:** Interactive Linux desktop GUI behavior has not yet been tested.
- **Build Instructions for Evaluation Only:** Source build instructions are provided for developer evaluation but are not certified as a tested installation procedure.
- **No Packaged Binaries Available:** Pre-compiled `.deb`, `.rpm`, and `.AppImage` packages are unavailable.
- **Windows Stable Unaffected:** Linux Beta status does not affect Windows Stable availability.
- **Standard User Execution:** AppTrace is engineered to run as a standard non-root user. Running AppTrace as root (`sudo apptrace`) is strictly prohibited.

---

## Main Technical & Security Improvements in v1.1.1

1. **Duplicate Finder Security Hardening:**
   - **Self-Deletion Guard:** Added canonical path verification (`canonical_target == canonical_ref`) to prevent a duplicate candidate that points to the reference file from deleting itself.
   - **Symlink Rejection:** Uses `symlink_metadata` to reject symlink targets and prevent link-following deletion attacks.
   - **Pre/Post Metadata Revalidation:** Re-verifies target file size, modification timestamp, and file type immediately before and after byte-by-byte direct comparison to minimize the TOCTOU race window.
   - **System Root Protection:** Automatically blocks candidate deletion in protected operating system scopes (`C:\Windows`, `System32`, `SysWOW64`, `Program Files`, `/etc`, `/bin`, `/boot`, `/usr`).
2. **SQLite Reliability & Decoupled Error Handling:**
   - Added thread-safe `persistence_failures_count: AtomicU64` to track database write conflicts without panics.
   - Exposed persistence failure metrics to diagnostics telemetry and the Settings UI with safe fallback (`diagnostics.persistence_failures_count ?? 0`).
   - Decoupled OS command execution results from SQLite history logging. A database persistence error logs to stderr and increments the failure counter, but never falsely reports that an OS operation failed if it actually succeeded.
3. **Defensive Safety Shields:**
   - Critical system services (`rpcss`, `samss`, `lsass`, `csrss`, `winlogon`, `cryptsvc`, `eventlog`) cannot be stopped or disabled.
   - Critical registry hives (`SAM`, `SECURITY`, `SYSTEM\CurrentControlSet`) are locked against modification.
   - Cleaners and uninstaller leftover scanners reject relative path traversal (`..`) and canonicalize all paths.
4. **Automated Verification Harness:**
   - Integrated `test_runner.rs` executing 11 isolated test suites across database migrations, uninstaller safety, duplicate revalidation, Win32 registry manipulation, and service locks.

---

## Download & Installation (Windows Stable)

1. Download **`AppTrace-Windows-x64-Portable.zip`** (7.98 MB) from the release assets below.
2. Verify the cryptographic SHA-256 hash in PowerShell:
   ```powershell
   Get-FileHash -Algorithm SHA256 .\AppTrace-Windows-x64-Portable.zip
   # Expected: e35ff28dbfc926fcbcf836fde3e13415c8537be2c3f9bc19f32ed7df2df246cb
   ```
3. Extract the ZIP archive to a folder on your system (e.g. `C:\Tools\AppTrace`).
4. Double-click `AppTrace.exe` to run.

For detailed setup instructions and SmartScreen verification, see the [Windows Installation Guide](installation/WINDOWS.md).

---

## Verified Release Assets & SHA-256 Checksums

| Asset Filename | File Size | SHA-256 Checksum |
| :--- | :---: | :--- |
| **`AppTrace-Windows-x64-Portable.zip`** | 8,370,456 bytes (~7.98 MB) | `e35ff28dbfc926fcbcf836fde3e13415c8537be2c3f9bc19f32ed7df2df246cb` |
| **`portable/AppTrace/AppTrace.exe`** | 27,290,400 bytes (~26.03 MB) | `f511a673bf0b3bc0d3cae1094fb05ee2d31e7c1e05da70064fe4cac88ef22cd9` |
| **`portable/AppTrace/WebView2Loader.dll`** | 160,880 bytes (~157 KB) | `86545b66cdb0603bc26b626fb9ad610cb6e71f28d468f5ea66df23b03dda96d5` |
| **`SHA256SUMS.txt`** | 275 bytes | Cryptographic manifest file |

---

## Documentation Links

- 📖 **[Documentation Portal](README.md):** Central documentation navigation portal.
- 🪟 **[Windows Installation Guide](installation/WINDOWS.md):** Installation, SHA-256 validation, and SmartScreen guidance.
- 🐧 **[Linux Installation Guide (Public Beta)](installation/LINUX.md):** Requirements, system libraries, and source evaluation instructions.
- 🚀 **[First Start Guide](guides/FIRST-START.md):** Interface walkthrough, dashboard metrics, and safe workflows.
- 🛠️ **[Troubleshooting Guide](installation/TROUBLESHOOTING.md):** Practical solutions for startup, permission, and database issues.
- 🧹 **[Uninstallation Guide](guides/UNINSTALLATION.md):** Clean removal of application files and local SQLite database.
- 📊 **[Independent Verification Report](INDEPENDENT_VERIFICATION_REPORT.md):** Full engineering verification evidence and test logs.

---

## Known Limitations

1. **Linux Packaged Binaries Unavailable:** Pre-compiled `.deb`, `.rpm`, and `.AppImage` packages are unavailable. Native Linux compilation and GUI behavior are unverified; source build instructions are provided for developer evaluation only.
2. **Scheduled Tasks Module Scope:** Implements enumeration and state toggling (enabling/disabling on Windows via `schtasks.exe`; starting/stopping systemd timers on Linux). State toggling is an active state modification and is not read-only. Creating new tasks, defining schedules, or editing existing triggers and actions are not implemented. User crontab entries on Linux are enumeration-only (toggling and editing are not supported).
3. **Linux Privilege Scope:** Autostart modifications operate exclusively within user-owned locations (`~/.config/autostart`). Modifying system-level systemd units from AppTrace is not supported (Polkit privilege escalation is not implemented).
```

---

## 8. Final Pre-Release Verification Checklist

All items below have been verified against actual code, test suites, and release assets:

- [x] **Windows release archive verified:** `release/AppTrace-Windows-x64-Portable.zip` exists, contains valid portable files (`AppTrace.exe`, `WebView2Loader.dll`, `PORTABLE_README.md`, `README.txt`, `LICENSE.txt`), and has no development junk or machine-specific data.
- [x] **SHA-256 checksums verified:** Hashes recalculated live from disk using `Get-FileHash`; identical across `SHA256SUMS.txt`, `README.md`, `docs/installation/WINDOWS.md`, and `docs/RELEASE_READINESS_REPORT.md`.
- [x] **Portable smoke test passed:** Standalone executable verified via `verify-release.ps1` (PID 33252, 69.37 MB working set RAM, custom protocol asset resolution, 0 dev-server dependency).
- [x] **TypeScript validation passed:** `cmd /c "npx tsc -b"` completed with exit code 0 (0 type errors).
- [x] **Rust compilation passed:** `cargo check --manifest-path src-tauri/Cargo.toml` completed with exit code 0 (0 errors, 0 warnings).
- [x] **Automated test suites passed:** `cargo run --bin test_runner --release` completed with exit code 0 (11/11 test suites passed).
- [x] **Documentation links verified:** All relative links verified with 0 broken links; public release notes contain zero local `file:///` URLs.
- [x] **Conservative privacy wording applied:** Claims strictly describe local-first design; no unverified "zero network activity" claims for third-party WebView2 runtime.
- [x] **Linux Beta status accurate:** Packaged binaries marked unavailable; native compilation and GUI behavior marked unverified; non-root execution policy enforced.
- [x] **Scheduled Tasks scope accurate:** Enumeration and toggling documented; unverified creation/editing omitted; no unapproved roadmap claims.
