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

RES=$(curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' "$L2_URL" 2>/dev/null)
if [[ "$RES" != *"result"* ]]; then
    echo "Error: Unable to connect to NairaTag L2 RPC at $L2_URL" >&2
    exit 1
fi

HEX=$(echo "$RES" | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
DEC=$((HEX))
echo "$DEC"
