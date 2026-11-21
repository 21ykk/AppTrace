# Security Policy

## 1. Security Philosophy & Principles

AppTrace is built with strict local-first and least-privilege principles. The application is designed for system diagnostic and administrative tasks while maintaining strict boundaries to protect user data and the underlying operating system.

- **100% Offline & Local Data:** AppTrace does not contain telemetry beacons, analytical trackers, or cloud sync services. All data is persisted strictly to `%LOCALAPPDATA%\AppTrace\apptrace.db` (or `~/.local/share/apptrace/` on Linux).
- **Zero Shell Concatenation:** Uninstallation commands and process executions are tokenized and spawned as explicit argument vectors (`std::process::Command`), preventing command injection attacks.
- **Native System APIs:** Windows Registry operations interact directly with the operating system via Win32 APIs (`RegOpenKeyExW`, `RegSetValueExW`, etc.), eliminating reliance on external shell script interpreters.

---

## 2. Destructive Operation Safeguards

AppTrace incorporates a multi-layer **Safety Shield** to prevent accidental or malicious destruction of operating system components:

### Path & Filesystem Protection (`is_safe_directory`)
- **Root Protection:** Deletion of drive roots (`C:\`, `/`) or top-level OS folders (`C:\Windows`, `C:\Program Files`, `C:\ProgramData`, `C:\Users`) is strictly blocked.
- **System Binary Isolation:** Any path inside `C:\Windows` (including `System32`, `SysWOW64`, `WinSxS`) is unconditionally protected.
- **User Library Protection:** Primary user directories (`Documents`, `Desktop`, `Downloads`) are safeguarded against accidental inclusion in uninstaller leftover deletions.
- **Path Traversal Defense:** Relative path traversal tokens (`..`) and unresolved symlink targets are rejected before executing filesystem deletions.

### Registry Protection
- Modification or deletion of security hives (`SAM`, `SECURITY`, `SYSTEM\CurrentControlSet`, `BCD00000000`) is prohibited.
- Root hive containers (`HKLM`, `HKCU`, `HKCR`, `HKU`, `HKLM\SOFTWARE`, `HKCU\Software`) cannot be deleted.

### Service Lockdown
- Core Windows operating system services (`rpcss`, `dcomlaunch`, `lsm`, `samss`, `plugplay`, `cryptsvc`, `eventlog`, `lsass`, `csrss`, `winlogon`, `gpsvc`, `brokerinfrastructure`, `lanmanworkstation`, `lanmanserver`) are locked from termination or modification.

---

## 3. Reporting a Vulnerability

If you discover a security vulnerability or bypass in AppTrace's safety controls:

1. **Do not create a public issue** on GitHub.
2. Email your findings with a detailed proof of concept to the security maintainers or open a private GitHub Security Advisory.
3. Include:
   - Operating system version.
   - AppTrace binary version and build hash.
   - Step-by-step reproduction instructions.
   - Potential impact analysis.

We acknowledge receipt within 48 hours and work with you to release an immediate security patch.
