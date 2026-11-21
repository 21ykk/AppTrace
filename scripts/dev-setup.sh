#!/usr/bin/env bash
set -e

echo "Setting up development environment for AppTrace..."
node -v
npm -v
cargo --version
echo "AppTrace dev environment ready."
