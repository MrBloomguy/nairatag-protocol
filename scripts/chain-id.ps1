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

try {
    $res = Invoke-RestMethod -Uri $l2Url -Method Post -Body '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' -ContentType "application/json" -TimeoutSec 2 -ErrorAction Stop
    if ($res -and $res.result) {
        $chainDec = [Convert]::ToInt64($res.result, 16)
        Write-Output $chainDec
    } else {
        Write-Error "Error: Empty response from NairaTag L2 RPC at $l2Url"
        exit 1
    }
} catch {
    Write-Error "Error: Unable to connect to NairaTag L2 RPC at $l2Url"
    exit 1
}
