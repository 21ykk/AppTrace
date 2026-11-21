================================================================================
                           AppTrace - System Observability
                              Portable Edition (v1.0.0)
================================================================================

AppTrace is a production-grade, local-first desktop system monitoring and 
observability application built with Rust and Tauri.

--------------------------------------------------------------------------------
1. PORTABLE USAGE - NO INSTALLATION REQUIRED
--------------------------------------------------------------------------------
- AppTrace is distributed as a self-contained portable executable.
- No installer (MSI/NSIS) or administrative privileges are required.
- You can run AppTrace.exe directly from any folder, including:
    * Desktop
    * Downloads
    * USB flash drives or external drives
    * Custom user directories

--------------------------------------------------------------------------------
2. DATA STORAGE & ISOLATION (%LOCALAPPDATA%)
--------------------------------------------------------------------------------
To ensure true portability and protect your system:
- AppTrace NEVER writes application data, logs, or databases into the executable 
  directory or USB storage root.
- All persistent configuration, telemetry data, logs, and backups are stored in:
    %LOCALAPPDATA%\AppTrace\
      ├── database\          (SQLite telemetry database: apptrace.db)
      ├── settings.json      (Application configuration & preferences)
      ├── logs\              (Diagnostic and operational logs)
      ├── backups\           (Database snapshots and user backups)
      ├── cache\             (Temporary UI state and transient caches)
      └── exports\           (Telemetry CSV/JSON exports)

Moving the executable or updating to a new version will never corrupt or lose
your stored data or preferences.

--------------------------------------------------------------------------------
3. SYSTEM REQUIREMENTS
--------------------------------------------------------------------------------
- Operating System: Windows 10 (version 1809+) or Windows 11 (x64)
- Runtime: Microsoft Edge WebView2 Evergreen Runtime
  (WebView2 is preinstalled by default on Windows 10/11. If missing, download it
   from Microsoft: https://developer.microsoft.com/en-us/microsoft-edge/webview2/)
- Offline & Local: AppTrace does not require an internet connection and makes
  no outbound cloud connections. All telemetry is strictly local.

--------------------------------------------------------------------------------
4. KEY FEATURES & SETTINGS
--------------------------------------------------------------------------------
- Telemetry Collection:
    * Process hierarchy, CPU%, Memory (Working Set/Private Bytes), handles, threads
    * Active TCP/UDP socket connections with PID resolution and protocol breakdown
    * Filesystem volume health, read/write I/O throughput
    * Real-time hardware health and OS metrics
- Configurable Polling & Retention:
    * Polling interval configurable from 500ms to 5000ms
    * Historical data retention policy (1 to 90 days with automatic vacuum)
    * Individual collectors can be enabled/disabled on demand
- System Tray & Autostart:
    * Minimize to Tray and Close to Tray options
    * Optional "Start with Windows" per-user autostart (HKCU\...\Run)
    * Automatic path mismatch detection: if you relocate AppTrace.exe,
      AppTrace alerts you and updates the autostart path with a single click.
- Database Management:
    * Manual and automated database backup creation and restoration
    * Safe cache clearing and telemetry history wiping directly from Settings

--------------------------------------------------------------------------------
(C) 2026 AppTrace Systems. All rights reserved.
================================================================================
