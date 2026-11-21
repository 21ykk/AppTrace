# Changelog

All notable changes to the AppTrace workstation observability platform are documented in this file.

## [1.1.1] — 2026-11-21

### Production Hardening & Security Hardening
- **Native Win32 Registry API Migration:** Completely eliminated PowerShell process spawning from Registry Manager reading, value editing, and deletion loops. Registry operations now execute directly via native Win32 APIs (`RegOpenKeyExW`, `RegCreateKeyExW`, `RegEnumValueW`, `RegSetValueExW`, `RegDeleteKeyW`), providing sub-millisecond responsiveness and immunity to command injection.
- **Critical Uninstaller Path Defense:** Hardened `is_safe_directory` with recursive path traversal (`..`) rejection, symlink canonicalization, user profile root protection (`C:\Users\<user>`), and absolute OS directory blacklisting (`C:\Windows`, `System32`, `Program Files`).
- **Disk Analyzer Bounded Pruning:** Replaced rigid 10 MB filter in `get_largest_files` with dynamic 1 KB threshold and memory-bounded pruning (keeping top 200 largest files), ensuring accurate file detection in directories of any size.
- **Fail-Safe Release Deployment:** Updated `build-windows.ps1` and `verify-release.ps1` to detect and safely close existing running instances before copying, preventing file-lock IO exceptions during release updates.
- **Automated Integration Test Runner:** Expanded `test_runner.rs` to 11 comprehensive automated test suites covering database schema migrations, uninstaller path validation, Win32 registry manipulation, duplicate header collision checks, and service protection locks.

## [1.1.0] — 2026-11-21

### Cross-Platform System Management Suite
- **Advanced Application Intelligence & Uninstaller (`ApplicationsPage`):**
  - Complete software discovery querying Win32/64 Registry hives (`HKLM`, `HKLM\Wow6432Node`, `HKCU\Uninstall`), AppData, and Linux package managers (`dpkg`, `rpm`, `flatpak`).
  - Correlates installed apps with active running PIDs, configuration folders, and registry trees.
  - Multi-stage uninstallation workflow: pre-uninstall warning analysis, process termination, silent/interactive uninstaller execution, deep leftover scanning (`Verified`, `Likely`, `Uncertain`, `SystemProtected`), and safe batch cleanup.
- **Windows Registry & Linux Configuration Manager (`RegistryPage`):**
  - Native tree explorer for `HKCU`, `HKLM`, `HKCR`, `HKU` with recursive branch search and `.reg` export.
  - Value editor supporting `REG_SZ`, `REG_DWORD`, `REG_QWORD`, `REG_MULTI_SZ`, `REG_EXPAND_SZ`, and `REG_BINARY`.
  - Safety protection preventing accidental modification or deletion of critical OS security hives (`SAM`, `SECURITY`, `SYSTEM\CurrentControlSet`).
- **Startup Applications Manager (`StartupPage`):**
  - Audits Windows Run keys (`HKCU\Run`, `HKLM\Run`) and Startup directory shortcuts.
  - Safe disable mechanism preserving original commands via `AppTrace_Disabled_` registry prefix.
  - Impact classification (`High`, `Medium`, `Low`) based on application architecture and background persistence.
- **System Services Manager (`ServicesPage`):**
  - Live Win32 Service Control Manager integration (`ServiceInfo`) with status, startup type, and execution context.
  - Safe service start/stop controls with hard protection locks for core OS subsystems (`RpcSs`, `DcomLaunch`, `LSM`, `SamSs`).
- **Scheduled Tasks & Timers (`ScheduledTasksPage`):**
  - Enumerates Windows Task Scheduler jobs and Linux systemd timers with action and trigger summaries.
  - Safe task enable/disable toggling via `schtasks.exe /change`.
- **Deep System & Storage Cleaner (`CleanerPage`):**
  - Analyzes cleanable categories: System/User `%TEMP%`, Windows Crash Dumps (`WER`, `Minidump`), Web Browser Caches (Chrome, Edge, Brave, Firefox), and OS diagnostics logs.
  - Dry-run storage calculation, transparent file sample viewer, safe deletion, and space reclaimed metrics.
- **Disk Space & Directory Size Analyzer (`DiskAnalyzerPage`):**
  - Recursive directory tree analyzer with depth exploration and proportional usage bars.
  - High-footprint file table indexing files larger than 10MB.
