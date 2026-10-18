# OP Stack Upstream Research — NairaTag Network

This document presents a comprehensive, factual analysis of the current upstream **OP Stack** architecture, tooling, and best practices to guide the design and operation of **NairaTag Network**.

---

## 1. Component Matrix

| Component | Purpose | Upstream Repository | Recommended Version | NairaTag Relevance | Configuration Method | Production Considerations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`op-reth`** | L2 Execution Client (Rust) | `paradigmxyz/reth` / `ethereum-optimism/op-reth` | `v1.2.0+` | Executes transactions, maintains state, serves L2 JSON-RPC for NairaTagScan & anyWALLET | Engine API JWT, CLI flags, genesis allocation | Fast sync, minimal memory overhead, standard for modern OP chains |
| **`op-geth`** | L2 Execution Client (Go) | `ethereum-optimism/op-geth` | `v1.101411.0+` | Fallback EVM execution client | Engine API JWT, CLI flags, `genesis.json` | Mature, but upstream ecosystem is transitioning to `op-reth` |
| **`op-node`** | L2 Consensus / Rollup Client | `ethereum-optimism/optimism` (`op-node`) | `v1.11.0+` | Derives canonical L2 chain from L1, drives execution engine, sequences blocks | CLI flags, `rollup.json`, P2P keys, Engine API | Sequencer high-availability, P2P peering, L1 RPC reliability |
| **`op-batcher`** | Data Availability Submitter | `ethereum-optimism/optimism` (`op-batcher`) | `v1.11.0+` | Bundles and compresses L2 transactions into channels and submits to L1 | CLI flags, private key, L1 RPC, rollup RPC | EIP-4844 blobs vs calldata, gas price spikes, nonces management |
| **`op-proposer`** | State Root Submitter | `ethereum-optimism/optimism` (`op-proposer`) | `v1.11.0+` | Posts state outputs / dispute game assertions to L1 to enable withdrawals | CLI flags, private key, `DisputeGameFactory` address | Bond management, dispute window timing, signer security |
| **`op-challenger`** | Fault Proof Defender | `ethereum-optimism/optimism` (`op-challenger`) | `v1.3.0+` | Plays dispute games to defend state assertions against invalid claims | CLI flags, FPVM traces (Cannon/Kona), L1 contract addresses | High computational requirements for trace generation; crucial for permissionless security |
| **`op-deployer`** | Declarative Contract Deployer | `ethereum-optimism/optimism` (`op-deployer`) | `v0.1.0+` | Deploys L1 contracts, generates `genesis.json` and `rollup.json` | `intent.toml`, `op-deployer apply` | Deterministic deployment, audit logs, upgrade migrations |
| **`op-contracts`** | L1 & L2 Smart Contracts | `ethereum-optimism/optimism` (`packages/contracts-bedrock`) | `op-contracts/v1.8.0+` | Core rollup protocol (`OptimismPortal2`, `SystemConfig`, `StandardBridge`) | Foundry scripts / `op-deployer` | Multi-sig governance, upgrade proxies, timelocks |

---

## 2. Declarative Deployment with `op-deployer`

Upstream OP Stack replaces manual shell scripts and bespoke migration code with `op-deployer`.

### Lifecycle:
1. **Initialize Intent**:
   ```bash
   op-deployer init \
     --l1-chain-id 11155111 \
     --l2-chain-ids 902 \
     --intent-type standard-overrides
   ```
2. **Review `intent.toml`**:
   Specify chain attributes, system config roles (Admin, Batcher, Proposer, Sequencer), gas limits, and locator versions.
3. **Deploy L1 Infrastructure**:
   ```bash
   op-deployer apply \
     --workdir ./op-stack/configuration \
     --l1-rpc-url $L1_RPC_URL \
     --private-key $DEPLOYER_PRIVATE_KEY
   ```
4. **Export L2 Genesis Artifacts**:
   ```bash
   op-deployer apply \
     --workdir ./op-stack/configuration \
     --deployment-target genesis
   ```
   Generates `genesis.json` for the execution engine and `rollup.json` for `op-node`.

