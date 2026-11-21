# AppTrace — Uninstallation & Clean Removal Guide

Because AppTrace is distributed as a zero-install portable application, removing it from your workstation is clean, simple, and leaves zero registry residue.

---

## 1. Quick Removal (Application Only)

If you wish to remove the AppTrace executable while preserving your historical telemetry logs and settings for a future upgrade:

### Step 1: Close AppTrace
Ensure AppTrace is not running in the background. Check your system tray or taskbar and exit the application.
- On Windows: Open Task Manager or PowerShell and verify no `AppTrace.exe` processes remain:
  ```powershell
  Stop-Process -Name "AppTrace" -ErrorAction SilentlyContinue
  ```
- On Linux:
  ```bash
  killall apptrace 2>/dev/null || true
  ```

### Step 2: Delete the Application Directory
Delete the folder where you extracted `AppTrace-Windows-x64-Portable.zip` (for example, `C:\Tools\AppTrace` or `C:\Users\<YourUsername>\AppData\Local\Programs\AppTrace`).

That is all. No uninstaller program needs to be run, and no registry keys need to be cleaned.

---

## 2. Complete Removal (Including User Data & SQLite Database)

If you wish to permanently remove all traces of AppTrace, including the local SQLite database, saved custom dashboards, and operation history:

### Step 1: Close the Application
Follow Step 1 above to ensure the application process is terminated.

### Step 2: Delete the Local User Data Directory

#### On Windows:
AppTrace stores its local database and backups in `%LOCALAPPDATA%\AppTrace`.
1. Press `Win + R`, type `%LOCALAPPDATA%`, and press **Enter**.
2. Locate the folder named `AppTrace`.
3. Delete the `AppTrace` folder.

Or run this single PowerShell command:
```powershell
Remove-Item -Path "$env:LOCALAPPDATA\AppTrace" -Recurse -Force
```

The deleted directory contains only:
```text
%LOCALAPPDATA%\AppTrace/
├── apptrace.db          # Local SQLite database (events, dashboards, metrics, history)
├── apptrace.db-wal      # SQLite Write-Ahead Log
├── apptrace.db-shm      # SQLite shared memory index
└── backups/             # Any manual database snapshots you created
```

#### On Linux:
AppTrace stores user data in `$XDG_DATA_HOME/AppTrace` (defaulting to `~/.local/share/AppTrace`):
```bash
rm -rf "$HOME/.local/share/AppTrace"
```

---

## 3. Preserved System State Guarantee

AppTrace does not install Windows background services, kernel drivers, or automatic startup entries for itself. Removing the application folder and the local data folder removes 100% of the application footprint.
