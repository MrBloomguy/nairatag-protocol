#!/usr/bin/env bash
set -euo pipefail

echo "=================================================="
echo " NairaTag Network — Prerequisites Doctor"
echo "=================================================="
echo ""

check_tool() {
    local name="$1"
    local cmd="$2"
    local ver_arg="$3"
    local required_for="$4"

    if command -v "$cmd" >/dev/null 2>&1; then
        local ver
        ver=$($cmd $ver_arg 2>&1 | head -n 1)
        printf "%-32s [OK] Installed   %-30s %-25s\n" "$name" "$ver" "$required_for"
        return 0
    else
        printf "%-32s [!] Missing     %-30s %-25s\n" "$name" "Not found" "$required_for"
        return 1
    fi
}

printf "%-32s %-16s %-30s %-25s\n" "TOOL" "STATUS" "VERSION" "REQUIRED FOR"
echo "---------------------------------------------------------------------------------------------------"

check_tool "Docker Engine" "docker" "--version" "dev-opstack, Blockscout" || true
check_tool "Docker Compose" "docker-compose" "version" "dev-opstack, Blockscout" || true
check_tool "Git" "git" "--version" "both" || true
check_tool "Go (Golang)" "go" "version" "dev-opstack" || true
check_tool "Node.js" "node" "--version" "both" || true
check_tool "Foundry: Anvil" "anvil" "--version" "both" || true
check_tool "Foundry: Forge" "forge" "--version" "both" || true
check_tool "Foundry: Cast" "cast" "--version" "both" || true
check_tool "jq" "jq" "--version" "dev-opstack" || true
check_tool "curl" "curl" "--version" "both" || true

echo "=================================================="
