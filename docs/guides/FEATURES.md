# AppTrace — Comprehensive Feature Guide

This guide details all implemented modules, internal mechanisms, permission requirements, safety boundaries, and cross-platform availability.

---

## 1. Feature Availability Matrix

| Feature Module | Windows x64 (Stable) | Linux x64 (Public Beta) | Permission Level |
| :--- | :---: | :---: | :--- |
| **System Overview Dashboard** | **Supported** | **Supported** | Standard Userland |
| **Process Tree Explorer** | **Supported** | **Supported** | Standard Userland |
| **Hardware Performance Monitor** | **Supported** | **Supported** | Standard Userland |
| **Active Network Sockets & GeoIP** | **Supported** | **Supported** | Standard Userland |
| **Live Filesystem Monitor** | **Supported** | **Supported** | Standard Userland |
| **Interactive Dependency Graph** | **Supported** | **Supported** | Standard Userland |
| **Telemetry Analytics & Trends** | **Supported** | **Supported** | Standard Userland |
| **Installed Applications & Leftovers** | **Supported** | **Supported** | Standard (Admin for machine apps) |
| **Universal Resource Hunter** | **Supported** | **Supported** | Standard Userland |
| **Startup Manager** | **Supported** | **Supported** | Standard (Admin for HKLM) |
| **Services Manager** | **Supported** | **Supported (User Session Units)** | Administrator (Windows) / User Session (Linux) |
| **Scheduled Tasks & Timers** | **Supported (Enumerate & Toggle)** | **Supported (Enumerate & Toggle)** | Standard Userland |
| **Win32 Registry Manager** | **Supported** | *N/A (Windows)* | Standard (Admin for HKLM) |
| **Linux Configuration Browser** | *N/A (Linux)* | **Supported** | Standard (User overrides) |
| **Deep System Cleaner** | **Supported** | **Supported** | Standard Userland |
| **Disk Analyzer & Largest Files** | **Supported** | **Supported** | Standard Userland |
| **3-Stage Duplicate Finder** | **Supported** | **Supported** | Standard Userland |
| **System Health Diagnostics** | **Supported** | **Supported** | Standard Userland |
| **System Optimizer** | **Supported** | **Supported** | Standard Userland |
| **Operation History Audit Trail** | **Supported** | **Supported** | Standard Userland |

---

## 2. Core Monitoring & Observability

### A. Process Tree Explorer (`/processes`)
- **What it does:** Displays all active system processes in an interactive hierarchical tree (parent/child) or a sortable flat list.
- **How it works:** On Windows, leverages the Win32 `Toolhelp32` snapshot API (`CreateToolhelp32Snapshot`, `Process32FirstW`, `Process32NextW`). On Linux, parses `/proc/[pid]/stat` and `/proc/[pid]/cmdline`.
- **Metrics Displayed:** Process Name, PID, Parent PID, CPU%, Private Working Set RAM (MiB), Disk I/O bytes, Status, Executable Path.
- **Safety & Permissions:** Runs in unprivileged userland. Killing protected kernel processes (`System`, `csrss.exe`) is blocked.

### B. Hardware Performance Monitor (`/performance`)
- **What it does:** Real-time visual monitoring of CPU, physical memory, and network interfaces.
- **How it works:** Queries system performance counters every 1000ms. CPU usage is computed from kernel/user time deltas. RAM is measured via Win32 `GlobalMemoryStatusEx` or `/proc/meminfo`.

### C. Active Network Sockets & GeoIP (`/network`)
- **What it does:** Displays all active TCP and UDP sockets, local and remote endpoints, socket states, and attributing process IDs with GeoIP country and location resolution.
- **How it works:** Windows calls the Win32 IP Helper API (`GetExtendedTcpTable`, `GetExtendedUdpTable`). Linux parses `/proc/net/tcp` and Netlink diagnostic tables. IP locations are resolved locally using offline GeoIP ranges.

### D. Interactive Dependency Graph (`/dependency-graph`)
- **What it does:** Renders a live physics-driven Canvas 2D topology graph showing relations between User Apps, System Services, and active network sockets.
- **How it works:** Uses a custom 120fps force-directed physics engine on a hardware-accelerated HTML5 Canvas with smooth wheel zoom and double-click centering.

---

## 3. Applications & Operating System Management

### A. Installed Applications & Leftover Scanner (`/applications`)
- **What it does:** Discovers all installed desktop software, displays installation sizes, versions, and publishers, and enables safe uninstallation with leftover artifact scanning.
- **How it works:**
  - **Windows:** Enumerates 64-bit (`HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall`), 32-bit (`Wow6432Node`), and per-user (`HKCU`) registry keys.
  - **Linux:** Enumerate installed packages via `dpkg-query`, `rpm`, and `flatpak list`.
  - **Leftover Scanner:** Uses heuristic path searching to locate orphaned caches and directories in `%APPDATA%`, `%LOCALAPPDATA%`, and `%PROGRAMDATA%` after uninstallation.
- **Safety Shields:** Hard-blocks deletion of operating system roots (`C:\Windows`, `C:\Windows\System32`, `/usr`, `/etc`). Rejects relative path traversal tokens (`..`).

