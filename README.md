# NairaTag Network — OP Stack Ethereum L2 Rollup

NairaTag Network is designed as an independent EVM-compatible Ethereum Layer 2 rollup built using the open-source **OP Stack**.

> **[!] Current Environment Status**:
> **Local mock EVM harness for NairaTag contract development.**
> The current local devnet uses Anvil as L1 (`http://127.0.0.1:8545`) and a Node.js mock RPC server on port `9545` for fast contract and identity resolution testing.
> **It is not yet a genuine OP Stack rollup.** `op-node`, `op-geth`, `op-batcher`, and canonical Bedrock contracts are not yet running locally.

---

## Architecture

### Target Production & Local OP Stack Architecture
```text
                     Ethereum L1
                    (Anvil in dev)
                          │
                          │ Canonical Bedrock L1 Contracts
                          ▼
                 ┌─────────────────┐
                 │ NairaTag L2     │
                 │                 │
                 │ op-node         │  <- Derivation & Consensus
                 │ op-geth/op-reth │  <- Execution Engine
                 │ sequencer       │  <- Block Production
                 │ op-batcher      │  <- L1 Calldata Batching
                 └────────┬────────┘
                          │
                          │ L2 JSON-RPC (Port 9545)
                          ▼
                 ┌─────────────────┐
                 │   Blockscout    │  <- Explorer & Indexer
                 │  NairaTag Scan  │
                 └─────────────────┘
```

### Current Status Matrix

| Component | Target Role | Current Status |
| :--- | :--- | :--- |
| **Ethereum L1** | Settlement & DA | **Anvil** (`anvil.exe`, Chain ID `900`, Port `8545`) |
| **OP Stack L1 Contracts** | Portal, Bridge, SystemConfig | **Mock/Toy Contracts** (`contracts/src/op-contracts/`) |
| **L2 Execution** | `op-geth` / `op-reth` | **Anvil EVM** (`anvil.exe`, Port `9545`, Chain ID `901`) |
| **Consensus / Sequencer** | `op-node` | **Pending** (Requires Docker Desktop or Linux/WSL2) |
| **Batcher** | `op-batcher` | **Pending** (Requires Docker Desktop or Linux/WSL2) |
| **L1 -> L2 Deposit** | OptimismPortal derivation | **Unverified** (Pending OP Stack daemons) |
| **L2 -> L1 Withdrawal** | L2ToL1MessagePasser + Oracle | **Unverified** (Pending OP Stack daemons) |
| **Explorer** | Blockscout (`NairaTag Scan`) | **Configured** (`blockscout/docker-compose.yml`), offline (Docker missing) |
| **Identity Registry** | `NairaTagRegistry.sol` | **Deployed & Tested** on L2 Anvil (`0x5FbDB...aa3`) |

---

## Local Development (Dual Anvil Devnet)

The repository runs a Dual Anvil local EVM devnet for developing and testing the NairaTag Identity protocols with full bytecode execution and state storage.

### 1. Start Dual Anvil Devnet
```powershell
powershell -File scripts/start.ps1
```
This starts:
1. Native Anvil L1 on `http://127.0.0.1:8545` (Chain ID: `900`).
2. Native Anvil L2 on `http://127.0.0.1:9545` (Chain ID: `901`).
3. Automatically deploys `NairaTagRegistry`, `NairaTagResolver`, and `NairaTagPaymentRequest` to L2.

### 2. Check Factual Status
```powershell
powershell -File scripts/status.ps1
```
The status script queries actual client versions and processes rather than assuming readiness.

### 3. Run Test Suites
```powershell
# Run Foundry Solidity unit tests
cd contracts && forge test

# Run smoke test suite
powershell -File scripts/smoke-test.ps1
```

### 4. Stop Local Harness
```powershell
powershell -File scripts/stop.ps1
```

---

## Roadmap to Genuine OP Stack L2

To replace the mock harness with genuine OP Stack binaries:
1. **Host Environment**: Install Docker Desktop (with WSL2 backend) on Windows or set up an Ubuntu/Debian runner.
2. **Canonical Contracts**: Deploy `@eth-optimism/contracts-bedrock` onto Anvil L1.
3. **Rollup Genesis**: Generate valid `genesis.json`, `rollup.json`, and `jwt.hex` using `op-node genesis l2` / `op-deployer`.
4. **Daemons**: Launch official `op-geth` (v1.101411+) and `op-node` (v1.11+) containers via `docker compose`.
5. **Explorer**: Launch the Blockscout compose stack indexing the real `op-geth` RPC.
