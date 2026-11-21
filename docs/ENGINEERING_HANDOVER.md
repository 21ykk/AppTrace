# AppTrace — Engineering Handover Documentation

**Target Audience:** Incoming Senior Software Engineer / Lead Maintainer  
**Release Version:** v1.1.1  
**Date:** 2026-11-21  

---

## Technical Q&A Walkthrough

### 1. What exactly did you change?
We evolved AppTrace from a read-only monitoring prototype into an enterprise desktop observability, diagnostic, and system management workstation. Key transformations include:
- Replaced slow PowerShell registry spawning with native Win32 APIs (`RegOpenKeyExW`, `RegSetValueExW`).
- Implemented Linux subsystem implementations for application discovery (`dpkg`, `rpm`, `flatpak`), services control (`systemctl`), XDG startup autostart, and `/etc` configuration navigation.
- Built a multi-layer **Safety Shield** (`is_safe_directory`, system root blacklisting, critical service lockdown).
- Created a reproducible Linux test lab (`tests/linux-lab/`) with disposable fixtures and automated assertions.
- Packaged a verified Windows Portable distribution with genuine cryptographic SHA-256 checksums.

### 2. Why did you change it?
- **Security & Safety:** External shell spawning (`powershell -Command "..."` or string concatenation) introduced command injection risks and high latency. Native Win32 APIs and explicit argument vectors (`std::process::Command::args`) guarantee execution safety.
- **Cross-Platform Parity:** Enterprise sysadmins operate hybrid environments; AppTrace's core value is unifying low-overhead telemetry with application management across Windows and Linux.
- **Portability:** Users need a self-contained binary that can run from USB drives without polluting system files or requiring administrative installers.

### 3. How does each new or modified module work?
- **Applications Manager:** Scans 64-bit/32-bit Windows registry roots or Linux package managers; correlates active processes with installation directories and configuration folders.
- **Advanced Uninstaller & Leftover Scanner:** Parses uninstaller commands into structured binaries and arguments; recursively locates orphaned publisher and app folders in AppData / ~/.config, enforcing strict blacklists against OS roots.
- **Registry / Linux Config Manager:** Provides a hierarchical tree explorer for Windows hives (HKCU/HKLM) or Linux `/etc`, supporting safe value inspection and editing.
- **Startup Manager:** Discovers autostart entries in Run keys or `.desktop` files, toggling state via safe name prefixes (`AppTrace_Disabled_`) without deleting command data.
- **Services Manager:** Interfaces with Win32 SCM or `systemctl`, classifying services and hard-locking core OS services from termination.
- **Deep Cleaner & Disk Analyzer:** Traverses user temp/cache directories and directory trees with dynamic byte filtering, memory-bounded pruning, and symlink loop avoidance.
- **Duplicate Finder:** 3-stage validation (Size $\rightarrow$ 4KB Header Hash $\rightarrow$ Full Stream Hash + Chunked 64KB Byte-by-Byte identity verification) ensuring byte-level identity verification before unlinking.

### 4. Which source files implement it?
- Core Management Modules: `src-tauri/src/management/` (`applications.rs`, `uninstall.rs`, `registry.rs`, `startup.rs`, `services.rs`, `scheduled_tasks.rs`, `cleaner.rs`, `disk_analyzer.rs`, `duplicates.rs`, `health.rs`, `optimizer.rs`, `hunter.rs`).
- Safety & Permissions: `src-tauri/src/security/` (`permissions.rs`, `redaction.rs`).
- Database & History: `src-tauri/src/database/` (`repository.rs`, `schema.rs`, `migrations/`).
- Tauri Command Boundary: `src-tauri/src/commands/mod.rs`.
- Automated Test Runner: `src-tauri/src/bin/test_runner.rs`.
- Linux Test Lab: `tests/linux-lab/`.

### 5. Which Linux APIs and commands does it use?
- `dpkg-query` (`-W`, `-f=...`) for Debian/Ubuntu software enumeration.
- `rpm` (`-qa`, `--qf=...`) for RedHat/Fedora/openSUSE package enumeration.
- `flatpak` (`list`, `--app`) for universal sandbox applications.
- `systemctl` (`list-units`, `start`, `stop`, `list-timers`) for systemd unit management.
- Standard POSIX filesystem calls (`std::fs::read_dir`, `canonicalize`, `metadata`, `remove_file`) for file operations.
- `crontab -l` for scheduled cron job discovery.

### 6. How does the frontend communicate with the backend?
The React frontend invokes asynchronous Tauri IPC commands via `@tauri-apps/api/core::invoke('<command_name>', { ...args })`. Real-time telemetry is streamed from the Rust background loop via Tauri event channels (`tauri://event`), received by React stores in a 1000ms polling cadence.

