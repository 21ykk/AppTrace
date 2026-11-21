# AppTrace — Building from Source

This guide covers the prerequisites, toolchain setup, and step-by-step procedures for compiling AppTrace from source on Windows and Linux.

---

## 1. Prerequisites & Toolchains

### Common Requirements:
- **Git:** Version 2.40 or higher.
- **Node.js:** Node.js 20 LTS or higher, with `npm` (v10+).
- **Rust:** Stable Rust toolchain (edition 2024, Rust 1.85 or newer; tested on Rust 1.90).

### Windows Specific:
- **Operating System:** Windows 10 (64-bit) or Windows 11 (64-bit).
- **C++ Build Tools:** Visual Studio 2022 Build Tools with the **Desktop development with C++** workload (MSVC compiler, Windows 10/11 SDK).
- **WebView2:** Microsoft Edge WebView2 Runtime (included by default on Windows 10/11).

### Linux Specific:
- **Operating System:** Ubuntu 24.04 / 22.04 LTS, Debian 12, or Fedora 39+.
- **System Libraries:** GTK 3, WebKit2GTK 4.1, Ayatana AppIndicator, and OpenSSL development headers.

---

## 2. Setting Up the Development Environment

### Windows Setup:
1. Install Rust via [rustup.rs](https://rustup.rs/):
   ```powershell
   winget install Rustlang.Rustup
   rustup default stable
   ```
2. Install Node.js 20 via [nodejs.org](https://nodejs.org/) or Winget:
   ```powershell
   winget install OpenJS.NodeJS.LTS
   ```

### Linux Setup (Ubuntu / Debian):
```bash
# 1. Install system development dependencies
sudo apt-get update
sudo apt-get install -y \
  build-essential \
  curl \
  pkg-config \
  libssl-dev \
  libgtk-3-dev \
  libwebkit2gtk-4.1-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev

# 2. Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"

# 3. Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

---

## 3. Cloning and Installing Dependencies

```bash
git clone https://github.com/21ykk/AppTrace.git
cd AppTrace

# Install locked frontend dependencies
npm ci
```

---

## 4. Verification & Testing Commands

Before building a release, verify frontend typing and backend unit tests:

```bash
# 1. Type-check TypeScript frontend
npx tsc -b

# 2. Check Rust backend compilation
cargo check --manifest-path src-tauri/Cargo.toml

# 3. Run the automated 11-suite verification harness
cargo run --manifest-path src-tauri/Cargo.toml --bin test_runner --release
```

---

## 5. Building the Desktop Application

### Running in Local Development Mode:
```bash
npm run tauri dev
```
This starts the Vite development server and launches the Tauri desktop application with hot-reloading.

### Compiling a Production Portable Binary (Windows):
AppTrace provides automated release scripts in `scripts/`:

```powershell
# 1. Compile and deploy the portable binary
powershell -ExecutionPolicy Bypass -File scripts/build-windows.ps1

# 2. Package the release ZIP and generate SHA-256 manifests
powershell -ExecutionPolicy Bypass -File scripts/package-release.ps1

# 3. Run the standalone smoke verification test
powershell -ExecutionPolicy Bypass -File scripts/verify-release.ps1
```

The output artifacts will be created in:
- `release/portable/AppTrace/AppTrace.exe` (26.03 MB)
- `release/AppTrace-Windows-x64-Portable.zip` (7.98 MB)
- `release/checksums/SHA256SUMS.txt`

### Compiling a Production Binary (Linux):
> [!NOTE]
> Linux compilation must be performed directly on a native Linux workstation or inside an Ubuntu/Debian container. Cross-compiling for Linux targets from Windows is blocked on standard Windows environments due to missing native Linux sysroot C headers (`webkit2gtk-4.1`, `gtk+-3.0`).

```bash
# Execute on a native Ubuntu 24.04/22.04 or Debian 12 machine:
npm run tauri build
```
The compiled Linux executable will be located in:
```text
src-tauri/target/release/apptrace
```
