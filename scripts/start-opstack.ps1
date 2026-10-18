# ==============================================================================
# start-opstack.ps1 - Single deterministic startup for NairaTag OP Stack L2
# ==============================================================================
param(
    [switch]$Background = $false
)

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$DeployerDir = Join-Path $RepoRoot "op-stack\deployer"
$StatePath = Join-Path $DeployerDir "anvil-l1-state.json"
$AnvilExe = Join-Path $HOME ".foundry\bin\anvil.exe"
if (-not (Test-Path $AnvilExe)) { $AnvilExe = "anvil" }

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Starting NairaTag OP Stack Network (L1 + L2)" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Start Anvil L1 (Windows Host)
$l1Healthy = $false
try {
    $res = Invoke-RestMethod -Uri "http://127.0.0.1:8545" -Method Post -Body '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' -ContentType "application/json" -TimeoutSec 1 -ErrorAction SilentlyContinue
    if ($res -and $res.result -eq "0x384") { $l1Healthy = $true }
} catch {}

if ($l1Healthy) {
    Write-Host "[1/4] Anvil L1 is already active on http://127.0.0.1:8545 (Chain 900)" -ForegroundColor Green
} else {
    Write-Host "[1/4] Starting persistent Anvil L1 (port 8545, chain 900)..." -ForegroundColor Yellow
    $anvilArgs = @(
        "--host", "0.0.0.0",
        "--port", "8545",
        "--chain-id", "900",
        "--block-time", "1"
    )
    if (Test-Path $StatePath) {
        $anvilArgs += @("--load-state", $StatePath, "--dump-state", $StatePath)
        Write-Host "      Loading persisted state from: $StatePath" -ForegroundColor DarkGray
    } else {
        $anvilArgs += @("--dump-state", $StatePath)
    }

    Start-Process -FilePath $AnvilExe -ArgumentList $anvilArgs -WindowStyle Hidden
    
    # Wait for L1 to become ready
    for ($i = 1; $i -le 15; $i++) {
        Start-Sleep -Seconds 1
        try {
            $res = Invoke-RestMethod -Uri "http://127.0.0.1:8545" -Method Post -Body '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' -ContentType "application/json" -TimeoutSec 1 -ErrorAction SilentlyContinue
            if ($res -and $res.result -eq "0x384") {
                $l1Healthy = $true
                break
            }
        } catch {}
    }
    if (-not $l1Healthy) {
        Write-Host "Error: Anvil L1 failed to start on port 8545" -ForegroundColor Red
        exit 1
    }
    Write-Host "      Anvil L1 is ready!" -ForegroundColor Green
}

# 2. Launch WSL OP Stack Daemons (op-geth + op-node + op-batcher)
Write-Host "[2/4] Launching OP Stack runtime inside WSL2..." -ForegroundColor Yellow
$wslScriptPath = "/mnt/c/" + ($RepoRoot.Path.Replace("C:\", "").Replace("\", "/")) + "/op-stack/scripts/start-daemon.sh"
wsl.exe -e bash $wslScriptPath
Start-Sleep -Seconds 3

# 3. Start Windows <-> WSL TCP Port Proxy (node scripts/wsl-proxy.js)
Write-Host "[3/4] Ensuring Windows-to-WSL port proxy is running..." -ForegroundColor Yellow
$proxyRunning = $false
try {
    $pConn = Get-NetTCPConnection -LocalPort 9545 -State Listen -ErrorAction SilentlyContinue
    if ($pConn) { $proxyRunning = $true }
} catch {}

if (-not $proxyRunning) {
    $proxyScript = Join-Path $PSScriptRoot "wsl-proxy.js"
    Start-Process -FilePath "node" -ArgumentList @($proxyScript) -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
    Start-Sleep -Seconds 2
}

# 4. Wait for NairaTag L2 RPC Readiness
Write-Host "[4/4] Verifying NairaTag L2 RPC (http://127.0.0.1:9545)..." -ForegroundColor Yellow
$l2Healthy = $false
$l2Block = 0
for ($i = 1; $i -le 25; $i++) {
    Start-Sleep -Seconds 1
    try {
        $cid = Invoke-RestMethod -Uri "http://127.0.0.1:9545" -Method Post -Body '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' -ContentType "application/json" -TimeoutSec 1 -ErrorAction SilentlyContinue
        $blk = Invoke-RestMethod -Uri "http://127.0.0.1:9545" -Method Post -Body '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' -ContentType "application/json" -TimeoutSec 1 -ErrorAction SilentlyContinue
        if ($cid -and $cid.result -eq "0x385" -and $blk -and $blk.result) {
            $l2Healthy = $true
            $l2Block = [Convert]::ToInt32($blk.result, 16)
            break
        }
    } catch {}
}

if (-not $l2Healthy) {
    Write-Host "Warning: L2 RPC did not respond on 127.0.0.1:9545 within 25 seconds." -ForegroundColor Red
    Write-Host "Check WSL logs: wsl cat /tmp/op-node.log and /tmp/op-geth.log" -ForegroundColor Yellow
    exit 1
}

# Print network status summary
$l1BlockHex = (Invoke-RestMethod -Uri "http://127.0.0.1:8545" -Method Post -Body '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' -ContentType "application/json").result
$l1Block = [Convert]::ToInt32($l1BlockHex, 16)

Write-Host "`n==================================================" -ForegroundColor Green
Write-Host " NairaTag OP Stack Network is LIVE & OPERATIONAL" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ("  L1 Chain ID      : 900 (Anvil)")
Write-Host ("  L1 RPC URL       : http://127.0.0.1:8545")
Write-Host ("  L1 Block Height  : #" + $l1Block)
Write-Host ("  L2 Chain ID      : 901 (NairaTag Rollup)")
Write-Host ("  L2 RPC URL       : http://127.0.0.1:9545")
Write-Host ("  L2 Block Height  : #" + $l2Block)
Write-Host ("  L2 Consensus RPC : http://127.0.0.1:8547 (op-node)")
Write-Host "==================================================`n" -ForegroundColor Green
