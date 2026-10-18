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

$smokeScript = Join-Path $PSScriptRoot "smoke-test.js"
node $smokeScript
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}
