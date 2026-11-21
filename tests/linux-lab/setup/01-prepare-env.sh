#!/usr/bin/env bash
# tests/linux-lab/setup/01-prepare-env.sh
# Prepares Linux host or VM for AppTrace compilation, testing, and execution.
set -euo pipefail

echo "=== [Linux Lab] Step 1: Preparing Linux Build & Runtime Environment ==="

if command -v apt-get &>/dev/null; then
    echo "Detected Debian/Ubuntu system. Checking required packages..."
    PACKAGES=(
        build-essential
        curl
        wget
        file
        libssl-dev
        libgtk-3-dev
        libwebkit2gtk-4.1-dev
        libayatana-appindicator3-dev
        librsvg2-dev
        patchelf
        squashfs-tools
        dpkg-dev
    )
    
    MISSING=()
    for pkg in "${PACKAGES[@]}"; do
        if ! dpkg -s "$pkg" &>/dev/null; then
            MISSING+=("$pkg")
        fi
    done
    
    if [ ${#MISSING[@]} -gt 0 ]; then
        echo "Installing missing packages: ${MISSING[*]}"
        if [ "$(id -u)" -eq 0 ]; then
            apt-get update -y
            apt-get install -y "${MISSING[@]}"
        elif command -v sudo &>/dev/null; then
            sudo apt-get update -y
            sudo apt-get install -y "${MISSING[@]}"
        else
            echo "WARNING: Missing packages detected and cannot elevate. Please install: ${MISSING[*]}"
        fi
    else
        echo "All core system development packages are installed."
    fi
elif command -v dnf &>/dev/null; then
    echo "Detected Fedora/RHEL system. Ensure webkit2gtk4.1-devel, openssl-devel, gtk3-devel are installed."
fi

# Verify Rust
if command -v cargo &>/dev/null; then
    echo "Rust Toolchain: $(cargo --version)"
else
    echo "Rust is not found. Installing via rustup..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    # shellcheck source=/dev/null
    source "$HOME/.cargo/env"
fi

# Verify Node.js
if command -v node &>/dev/null; then
    echo "Node.js Runtime: $(node --version)"
    echo "NPM Package Manager: $(npm --version)"
else
    echo "Node.js not detected. Please install Node.js >= 20.x."
fi

echo "=== [Linux Lab] Environment preparation complete. ==="
