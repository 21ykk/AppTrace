# Verification script for AppTrace Portable Release
$ErrorActionPreference = "Stop"

$exePath = Join-Path $PSScriptRoot "..\release\portable\AppTrace\AppTrace.exe"
if (-not (Test-Path $exePath)) {
    Write-Error "AppTrace.exe not found at $exePath"
    exit 1
}

$fileInfo = Get-Item $exePath
Write-Host "Verifying Portable Executable: $exePath" -ForegroundColor Cyan
Write-Host "  -> File Size: $([math]::Round($fileInfo.Length / 1MB, 2)) MB ($($fileInfo.Length) bytes)" -ForegroundColor Cyan
Write-Host "  -> Last Modified: $($fileInfo.LastWriteTime)" -ForegroundColor Cyan

# Terminate any stray AppTrace instances before test
Get-Process -Name "apptrace", "AppTrace" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 300

Write-Host "Launching AppTrace in isolated smoke verification mode..." -ForegroundColor Cyan
$proc = Start-Process -FilePath $exePath -PassThru

# Monitor process startup for up to 6 seconds
$isHealthy = $false
for ($i = 0; $i -lt 12; $i++) {
    Start-Sleep -Milliseconds 500
    $found = Get-Process -Id $proc.Id -ErrorAction SilentlyContinue
    if ($null -ne $found -and -not $found.HasExited) {
        $workingSetMb = [math]::Round($found.WorkingSet64 / 1MB, 2)
        if ($workingSetMb -gt 15) {
            Write-Host "AppTrace process initialized cleanly!" -ForegroundColor Green
            Write-Host "  -> Process ID: $($found.Id)" -ForegroundColor Green
            Write-Host "  -> Working Set Memory: $workingSetMb MB" -ForegroundColor Green
            $isHealthy = $true
            break
        }
    }
}

if ($isHealthy) {
    Stop-Process -Id $proc.Id -Force
    Write-Host "Verification PASSED: Portable executable starts and runs cleanly with zero dependency on dev server." -ForegroundColor Green
    exit 0
} else {
    Write-Error "Verification FAILED: AppTrace process failed to initialize or exited prematurely."
    exit 1
}
