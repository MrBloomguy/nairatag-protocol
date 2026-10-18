# NairaTag Network — Local Devnet Guide

## Critical Distinction: Contract Dev vs. Actual Rollup Dev

To maintain engineering rigor, this repository clearly distinguishes between:

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. LOCAL CONTRACT DEVELOPMENT (DUAL ANVIL DEVNET)           │
│    Tools: Foundry / Anvil L1 + Anvil L2                     │
│    Purpose: Solidity contract deployment, unit testing,     │
│             and real on-chain tag normalization & claims.   │
│    Scope: Smart contracts & EVM execution.                  │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. GENUINE LOCAL OP STACK ROLLUP (TARGET INFRASTRUCTURE)    │
│    Settlement: Native Anvil Ethereum L1                     │
│    Contracts: Canonical Bedrock L1 contracts                │
│    Rollup Daemons: op-node, op-geth, op-batcher             │
│    Explorer: Self-hosted Blockscout                         │
└─────────────────────────────────────────────────────────────┘
```

> **Audit Notice**: The repository currently operates at Stage 1 (Dual Anvil devnet).
> Stage 2 requires Docker Desktop or WSL2 to run official OP Stack container images.

---

## Current Local Ports

* **Ethereum L1 RPC**: `http://127.0.0.1:8545` (Anvil L1, Chain ID: `900`)
* **NairaTag L2 RPC**: `http://127.0.0.1:9545` (Anvil L2, Chain ID: `901`, real bytecode execution)
* **Blockscout Explorer URL**: `http://localhost:4000` (Configured, requires Docker engine to run)

---

## Prerequisites for Genuine OP Stack Rollup

To transition from the current mock harness to genuine OP Stack execution:
1. **Foundry**: `anvil`, `cast`, `forge` (Installed at `~/.foundry/bin`)
2. **Container Engine or Linux/WSL2**: Docker Desktop (with WSL2 enabled) or native Linux environment to execute `op-node`, `op-geth`, and `op-batcher` images.
3. **Canonical Bedrock Contracts**: Official `@eth-optimism/contracts-bedrock` deployed to Anvil L1.
4. **Genesis Artifacts**: Real `genesis.json`, `rollup.json`, and `jwt.hex` generated via OP Stack tooling.

---

## Current Commands

```bash
# Start local Anvil L1 + Mock L2 harness
powershell -File scripts/start.ps1

# Check honest status of all components
powershell -File scripts/status.ps1

# Run core smoke tests (with audit warnings on mock client)
powershell -File scripts/smoke-test.ps1

# Run Blockscout verification (checks Docker and indexing)
powershell -File scripts/blockscout-smoke-test.ps1

# Stop running devnet processes
powershell -File scripts/stop.ps1
```
