# NairaTag Network — Production Architecture Guide

## 1. Network Topology

In production, **NairaTag Network is an Ethereum Layer 2 rollup settling to Ethereum Mainnet (L1)**.

```text
                           Ethereum Mainnet (L1)
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           │ Ethereum L1 Rollup Contracts (Multi-Sig Owned)   │
           │ OptimismPortal2, SystemConfig, DisputeGameFactory  │
           └─────────────────────────┬─────────────────────────┘
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           │           NairaTag Network L2 Sequencer           │
           │  Primary Sequencer (op-node + op-reth)            │
           │  Hot Standby Replica (Passive op-node)            │
           └─────────────────────────┬─────────────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         ▼                           ▼                           ▼
op-batcher                  op-proposer                 Public L2 RPC Cluster
(Publishes L2 data to L1)   (Submits state roots to L1) (Load-balanced JSON-RPC)
                                                                 │
                                                    ┌────────────┴────────────┐
                                                    ▼                         ▼
                                               NairaTagScan               anyWALLET
```

---

## 2. Key Terminology

* **Ethereum**: The L1 settlement and data availability layer.
* **NairaTag Network**: The sovereign L2 rollup where transactions execute and identity state lives.
* **OP Stack**: The underlying optimistic rollup infrastructure powering NairaTag Network.
* **`op-node`**: The L2 consensus client deriving canonical blocks from Ethereum L1.
* **`op-reth` / `op-geth`**: The L2 EVM execution client.
* **`op-batcher`**: The service that compresses and posts L2 transaction batches to Ethereum L1.
* **`op-proposer`**: The service that submits L2 state root claims to the L1 `DisputeGameFactory`.
* **`OptimismPortal2`**: The Ethereum L1 contract managing deposits and finalizing withdrawals.

---

## 3. Production Infrastructure & Redundancy

1. **Sequencer Redundancy**:
   - Primary active sequencer with dedicated P2P signing key.
   - Passive hot-standby node continuously syncing from L1 and sequencer P2P gossip, ready for automatic failover.
2. **Key Custody & Signer Separation**:
   - **ProxyAdmin / SystemConfig Owner**: 3-of-5 Hardware Multi-Sig (Safe) on Ethereum Mainnet.
   - **Batcher Key**: Cloud HSM / HashiCorp Vault. Submits EIP-4844 blobs to Ethereum L1.
   - **Proposer Key**: Cloud HSM / HashiCorp Vault. Submits dispute game claims to Ethereum L1.
   - **Challenger Key**: Automated monitoring service defending state against invalid proposals.
3. **RPC Availability**:
   - Geo-distributed edge proxies with Cloudflare DDoS protection and rate limiting.
   - Read-only replica nodes handling JSON-RPC read traffic (`eth_call`, `eth_getLogs`) to isolate sequencer compute.
4. **Data Availability**:
   - Uses Ethereum L1 EIP-4844 data blobs for low-cost, decentralized data availability.
