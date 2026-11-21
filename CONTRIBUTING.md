# Contributing to AppTrace

Thank you for your interest in contributing to **AppTrace**!

## Development Guidelines

### 1. Code Standards
- **Rust Backend:**
  - Follow standard Rust idioms and format with `cargo fmt`.
  - Pass all compiler checks without warnings (`cargo check --manifest-path src-tauri/Cargo.toml`).
  - Native Win32 operations must use direct Windows API calls via `windows-sys` rather than spawning shell interpreters (`powershell.exe` or `cmd.exe`).
- **Frontend Workstation:**
  - Strict TypeScript compliance (`npx tsc -b`).
  - Adhere to the **Dark Graphite** design system (`#101113` background, `#0B0C0E` sidebar, `#17191C` panels, `#30343A` borders, `#2878D0` diagnostic blue).
  - Use Lucide icons consistently across navigation and widgets.
  - No synthetic or mock telemetry in production views.

### 2. Testing Requirements
Before submitting a pull request:
1. Run the comprehensive automated verification suite:
   ```bash
   cargo run --manifest-path src-tauri/Cargo.toml --bin test_runner
   ```
2. Verify frontend compilation:
   ```bash
   npm run build
   ```
3. Run release smoke testing:
   ```powershell
   powershell.exe -ExecutionPolicy Bypass -File scripts\verify-release.ps1
   ```

### 3. Safety First
Any new management feature that modifies the filesystem, registry, or services must implement defensive validation:
- Input canonicalization and path traversal prevention.
- System root protection.
- Operation preview and explicit user confirmation.
- SQLite audit logging in `operation_history`.
