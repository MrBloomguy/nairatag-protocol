# NairaTag Network — OP Stack Readiness & Implementation Matrix

This document tracks the factual engineering readiness of the repository to transition from the **Anvil EVM Development Harness (`dev-anvil`)** to a **Genuine Local OP Stack Rollup (`dev-opstack`)**.

---

## 1. Component Status Matrix

| Component | Category | Current Status | Notes / Blockers |
| :--- | :--- | :--- | :--- |
| **op-deployer Toolchain** (v0.7.1) | Deployment Tool | `implemented` | Installed native Windows binary (`~/.foundry/bin/op-deployer.exe`). Executed locally without Docker. |
| **Foundry Toolchain** (Anvil, Forge, Cast) | Host Prerequisite | `implemented` | Installed in `~/.foundry/bin` (v1.8.1). |
| **Node.js Environment** (v24.14) | Host Prerequisite | `implemented` | Installed for scripts and tooling. |
| **Docker Engine / Desktop** | Host Prerequisite | `not installed` | Missing on Windows host. Required to run Linux container images for `op-node`, `op-geth`, `op-batcher`, and `Blockscout`. |
| **WSL2 (Windows Subsystem for Linux)** | Host Prerequisite | `not installed` | Missing on Windows host. Alternative to Docker Desktop for running Linux OP Stack daemons. |
| **Canonical OP Stack L1 Contracts** | L1 Contracts | `implemented` | Deployed to Anvil L1 (port 8545, chain 900) via `op-deployer apply`. Real `OptimismPortalProxy` at `0x83e63238587aabd00658a18b965a66f433a49d05`. |
| **Deployment State (`state.json`)** | Deployment State | `implemented` | Generated in `op-stack/deployer/.deployer/state.json` (230 KB). |
| **L2 Genesis Configuration (`genesis.json`)** | Configuration | `implemented` | Generated via `op-deployer inspect genesis` (9.5 MB, Chain ID 901, 2,370 allocations). |
| **Rollup Configuration (`rollup.json`)** | Configuration | `implemented` | Generated via `op-deployer inspect rollup` (Chain ID 901, start block 1655). |
| **NairaTag Registry Contract** | L2 Protocol | `implemented` | Written and unit tested; ready for deployment to OP Stack L2 once `op-geth` boots. |
| **NairaTag Resolver Contract** | L2 Protocol | `implemented` | Written and unit tested; ready for deployment to OP Stack L2 once `op-geth` boots. |
| **NairaTag PaymentRequest Contract** | L2 Protocol | `implemented` | Excluded from initial V0 rollup deployment scope. |
| **L1 Settlement Service (Anvil)** | Service | `implemented` | Anvil port 8545 (Chain ID 900). Mining live blocks. |
| **Real L1 -> L2 Deposit Transaction** | Infrastructure Test | `implemented` | Executed genuine deposit of 0.5 ETH into `OptimismPortalProxy` emitting canonical `TransactionDeposited` event at L1 block 1765. |
| **L2 Execution Engine (`op-geth`)** | Service | `not running` | Requires Docker Desktop / WSL2 to run official image `us-docker.pkg.dev/oplabs-tools-artifacts/images/op-geth`. |
| **Rollup Consensus Daemon (`op-node`)** | Service | `not running` | Requires Docker Desktop / WSL2 to run official image `us-docker.pkg.dev/oplabs-tools-artifacts/images/op-node`. |
| **Batch Submitter (`op-batcher`)** | Service | `not running` | Requires Docker Desktop / WSL2 to run official image `us-docker.pkg.dev/oplabs-tools-artifacts/images/op-batcher`. |
| **L1 -> L2 Derivation Loop** | Rollup Operation | `pending op-node` | Requires `op-node` daemon running against Anvil L1 and `op-geth` engine API. |
| **L2 -> L1 Withdrawal Finalization** | Infrastructure Test | `pending op-node` | Requires active L2 execution client and state proposer. |
| **Blockscout Explorer Stack** | Explorer | `configured` | `blockscout/docker-compose.yml` configured; awaiting Docker Engine. |

---

## 2. Required Endpoints for Genuine Rollup (`dev-opstack`)

When the genuine OP Stack local devnet is operational, the following RPC endpoints must be active and respond with genuine client versions:

| Service | Protocol | Host / Port | Expected Client / Response | Status |
| :--- | :--- | :--- | :--- | :--- |
| **L1 Ethereum RPC** | HTTP JSON-RPC | `http://127.0.0.1:8545` | `anvil/v1.8.1` (Chain ID: 900) | `implemented` |
| **L2 Public Execution RPC** | HTTP JSON-RPC | `http://127.0.0.1:9545` | `op-geth/v1.101411+` (Chain ID: 901) | `not running` |
| **L2 Engine API** | Auth HTTP JSON-RPC | `http://127.0.0.1:8551` | Authenticated via JWT secret | `not running` |
| **op-node RPC** | HTTP JSON-RPC | `http://127.0.0.1:8547` | OP Stack Consensus / Derivation status | `not running` |
| **op-batcher Metrics** | HTTP / Metrics | `http://127.0.0.1:8548` | Batch publishing status to L1 | `not running` |
| **Blockscout Web UI** | HTTP | `http://localhost:4000` | Blockscout explorer UI & indexer | `not running` |

---

## 3. Strict Verification & Health Check Rules

A run of `scripts/status.ps1 -Profile dev-opstack` or `scripts/smoke-test.js` **must strictly fail** if any of the following conditions occur:
1. **Client Mismatch**: L2 client reports `anvil` instead of `op-geth` or `op-reth`.
2. **Missing Daemons**: `op-node` or `op-batcher` processes / containers are not running.
3. **Derivation Inactive**: L2 block production is not advancing via L1 block derivation.
4. **Unauthenticated Engine API**: Engine API calls fail JWT authentication.
5. **Simulated Assertions**: Tests must not contain dummy `assert(true)` statements.

---

## 4. Cross-Domain Bridging Requirements

### Deposit Verification
1. Account on L1 sends transaction to canonical `OptimismPortal.depositTransaction`.
2. Portal emits `TransactionDeposited` event on L1.
3. `op-node` reads L1 logs and derives a deposit transaction in L2 block.
4. L2 account balance increases by the deposited amount.

### Withdrawal Verification
1. Account on L2 calls `L2ToL1MessagePasser.initiateWithdrawal`.
2. `op-batcher` batches L2 transaction to L1.
3. `op-proposer` publishes state root proposal containing withdrawal to `L2OutputOracle` on L1.
4. Proof is submitted and withdrawal is finalized on L1 after required challenge period or mock dispute window.

---

## 5. Transition Steps to Enable `dev-opstack`

```text
Step 1: Install Docker Desktop with WSL2 on Windows host
Step 2: Pull official images (op-geth, op-node, op-batcher, blockscout)
Step 3: Import canonical Bedrock L1 contracts into contracts/lib/contracts-bedrock
Step 4: Deploy Bedrock contracts to Anvil L1 (port 8545)
Step 5: Generate real genesis.json and rollup.json with actual contract addresses
Step 6: Boot op-geth, op-node, op-batcher via docker compose
Step 7: Verify L2 client reports op-geth and derive blocks from Anvil L1
Step 8: Deploy NairaTagRegistry and NairaTagResolver to genuine L2
Step 9: Launch Blockscout stack against live op-geth RPC
```
