# AppTrace — Windows Installation Guide

**Platform Status:** **Windows x64 — Stable**  
**Supported OS Target:** Windows 10 (64-bit, Version 1809 / Build 17763 or higher) and Windows 11 (64-bit)  
**Tested Environment:** Windows 11 Pro x64 (Build 26300) with Microsoft Edge WebView2  
**Distribution Model:** Zero-Install Standalone Portable Package  
**Latest Version:** v1.1.1  

---

## 1. System Requirements

| Requirement | Minimum | Recommended |
| :--- | :--- | :--- |
| **Operating System** | Windows 10 x64 (1809+) or Windows 11 x64 | Windows 11 x64 (23H2 or newer) |
| **Processor** | Dual-core 64-bit x86_64 processor | Quad-core processor or better |
| **Memory (RAM)** | 2 GB available RAM | 4 GB or more |
| **Storage Space** | 100 MB free storage (for executable and local SQLite database) | 500 MB free SSD storage |
| **Runtime Dependency** | Microsoft Edge WebView2 Runtime (pre-installed on Windows 10/11) | WebView2 Evergreen Runtime |

> [!NOTE]
> **Tested Environment vs. Supported Platforms:** Automated test suites (`test_runner.rs`) and standalone smoke execution (`verify-release.ps1`) were validated on Windows 11 Pro x64 (Build 26300). Supported platform targets include 64-bit Windows 10 (1809+) and Windows 11, requiring the Microsoft Edge WebView2 Runtime (pre-installed on standard Windows 10/11 installations). If running on enterprise LTSC or stripped Windows editions lacking WebView2, install the official evergreen bootstrapper from [Microsoft WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

---

## 2. Where to Download

Official releases are distributed directly through the GitHub repository release assets:
- **Repository:** [https://github.com/21ykk/AppTrace](https://github.com/21ykk/AppTrace)
- **Official Release Package:** `AppTrace-Windows-x64-Portable.zip` (~7.98 MB)
- **Release Directory:** [`release/AppTrace-Windows-x64-Portable.zip`](../../release/AppTrace-Windows-x64-Portable.zip)
- **SHA-256 Checksums:** [`release/checksums/SHA256SUMS.txt`](../../release/checksums/SHA256SUMS.txt)

> [!IMPORTANT]
> AppTrace is distributed exclusively as a **portable application**. There is no MSI installer or wizard required. You do not need to install Node.js, Python, or external runtime servers.

---

## 3. Step-by-Step Installation

### Step 1: Download the Portable Archive
Download `AppTrace-Windows-x64-Portable.zip` from the official repository releases into your `Downloads` folder.

### Step 2: Verify the File Checksum (Recommended)
Before running untrusted executables, verify the cryptographic integrity of the downloaded file. Open Windows PowerShell and run:

```powershell
Get-FileHash -Algorithm SHA256 "$HOME\Downloads\AppTrace-Windows-x64-Portable.zip"
```

Verify that the output matches the official checksum in `SHA256SUMS.txt`:
```text
e35ff28dbfc926fcbcf836fde3e13415c8537be2c3f9bc19f32ed7df2df246cb
```

### Step 3: Extract the Archive
1. Right-click `AppTrace-Windows-x64-Portable.zip` and select **Extract All...**.
2. Choose a permanent location on your system, for example:
   - `C:\Users\<YourUsername>\AppData\Local\Programs\AppTrace`
   - `C:\Tools\AppTrace`
   - Or any folder on an external fast USB drive.
3. Click **Extract**.

The extracted folder contains:
```text
AppTrace/
├── AppTrace.exe         # The standalone desktop application (26.03 MB)
├── WebView2Loader.dll   # Native WebView2 connector library
├── PORTABLE_README.md   # Quick-start instructions
├── LICENSE.txt          # MIT Open Source License
└── README.txt           # Release information
```

### Step 4: Launch AppTrace
Navigate to the extracted directory and double-click `AppTrace.exe`.

---

## 4. Windows Security & SmartScreen Guidance

Because AppTrace is an open-source tool compiled from source without an expensive commercial EV Code Signing certificate, Windows Defender SmartScreen may display an informational prompt on the first launch:

```text
Windows protected your PC
Microsoft Defender SmartScreen prevented an unrecognized app from starting.
```

### Safe Verification Procedure:
1. **Verify the SHA-256 hash** of `AppTrace.exe` against the official release manifest:
   ```powershell
   Get-FileHash -Algorithm SHA256 ".\AppTrace.exe"
   # Official SHA256: f511a673bf0b3bc0d3cae1094fb05ee2d31e7c1e05da70064fe4cac88ef22cd9
   ```
2. If the hash matches the official release, click **More info** on the SmartScreen dialog.
3. Click **Run anyway**.

> [!CAUTION]
> Never click "Run anyway" if the computed SHA-256 hash differs from the official release manifest. An altered hash indicates that the download was truncated or modified.

---

## 5. Administrator Permissions: When and Why

AppTrace is engineered to follow the **principle of least privilege**:

- **Standard Userland Scope (Default):**
  - AppTrace starts by default under standard user privileges.
  - In standard mode, you can inspect processes, system CPU and RAM metrics, active network sockets, installed user apps, user startup keys (`HKCU`), clean temporary user caches, search files, and analyze duplicate files.
  - **No UAC elevation is required for standard observability.**

- **Elevated Administrator Scope (Optional):**
  - You only need to run AppTrace as Administrator when modifying machine-wide system state:
    - Stopping machine-wide system services (Win32 Service Control Manager)
    - Modifying machine-level startup keys (`HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run`)
    - Editing system-level registry keys
    - Uninstalling machine-wide applications located in `C:\Program Files`
  - To elevate: Right-click `AppTrace.exe` and select **Run as administrator**.

> [!TIP]
> AppTrace features built-in safety locks. Even when running as Administrator, critical Windows kernel services (`rpcss`, `lsass`, `csrss`, `winlogon`) and core registry hives (`SAM`, `SECURITY`, `SYSTEM\CurrentControlSet`) cannot be stopped or deleted.

---

## 6. How to Update AppTrace

Because AppTrace is portable:
1. Close your running instance of AppTrace.
2. Download the latest `AppTrace-Windows-x64-Portable.zip`.
3. Extract the new archive, replacing the existing files in your AppTrace folder.
4. Your application history, dashboards, and settings are stored separately in `%LOCALAPPDATA%\AppTrace\apptrace.db` and are preserved across updates automatically.

---

## 7. How to Uninstall

Because no system files or registry installer entries are created by the portable version:
1. Close AppTrace.
2. Delete the folder containing `AppTrace.exe`.
3. To remove all local operational history and cached metrics:
   Delete the folder `%LOCALAPPDATA%\AppTrace` (`C:\Users\<YourUsername>\AppData\Local\AppTrace`).
4. Complete uninstallation details are available in [UNINSTALLATION.md](../guides/UNINSTALLATION.md).
