#!/usr/bin/env bash
# tests/linux-lab/services/setup-user-service.sh
# Creates and starts a disposable systemd user service and timer for AppTrace testing.
set -euo pipefail

USER_SYSTEMD_DIR="$HOME/.config/systemd/user"
mkdir -p "$USER_SYSTEMD_DIR"

SERVICE_FILE="$USER_SYSTEMD_DIR/apptrace-test-daemon.service"
TIMER_FILE="$USER_SYSTEMD_DIR/apptrace-test-timer.timer"

echo "=== [Linux Lab] Creating Disposable systemd User Service & Timer ==="

cat << 'EOF' > "$SERVICE_FILE"
[Unit]
Description=AppTrace Disposable Test Daemon
After=network.target

[Service]
Type=simple
ExecStart=/bin/sh -c "while true; do sleep 60; done"
Restart=no

[Install]
WantedBy=default.target
EOF

cat << 'EOF' > "$TIMER_FILE"
[Unit]
Description=AppTrace Disposable Test Timer

[Timer]
OnCalendar=hourly
Persistent=false

[Install]
WantedBy=timers.target
EOF

if command -v systemctl &>/dev/null; then
    echo "Reloading systemd user daemon and starting test service..."
    systemctl --user daemon-reload || true
    systemctl --user start apptrace-test-daemon.service || true
    systemctl --user start apptrace-test-timer.timer || true
    echo "Service Status:"
    systemctl --user is-active apptrace-test-daemon.service || true
    echo "Timer Status:"
    systemctl --user is-active apptrace-test-timer.timer || true
else
    echo "systemctl is not running in this environment."
fi

echo "=== [Linux Lab] Service & Timer created in $USER_SYSTEMD_DIR ==="
