# Windows Build & Validation Script for AppTrace
$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  AppTrace Production Build & Quality Check" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

Write-Host "[1/4] Compiling React + TypeScript Frontend..." -ForegroundColor Yellow
cmd.exe /c "npm.cmd run build"
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }

Write-Host "[2/4] Building Standalone Portable Binary (Tauri Release)..." -ForegroundColor Yellow
cmd.exe /c "npm.cmd run tauri -- build --no-bundle"
if ($LASTEXITCODE -ne 0) { throw "Tauri release compilation failed" }

Write-Host "[3/4] Running Subsystem Verification Suite..." -ForegroundColor Yellow
cargo run --manifest-path src-tauri/Cargo.toml --bin test_runner
if ($LASTEXITCODE -ne 0) { throw "Test runner suite failed" }

Write-Host "[4/5] Preparing Portable Deployment..." -ForegroundColor Yellow
if (-not (Test-Path "release/portable/AppTrace")) {
    New-Item -ItemType Directory -Force -Path "release/portable/AppTrace" | Out-Null
}

# Ensure existing running instance is closed so Copy-Item does not encounter file locks
Get-Process -Name "apptrace", "AppTrace" -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "  -> Stopping existing running instance (PID $($_.Id))..." -ForegroundColor DarkYellow
    Stop-Process -Id $_.Id -Force
}
Start-Sleep -Milliseconds 500

$srcExe = "src-tauri/target/release/apptrace.exe"
$destExe = "release/portable/AppTrace/AppTrace.exe"

if (Test-Path $srcExe) {
    Copy-Item $srcExe $destExe -Force
    $destInfo = Get-Item $destExe
    Write-Host "  -> Successfully deployed portable AppTrace.exe ($([math]::Round($destInfo.Length / 1MB, 2)) MB)" -ForegroundColor Green
} else {
    throw "Release binary not found at $srcExe"
}

Write-Host "[5/5] Running Portable Smoke Verification..." -ForegroundColor Yellow
& (Join-Path $PSScriptRoot "verify-release.ps1")

Write-Host "==========================================" -ForegroundColor Green
Write-Host "  AppTrace Build Verification PASSED!    " -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

