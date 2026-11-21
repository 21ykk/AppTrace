# AppTrace — Troubleshooting Guide

This guide provides practical diagnostic steps and solutions for common issues on Windows (Stable) and Linux (Public Beta).

---

## 1. Windows Troubleshooting

### Issue W-1: Application Fails to Launch or Shows a Blank Window

- **Symptoms:** Double-clicking `AppTrace.exe` produces no visible window, or opens a white/black blank window that closes immediately.
- **Possible Causes:**
  1. The Microsoft Edge WebView2 Runtime is missing or corrupted.
  2. `WebView2Loader.dll` is missing from the directory containing `AppTrace.exe`.
  3. The executable was launched from an incomplete archive without extracting all files.
- **Safe Diagnostic Steps:**
  1. Open PowerShell and navigate to the directory where `AppTrace.exe` is located:
     ```powershell
     cd C:\Path\To\AppTrace
     .\AppTrace.exe
     ```
  2. Check if `WebView2Loader.dll` is present in the same directory:
     ```powershell
     Test-Path .\WebView2Loader.dll
     ```
  3. Verify WebView2 Runtime installation:
     ```powershell
     Get-ItemProperty -Path "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" -ErrorAction SilentlyContinue
     ```
- **Recommended Solution:**
  - If `WebView2Loader.dll` is missing: re-extract the full `AppTrace-Windows-x64-Portable.zip` archive into a clean folder. Do not run `AppTrace.exe` directly from inside the compressed zip view.
  - If WebView2 is missing: download and install the official [Microsoft WebView2 Evergreen Bootstrapper](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

---

### Issue W-2: Microsoft Defender SmartScreen Blocks Execution

- **Symptoms:** Windows displays a blue prompt: *"Windows protected your PC — Microsoft Defender SmartScreen prevented an unrecognized app from starting."*
- **Possible Causes:** AppTrace is an open-source binary distributed without an expensive commercial EV certificate.
- **Safe Diagnostic Steps:**
  Compute the SHA-256 hash to confirm the file has not been altered:
  ```powershell
  Get-FileHash -Algorithm SHA256 .\AppTrace.exe
  ```
- **Recommended Solution:**
  Compare the computed hash with the official hash in [release/checksums/SHA256SUMS.txt](../../release/checksums/SHA256SUMS.txt). If the hash matches:
  1. Click **More info**.
  2. Click **Run anyway**.

---

### Issue W-3: "Access Denied" When Stopping Services or Editing Registry

- **Symptoms:** Modifying a machine-wide service status or editing an `HKEY_LOCAL_MACHINE` registry entry results in an error: *"Access is denied"*.
- **Possible Causes:** AppTrace is running under standard userland privileges (`Medium Integrity Level`).
- **Safe Diagnostic Steps:**
  Check the bottom-left status indicator in the AppTrace UI. It will show `Standard User (Userland Scope)`.
- **Recommended Solution:**
  1. Close AppTrace.
  2. Right-click `AppTrace.exe` and select **Run as administrator**.
  3. The status indicator will switch to `Administrator (Elevated Scope)`.
  > [!NOTE]
  > Critical system services (`rpcss`, `lsass`, `csrss`, `winlogon`) and core hives (`SAM`, `SECURITY`) are locked by built-in security shields and cannot be stopped even under Administrator privilege.

---

### Issue W-4: Database Lock or Persistence Errors

- **Symptoms:** The Settings page displays a red diagnostic indicator: `Persistence Errors > 0`, or an error toast mentions a SQLite write conflict.
- **Possible Causes:**
  1. Another instance of `AppTrace.exe` is running concurrently and holding a lock on the database file.
  2. Disk space on the drive hosting `%LOCALAPPDATA%` is exhausted.
- **Safe Diagnostic Steps:**
  1. Check for running AppTrace processes:
     ```powershell
     Get-Process -Name "AppTrace", "apptrace" -ErrorAction SilentlyContinue
     ```
  2. Check available storage space on drive `C:`:
     ```powershell
     Get-PSDrive C | Select-Object Used, Free
     ```
- **Recommended Solution:**
  1. Close any duplicate instances of AppTrace via Task Manager or PowerShell:
     ```powershell
     Stop-Process -Name "AppTrace" -Force
     ```
  2. Restart AppTrace. The SQLite WAL mode will automatically recover any incomplete transactions.

---

## 2. Linux Troubleshooting (Public Beta)

### Issue L-1: Missing Shared Libraries (`libwebkit2gtk-4.1.so.0`)

- **Symptoms:** Running `./apptrace` in the terminal outputs:
  ```text
  error while loading shared libraries: libwebkit2gtk-4.1.so.0: cannot open shared object file: No such file or directory
  ```
- **Possible Causes:** WebKit2GTK 4.1 runtime libraries are not installed on your distribution.
- **Recommended Solution:**
  Install the WebKit2GTK 4.1 package:
  - On Ubuntu / Debian:
    ```bash
    sudo apt-get install -y libwebkit2gtk-4.1-0
    ```
  - On Fedora:
    ```bash
    sudo dnf install -y webkit2gtk4.1
    ```

---

### Issue L-2: Display Server / Wayland Crash on Launch

- **Symptoms:** Launching AppTrace produces a GLib or GDK display connection error:
  ```text
  cannot open display: ... or Gdk-Message: Error 71 (Protocol error) dispatching to Wayland display
  ```
- **Possible Causes:** Incompatibility with certain Wayland compositors or missing XWayland bridging.
- **Recommended Solution:**
  Force the application to use the standard X11 backend:
  ```bash
  GDK_BACKEND=x11 ./apptrace
  ```

---

### Issue L-3: Service Management Shows No Services

- **Symptoms:** The Services module displays an empty table or an error querying systemd.
- **Possible Causes:** AppTrace is running inside an environment where `systemd` is not PID 1 (e.g. WSL, Docker, or lightweight container).
- **Safe Diagnostic Steps:**
  ```bash
  systemctl is-system-running
  ```
- **Recommended Solution:**
  AppTrace requires a genuine host installation with `systemd` enabled to manage services. If running inside a container, service management is unavailable.

---

## 3. What Information to Include in Bug Reports

When opening an issue at [https://github.com/21ykk/AppTrace/issues](https://github.com/21ykk/AppTrace/issues), please provide:

1. **Operating System:** Exact Windows version/build (e.g. Windows 11 23H2) or Linux distribution (`lsb_release -a`).
2. **AppTrace Version:** Exact version or commit SHA (e.g. `v1.1.1`).
3. **Execution Mode:** Standard user vs. Administrator.
4. **Error Messages:** Exact text from the UI toast or terminal stderr output.
5. **Expected vs. Observed Behavior:** What you expected to happen and what actually occurred.
