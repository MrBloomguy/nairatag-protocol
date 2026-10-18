Write-Host "Stopping NairaTag Network Devnet & Explorer..." -ForegroundColor Yellow

$blockscoutCompose = Join-Path $PSScriptRoot "..\blockscout\docker-compose.yml"
$opstackCompose = Join-Path $PSScriptRoot "..\op-stack\configuration\docker-compose.yml"
$pidFile = Join-Path $PSScriptRoot "..\.devnet.pid"

# Stop Blockscout containers if running
try {
    docker compose -f $blockscoutCompose down 2>$null
} catch {}

# Stop OP Stack containers if running
try {
    docker compose -f $opstackCompose down 2>$null
} catch {}

if (Test-Path $pidFile) {
    $procId = Get-Content $pidFile
    try {
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    } catch {}
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

# Stop devnet-runner.js node processes
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*devnet-runner.js*" } | ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
}

# Stop anvil processes
Get-Process anvil -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "* NairaTag Network Devnet & Explorer stopped." -ForegroundColor Green
