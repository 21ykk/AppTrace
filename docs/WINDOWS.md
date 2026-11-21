# AppTrace Platform Guide: Windows

## Telemetry Mechanisms
- **Process Lifecycle:** Toolhelp32 API (`CreateToolhelp32Snapshot`) runs unprivileged at 500ms intervals. Optional elevated Kernel ETW tracing tracks process launch and termination events.
- **Network Sockets:** Win32 IP Helper API (`GetExtendedTcpTable` / `GetExtendedUdpTable`) enumerates active endpoints and attributes them to local process IDs.
- **Filesystem Activity:** Win32 `ReadDirectoryChangesW` handles directory tree monitoring via asynchronous completion ports.

## Privilege Elevation
- Standard unprivileged user execution provides baseline polling metrics.
- Administrator elevation activates kernel tracing sessions.
- Running the UI as Administrator is prohibited to adhere to least privilege.
