# ==================================================
# NairaTag Network — Status Checker (Profile-Aware)
# ==================================================

param(
    [string]$Profile = "dev-anvil"
)

# Load profile env
$envFile = if ($Profile -eq "dev-opstack") {
    Join-Path $PSScriptRoot "..\config\dev-opstack.env"
} else {
    Join-Path $PSScriptRoot "..\config\dev-anvil.env"
}

if (-not (Test-Path $envFile)) {
    $envFile = Join-Path $PSScriptRoot "..\config\development.env"
}

if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            [System.Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), "Process")
        }
    }
}

$l1Url = if ($env:L1_RPC_URL) { $env:L1_RPC_URL } else { "http://127.0.0.1:8545" }
$l2Url = if ($env:L2_RPC_URL) { $env:L2_RPC_URL } else { "http://127.0.0.1:9545" }
$blockscoutUrl = "http://localhost:4000"

Write-Host "==================================================" -ForegroundColor Cyan
if ($Profile -eq "dev-opstack") {
    Write-Host " NairaTag Network - Genuine OP Stack Rollup Status" -ForegroundColor Cyan
} else {
    Write-Host " NairaTag Local EVM Harness - Anvil L1 + Anvil EVM" -ForegroundColor Cyan
    Write-Host " (Contract Development Profile: dev-anvil)" -ForegroundColor Cyan
}
Write-Host "==================================================" -ForegroundColor Cyan

$passed = $true

# 1. Check L1
$l1Status = "OFFLINE"
$l1Client = "UNKNOWN"
$l1Chain = "UNKNOWN"
$l1Block = "UNKNOWN"
try {
    $resBlock = Invoke-RestMethod -Uri $l1Url -Method Post -Body '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' -ContentType "application/json" -TimeoutSec 2 -ErrorAction Stop
    $resClient = Invoke-RestMethod -Uri $l1Url -Method Post -Body '{"jsonrpc":"2.0","method":"web3_clientVersion","params":[],"id":2}' -ContentType "application/json" -TimeoutSec 2 -ErrorAction Stop
    $resChain = Invoke-RestMethod -Uri $l1Url -Method Post -Body '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":3}' -ContentType "application/json" -TimeoutSec 2 -ErrorAction Stop
    if ($resBlock -and $resBlock.result) {
        $l1Status = "ONLINE"
        $l1Block = [Convert]::ToInt64($resBlock.result, 16).ToString()
        if ($resClient -and $resClient.result) { $l1Client = $resClient.result }
        if ($resChain -and $resChain.result) { $l1Chain = [Convert]::ToInt64($resChain.result, 16).ToString() }
    }
} catch {
    $passed = $false
}

# 2. Check L2 RPC
$l2Status = "OFFLINE"
$l2Client = "UNKNOWN"
$l2Chain = "UNKNOWN"
$l2Block = "UNKNOWN"
$isRealOpGeth = $false
try {
    $resBlock2 = Invoke-RestMethod -Uri $l2Url -Method Post -Body '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' -ContentType "application/json" -TimeoutSec 2 -ErrorAction Stop
    $resClient2 = Invoke-RestMethod -Uri $l2Url -Method Post -Body '{"jsonrpc":"2.0","method":"web3_clientVersion","params":[],"id":2}' -ContentType "application/json" -TimeoutSec 2 -ErrorAction Stop
    $resChain2 = Invoke-RestMethod -Uri $l2Url -Method Post -Body '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":3}' -ContentType "application/json" -TimeoutSec 2 -ErrorAction Stop
    if ($resBlock2 -and $resBlock2.result) {
        $l2Status = "ONLINE"
        $l2Block = [Convert]::ToInt64($resBlock2.result, 16).ToString()
        if ($resClient2 -and $resClient2.result) { 
            $l2Client = $resClient2.result 
            if ($l2Client -match "op-geth|op-reth|Geth") {
                $isRealOpGeth = $true
            }
        }
        if ($resChain2 -and $resChain2.result) { $l2Chain = [Convert]::ToInt64($resChain2.result, 16).ToString() }
    }
} catch {
    $passed = $false
}

