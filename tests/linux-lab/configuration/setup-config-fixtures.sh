#!/usr/bin/env bash
# tests/linux-lab/configuration/setup-config-fixtures.sh
# Generates disposable mock configuration hierarchy for testing Linux Configuration Manager.
set -euo pipefail

TEST_ROOT="${APPTRACE_TEST_ROOT:-/tmp/apptrace-linux-lab}"
CONFIG_DIR="$TEST_ROOT/mock_etc"
echo "=== [Linux Lab] Setting up Mock Linux Configuration in $CONFIG_DIR ==="

mkdir -p "$CONFIG_DIR/apptrace"
mkdir -p "$CONFIG_DIR/systemd"
mkdir -p "$CONFIG_DIR/network"

cat << 'EOF' > "$CONFIG_DIR/apptrace/apptrace.conf"
[server]
port = 9090
telemetry = true
log_level = "info"

[storage]
database_path = "/tmp/apptrace-test-lab/db.sqlite"
max_retention_days = 30
EOF

cat << 'EOF' > "$CONFIG_DIR/apptrace/security.policy"
ALLOW_ANALYTICS=0
LOCAL_FIRST_ONLY=1
ENFORCE_SAFE_DELETE=1
EOF

echo "127.0.0.1 localhost apptrace-test-host" > "$CONFIG_DIR/network/hosts"

echo "=== [Linux Lab] Configuration fixtures created. ==="
ls -lR "$CONFIG_DIR"
