# AppTrace Official Release Packaging & Verification Script
$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$releaseDir = Join-Path $repoRoot "release"
$portableDir = Join-Path $releaseDir "portable\AppTrace"
$checksumsDir = Join-Path $releaseDir "checksums"
$zipPath = Join-Path $releaseDir "AppTrace-Windows-x64-Portable.zip"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "     AppTrace Release Packaging & Checksum Generation       " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Verify portable folder prerequisites
if (-not (Test-Path "$portableDir\AppTrace.exe")) {
    throw "Fatal: $portableDir\AppTrace.exe does not exist. Run build-windows.ps1 first."
}

# 2. Ensure root LICENSE exists
$licenseSource = "$portableDir\LICENSE.txt"
$licenseRoot = Join-Path $repoRoot "LICENSE"
if (Test-Path $licenseSource) {
    Copy-Item $licenseSource $licenseRoot -Force
}

# 3. Create clean checksums directory
if (-not (Test-Path $checksumsDir)) {
    New-Item -ItemType Directory -Path $checksumsDir -Force | Out-Null
}

# 4. Remove previous zip if present
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

# 5. Create Portable ZIP archive
Write-Host "[1/4] Creating Portable ZIP archive: $zipPath..." -ForegroundColor Yellow
$tempStageDir = Join-Path $env:TEMP ("apptrace_stage_" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path "$tempStageDir\AppTrace" -Force | Out-Null

Copy-Item "$portableDir\AppTrace.exe" "$tempStageDir\AppTrace\" -Force
Copy-Item "$portableDir\WebView2Loader.dll" "$tempStageDir\AppTrace\" -Force
Copy-Item "$portableDir\PORTABLE_README.md" "$tempStageDir\AppTrace\" -Force
Copy-Item "$portableDir\README.txt" "$tempStageDir\AppTrace\" -Force
Copy-Item "$portableDir\LICENSE.txt" "$tempStageDir\AppTrace\" -Force

Compress-Archive -Path "$tempStageDir\AppTrace" -DestinationPath $zipPath -CompressionLevel Optimal
Remove-Item -Recurse -Force $tempStageDir

$zipInfo = Get-Item $zipPath
Write-Host "  -> ZIP created successfully ($([math]::Round($zipInfo.Length / 1MB, 2)) MB)" -ForegroundColor Green

# 6. Calculate real SHA-256 Checksums
Write-Host "[2/4] Calculating genuine SHA-256 cryptographic checksums..." -ForegroundColor Yellow
$exeHash = (Get-FileHash "$portableDir\AppTrace.exe" -Algorithm SHA256).Hash.ToLowerInvariant()
$zipHash = (Get-FileHash $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()

$checksumContent = @"
# AppTrace Release SHA-256 Checksums
# Generated on: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

$exeHash *portable/AppTrace/AppTrace.exe
$zipHash *AppTrace-Windows-x64-Portable.zip
"@

$checksumFile = Join-Path $checksumsDir "SHA256SUMS.txt"
Set-Content -Path $checksumFile -Value $checksumContent -Encoding UTF8
Write-Host "  -> Written: $checksumFile" -ForegroundColor Green

# 7. Test ZIP Extraction & Verification
Write-Host "[3/4] Validating ZIP archive extraction in isolated environment..." -ForegroundColor Yellow
$testExtractDir = Join-Path $env:TEMP ("apptrace_extract_test_" + [guid]::NewGuid().ToString("N"))
Expand-Archive -Path $zipPath -DestinationPath $testExtractDir

$extractedExe = "$testExtractDir\AppTrace\AppTrace.exe"
if (-not (Test-Path $extractedExe)) {
    throw "Fatal: Extracted executable missing from archive!"
}

# 8. Isolated Smoke Launch
Write-Host "[4/4] Executing smoke test from extracted ZIP directory..." -ForegroundColor Yellow
$proc = Start-Process -FilePath $extractedExe -PassThru
Start-Sleep -Seconds 3

$active = Get-Process -Id $proc.Id -ErrorAction SilentlyContinue
if ($active -and -not $active.HasExited) {
    Write-Host "  -> Smoke test PASSED: Process is live (PID $($active.Id), WorkingSet: $([math]::Round($active.WorkingSet64 / 1MB, 2)) MB)" -ForegroundColor Green
    Stop-Process -Id $active.Id -Force
} else {
    throw "Fatal: Extracted portable executable failed to start or exited prematurely."
}

Remove-Item -Recurse -Force $testExtractDir -ErrorAction SilentlyContinue

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "  AppTrace Release Package Prepared & Verified Successfully! " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "Executable: $portableDir\AppTrace.exe"
Write-Host "ZIP:        $zipPath"
Write-Host "Checksums:  $checksumFile"
Write-Host "SHA256(exe): $exeHash"
Write-Host "SHA256(zip): $zipHash"
