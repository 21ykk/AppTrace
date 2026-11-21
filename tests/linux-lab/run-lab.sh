#!/usr/bin/env bash
# tests/linux-lab/run-lab.sh
# Canonical single-command entry point for the AppTrace Linux Test Lab.
# Usage: ./tests/linux-lab/run-lab.sh [--clean-only] [--skip-package-build]
set -euo pipefail

LAB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export APPTRACE_TEST_ROOT="${APPTRACE_TEST_ROOT:-/tmp/apptrace-linux-lab}"

echo "============================================================"
echo "             APPTRACE LINUX LAB ORCHESTRATOR                "
echo "============================================================"
echo "Lab Directory: $LAB_DIR"
echo "Test Root:     $APPTRACE_TEST_ROOT"
echo "Target OS:     $(uname -s) ($(uname -m))"
echo "============================================================"

if [ "${1:-}" = "--clean-only" ]; then
    echo "Running cleanup only..."
    bash "$LAB_DIR/cleanup/idempotent-cleanup.sh"
    exit 0
fi

# Step 1: Environment Preparation
echo "`n[Step 1/5] Preparing environment..."
bash "$LAB_DIR/setup/01-prepare-env.sh"

# Step 2: Build Debian Package Fixture
if [ "${1:-}" != "--skip-package-build" ] && command -v dpkg-deb &>/dev/null; then
    echo "`n[Step 2/5] Building disposable test package..."
    bash "$LAB_DIR/packages/build-test-deb.sh"
else
    echo "`n[Step 2/5] Skipping deb package build (not Debian or --skip-package-build passed)."
fi

# Step 3: Setup Disposable Fixtures
echo "`n[Step 3/5] Setting up disposable fixtures..."
bash "$LAB_DIR/fixtures/setup-disposable-files.sh"
bash "$LAB_DIR/configuration/setup-config-fixtures.sh"
bash "$LAB_DIR/startup/setup-xdg-autostart.sh"
bash "$LAB_DIR/services/setup-user-service.sh"

# Step 4: Run Integration Tests
echo "`n[Step 4/5] Executing automated assertions..."
bash "$LAB_DIR/scripts/run-all-tests.sh"

# Step 5: Idempotent Cleanup
echo "`n[Step 5/5] Performing post-test cleanup..."
bash "$LAB_DIR/cleanup/idempotent-cleanup.sh"

echo "`n============================================================"
echo "  APPTRACE LINUX TEST LAB RUN COMPLETED SUCCESSFULLY!       "
echo "============================================================"