---

## 3. Configurable Rollup Parameters

The table below outlines core parameters that define the behavior of NairaTag Network:

| Parameter | Recommended Devnet Value | Recommended Sepolia / Prod | Purpose & Impact |
| :--- | :--- | :--- | :--- |
| `chainId` | `901` | `902` (Sepolia), `779` (Prod candidate) | Unique EIP-155 chain ID. Prevents cross-chain replay. |
| `blockTime` | `2` seconds | `2` seconds | L2 block interval. Fast enough for instant identity resolution and payments. |
| `maxSequencerDrift` | `600` | `600` (seconds) | Maximum allowed time drift between L2 block timestamps and L1 clock. |
| `seqWindowSize` | `3600` | `3600` (L1 blocks) | Maximum window within which L2 batches must be finalized on L1. |
| `channelTimeout` | `300` | `300` (L1 blocks) | Timeout duration for open data batch channels. |
| `gasLimit` | `30000000` | `30000000` | Target gas limit per L2 block. Ensures low-cost compute for registry calls. |
| `basefeeScalar` | `1368` | Tuned per network | Multiplier for L1 base fee execution costs. |
| `blobBaseFeeScalar` | `801949` | Tuned per network | Multiplier for L1 blob fee costs (EIP-4844). |

---

## 4. Custom Native Gas Token (CGT v2) Evaluation

### Current Upstream Capabilities
With Upgrade 18, OP Stack introduced **Custom Gas Token v2 (CGT v2)**:
* Activated via `useCustomGasToken = true` and `--intent-type custom` in `op-deployer`.
* The `OptimismPortal2` and `CrossDomainMessenger` enable the `isCustomGasToken()` flag.
* Any transaction sending ETH (`msg.value > 0`) is rejected at the portal level.
* Two predeploys handle native assets: `NativeAssetLiquidity` (`0x4200000000000000000000000000000000000028`) and `LiquidityController` (`0x4200000000000000000000000000000000000029`).

### NairaTag Strategic Decision: Native ETH First
1. **Rule of Simplicity**: Following NairaTag's core principle, we avoid fragile workarounds.
2. **Ecosystem Compatibility**: Using standard ETH allows immediate out-of-the-box support from every Ethereum wallet (MetaMask, Rainbow, Rabby), block explorers, and standard bridge contracts without requiring custom fee-token logic.
3. **Future Path**: If a dedicated gas token (e.g. `NTG`) is later desired, it can be migrated using the formal CGT v2 framework after the core identity contracts and explorer are stabilized.

---

## 5. L1/L2 Bridging & Messaging Flow

```text
[Ethereum L1]                                           [NairaTag L2]
OptimismPortal2.depositTransaction(...)
        │ (Emits TransactionDeposited event)
        ▼
op-node reads L1 log ─────────────────────────────► Ingests deposit into next L2 block
                                                        │
                                                        ▼
                                                L2CrossDomainMessenger
                                                        │
                                                        ▼
                                                Target Contract Execution

[NairaTag L2]                                           [Ethereum L1]
User calls L2ToL1MessagePasser.initiateWithdrawal(...)
        │ (Emits MessagePassed event)
        ▼
op-proposer submits state root ───────────────────► DisputeGameFactory / L2OutputOracle
                                                        │
                                                        ▼ (7-day dispute window / proof)
                                                OptimismPortal2.finalizeWithdrawalTransaction(...)
```

---

## 6. Fault-Proof Architecture

1. **Dispute Games**: Assertions regarding L2 output state roots are represented as games created in the `DisputeGameFactory`.
2. **Interactive Bisection**: If a state root is disputed, the challenger and defender bisect the execution trace until finding the exact instruction where disagreement occurs.
3. **Single-Step Execution**: The Fault Proof VM (Cannon or Kona) executes the single step on L1 via `MIPS64.sol` or `RISCV.sol` to mathematically prove the truth.
4. **Bootstrapping**: For devnet and early testnets, OP Stack supports `PermissionedDisputeGame` (governed by designated signers) to maintain operational velocity before opening permissionless games.