### B. Startup Manager (`/startup`)
- **What it does:** Displays all software configured to run on user login and allows enabling or disabling autostart entries.
- **How it works:**
  - **Windows:** Scans `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`, `HKLM`, and the user Startup folder (`shell:startup`). Disabling safely prepends an `AppTrace_Disabled_` prefix without destroying original command strings.
  - **Linux:** Scans `~/.config/autostart/*.desktop` and `/etc/xdg/autostart/`. Disabling adds `Hidden=true` to user override entries in `~/.config/autostart/`. Does not modify system directories.

### C. Services Manager (`/services`)
- **What it does:** Lists all installed system services, displays running/stopped status and startup types (Automatic, Manual, Disabled), and allows starting or stopping services.
- **How it works:** On Windows, communicates directly with the Win32 Service Control Manager (SCM) via `OpenSCManagerW` and `EnumServicesStatusExW`. On Linux, queries `systemd` through `systemctl list-units`. Service operations execute under the current unprivileged user session; Polkit privilege escalation is not supported.
- **Lockdown Defense:** A hard-coded lockdown filter prevents stopping or disabling essential operating system services (`rpcss`, `samss`, `lsass`, `csrss`, `winlogon`, `cryptsvc`, `eventlog`).

### D. Win32 Registry Manager (`/registry`) — Windows Only
- **What it does:** Native registry browser and value editor for `HKEY_CURRENT_USER` and `HKEY_LOCAL_MACHINE`.
- **How it works:** Operates 100% via native Win32 APIs (`RegOpenKeyExW`, `RegEnumValueW`, `RegSetValueExW`) with zero PowerShell invocation.
- **Safety Locks:** Hard blocks modifications to critical hives: `SYSTEM\CurrentControlSet`, `SAM`, and `SECURITY`.

### E. Scheduled Tasks & Timers (`/scheduled-tasks`)
- **What it does:** Displays registered scheduled tasks and timer units, allowing inspection of trigger schedules, action summaries, and toggling the operational state of existing entries.
- **How it works:**
  - **Windows Task Scheduler:** Enumerates registered tasks via PowerShell `Get-ScheduledTask` (with `schtasks.exe /query` fallback) and toggles task state using `schtasks.exe /change /tn <task> /enable|/disable`.
  - **Linux systemd Timers & Crontab:** Enumerates active timers via `systemctl list-timers` and user crontabs via `crontab -l`. Toggles systemd timer units via `systemctl start|stop <unit>`. Crontab entries are enumeration-only (toggling and editing crontabs are not supported).
- **Implementation Scope:** Enumeration and state toggling of existing entries are implemented. State toggling is an active state modification (not read-only). Creating new scheduled tasks, defining schedules, or editing existing triggers/actions is not implemented.

---

## 4. Storage & Deep Cleaning

### A. Deep System Cleaner (`/cleaner`)
- **What it does:** Reclaims wasted disk space by cleaning temporary files, memory crash dumps (`.dmp`), Windows Error Reporting (WER) logs, and web browser caches.
- **Safety Protocol:**
  - Files are scanned and categorized for preview before deletion.
  - Recursive traversal ignores symlinks (`!ft.is_symlink()`) to prevent escaping cache scopes.
  - Every deletion is audited in the persistent SQLite operation history.

### B. Disk Analyzer & Directory Size Map (`/disk-analyzer`)
- **What it does:** Scans any directory or drive to visualize subdirectory storage allocation and locate multi-gigabyte large files.
- **How it works:** Bounded recursive filesystem traversal aggregating folder sizes with depth limits to prevent infinite loops on deep directory trees.

### C. 3-Stage Duplicate Finder (`/duplicates`)
- **What it does:** Discovers duplicate files across folders and allows safe deletion of redundant copies while preserving original reference files.
- **How it works:**
  1. **Stage 1 (Size Partitioning):** Groups files by exact file size ($O(N)$). Files < 1 KB are skipped.
  2. **Stage 2 (Header Hash):** Evaluates a 64-bit hash over the first 4096 bytes.
  3. **Stage 3 (Full Stream Hash):** Streams full file contents through a 128-bit rolling hash.
  4. **Direct Byte Verification:** Compares original and candidate byte-by-byte in 64 KB chunks (`files_are_identical`).
- **Security & TOCTOU Defenses:**
  - **Self-Deletion Guard:** Canonicalizes paths; strictly rejects deleting a candidate if it resolves to the reference file.
  - **Protected Directory Guard:** Automatically rejects candidates in `System32`, `C:\Windows`, `/etc`, `/bin`, etc.
  - **Pre/Post Metadata Revalidation:** Checks that the file size, timestamp, and regular file type have not been modified or replaced with a symlink prior to unlinking.

---

## 5. Health & Optimization

### A. System Health Center (`/health`)
- **What it does:** Computes a comprehensive 0–100 System Health Diagnostic Score.
- **Score Factors:** Storage headroom on system drives, committed memory percentage, CPU runaway processes, and essential background service states.
- **Transparency:** Evaluates genuine telemetry metrics; never produces simulated scores.

### B. System Optimizer (`/optimizer`)
- **What it does:** Generates actionable system tuning recommendations based on measured performance evidence.
- **Safety Principle:** Previews every recommendation with risk levels (Low, Medium, High). No modifications are made automatically without user confirmation.
