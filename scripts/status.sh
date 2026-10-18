#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="config/development.env"
if [ -f "$ENV_FILE" ]; then
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
fi

L1_URL="${L1_RPC_URL:-http://127.0.0.1:8545}"
L2_URL="${L2_RPC_URL:-http://127.0.0.1:9545}"
BLOCKSCOUT_URL="http://localhost:4000"

echo "=================================================="
echo " NairaTag Network Status (Factual Audit)"
echo "=================================================="

# 1. Check L1
L1_BLOCK=$(curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' "$L1_URL" 2>/dev/null || echo "")
L1_CLIENT=$(curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"web3_clientVersion","params":[],"id":2}' "$L1_URL" 2>/dev/null || echo "")

if echo "$L1_BLOCK" | grep -q "result"; then
    echo "L1 Ethereum:      ONLINE ($L1_URL)"
else
    echo "L1 Ethereum:      OFFLINE ($L1_URL)"
fi

# 2. Check L2
L2_BLOCK=$(curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' "$L2_URL" 2>/dev/null || echo "")
L2_CLIENT=$(curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"web3_clientVersion","params":[],"id":2}' "$L2_URL" 2>/dev/null || echo "")

if echo "$L2_BLOCK" | grep -q "result"; then
    if echo "$L2_CLIENT" | grep -q -i "op-geth\|op-reth"; then
        echo "L2 Execution:     ONLINE (Real OP Client)"
    else
        echo "L2 Execution:     ONLINE (Mock Node.js Server - NOT a genuine OP Stack L2)"
    fi
else
    echo "L2 Execution:     OFFLINE ($L2_URL)"
fi

# 3. Check Daemons
if pgrep -x "op-node" >/dev/null 2>&1; then
    echo "op-node:          RUNNING"
else
    echo "op-node:          MISSING (No process found)"
fi

if pgrep -x "op-batcher" >/dev/null 2>&1; then
    echo "op-batcher:       RUNNING"
else
    echo "op-batcher:       MISSING (No process found)"
fi

# 4. Check Blockscout
if curl -s -I "$BLOCKSCOUT_URL" 2>/dev/null | grep -q "200\|301\|302"; then
    echo "Blockscout:       ONLINE ($BLOCKSCOUT_URL)"
else
    echo "Blockscout:       OFFLINE (Docker not running)"
fi

echo "=================================================="
