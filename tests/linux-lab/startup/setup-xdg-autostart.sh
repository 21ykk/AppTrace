#!/usr/bin/env bash
# tests/linux-lab/startup/setup-xdg-autostart.sh
# Creates a disposable XDG autostart desktop entry for AppTrace Startup Manager testing.
set -euo pipefail

AUTOSTART_DIR="$HOME/.config/autostart"
mkdir -p "$AUTOSTART_DIR"

DESKTOP_FILE="$AUTOSTART_DIR/apptrace-test-autostart.desktop"

echo "=== [Linux Lab] Creating Disposable XDG Autostart Fixture ==="

cat << 'EOF' > "$DESKTOP_FILE"
[Desktop Entry]
Type=Application
Version=1.0
Name=AppTrace Test Autostart Application
Comment=Disposable entry for verifying AppTrace startup enable/disable toggling
Exec=/usr/bin/true --apptrace-test-flag
Terminal=false
Hidden=false
X-GNOME-Autostart-enabled=true
Categories=Utility;
EOF

echo "Created: $DESKTOP_FILE"
cat "$DESKTOP_FILE"
