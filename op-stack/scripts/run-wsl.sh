#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DEPLOYER_DIR="${REPO_ROOT}/op-stack/deployer/.deployer"

GENESIS_FILE="${DEPLOYER_DIR}/genesis.json"
ROLLUP_FILE="${DEPLOYER_DIR}/rollup.json"
JWT_FILE="${DEPLOYER_DIR}/jwt.hex"
L1_CHAIN_CONFIG="${DEPLOYER_DIR}/l1-genesis.json"

echo "=== NairaTag OP Stack L2 - WSL2 Runner ==="

if [[ ! -f "${GENESIS_FILE}" ]] || [[ ! -f "${ROLLUP_FILE}" ]]; then
  echo "Error: genesis.json or rollup.json not found in ${DEPLOYER_DIR}."
  echo "Please run op-deployer first."
  exit 1
fi

# Clean up any lingering processes first
bash "${SCRIPT_DIR}/stop-wsl.sh" || true
sleep 1

# Detect Windows host IP for Anvil L1 (port 8545)
HOST_IP="$(ip route show default | cut -d ' ' -f 3)"
if [[ -z "${HOST_IP}" ]]; then
  HOST_IP="$(grep -m 1 nameserver /etc/resolv.conf | awk '{print $2}')"
fi
L1_RPC="http://${HOST_IP}:8545"

# If localhost works (e.g. WSL2 mirrored networking)
if curl -s "http://127.0.0.1:8545" -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' > /dev/null 2>&1; then
  L1_RPC="http://127.0.0.1:8545"
fi

echo "Connecting to Anvil L1 at: ${L1_RPC}"

DATA_DIR="${HOME}/.nairatag-l2/op-geth-data"
mkdir -p "${DATA_DIR}"

if [[ ! -d "${DATA_DIR}/geth/chaindata" ]]; then
  echo "Initializing op-geth from genesis.json..."
  geth init --datadir="${DATA_DIR}" "${GENESIS_FILE}"
else
  echo "Existing op-geth chaindata detected at ${DATA_DIR}. Resuming..."
fi

cleanup() {
  echo "[run-wsl] Received termination signal. Cleaning up child processes..."
  kill -TERM "${OP_BATCHER_PID:-}" "${OP_NODE_PID:-}" "${OP_GETH_PID:-}" 2>/dev/null || true
  wait 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM

LOG_DIR="${REPO_ROOT}/op-stack/logs"
mkdir -p "${LOG_DIR}"

echo "Starting op-geth (L2 Execution Engine)..."
geth \
  --datadir="${DATA_DIR}" \
  --http \
  --http.addr=0.0.0.0 \
  --http.port=9545 \
  --http.corsdomain="*" \
  --http.vhosts="*" \
  --http.api=web3,eth,net,txpool,debug,miner \
  --authrpc.addr=0.0.0.0 \
  --authrpc.port=8551 \
  --authrpc.vhosts="*" \
  --authrpc.jwtsecret="${JWT_FILE}" \
  --rollup.disabletxpoolgossip=true \
  --nodiscover \
  --syncmode=full \
  --gcmode=archive > "${LOG_DIR}/op-geth.log" 2>&1 &
OP_GETH_PID=$!
echo "op-geth started (PID: ${OP_GETH_PID})"

sleep 2

echo "Starting op-node (L2 Consensus Engine)..."
op-node \
  --l1="${L1_RPC}" \
  --l1.rpckind=basic \
  --l1.beacon.ignore=true \
  --l1.beacon.slot-duration-override=1 \
  --l2=http://127.0.0.1:8551 \
  --l2.jwt-secret="${JWT_FILE}" \
  --l2.enginekind=geth \
  --rollup.config="${ROLLUP_FILE}" \
  --rollup.l1-chain-config="${L1_CHAIN_CONFIG}" \
  --rpc.addr=0.0.0.0 \
  --rpc.port=8547 \
  --rpc.enable-admin \
  --sequencer.enabled \
  --sequencer.l1-confs=0 \
  --verifier.l1-confs=0 \
  --p2p.disable \
  --p2p.sequencer.key=0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a > "${LOG_DIR}/op-node.log" 2>&1 &
OP_NODE_PID=$!
echo "op-node started (PID: ${OP_NODE_PID})"

sleep 2

echo "Starting op-batcher (Batch Submitter)..."
op-batcher \
  --l1-eth-rpc="${L1_RPC}" \
  --l2-eth-rpc=http://127.0.0.1:9545 \
  --rollup-rpc=http://127.0.0.1:8547 \
  --private-key=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d \
  --rpc.addr=0.0.0.0 \
  --rpc.port=8548 \
  --wait-node-sync=true \
  --throttle.unsafe-da-bytes-lower-threshold=0 > "${LOG_DIR}/op-batcher.log" 2>&1 &
OP_BATCHER_PID=$!
echo "op-batcher started (PID: ${OP_BATCHER_PID})"

echo "=== All OP Stack daemons launched! ==="
echo "L2 RPC: http://127.0.0.1:9545"
echo "op-node RPC: http://127.0.0.1:8547"

wait "${OP_NODE_PID}"
