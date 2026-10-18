#!/usr/bin/env bash
set -euo pipefail
export PATH="$PATH:$HOME/.foundry/bin:/c/Users/olusegun/.foundry/bin"

ENV_FILE="config/development.env"
if [ -f "$ENV_FILE" ]; then
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
fi

L1_URL="${L1_RPC_URL:-http://127.0.0.1:8545}"
L2_URL="${L2_RPC_URL:-http://127.0.0.1:9545}"

echo "=================================================="
echo " Starting NairaTag Network Anvil Devnet"
echo "=================================================="

# 1. Start Anvil L1
if curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' "$L1_URL" | grep -q "result"; then
    echo "[1/4] Anvil L1 already active on $L1_URL"
else
    echo "[1/4] Starting native Anvil L1 on port 8545..."
    anvil --port 8545 --chain-id 900 --block-time 1 >/dev/null 2>&1 &
fi

# 2. Start NairaTag L2 Anvil
if curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' "$L2_URL" | grep -q "result"; then
    echo "[2/4] NairaTag L2 Anvil already active on $L2_URL"
else
    echo "[2/4] Starting NairaTag L2 (Anvil) on port 9545..."
    anvil --port 9545 --chain-id 901 --block-time 2 >/dev/null 2>&1 &
fi

# Wait for RPC readiness
sleep 2

# 3. Deploy contracts to L2
echo "[3/4] Deploying contracts to L2..."
bash scripts/deploy-contracts.sh

# 4. Report status
echo "[4/4] Reporting status..."
bash scripts/status.sh
