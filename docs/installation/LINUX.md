# AppTrace — Linux Installation Guide

> [!WARNING]
> **LINUX — PUBLIC BETA**  
> Linux support is currently in **Public Beta**. Native Linux compilation has not yet been verified on a Linux build host, and interactive Linux desktop GUI behavior has not yet been tested. Build instructions are provided for evaluation purposes only and are not certified as a tested installation procedure. Pre-compiled packaged distributions (.deb, .rpm, .AppImage) are currently unavailable. The Linux Beta status does not affect Windows Stable availability.

---

## 1. Distribution Support & System Requirements

| Specification | Supported Configuration |
| :--- | :--- |
| **Operating System** | Ubuntu 24.04 LTS / 22.04 LTS, Debian 12 (Bookworm), Fedora 39+ |
| **Architecture** | x86_64 (64-bit Intel/AMD) |
| **Kernel Version** | Linux Kernel >= 5.15 |
| **Display Server** | X11 or Wayland (with XWayland or GTK3 backend) |
| **Desktop Environment** | GNOME, KDE Plasma, XFCE, or any Freedesktop-compliant desktop |
| **Privilege Scope** | **Standard Non-Root User Execution Only** |

> [!CAUTION]
> **Do not run AppTrace as root (`sudo apptrace`).**  
> Running GUI desktop applications and WebViews as the root user introduces severe security risks. AppTrace is engineered to run as a standard user. Systemd unit modifications at the system level and `/etc` files are not modified directly by AppTrace; autostart entries operate exclusively in the user's directory (`~/.config/autostart`). System-level modifications and Polkit privilege escalation are not supported.

---

## 2. Packaged Release Availability Status

| Packaging Format | Current Availability | Notes |
| :--- | :---: | :--- |
| **Standalone Portable Binary** | *Unavailable* | Held pending automated CI runner verification. |
| **Debian / Ubuntu (.deb)** | *Unavailable* | Package generation workflow codified in `.github/workflows/build-linux.yml`. |
| **AppImage (.AppImage)** | *Unavailable* | Planned for post-beta release. |
| **RPM Package (.rpm)** | *Unavailable* | Planned for Fedora / RHEL post-beta. |
| **Building from Source** | **Evaluation Only (Unverified)** | Build instructions provided for developer evaluation; not certified. |

---

## 3. Building and Running from Source (Beta Method)

To run AppTrace on Ubuntu 24.04 or Debian 12 from source:

### Step 1: Install Required System Libraries
Tauri applications on Linux require GTK 3, WebKit2GTK 4.1, and OpenSSL development headers:

```bash
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
```

### Step 2: Install Node.js (v20 LTS) & Rust Toolchain
If you do not have Node.js and Rust installed:

```bash
# 1. Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"

# 2. Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Step 3: Clone the Repository
```bash
git clone https://github.com/21ykk/AppTrace.git
cd AppTrace
```

### Step 4: Install Dependencies & Build Frontend
```bash
npm ci
npx tsc -b
```

### Step 5: Run the Desktop Application
```bash
# Run in development / local mode:
npm run tauri dev

# Or compile an optimized release binary:
npm run tauri build
```

The resulting binary will be created in:
```text
src-tauri/target/release/apptrace
```

---

## 4. Platform Architectural Differences (Linux vs Windows)

Linux users should note the following platform adaptations:

| Subsystem | Windows Implementation | Linux Implementation (Beta) |
| :--- | :--- | :--- |
| **Configuration Manager** | Win32 Registry Manager (`HKCU`/`HKLM`) | `/etc` Configuration Browser & Structured Editor |
| **Application Inventory** | Windows Registry `Uninstall` keys & MSI | `dpkg`, `rpm`, and `flatpak` package inspection |
| **Services Control** | Win32 Service Control Manager (SCM) | `systemctl` (`systemd` service and timer management) |
| **Startup Programs** | Registry Run keys & Windows Startup Menu | XDG Autostart (`~/.config/autostart/`) |
| **Hardware Telemetry** | Toolhelp32 & Win32 Performance Counters | `/proc/stat`, `/proc/meminfo`, `/sys/class/net` |
| **Network Telemetry** | Win32 IP Helper API (`GetExtendedTcpTable`) | Linux Netlink / `/proc/net/tcp` socket parsing |
| **Storage & Caches** | Windows Temp, WER crash dumps, prefetch | Linux `/tmp`, `~/.cache`, journald logs, crash logs |

---

## 5. Collecting Diagnostics and Reporting Bugs

If you encounter issues during the Linux Public Beta:

1. **Check the Local SQLite Database & Logs:**
   AppTrace stores its local database in:
   ```bash
   ~/.local/share/AppTrace/apptrace.db
   ```
2. **Run with Verbose Output:**
   Launch the binary from your terminal to view real-time diagnostics:
   ```bash
   RUST_LOG=debug ./apptrace
   ```
3. **Submit a Bug Report:**
   Report issues at [https://github.com/21ykk/AppTrace/issues](https://github.com/21ykk/AppTrace/issues) including:
   - Linux distribution and version (`lsb_release -a`)
   - Desktop environment and display server (`echo $XDG_CURRENT_DESKTOP`, `echo $XDG_SESSION_TYPE`)
   - Terminal stderr output
   - Steps to reproduce
