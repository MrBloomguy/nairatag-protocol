#!/usr/bin/env bash
set -euo pipefail

echo "Stopping NairaTag Network Devnet & Explorer..."

if command -v docker >/dev/null 2>&1; then
    docker compose -f blockscout/docker-compose.yml down 2>/dev/null || true
    docker compose -f op-stack/configuration/docker-compose.yml down 2>/dev/null || true
fi

pkill -f "devnet-runner.js" 2>/dev/null || true
pkill -f "anvil" 2>/dev/null || true

if [ -f ".devnet.pid" ]; then
    PID=$(cat .devnet.pid)
    kill "$PID" 2>/dev/null || true
    rm -f .devnet.pid
fi

echo "✓ NairaTag Network Devnet & Explorer stopped."
