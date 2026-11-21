#!/usr/bin/env bash
# tests/linux-lab/cleanup/idempotent-cleanup.sh
# Safely and idempotently removes all disposable test resources created by the Linux Lab.
set -euo pipefail

echo "=== [Linux Lab] Starting Idempotent Test Cleanup ==="

# 1. Stop and remove systemd user service & timer
if command -v systemctl &>/dev/null; then
    echo "Stopping test service and timer..."
    systemctl --user stop apptrace-test-daemon.service 2>/dev/null || true
    systemctl --user stop apptrace-test-timer.timer 2>/dev/null || true
    systemctl --user disable apptrace-test-daemon.service 2>/dev/null || true
    systemctl --user disable apptrace-test-timer.timer 2>/dev/null || true
fi

rm -f "$HOME/.config/systemd/user/apptrace-test-daemon.service"
rm -f "$HOME/.config/systemd/user/apptrace-test-timer.timer"

if command -v systemctl &>/dev/null; then
    systemctl --user daemon-reload 2>/dev/null || true
fi

# 2. Remove XDG autostart entry
rm -f "$HOME/.config/autostart/apptrace-test-autostart.desktop"

# 3. Uninstall test debian package if installed
if dpkg -s apptrace-test-pkg &>/dev/null; then
    echo "Purging installed test package apptrace-test-pkg..."
    if [ "$(id -u)" -eq 0 ]; then
        dpkg --purge apptrace-test-pkg 2>/dev/null || true
    elif command -v sudo &>/dev/null; then
        sudo dpkg --purge apptrace-test-pkg 2>/dev/null || true
    fi
fi

# 4. Remove built deb package file
LAB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
rm -f "$LAB_DIR/packages/apptrace-test-pkg_1.0.0_all.deb"
rm -rf "$LAB_DIR/packages/pkg_build"

# 5. Remove temporary test filesystem directories
TEST_ROOT="${APPTRACE_TEST_ROOT:-/tmp/apptrace-linux-lab}"
if [ -d "$TEST_ROOT" ]; then
    echo "Removing temporary test root: $TEST_ROOT"
    rm -rf "$TEST_ROOT"
fi

echo "=== [Linux Lab] Cleanup completed cleanly and idempotently. ==="
