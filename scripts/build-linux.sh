#!/usr/bin/env bash
set -euo pipefail

echo "Starting AppTrace Linux Build..."
npm install
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
echo "AppTrace Linux Validation Passed Successfully."
