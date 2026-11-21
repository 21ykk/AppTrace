# AppTrace — First Start Guide

Welcome to **AppTrace**. This guide will help you get started with the dashboard, navigate the interface, understand the system diagnostics, and safely execute management operations.

---

## 1. First Application Launch

When you launch `AppTrace.exe` for the first time:
1. **Zero Initialization Delay:** The application initializes immediately (under 1.5 seconds) using local SQLite storage in Write-Ahead Logging (`WAL`) mode.
2. **Local Storage Created:** A local database file is automatically created in `%LOCALAPPDATA%\AppTrace\apptrace.db` (Windows) or `~/.local/share/AppTrace/apptrace.db` (Linux).
3. **Telemetry Polling Starts:** Background collectors begin sampling real-time CPU, RAM, active sockets, and filesystem metrics with an average baseline load of <1% CPU.

---

## 2. Navigating the Interface

AppTrace uses an enterprise **Dark Graphite** workstation interface with two primary visual sections:
- **Collapsible Sidebar (Left):** Navigation categories.
- **Active Workspace (Right):** Telemetry dashboard, process tables, interactive graphs, and management views.

### Navigation Hierarchy

```text
MONITORING
  ├── Overview          # Central system telemetry overview and widget grid
  ├── Processes         # Sysinternals-grade process hierarchy tree & flat list
  ├── Performance       # CPU sparklines, RAM gauges, network curves
  ├── Network           # Active TCP/UDP endpoints, process map, GeoIP locations
  └── Filesystem        # Live directory change timeline (create, modify, delete)

APPLICATIONS & OS
  ├── Applications      # Installed 64-bit, 32-bit & user apps, uninstaller, leftover scan
  ├── Resource Hunter   # Universal search across apps, processes, files, registry
  ├── Startup Manager   # Registry Run keys and Startup folder autostart toggling
  ├── Services          # Win32 Service Control Manager (SCM) or systemd units
  ├── Scheduled Tasks   # Windows Task Scheduler or systemd timer inspection
  └── Registry / Config # Win32 Registry Editor or Linux /etc Configuration Browser

CLEANING & STORAGE
  ├── System Cleaner    # Targeted cache cleaner: temp files, crash dumps, WER logs
  ├── Disk Analyzer     # Directory size allocation breakdown and largest files
  └── Duplicate Finder  # 3-stage duplicate detection with byte-by-byte direct verification

HEALTH & OPTIMIZATION
  ├── System Health     # Multi-factor 0-100 system diagnostic score
  ├── Optimizer         # Actionable recommendations backed by measured telemetry
  ├── Timeline          # Historical event timeline feed
  ├── Analytics         # Aggregate workload trendlines and demand curves
  ├── Dependency Graph  # Interactive physics-driven topology graph
  └── Operation History # Persistent audit log of all executed management operations

SYSTEM
  └── Settings          # Live engine diagnostics, database backups, data reset
```

---

## 3. Main Overview Dashboard

The default landing page combines essential system health signals into a high-density view:
1. **CPU Monitor:** Real-time total processor load, active physical and logical cores, active process count, and per-core distribution bars.
2. **Memory Monitor:** Allocated physical RAM vs. available headroom, and pagefile / swap utilization.
3. **Network Traffic:** Real-time inbound (RX) and outbound (TX) throughput history curves.
4. **Storage Volumes:** Mounted filesystem drives (`C:\`, `D:\`), capacity bars, and percentage free space.
5. **System Telemetry Health Card:**
   - **Engine State:** `ACTIVE`
   - **Privilege Token:** `STANDARD` (Userland) or `ADMINISTRATOR` (Elevated)
   - **Ring Buffer Drops:** Counter showing dropped kernel events (normally 0)
   - **Storage Mode:** `SQLite WAL`
   - **Domain Capability Verification:** Real-time validation of OS APIs (`Toolhelp32`, `IP Helper`, `ReadDirectoryChangesW`, `SystemMetrics`).

---

## 4. Safe Operation Workflow

AppTrace follows a strict **Safety-First Protocol** for all destructive or mutating actions:

### 1. Preview Before Deletion
- In the **System Cleaner**, clicking **Scan** enumerates cleanable files by category (Temp files, Crash Dumps, Browser Caches, Logs). No files are removed until you select specific categories and click **Clean Selected**.
- In the **Duplicate Finder**, duplicates are grouped with the original reference file clearly marked. You review and select which duplicate copies to delete.

### 2. Confirmation Modals
Every destructive action opens an explicit confirmation dialog:
- Displays the exact number of files to be deleted and total disk space to be reclaimed.
- Confirms that original reference files are preserved and will not be touched.

### 3. Built-in Security Shields
- **Protected Scopes:** AppTrace automatically blocks deletion of files in critical operating system scopes (`C:\Windows`, `System32`, `Program Files`, `/etc`, `/bin`, `/boot`).
- **Critical Service Lockdown:** Critical system services (`rpcss`, `lsass`, `csrss`, `winlogon`, `cryptsvc`) cannot be stopped or disabled.
- **Self-Deletion Guard:** Duplicate deletion strictly prohibits deleting a candidate if its canonical path resolves to the retained reference file.

---

## 5. Operation History & Audit Trail

Every mutating action executed in AppTrace is persistently logged in SQLite:
1. Navigate to **Operation History** in the sidebar.
2. Review past uninstallation tasks, cleaned cache batches, startup toggle events, and service modifications.
3. Each record contains:
   - Timestamp
   - Action type (`UninstallApp`, `CleanFiles`, `ToggleStartup`, `DeleteDuplicates`)
   - Target name and path
   - Result status (`Success`, `PartialSuccess`, `Failed`)
   - Detailed JSON payload (bytes reclaimed, files deleted, error messages)

---

## 6. Where to Find Help & Configure Settings

- Click **Settings** at the bottom of the sidebar.
- Inspect live engine performance metrics and persistence status.
- Create automated database backups (`apptrace-backup-<timestamp>.db`).
- Export database telemetry to JSON or clear historical event feeds.
