$composeFile = Join-Path $PSScriptRoot "..\op-stack\configuration\docker-compose.yml"
$hasDocker = $false
try {
    $dockerOut = docker info 2>&1
    if ($LASTEXITCODE -eq 0) { $hasDocker = $true }
} catch {}

if ($hasDocker) {
    docker compose -f $composeFile logs -f --tail=100
} else {
    $pidFile = Join-Path $PSScriptRoot "..\.devnet.pid"
    if (Test-Path $pidFile) {
        $pidVal = Get-Content $pidFile
        Write-Host "Devnet running with PID: $pidVal" -ForegroundColor Green
    } else {
        Write-Host "No devnet process is currently active." -ForegroundColor Yellow
    }
}
