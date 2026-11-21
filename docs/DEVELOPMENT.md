# AppTrace Developer Guide

## Prerequisites
- Node.js >= 20.0 and npm
- Rust toolchain (cargo, rustc >= 1.85)
- Windows: Visual Studio C++ Build Tools & WebView2
- Linux: `libwebkit2gtk-4.1-dev`, `libssl-dev`, `build-essential`

## Local Development Commands
```bash
# Install frontend dependencies
npm install

# Run frontend test build
npm run build

# Run type check
npx tsc --noEmit

# Check Rust backend
cargo check --manifest-path src-tauri/Cargo.toml

# Launch desktop development application
npm run dev
```
