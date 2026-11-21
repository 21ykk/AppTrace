# AppTrace Portable Edition (v1.1.1)

AppTrace is a production-grade, local-first Windows system observability and workstation management application built with Rust and Tauri.

---

## 1. Portable Deployment Instructions

AppTrace is packaged as a fully self-contained portable distribution. No Windows MSI/NSIS installation or administrative installer privileges are required.

- **Executable:** `AppTrace.exe`
- **Location:** You can run `AppTrace.exe` from any writable folder, such as:
  - Your Desktop or personal tools directory
  - A USB flash drive or external SSD
  - Dedicated workstation utility folders

---

## 2. Local-First Data Storage Policy

To prevent filesystem pollution on removable media and ensure your telemetry data remains private:
- AppTrace stores all runtime state, logs, and database files in:
  `%LOCALAPPDATA%\AppTrace\`
  - `database\apptrace.db` (Local SQLite database with WAL journaling)
  - `settings.json` (Custom workspace preferences and polling intervals)
  - `backups\` (User-created database snapshots)
  - `logs\` (Operational diagnostics)

Moving the portable folder or launching it from a different drive will never corrupt your historical telemetry.

---

## 3. System Requirements & Runtime Dependencies

- **Operating System:** Windows 10 (Version 1809+, 64-bit) or Windows 11 (64-bit).
- **Web Runtime:** Microsoft Edge WebView2 Evergreen Runtime (pre-installed by default on modern Windows 10 and Windows 11 installations).
- **Runtime Library:** `WebView2Loader.dll` is bundled alongside `AppTrace.exe` for immediate runtime resolution.
- **Network Access:** Zero outbound network connections required. Telemetry collection is strictly offline and private.

---

## 4. Workstation Management Capabilities

- **System Observability:** Real-time CPU core utilization, memory commitment, disk throughput, and active TCP/UDP socket telemetry.
- **Process Explorer:** Sysinternals-grade process hierarchy with PID resolution, memory working sets, and full executable path tracking.
- **Application Lifecycle & Leftovers:** Discovers installed applications across 64-bit, 32-bit, and user registry hives with orphan leftover detection.
- **Windows Registry Manager:** Native Win32 API browser and value editor (`REG_SZ`, `REG_DWORD`, `REG_QWORD`, `REG_MULTI_SZ`, `REG_BINARY`) with safety locks.
- **Startup & Services Manager:** Audits and controls Windows Run keys and Service Control Manager services with critical system service protection.
- **Storage Cleaner & Disk Analyzer:** Multi-category temporary file cleaner and recursive directory space breakdown.
- **Duplicate File Finder:** 3-stage byte-level header and hash verification engine.

---

(C) 2026 AppTrace Systems. Distributed under the terms of the included LICENSE.
