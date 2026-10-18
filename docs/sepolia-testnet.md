# NairaTag Network — Sepolia Testnet Guide

## Overview

**NairaTag Sepolia Testnet** is an OP Stack Layer 2 rollup settling to **Ethereum Sepolia (L1)**.

```text
                     Ethereum Sepolia (L1)
                               │
               ┌───────────────┴───────────────┐
               │                               │
       L1 Rollup Contracts            Data Availability
    (OptimismPortal2, SystemConfig)   (EIP-4844 Blobs / Calldata)
               │                               │
               └───────────────┬───────────────┘
                               │
                               ▼
                    NairaTag Network (L2)
                    Chain ID: 902
                    Block Time: 2 seconds
                    Native Gas Asset: Sepolia ETH
                               │
                ┌──────────────┼──────────────┐
                │              │              │
           NairaTag       NairaTag       anyWALLET
           Registry         Scan         Integration
```

---

## Deployment Prerequisites

Before promoting from local OP Stack devnet to Ethereum Sepolia L1:
1. **Local Devnet Verification**: All 10 smoke test assertions must pass on the local OP Stack rollup devnet.
2. **Funded Sepolia L1 Accounts**:
   - `DEPLOYER`: ~0.5 Sepolia ETH (for deploying L1 rollup contracts via `op-deployer`)
   - `BATCHER`: ~0.5 Sepolia ETH (for posting L2 transaction batches/blobs to Ethereum Sepolia)
   - `PROPOSER`: ~0.5 Sepolia ETH (for posting L2 state roots and dispute game bonds to Ethereum Sepolia)
3. **Cloud Node Infrastructure**:
   - Linux Virtual Machine (Ubuntu 24.04 LTS, 8 vCPU, 16 GB RAM, 300 GB NVMe SSD)
   - Services to run:
     * `op-reth` or `op-geth` (L2 execution engine)
     * `op-node` (L2 rollup consensus client, connected to Ethereum Sepolia L1 RPC)
     * `op-batcher` (submits L2 transactions to Ethereum Sepolia)
     * `op-proposer` (submits L2 state outputs to Ethereum Sepolia)
4. **Public Network Endpoints**:
   - Public L2 RPC domain: `https://sepolia-rpc.nairatag.network` (with SSL/TLS and rate limiting)
   - L2 WebSocket: `wss://sepolia-rpc.nairatag.network`

---

## Step-by-Step Deployment Workflow

### 1. Configure Intent File
```bash
op-deployer init \
  --l1-chain-id 11155111 \
  --l2-chain-ids 902 \
  --intent-type standard-overrides
```

Edit `op-stack/configuration/intent.toml` to configure:
- `name = "NairaTag"`
- `chainId = 902`
- `blockTime = 2`
- Role addresses for Deployer, Admin, Batcher, Proposer, and Sequencer P2P key.

### 2. Deploy L1 Rollup Contracts to Ethereum Sepolia
```bash
op-deployer apply \
  --workdir ./op-stack/configuration \
  --l1-rpc-url $SEPOLIA_L1_RPC_URL \
  --private-key $SEPOLIA_DEPLOYER_PRIVATE_KEY
```
This deploys the Ethereum L1 contracts:
- `OptimismPortal2`
- `SystemConfig`
- `L1CrossDomainMessenger`
- `L1StandardBridge`
- `DisputeGameFactory`

### 3. Generate L2 Genesis and Rollup Config
```bash
op-deployer apply \
  --workdir ./op-stack/configuration \
  --deployment-target genesis
```
Outputs `genesis.json` (for `op-reth`/`op-geth`) and `rollup.json` (for `op-node`).

### 4. Initialize and Launch the L2 Services
1. Initialize execution client state:
   ```bash
   op-geth init --datadir ./data genesis.json
   ```
2. Start L2 execution client (`op-geth` / `op-reth`) with Engine API.
3. Start L2 consensus client (`op-node`) connected to Ethereum Sepolia L1 and the local Engine API.
4. Start `op-batcher` to submit L2 blocks to Ethereum Sepolia.
5. Start `op-proposer` to submit state roots to Ethereum Sepolia.

### 5. Deploy NairaTag Identity Contracts to NairaTag L2
Once the L2 sequencer is actively producing blocks:
```bash
forge script contracts/script/Deploy.s.sol \
  --rpc-url https://sepolia-rpc.nairatag.network \
  --broadcast \
  --verify
```
