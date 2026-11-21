# Contributing to AppTrace

Thank you for your interest in contributing to **AppTrace**!

---

## 1. Code Standards

### Rust Backend:
- Follow standard Rust idioms and format with `cargo fmt`.
- Pass all compiler checks without warnings (`cargo check --manifest-path src-tauri/Cargo.toml`).
- Native Win32 operations must use direct Windows API calls via `windows-sys` rather than spawning shell interpreters (`powershell.exe` or `cmd.exe`).
- Never introduce `unsafe` code unless strictly necessary for platform FFI, and provide comprehensive safety documentation comments.

### Frontend Workstation:
- Strict TypeScript compliance without `any` overrides (`npx tsc -b`).
- Adhere to the **Dark Graphite** enterprise visual design system:
  - Background: `#101113`
  - Sidebar: `#0B0C0E`
  - Panel Surfaces: `#17191C`
  - Elevated Cards: `#1D2024`
  - Borders: `#30343A`
  - Diagnostic Blue Accent: `#2878D0`
- Use Lucide icons consistently across navigation, modals, and widget headers.
- Never render mock or fabricated metrics in production views.

---

## 2. Mandatory Verification Requirements

Before submitting any Pull Request, you must verify all checks pass:

1. **Frontend Type Check:**
   ```bash
   npx tsc -b
   ```
2. **Rust Backend Cargo Check:**
   ```bash
   cargo check --manifest-path src-tauri/Cargo.toml
   ```
3. **Comprehensive 11-Suite Verification Test Harness:**
   ```bash
   cargo run --manifest-path src-tauri/Cargo.toml --bin test_runner --release
   ```
4. **Standalone Portable Smoke Verification (Windows):**
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/verify-release.ps1
   ```

---

## 3. Safety Architecture Rules

Any new feature that performs mutating operating system actions (deleting files, modifying registry keys, toggling startup programs, stopping services) must adhere to these safety rules:
1. **Never Bypass System Root Guards:** Hard-block OS roots (`C:\Windows`, `System32`, `SysWOW64`, `Program Files`, `/etc`, `/bin`, `/boot`, `/usr`).
2. **Defend Against Path Traversal:** Disallow `..` tokens and always verify canonicalized paths (`fs::canonicalize`).
3. **Reject Symlink Redirection:** Inspect `fs::symlink_metadata` before opening or deleting files to prevent symlink traversal attacks.
4. **Decouple SQLite Persistence:** Operating system results must remain decoupled from database write status. A database write failure must never report an OS action failure if the OS action succeeded.
5. **Always Log to `operation_history`:** Mutating actions must record timestamped entries in the local SQLite audit log.
