#!/usr/bin/env bash
set -euo pipefail

echo "=================================================="
echo " Running NairaTag Contract Tests"
echo "=================================================="

if command -v forge >/dev/null 2>&1; then
    echo "Running Foundry test suite..."
    (cd contracts && forge test -v)
else
    echo "Forge not detected; running contract logic test suite via Node.js..."
    node scripts/test-contracts.js
fi
