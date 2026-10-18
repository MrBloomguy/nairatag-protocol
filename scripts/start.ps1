# ==================================================
# NairaTag Network — Start Devnet (Dual Anvil)
# ==================================================

$EnvFile = Join-Path $PSScriptRoot "..\config\development.env"
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            [System.Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), "Process")
        }
    }
}

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Starting NairaTag Network Anvil Devnet" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$l1Url = if ($env:L1_RPC_URL) { $env:L1_RPC_URL } else { "http://127.0.0.1:8545" }
$l2Url = if ($env:L2_RPC_URL) { $env:L2_RPC_URL } else { "http://127.0.0.1:9545" }
$anvilPath = Join-Path $HOME ".foundry\bin\anvil.exe"
$anvilExe = if (Test-Path $anvilPath) { $anvilPath } else { "anvil" }

# 1. Check / Start Anvil L1 (Port 8545, Chain ID 900)
$anvilL1Running = $false
try {
    $checkL1 = Invoke-RestMethod -Uri $l1Url -Method Post -Body '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' -ContentType "application/json" -TimeoutSec 1 -ErrorAction SilentlyContinue
    if ($checkL1 -and $checkL1.result) { $anvilL1Running = $true }
} catch {}

if ($anvilL1Running) {
    Write-Host "[1/4] Anvil L1 already active on $l1Url" -ForegroundColor Green
} else {
    Write-Host "[1/4] Starting Anvil L1 on port 8545 (Chain ID: 900, Persistent State)..." -ForegroundColor Yellow
    $statePath = Join-Path $PSScriptRoot "..\op-stack\deployer\anvil-l1-state.json"
    Start-Process -FilePath $anvilExe -ArgumentList @("--host", "0.0.0.0", "--port", "8545", "--chain-id", "900", "--block-time", "1", "--state", $statePath, "--state-interval", "10", "--preserve-historical-states") -WindowStyle Hidden
}

# 2. Check / Start Anvil L2 (Port 9545, Chain ID 901)
$anvilL2Running = $false
try {
    $checkL2 = Invoke-RestMethod -Uri $l2Url -Method Post -Body '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' -ContentType "application/json" -TimeoutSec 1 -ErrorAction SilentlyContinue
    if ($checkL2 -and $checkL2.result) { $anvilL2Running = $true }
} catch {}

if ($anvilL2Running) {
    Write-Host "[2/4] NairaTag L2 Anvil already active on $l2Url" -ForegroundColor Green
} else {
    Write-Host "[2/4] Starting NairaTag L2 (Anvil) on port 9545 (Chain ID: 901)..." -ForegroundColor Yellow
    Start-Process -FilePath $anvilExe -ArgumentList @("--port", "9545", "--chain-id", "901", "--block-time", "2") -WindowStyle Hidden
}

# Wait for L1 and L2 readiness
Write-Host "Waiting for EVM RPC readiness..." -ForegroundColor Cyan
for ($i = 1; $i -le 15; $i++) {
    try {
        $r1 = Invoke-RestMethod -Uri $l1Url -Method Post -Body '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' -ContentType "application/json" -TimeoutSec 1 -ErrorAction SilentlyContinue
        $r2 = Invoke-RestMethod -Uri $l2Url -Method Post -Body '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' -ContentType "application/json" -TimeoutSec 1 -ErrorAction SilentlyContinue
        if ($r1.result -and $r2.result) { break }
    } catch {}
    Start-Sleep -Seconds 1
}

# 3. Deploy Contracts to L2
Write-Host "[3/4] Deploying NairaTag contracts to L2..." -ForegroundColor Yellow
& (Join-Path $PSScriptRoot "deploy-contracts.ps1")

# 4. Report status
Write-Host "[4/4] Reporting status..." -ForegroundColor Yellow
& (Join-Path $PSScriptRoot "status.ps1")
