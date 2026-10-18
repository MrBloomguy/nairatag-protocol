#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="config/development.env"
if [ -f "$ENV_FILE" ]; then
    # Load env file safely
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
fi

L1_URL="${L1_RPC_URL:-http://127.0.0.1:8545}"
L2_URL="${L2_RPC_URL:-http://127.0.0.1:9545}"

echo ""
echo "NairaTag L2 RPC:"
echo "$L2_URL"
echo ""
echo "NairaTag L1 RPC:"
echo "$L1_URL"
echo ""
