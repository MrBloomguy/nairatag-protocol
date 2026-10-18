# ==================================================
# NairaTag Network — Deploy Contracts to L2 (Foundry)
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

$l2Url = if ($env:L2_RPC_URL) { $env:L2_RPC_URL } else { "http://127.0.0.1:9545" }
$privateKey = if ($env:DEV_DEPLOYER_PRIVATE_KEY) { $env:DEV_DEPLOYER_PRIVATE_KEY } else { "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" }

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Deploying NairaTag Contracts to L2 Anvil: $l2Url" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$contractsDir = Resolve-Path (Join-Path $PSScriptRoot "..\contracts")
Push-Location $contractsDir
try {
    forge script script/Deploy.s.sol --rpc-url $l2Url --broadcast --private-key $privateKey --non-interactive
    Write-Host "`n* NairaTag contracts successfully deployed to L2 Anvil!" -ForegroundColor Green
} catch {
    Write-Host "`n[FAIL] Contract deployment failed: $_" -ForegroundColor Red
} finally {
    Pop-Location
}
Write-Host "==================================================" -ForegroundColor Cyan