### 7. How does each destructive operation work?
Every destructive operation (uninstall, leftover delete, cache clean, service stop, registry delete) flows through:
1. User confirmation modal in React UI.
2. Parameterized IPC invocation.
3. Backend Safety Shield validation (`is_safe_directory` check, path canonicalization, critical service whitelist check).
4. Direct native Win32 API execution or explicit argument vector spawning.
5. Post-operation confirmation (verifying target file is absent or service state has changed).
6. ACID transaction logging to SQLite `operation_history`.
7. UI notification with space reclaimed metrics.

### 8. How are dangerous operations prevented?
- Absolute path blacklisting (`C:\Windows`, `System32`, `/etc`, `/bin`, `/usr`).
- Rejection of relative traversal tokens (`..`) and symlink escapes.
- Protection against bare profile deletion (`C:\Users\<user>`, `/home/<user>`).
- Hardcoded critical service locks (`rpcss`, `lsass`, `systemd-journald`, `dbus`).
- Tokenization preventing command-line argument injection.

### 9. What tests were actually executed?
- Comprehensive automated verification suite (`test_runner --release`): 11 full test suites covering database integrity, uninstaller parser, disk analyzer, duplicate detection, cleaner categories, Win32 registry, application discovery, startup keys, service protection, health score, and resource hunter.
- Frontend TypeScript type check (`tsc -b`) and Vite production build.
- Rust Clippy static analysis (`cargo clippy`).
- Standalone portable smoke tests verifying independent execution outside dev server.

### 10. Which tests passed?
All 11 Rust subsystem test suites, frontend TypeScript check, production bundle, release packaging, and isolated portable launch passed with **exit code 0**.

### 11. Which tests failed?
Zero tests failed during final verification.

### 12. Which tests were skipped?
Direct in-VM execution of the Linux GUI on the host machine was skipped because the Windows host environment lacks preinstalled virtualization engines (Hyper-V/VirtualBox/WSL). The tests are instead codified into the automated `tests/linux-lab/run-lab.sh` test suite.

### 13. Which features remain incomplete?
- Linux XDG autostart file toggle modifies user-level entries in-place and generates user overrides in `~/.config/autostart/` with `Hidden=true` for system-wide entries without requiring Polkit or root elevation. Full in-place editing of `/etc/xdg/autostart/*.desktop` still requires Polkit or root elevation.
- Wayland-specific global hotkeys are not implemented (operates under X11 / XWayland standard shortcuts).

### 14. What is still Windows-only?
- Native Win32 Registry Manager (browsing HKCU/HKLM hives, binary decoding, `.reg` export). On Linux, this interface transitions to the `/etc` Configuration Browser.
- Windows Task Scheduler direct COM interface (uses `schtasks.exe` fallback).

### 15. What is genuinely cross-platform?
- Core telemetry collection (CPU per-core, RAM, disk I/O via `sysinfo`, socket table via `netstat2`).
- 3-stage cryptographic duplicate detection.
- Disk space and directory size analyzer.
- Deep system and cache cleaner (adapted directory roots).
- Application discovery (`Uninstall` registry on Windows vs `dpkg`/`rpm`/`flatpak` on Linux).
- Service control (Win32 SCM on Windows vs `systemctl` on Linux).
- System health diagnostic engine (0–100 score).
- SQLite persistence and operation audit history.

### 16. How do I reproduce the Linux VM?
Provision an Ubuntu 24.04 LTS VM with 4 CPU cores, 8 GB RAM, and a graphical desktop. Run:
```bash
sudo apt update && sudo apt install -y build-essential curl libwebkit2gtk-4.1-dev libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 17. How do I run the complete test suite?
- On Windows: `powershell -ExecutionPolicy Bypass -File scripts\build-windows.ps1`
- On Linux: `./tests/linux-lab/run-lab.sh`

### 18. How do I build the Linux application?
```bash
npm install
npm run build
npm run tauri -- build
```
Generates portable AppImage and `.deb` in `src-tauri/target/release/bundle/`.

### 19. How do I debug a failed operation?
1. Check the SQLite audit table:
   `sqlite3 %LOCALAPPDATA%\AppTrace\database\apptrace.db "SELECT * FROM operation_history ORDER BY timestamp_ns DESC LIMIT 5;"`
2. Inspect operational diagnostic logs in `%LOCALAPPDATA%\AppTrace\logs\`.
3. Run `test_runner` in debug mode: `cargo run --manifest-path src-tauri/Cargo.toml --bin test_runner`.

### 20. What should the next developer work on? (Prioritized Next Steps)
1. **Linux Polkit / pkexec Integration:** Add graphical privilege elevation prompts for `apt remove` and `/etc` configuration modifications on Linux.
2. **eBPF Network Collector:** Implement optional eBPF socket monitoring for Linux kernel-level packet inspection without polling overhead.
3. **Automated CI Matrix:** Enable GitHub Actions runner for Ubuntu 24.04 (`.github/workflows/build-linux.yml`) to automatically compile and release Linux `.AppImage` and `.deb` binaries on tag pushes.
