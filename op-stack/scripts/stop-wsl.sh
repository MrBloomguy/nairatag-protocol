#!/usr/bin/env bash
# ==================================================
# stop-wsl.sh - Stop all running OP Stack daemons
# ==================================================

echo "[wsl] Stopping OP Stack daemons (op-batcher, op-node, op-geth)..."

# Terminate op-batcher
pkill -f "op-batcher" 2>/dev/null || true
# Terminate op-node
pkill -f "op-node" 2>/dev/null || true
# Gracefully signal op-geth to flush LevelDB state
pkill -SIGTERM -f "geth.*--datadir" 2>/dev/null || true

# Wait up to 5s for clean shutdown
for i in {1..5}; do
  if ! pgrep -f "geth.*--datadir" > /dev/null 2>&1; then
    break
  fi
  sleep 1
done

# Force kill if still lingering
pkill -9 -f "geth.*--datadir" 2>/dev/null || true
pkill -9 -f "op-node" 2>/dev/null || true
pkill -9 -f "op-batcher" 2>/dev/null || true

echo "[wsl] All OP Stack daemons stopped."
