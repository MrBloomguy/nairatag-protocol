# ==================================================
# NairaTag Network - Prerequisites Doctor
# ==================================================

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " NairaTag Network - Prerequisites Doctor" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$results = @()

function Check-Tool($name, $cmd, $verArg, $reqFor, $guide) {
    $installed = $false
    $ver = "Not found"
    try {
        $c = Get-Command $cmd -ErrorAction SilentlyContinue
        if ($c) {
            $out = & $cmd $verArg 2>&1 | Out-String
            $lines = $out.Trim() -split "`r?`n"
            if ($lines.Length -gt 0 -and $lines[0].Trim()) {
                $ver = $lines[0].Trim()
                $installed = $true
            } else {
                $ver = "Detected"
                $installed = $true
            }
        }
    } catch {}

    return [PSCustomObject]@{
        Name = $name
        Installed = $installed
        Version = $ver
        RequiredFor = $reqFor
        InstallGuide = $guide
    }
}

# 1. Docker
$hasDocker = $false
$dVer = "Not installed"
try {
    $d = Get-Command "docker" -ErrorAction SilentlyContinue
    if ($d) {
        $out = docker --version 2>&1 | Out-String
        if ($out.Trim()) { $dVer = $out.Trim(); $hasDocker = $true }
    }
} catch {}
$results += [PSCustomObject]@{
    Name = "Docker Engine"
    Installed = $hasDocker
    Version = $dVer
    RequiredFor = "dev-opstack, Blockscout"
    InstallGuide = "Install Docker Desktop: winget install Docker.DockerDesktop"
}

# 2. Docker Compose
$hasCompose = $false
$cVer = "Not installed"
try {
    if ($hasDocker) {
        $out = docker compose version 2>&1 | Out-String
        if ($out.Trim()) { $cVer = $out.Trim(); $hasCompose = $true }
    }
} catch {}
$results += [PSCustomObject]@{
    Name = "Docker Compose"
    Installed = $hasCompose
    Version = $cVer
    RequiredFor = "dev-opstack, Blockscout"
    InstallGuide = "Included with Docker Desktop"
}

# 3. WSL2
$hasWsl = $false
$wVer = "Not installed"
try {
    $null = wsl.exe -l -q 2>&1
    if ($LASTEXITCODE -eq 0) {
        $wVer = "Installed"
        $hasWsl = $true
    }
} catch {}
$results += [PSCustomObject]@{
    Name = "WSL2"
    Installed = $hasWsl
    Version = $wVer
    RequiredFor = "dev-opstack (Windows host)"
    InstallGuide = "Run: wsl --install (in Admin PowerShell, requires reboot)"
}

# 4. Git
$results += Check-Tool "Git" "git" "--version" "both" "https://git-scm.com/download/win"

# 5. Go
$results += Check-Tool "Go (Golang)" "go" "version" "dev-opstack (build from source)" "https://go.dev/dl/"

# 6. Node.js
$results += Check-Tool "Node.js" "node" "--version" "both" "https://nodejs.org/"

# 7. Foundry
$results += Check-Tool "Foundry: Anvil" "anvil" "--version" "both" "https://getfoundry.sh"
$results += Check-Tool "Foundry: Forge" "forge" "--version" "both" "https://getfoundry.sh"
$results += Check-Tool "Foundry: Cast" "cast" "--version" "both" "https://getfoundry.sh"

# 8. jq
$results += Check-Tool "jq" "jq" "--version" "dev-opstack" "winget install jqlang.jq"

# 9. curl
$results += Check-Tool "curl" "curl.exe" "--version" "both" "Built-in"

# Print Output
Write-Host ("{0,-28} {1,-14} {2,-32} {3,-25}" -f "TOOL", "STATUS", "VERSION", "REQUIRED FOR") -ForegroundColor White
Write-Host ("-" * 105) -ForegroundColor DarkGray

$devAnvilReady = $true
$devOpStackReady = $true

foreach ($r in $results) {
    $statusStr = if ($r.Installed) { "[OK] Installed" } else { "[!] Missing" }
    $color = if ($r.Installed) { "Green" } else { "Yellow" }
    
    if (-not $r.Installed) {
        if ($r.RequiredFor -match "both" -or $r.RequiredFor -match "dev-anvil") {
            $devAnvilReady = $false
        }
        if ($r.RequiredFor -match "both" -or $r.RequiredFor -match "dev-opstack") {
            $devOpStackReady = $false
        }
    }

    $verDisplay = if ($r.Version.Length -gt 30) { $r.Version.Substring(0, 27) + "..." } else { $r.Version }
    Write-Host ("{0,-28} {1,-14} {2,-32} {3,-25}" -f $r.Name, $statusStr, $verDisplay, $r.RequiredFor) -ForegroundColor $color
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Profile Readiness Evaluation:" -ForegroundColor Cyan
Write-Host "--------------------------------------------------" -ForegroundColor Cyan

if ($devAnvilReady) {
    Write-Host "  Profile [dev-anvil]: READY" -ForegroundColor Green
    Write-Host "  -> Can run Anvil L1 + Anvil EVM harness, deploy contracts, run tests." -ForegroundColor Green
} else {
    Write-Host "  Profile [dev-anvil]: BLOCKED" -ForegroundColor Red
}

Write-Host ""
if ($devOpStackReady) {
    Write-Host "  Profile [dev-opstack]: READY" -ForegroundColor Green
} else {
    Write-Host "  Profile [dev-opstack]: NOT READY (Missing Docker / WSL2)" -ForegroundColor Red
    Write-Host "  Action items to enable genuine OP Stack:" -ForegroundColor Yellow
    foreach ($r in $results) {
        if (-not $r.Installed -and ($r.RequiredFor -match "dev-opstack" -or $r.RequiredFor -match "both")) {
            Write-Host "    - $($r.Name): $($r.InstallGuide)" -ForegroundColor Yellow
        }
    }
}
Write-Host "==================================================" -ForegroundColor Cyan