- **Duplicate File Finder (`DuplicatesPage`):**
  - 3-stage duplicate detection: Stage 1 (exact size match) → Stage 2 (4KB header SHA-256 sample) → Stage 3 (full SHA-256 cryptographic verification).
  - One-click duplicate copy selection keeping original files safe, with deletion confirmation and space reclamation.
- **Actionable System Optimizer (`OptimizerPage`):**
  - Generates telemetry-backed optimization recommendations (startup impact, temp bloat >500MB, memory pressure, runaway CPU processes).
- **System Health & Diagnostics Center (`HealthPage`):**
  - Holistic 0-100 system health score with categorical check evaluations for Storage capacity, RAM saturation, service consistency, process load, and Administrator elevation.
- **Universal Software & Resource Hunter (`HunterPage`):**
  - Cross-correlates keyword queries across installed apps, active processes, filesystem roots, registry branches, services, and startup entries.
- **System Operations Audit Log (`HistoryPage`):**
  - Persistent SQLite logging in `operation_history` table recording all uninstalls, cleanings, service toggles, and registry edits with timestamps and execution status.

## [1.0.0] — 2026-11-21

### Enterprise Visual Redesign & System Palette
- **Dark Graphite Palette:** Completely overhauled UI from legacy purple theme to an enterprise matte graphite palette (`#101113` background, `#0B0C0E` sidebar, `#17191C` panel background, `#1D2024` elevated cards, `#22262B` secondary panels, `#30343A` borders, `#E6E8EB` primary text, `#9A9FA8` secondary text, `#2878D0` blue accent, `#35B879` green status, `#E4A83A` amber warning, `#D94B4B` red critical).
- **Navigation Shell:** Introduced collapsible sidebar supporting expanded (`w-56`) and compact (`w-14`) modes with crisp monochrome iconography and active blue border accents.
- **Header & Telemetry Controls:** Redesigned header with real-time collector status, system privilege indicator (Standard User vs. Elevated), OS capabilities indicator, and quick alert notifications.

### Advanced Process Explorer (Sysinternals-Inspired)
- **Hierarchical Process Tree:** Added recursive tree layout constructing parent-child relationships via `pid`/`ppid` with collapse/expand toggles, branch indent lines, and instant switch to flat sorted list.
- **Enterprise Filters & Sorting:** Quick-filter pills (All, Applications, Network Sockets, High Load, System Services) and bidirectional sorting across Process Name, PID, CPU %, Memory Working Set, Total I/O, Status, and Executable Path.
- **Docked Multi-Tab Inspector:**
  - *Overview Tab:* Detailed PID, PPID, executable path, command-line arguments, physical working set, and virtual address space.
  - *Performance Tab:* Disk read bytes, disk write bytes, cumulative I/O rate, and private working set allocation.
  - *Network Tab:* Direct attribution of live TCP/UDP sockets to inspected PID with country GeoIP flags and state indicators.
  - *Hierarchy Tab:* Interactive direct parent process link and spawned children links with one-click navigation.
  - *Files Tab:* Active filesystem change stream matching inspected process executable.
  - *Security Tab:* Process architecture (`x86_64`), service isolation classification, and command-line privacy redaction status.
- **Native Diagnostic Actions:** Added secure process termination (`terminate_process`) with PID <= 4 system protection & confirmation dialog, and executable location reveal (`open_process_directory`) via Windows Explorer.

### Telemetry & Network Intelligence
- **Canvas 2D Topology Graph:** High-performance hardware-accelerated Canvas 2D rendering engine capable of displaying 150+ interactive nodes with zero-latency drag-and-drop, inertial camera panning, and wheel zooming.
- **GeoIP Socket Enrichment:** Integrated in-memory IP geolocation engine with RFC 1918 private IP detection, CDN detection, country flag badges, and remote endpoint resolution.
- **Data Provenance:** Strict telemetry truth policy — all metrics derive directly from operating system kernel APIs (`CreateToolhelp32Snapshot`, `GetExtendedTcpTable`, `ReadDirectoryChangesW`) with zero fabricated data.

### Repository Cleanup & Structure Optimization
- **Asset Consolidation:** Removed obsolete starter assets (`react.svg`, `vite.svg`, `hero.png`) and established canonical branding in `public/branding/logo.svg` and `public/branding/logo.png`.
- **Packaging & Storage Architecture:** Preserved strictly portable runtime architecture where SQLite database and configuration persist exclusively in `%LOCALAPPDATA%\AppTrace\`.
- **Validation Suite:** Integrated native subsystem verification runner (`test_runner.rs`) to validate SQLite schema migrations, telemetry ingestion, path resolution, and registry autostart.