# 3. Check Rollup Daemons
$opNodeProc = Get-Process -Name "op-node" -ErrorAction SilentlyContinue
$opBatcherProc = Get-Process -Name "op-batcher" -ErrorAction SilentlyContinue

# Output report
if ($l1Status -eq "ONLINE") {
    Write-Host "L1 Ethereum:      ONLINE ($l1Client, Chain ID: $l1Chain, Block: #$l1Block)" -ForegroundColor Green
} else {
    Write-Host "L1 Ethereum:      OFFLINE ($l1Url)" -ForegroundColor Red
}

if ($Profile -eq "dev-opstack") {
    # STRICT OP STACK CHECKS
    if ($l2Status -eq "ONLINE" -and $isRealOpGeth) {
        Write-Host "L2 Execution:     ONLINE (OP Stack: $l2Client, Chain ID: $l2Chain, Block: #$l2Block)" -ForegroundColor Green
    } else {
        if ($l2Client -match "anvil") {
            Write-Host "L2 Execution:     FAIL (Running Anvil: $l2Client; dev-opstack requires op-geth/op-reth)" -ForegroundColor Red
        } else {
            Write-Host "L2 Execution:     OFFLINE ($l2Url)" -ForegroundColor Red
        }
        $passed = $false
    }

    # 3. Check Rollup Daemons (running in WSL2 or reachable via RPC)
    $opNodeRunning = $false
    try {
        $nodeSync = Invoke-RestMethod -Uri "http://127.0.0.1:8547" -Method Post -Body '{"jsonrpc":"2.0","method":"optimism_syncStatus","params":[],"id":1}' -ContentType "application/json" -TimeoutSec 1 -ErrorAction SilentlyContinue
        if ($nodeSync -and $nodeSync.result) { $opNodeRunning = $true }
    } catch {}
    if (-not $opNodeRunning) {
        $wslNode = wsl.exe -e pgrep -f "op-node" 2>$null
        if ($wslNode) { $opNodeRunning = $true }
    }

    $opBatcherRunning = $false
    $wslBatcher = wsl.exe -e pgrep -f "op-batcher" 2>$null
    if ($wslBatcher) { $opBatcherRunning = $true }

    if ($opNodeRunning) {
        Write-Host "op-node:          RUNNING (WSL2 Consensus / RPC: 8547)" -ForegroundColor Green
    } else {
        Write-Host "op-node:          MISSING (dev-opstack requires running op-node)" -ForegroundColor Red
        $passed = $false
    }

    if ($opBatcherRunning) {
        Write-Host "op-batcher:       RUNNING (WSL2 Batch Submitter)" -ForegroundColor Green
    } else {
        Write-Host "op-batcher:       OFFLINE / STANDBY" -ForegroundColor Yellow
    }

} else {
    # ANVIL DEV HARNESS REPORT
    if ($l2Status -eq "ONLINE") {
        Write-Host "L2 EVM Harness:   ONLINE ($l2Client, Chain ID: $l2Chain, Block: #$l2Block)" -ForegroundColor Green
        Write-Host "                  [*] Mode: Anvil EVM Development Harness (Real bytecode execution)" -ForegroundColor Cyan
        Write-Host "                  [!] Notice: This is an Anvil EVM harness, not an OP Stack rollup." -ForegroundColor Yellow
    } else {
        Write-Host "L2 EVM Harness:   OFFLINE ($l2Url)" -ForegroundColor Red
        $passed = $false
    }
}

Write-Host "==================================================" -ForegroundColor Cyan

if ($Profile -eq "dev-opstack" -and -not $passed) {
    Write-Host "RESULT: dev-opstack profile is NOT ready (missing op-geth/op-node/op-batcher)." -ForegroundColor Red
    exit 1
} else {
    exit 0
}
