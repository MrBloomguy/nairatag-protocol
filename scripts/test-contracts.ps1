Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Running NairaTag Contract Tests" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$hasForge = $false
try {
    $forgeOut = forge --version 2>&1
    if ($LASTEXITCODE -eq 0) { $hasForge = $true }
} catch {}

if ($hasForge) {
    Write-Host "Running Foundry test suite..." -ForegroundColor Yellow
    Push-Location (Join-Path $PSScriptRoot "..\contracts")
    forge test -v
    Pop-Location
} else {
    Write-Host "Forge not detected on PATH; running contract logic test suite via Node.js..." -ForegroundColor Yellow
    $testScript = Join-Path $PSScriptRoot "test-contracts.js"
    node $testScript
}
