# AppTrace Development Roadmap

## Phase 1: Foundation and Local Persistence (Completed)
- Tauri 2 shell with React 19 and Tailwind CSS
- Normalized event model and SQLite WAL schema
- Windows Toolhelp32, IP Helper, and Notify filesystem collectors
- 14 real-time observability widgets and dashboard persistence

## Phase 2: Privileged Telemetry Helpers (In Progress)
- Decoupled Windows ETW background service communicating via authenticated Named Pipe
- Linux eBPF CO-RE daemon communicating via Unix Domain Socket

## Phase 3: Advanced Visualizations & Analytics
- Multi-day historical telemetry analysis
- Network latency and DNS lookup correlation
- Forensic timeline export (JSON, CSV, Parquet)
