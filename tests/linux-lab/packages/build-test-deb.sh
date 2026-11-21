#!/usr/bin/env bash
# tests/linux-lab/packages/build-test-deb.sh
# Builds a harmless, minimal Debian test package for AppTrace Uninstaller testing.
set -euo pipefail

LAB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PKG_DIR="$LAB_DIR/packages/pkg_build"
DEB_NAME="apptrace-test-pkg_1.0.0_all.deb"
OUTPUT_DEB="$LAB_DIR/packages/$DEB_NAME"

echo "=== [Linux Lab] Building Disposable Test Debian Package: $DEB_NAME ==="

rm -rf "$PKG_DIR"
mkdir -p "$PKG_DIR/DEBIAN"
mkdir -p "$PKG_DIR/usr/bin"
mkdir -p "$PKG_DIR/usr/share/apptrace-test-pkg"

# Create debian control file
cat << 'EOF' > "$PKG_DIR/DEBIAN/control"
Package: apptrace-test-pkg
Version: 1.0.0
Section: utils
Priority: optional
Architecture: all
Maintainer: AppTrace QA Engineering <qa@apptrace.internal>
Description: Harmless test package for AppTrace uninstallation verification.
 This package provides a mock daemon and files used solely for automated integration testing.
EOF

# Create harmless mock executable
cat << 'EOF' > "$PKG_DIR/usr/bin/apptrace-test-dummy"
#!/usr/bin/env bash
echo "AppTrace Test Dummy Daemon v1.0.0"
exit 0
EOF
chmod 755 "$PKG_DIR/usr/bin/apptrace-test-dummy"

# Create dummy resource files
echo "AppTrace test asset 1" > "$PKG_DIR/usr/share/apptrace-test-pkg/asset.txt"
echo "AppTrace test config" > "$PKG_DIR/usr/share/apptrace-test-pkg/config.json"

# Build .deb package
dpkg-deb --build --root-owner-group "$PKG_DIR" "$OUTPUT_DEB"
rm -rf "$PKG_DIR"

echo "=== [Linux Lab] Package built successfully: $OUTPUT_DEB ==="
dpkg-deb --info "$OUTPUT_DEB"
