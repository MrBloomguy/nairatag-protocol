#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="config/development.env"
if [ -f "$ENV_FILE" ]; then
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
fi

L2_URL="${L2_RPC_URL:-http://127.0.0.1:9545}"
BLOCKSCOUT_URL="http://localhost:4000"

echo "=================================================="
echo " NairaTag Network — Blockscout Verification"
echo "=================================================="

PASSED=1

# 1. Docker check
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    echo "[OK] Docker engine detected"
else
    echo "[FAIL] Docker engine is NOT installed or running."
    echo "       Blockscout requires Docker Desktop or Docker Engine."
    PASSED=0
fi

# 2. Blockscout reachability
if curl -s -f "$BLOCKSCOUT_URL/api/v2/stats" >/dev/null 2>&1; then
    echo "[OK] Blockscout API reachable"
    TOTAL_BLOCKS=$(curl -s "$BLOCKSCOUT_URL/api/v2/stats" | grep -o '"total_blocks":[0-9]*' | cut -d':' -f2 || echo "0")
    if [ "$TOTAL_BLOCKS" -gt 0 ]; then
        echo "[OK] Blockscout indexed $TOTAL_BLOCKS blocks"
    else
        echo "[FAIL] Blockscout has indexed 0 blocks"
        PASSED=0
    fi
else
    echo "[FAIL] Blockscout API is not reachable on port 4000"
    PASSED=0
fi

echo "=================================================="
if [ "$PASSED" -eq 1 ]; then
    echo "BLOCKSCOUT SMOKE TEST: PASSED"
    exit 0
else
    echo "BLOCKSCOUT SMOKE TEST: FAILED / NOT OPERATIONAL"
    exit 1
fi
