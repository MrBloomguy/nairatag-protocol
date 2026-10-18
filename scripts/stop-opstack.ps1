# ==============================================================================
# stop-opstack.ps1 - Graceful shutdown for NairaTag OP Stack Network
# ==============================================================================

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Stopping NairaTag OP Stack Network" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Stop WSL OP Stack Daemons (op-batcher, op-node, op-geth)
Write-Host "[1/3] Stopping OP Stack daemons inside WSL..." -ForegroundColor Yellow
$wslStopScript = "/mnt/c/" + ($RepoRoot.Path.Replace("C:\", "").Replace("\", "/")) + "/op-stack/scripts/stop-wsl.sh"
wsl.exe -e bash $wslStopScript

# 2. Stop Windows WSL Port Proxy
Write-Host "[2/3] Stopping Windows wsl-proxy..." -ForegroundColor Yellow
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*wsl-proxy.js*" } | ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
}

# 3. Gracefully Stop Anvil L1 (flushes state via --dump-state)
Write-Host "[3/3] Gracefully stopping Anvil L1..." -ForegroundColor Yellow
Get-Process -Name anvil -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.Id -ErrorAction SilentlyContinue
}

Start-Sleep -Seconds 2

# Verify ports
$l1StillListening = Get-NetTCPConnection -LocalPort 8545 -State Listen -ErrorAction SilentlyContinue
$l2StillListening = Get-NetTCPConnection -LocalPort 9545 -State Listen -ErrorAction SilentlyContinue

if (-not $l1StillListening -and -not $l2StillListening) {
    Write-Host "All NairaTag OP Stack services cleanly stopped. State persisted to disk." -ForegroundColor Green
} else {
    Write-Host "Warning: Some ports may still be closing..." -ForegroundColor Yellow
}
