# AppTrace Technical Architecture

## 1. High-Level System Overview

AppTrace is an enterprise-grade, local-first system observability and system management workstation built with **Tauri 2**, **Rust**, **React 19**, **TypeScript**, and **SQLite**.

The system is designed with a clear separation of concerns between low-level kernel telemetry collection, operating system management subsystems, and a high-density dark graphite user interface.

```
+---------------------------------------------------------------------------------+
|                        REACT 19 + TYPESCRIPT FRONTEND                           |
|       - Dark Graphite Enterprise UI System (Tailwind CSS)                       |
|       - Observability Dashboards (Sysinternals-inspired dense data tables)      |
|       - Hardware-Accelerated Canvas 2D Topology Graph                           |
|       - 12 Comprehensive System Management Pages                                |
+---------------------------------------------------------------------------------+
                                      |
                     [ Tauri 2 IPC Protocol / Invocations ]
                                      |
                                      v
+---------------------------------------------------------------------------------+
|                          RUST SYSTEMS CORE (apptrace-lib)                       |
|                                                                                 |
|  +---------------------------+  +--------------------------------------------+  |
|  |    COLLECTORS ENGINE      |  |           MANAGEMENT ENGINE                |  |
|  | - Process Monitor         |  | - Applications Manager (Win32/Linux)       |  |
|  | - Network Socket Tracker  |  | - Uninstaller & Leftover Scanner           |  |
|  | - Filesystem Change Watch |  | - Startup Manager (Run Keys / XDG)        |  |
|  | - System Health Telemetry |  | - Services Manager (Win32 SCM / Systemd)  |  |
|  +---------------------------+  | - Scheduled Tasks (Task Scheduler / Cron) |  |
|                                 | - Win32 Registry Manager (Native APIs)     |  |
|  +---------------------------+  | - Deep System Cleaner                      |  |
|  |     PERSISTENCE ENGINE    |  | - Recursive Disk Analyzer                  |  |
|  | - SQLite 3 (WAL Mode)     |  | - 3-Stage Duplicate File Finder            |  |
|  | - SCHEMA_V2 Auto-Migrate  |  | - System Optimizer & Health Diagnostic     |  |
|  | - Operation History Audit |  | - Universal Software Resource Hunter       |  |
|  +---------------------------+  +--------------------------------------------+  |
+---------------------------------------------------------------------------------+
                                      |
                                      v
+---------------------------------------------------------------------------------+
|                    OPERATING SYSTEM INTERFACES (LOCAL-ONLY)                     |
|  - Windows: Win32 Registry, SCM, Task Scheduler, Toolhelp32, IP Helper, ETW     |
|  - Linux: /proc, sysfs, systemd, Netlink, inotify, dpkg/rpm/flatpak             |
|  - Storage: %LOCALAPPDATA%\AppTrace\ (Windows) or ~/.local/share/apptrace/ (Linux) |
+---------------------------------------------------------------------------------+
```

---

## 2. Core Architectural Layers

### A. Frontend Presentation Layer (`src/`)
- **React 19 & TypeScript:** Single-page application architecture using `@tanstack/react-virtual` for virtualized process tables and list views.
- **Dark Graphite Design System:** Enterprise-grade color palette prioritizing readability, typography, and dense alignment without distracting visual decorations.
- **Topology Engine:** Custom Canvas 2D force-directed graph with inertial pan/zoom and direct socket-to-process attribution.

### B. Tauri IPC Gateway (`src-tauri/src/commands/`)
- Exposes 31 typed management commands and 18 telemetry commands.
- Asynchronous dispatch preventing long-running disk or network scans from blocking the main UI thread.
- Strictly validated input arguments with path traversal and permission checks.

### C. Management Engine (`src-tauri/src/management/`)
- **Applications (`applications.rs`):** Scans 64-bit and 32-bit (`Wow6432Node`) machine uninstall keys and user uninstall keys. Extracts version, publisher, install paths, and correlates running PIDs.
- **Uninstaller (`uninstall.rs`):** Spawns uninstaller executables with parsed argument arrays (never shell concatenation). Scans orphaned directories in AppData, ProgramData, and registry keys.
- **Registry Manager (`registry.rs`):** Native Win32 API implementation using `windows-sys`. Directly calls `RegOpenKeyExW`, `RegCreateKeyExW`, `RegEnumValueW`, `RegSetValueExW`, and `RegDeleteKeyW` with hard safety blocks on critical hives.
- **Deep Cleaner (`cleaner.rs`):** Scans safe-to-clean temporary directories, crash dumps, and browser caches with symlink traversal prevention.
- **Duplicate Finder (`duplicates.rs`):** Pure-Rust 3-stage hashing pipeline: file size match $\rightarrow$ 4 KB header hash $\rightarrow$ full 128-bit streaming hash.
- **Disk Analyzer (`disk_analyzer.rs`):** Recursive directory sizing with memory-bounded tracking of top largest files.

### D. Persistence Engine (`src-tauri/src/database/`)
- Single-writer SQLite 3 engine operating in Write-Ahead Logging (`WAL`) mode with `NORMAL` synchronous mode for high-throughput, crash-safe local storage.
- Auto-migrating schema (`SCHEMA_V1`, `SCHEMA_V2`) maintaining application inventory, telemetry time-series, saved dashboards, and operations history.
- Resolves paths exclusively to `%LOCALAPPDATA%\AppTrace\apptrace.db` (portable).
