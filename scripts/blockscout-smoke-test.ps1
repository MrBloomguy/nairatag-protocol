# ==================================================
# NairaTag Network — Blockscout Smoke Test (Honest)
# ==================================================

$EnvFile = Join-Path $PSScriptRoot '..\config\development.env'
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith('#') -and $line.Contains('=')) {
            $parts = $line.Split('=', 2)
            [System.Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), 'Process')
        }
    }
}

$l1Url = if ($env:L1_RPC_URL) { $env:L1_RPC_URL } else { 'http://127.0.0.1:8545' }
$l2Url = if ($env:L2_RPC_URL) { $env:L2_RPC_URL } else { 'http://127.0.0.1:9545' }
$blockscoutUrl = 'http://localhost:4000'
$expectedChainId = 901

Write-Host '==================================================' -ForegroundColor Cyan
Write-Host ' NairaTag Network — Blockscout Verification' -ForegroundColor Cyan
Write-Host '==================================================' -ForegroundColor Cyan
Write-Host ''

$passed = $true

# 1. Check Docker engine
$hasDocker = $false
try {
    $dockerCmd = Get-Command "docker" -ErrorAction SilentlyContinue
    if ($dockerCmd) {
        $dockerCheck = docker info 2>&1
        if ($LASTEXITCODE -eq 0) { $hasDocker = $true }
    }
} catch {}

if ($hasDocker) {
    Write-Host '[OK] Docker engine detected' -ForegroundColor Green
} else {
    Write-Host '[FAIL] Docker engine is NOT installed or running on this Windows host.' -ForegroundColor Red
    Write-Host '       Blockscout requires Docker Desktop or WSL2 to run.' -ForegroundColor Yellow
    $passed = $false
}

# 2. Check L2 RPC client
try {
    $l2Client = Invoke-RestMethod -Uri $l2Url -Method Post -Body '{"jsonrpc":"2.0","method":"web3_clientVersion","params":[],"id":1}' -ContentType 'application/json' -TimeoutSec 2 -ErrorAction Stop
    $isReal = $false
    if ($l2Client -and $l2Client.result -match "op-geth|op-reth") {
        $isReal = $true
        Write-Host "[OK] L2 RPC is real OP Stack client ($($l2Client.result))" -ForegroundColor Green
    } else {
        Write-Host "[WARN] L2 RPC is running a mock devnet runner, not real op-geth/op-reth" -ForegroundColor Yellow
        Write-Host "       Blockscout should not index a simulated mock server in production." -ForegroundColor Yellow
    }
} catch {
    Write-Host '[FAIL] L2 RPC is offline' -ForegroundColor Red
    $passed = $false
}

# 3. Check Blockscout endpoint
$blockscoutRunning = $false
try {
    $bsRes = Invoke-WebRequest -Uri ($blockscoutUrl + '/api/v2/stats') -TimeoutSec 2 -ErrorAction Stop
    if ($bsRes.StatusCode -eq 200) {
        $blockscoutRunning = $true
        Write-Host '[OK] Blockscout API is reachable' -ForegroundColor Green
    }
} catch {
    Write-Host '[FAIL] Blockscout API is not reachable on port 4000' -ForegroundColor Red
    $passed = $false
}

# 4. Check Blockscout indexing
if ($blockscoutRunning) {
    try {
        $stats = Invoke-RestMethod -Uri ($blockscoutUrl + '/api/v2/stats') -TimeoutSec 3 -ErrorAction Stop
        if ($stats -and $stats.total_blocks -gt 0) {
            Write-Host "[OK] Blockscout indexed $($stats.total_blocks) blocks" -ForegroundColor Green
        } else {
            Write-Host '[FAIL] Blockscout connected but has indexed 0 blocks' -ForegroundColor Red
            $passed = $false
        }
    } catch {
        Write-Host '[FAIL] Failed to retrieve indexing statistics from Blockscout' -ForegroundColor Red
        $passed = $false
    }
} else {
    Write-Host '[FAIL] L2 block indexing: NOT RUNNING' -ForegroundColor Red
}

Write-Host ''
Write-Host '==================================================' -ForegroundColor Cyan
if ($passed) {
    Write-Host 'BLOCKSCOUT SMOKE TEST: PASSED' -ForegroundColor Green
    exit 0
} else {
    Write-Host 'BLOCKSCOUT SMOKE TEST: FAILED / NOT OPERATIONAL' -ForegroundColor Red
    Write-Host 'Prerequisite: Docker Desktop must be installed to start Blockscout.' -ForegroundColor Yellow
    Write-Host '==================================================' -ForegroundColor Cyan
    exit 1
}
