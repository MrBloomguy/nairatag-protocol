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

L2_URL="${L2_RPC_URL:-http://127.0.0.1:9545}"
DEPLOYER_KEY="${DEV_DEPLOYER_PRIVATE_KEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}"

echo "=================================================="
echo " Deploying NairaTag Contracts to L2 Anvil: $L2_URL"
echo "=================================================="

cd contracts
forge script script/Deploy.s.sol --rpc-url "$L2_URL" --broadcast --private-key "$DEPLOYER_KEY" --non-interactive
cd ..
echo "* NairaTag contracts deployed to L2 Anvil."
