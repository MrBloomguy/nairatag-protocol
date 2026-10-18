# NairaTag Network — Architecture Specification

## 1. Vision & Ecosystem Position

**NairaTag Network is designed as an Ethereum Layer 2 rollup built on the open-source OP Stack.**

Ethereum serves as the canonical settlement and data availability layer (L1). In local development, Anvil serves as the local Ethereum L1.

> **Status Notice**: The canonical OP Stack L1 contracts have been deployed to local Anvil L1 (port 8545, Chain 900) using the official Optimism `op-deployer` toolchain natively on Windows.
> The authoritative `genesis.json` and `rollup.json` (Chain 901) have been generated.
> The next operational step is executing the OP Stack L2 nodes (`op-geth`, `op-node`, `op-batcher`) via a Linux runtime (WSL2 Ubuntu or Docker Desktop) against these exact artifacts.

```text
Target Architecture:
                     Ethereum L1
                        Anvil
                    (Chain ID 900)
                          │
                          │ Canonical OP Stack L1 Contracts (Deployed via op-deployer)
                          ▼
                 ┌─────────────────┐
                 │ NairaTag L2     │
                 │ (Chain ID 901)  │
                 │                 │
                 │ op-node         │  <- L2 Consensus & Derivation Daemon
                 │ op-geth         │  <- L2 EVM Execution Engine
                 │ sequencer       │  <- Block Sequencer
                 │ op-batcher      │  <- Batch Submitter
                 └────────┬────────┘
                          │
                          │ L2 RPC (Port 9545)
                          ▼
                 ┌─────────────────┐
                 │   Blockscout    │  <- Explorer & Indexer
                 │  NairaTag Scan  │
                 └─────────────────┘
```

> **Note**: Blockscout is strictly an explorer and indexing layer. It is not part of NairaTag Network consensus and does not operate the rollup.

---

## 2. Layer Separation & Responsibilities

| Layer | System | Responsibilities | Implementation Status |
| :--- | :--- | :--- | :--- |
| **L1: Settlement & DA** | **Ethereum (Anvil in dev)** | Canonical contract hosting, deposit/withdrawal finality. | **Active** (Anvil port 8545, Chain ID 900) |
| **OP Stack L1 Contracts** | Canonical Bedrock Suite | `OptimismPortal` (`0x83e6...`), `SystemConfig` (`0xf3d8...`), `L1StandardBridge` (`0x842c...`). | **Deployed & Verified** (via `op-deployer apply`) |
| **Rollup Configuration** | OP Stack Artifacts | `genesis.json` (9.5MB) and `rollup.json` (Chain ID 901). | **Generated** (via `op-deployer inspect`) |
| **Rollup Consensus** | `op-node` | Block derivation, L1 log parsing, sequencer coordination. | **Ready for Linux runtime** (WSL2 / Docker) |
| **L2 Execution Engine** | `op-geth` / `op-reth` | EVM execution, state transitions, JSON-RPC. | **Ready for Linux runtime** (WSL2 / Docker) |
| **L1 Batch Submission** | `op-batcher` | Compresses L2 txs and submits to L1 inbox. | **Ready for Linux runtime** (WSL2 / Docker) |
| **Explorer** | Blockscout (`NairaTag Scan`) | Web UI & PostgreSQL indexer for L2 blocks & txs. | **Configured** (Compose file ready) |
| **Identity Protocol** | `NairaTagRegistry` & `Resolver` | On-chain registration, normalization, and tag resolution. | **Compiled & Tested** (Foundry unit tests pass) |

---

## 3. Strict Development Progression

```text
1. LOCAL CONTRACT DEVELOPMENT (CURRENT)
   Foundry / Anvil (Normalization, claim, resolve, unit tests of Registry & Resolver)
   ↓
2. GENUINE LOCAL OP STACK ROLLUP
   Deploy canonical Bedrock contracts to Anvil -> Start op-node + op-geth + op-batcher
   ↓
3. LOCAL EXPLORER (BLOCKSCOUT)
   Connect Blockscout container stack to live op-geth RPC (Chain ID: 901)
   ↓
4. PUBLIC TESTNET
   Deploy NairaTag L2 Rollup on Ethereum Sepolia L1 + Testnet Blockscout
   ↓
5. PRODUCTION ROLLUP
   NairaTag L2 Rollup on Ethereum Mainnet L1
```

---

## 4. End-to-End Resolution Flow (Target)

```text
User / Wallet (anyWALLET)               Blockscout (NairaTag Scan)
         │                                         │
         │ Resolves "₦micheal"                     │ Indexes real blocks & txs
         ▼                                         ▼
NairaTag Network L2 RPC (Port 9545 / op-geth)
         │
         ▼
NairaTagRegistry / Resolver Contract on L2
         │
         ▼ Returns address: 0xAbC123...
Transaction dispatched on NairaTag L2
```
