#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="op-stack/configuration/docker-compose.yml"
if command -v docker >/dev/null 2>&1 && docker compose -f "$COMPOSE_FILE" ps -q >/dev/null 2>&1; then
    docker compose -f "$COMPOSE_FILE" logs -f --tail=100
else
    echo "Displaying local devnet logs..."
    if [ -f ".devnet.pid" ]; then
        PID=$(cat .devnet.pid)
        echo "Devnet process PID: $PID"
    else
        echo "No devnet process is currently active."
    fi
fi
