# External Chain Support & Readiness Matrix

## 1. Network Support Classification

In accordance with Section 8 of the NairaTag Specification, all external blockchain networks are explicitly classified into one of three statuses:

- **`SUPPORTED`**: The network is live, active, and possesses an operational bridge and DEX settlement pipeline.
- **`COMING_SOON`**: The network has defined contract architectures and is actively under testnet evaluation.
- **`UNAVAILABLE`**: The network is part of the future roadmap; no bridge contracts are currently deployed.

---

## 2. Chain Readiness Matrix

| Network | Chain ID | Type | Route Status | Settlement Mechanism | Native / Bridged |
|---|---|---|---|---|---|
| **NairaTag Chain 901** | `901` | L2 Rollup | **`SUPPORTED`** | NairaTagRouter / NairaTagPair | Native |
| **Celo Sepolia** | `11142220` | L2 Testnet | **`COMING_SOON`** | OP Stack Standard Bridge | Bridged |
| **Ethereum Sepolia** | `11155111` | L1 Testnet | **`COMING_SOON`** | L1CrossDomainMessenger | Bridged |
| **Base Mainnet** | `8453` | L2 Mainnet | **`UNAVAILABLE`** | Production Rollout Phase | Bridged |
| **Ethereum Mainnet** | `1` | L1 Mainnet | **`UNAVAILABLE`** | Production Rollout Phase | Bridged |
| **Arbitrum One** | `42161` | L2 Mainnet | **`UNAVAILABLE`** | Production Rollout Phase | Bridged |

---

## 3. Celo Sepolia First External Testnet Path

Celo Sepolia is identified as the primary target for the first external cross-chain demonstration:

```text
Celo Sepolia (Chain 11142220)
       │
       │ 1. User deposits testnet USDC into L1StandardBridge
       ▼
Cross-Domain Relayer
       │
       │ 2. Relays deposit message to Chain 901
       ▼
Chain 901 (L2StandardBridge)
       │
       │ 3. Mints bridged USDC to user
       ▼
NairaTag AMM
       │
       │ 4. Swaps bridged USDC → ASAKE
       ▼
NairaTag Registry
       │
       │ 5. Delivers ASAKE to ₦ASAKE
```

### Pre-requisites for Celo Sepolia Public Launch:
1. Deploy `L1CrossDomainMessenger` and `L1StandardBridge` to Celo Sepolia.
2. Configure OP Stack batcher and proposer pointing to public Chain 901 sequencers.
3. Deploy official testnet USDC token contract on Celo Sepolia.
4. Establish initial `USDC / cNGN` or `USDC / ASAKE` liquidity pool on Chain 901.

Until these four milestones are deployed and validated with actual on-chain transaction receipts, Celo Sepolia routes are truthfully tagged **Coming Soon / Testnet Evaluation**.
