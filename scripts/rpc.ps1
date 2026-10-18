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

$l1Url = if ($env:L1_RPC_URL) { $env:L1_RPC_URL } else { "http://127.0.0.1:8545" }
$l2Url = if ($env:L2_RPC_URL) { $env:L2_RPC_URL } else { "http://127.0.0.1:9545" }

Write-Host ""
Write-Host "NairaTag L2 RPC:" -ForegroundColor Cyan
Write-Host $l2Url
Write-Host ""
Write-Host "NairaTag L1 RPC:" -ForegroundColor Cyan
Write-Host $l1Url
Write-Host ""
