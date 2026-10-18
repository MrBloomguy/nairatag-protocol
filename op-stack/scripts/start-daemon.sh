#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

LOG_DIR="${SCRIPT_DIR}/../logs"
mkdir -p "${LOG_DIR}"

# Run run-wsl.sh detached in a new session (setsid) so it survives parent exit
setsid nohup bash "${SCRIPT_DIR}/run-wsl.sh" </dev/null >"${LOG_DIR}/wsl-runner.log" 2>&1 &
RUNNER_PID=$!
echo "${RUNNER_PID}" > "${LOG_DIR}/wsl-runner.pid"

echo "[wsl] OP Stack daemons launched in detached session (PID: ${RUNNER_PID})"
