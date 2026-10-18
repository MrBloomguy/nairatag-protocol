# NairaTag Bridge & Swap Architecture

## 1. Vision

The long-term user experience of the NairaTag Network is seamless cross-chain settlement:

> `USDC on external chain → ASAKE on NairaTag → ₦ASAKE`

```text
External Chain (Base / Ethereum / Arbitrum)
        │
        │ 1. Inbound deposit / cross-chain hop
        ▼
NairaTag Chain 901
        │
        │ 2. Native AMM Swap
        ▼
      ASAKE
        │
        │ 3. On-chain resolution & delivery
        ▼
     ₦ASAKE
```

---

## 2. Two-Layer Operational Principle

To ensure zero simulation and 100% verifiability, the protocol maintains a strict separation:

### Layer A — Native NairaTag (Chain 901) — ACTIVE
- Native assets (`cNGN.test`, `ASAKE`, `BISI`, `KEMI`)
- Native constant-product AMM router and pools
- Direct resolution to `₦Tag` handles
- **Status**: Live, tested, and fully functional on Chain 901.

### Layer B — External Chain Bridge + Swap — IN EVALUATION
- Cross-chain asset bridging between external testnets (Celo Sepolia, Ethereum Sepolia) and Chain 901
- Requires an active relayer, cross-domain messenger, and standard bridge contracts
- **Status**: Contracts specified in `contracts/src/op-contracts/`; routes truthfully reported as **Coming Soon / Testnet Evaluation**. Never faked or simulated.

---

## 3. Multi-Transaction Tracking Pipeline

A cross-chain Bridge & Swap operation consists of 6 discrete, verifiable on-chain stages:

| Stage | Operation | Network | Description |
|---|---|---|---|
| **1** | Source Approval | Source Chain | `IERC20.approve(bridgeAddress, amount)` |
| **2** | Source Bridge Tx | Source Chain | Deposit locked in `L1StandardBridge` / Messenger |
| **3** | Relayer Processing | Inter-chain | Sequencer / Relayer attestation and fraud-proof window |
| **4** | Destination Receipt | Chain 901 | `L2StandardBridge` mints/unlocks bridged asset |
| **5** | Native AMM Swap | Chain 901 | `NairaTagRouter.swapExactTokensForTokens` |
| **6** | Settlement to ₦Tag | Chain 901 | Delivery of target token to resolved ₦Tag address |

The UI displays real transaction hashes for each executed stage. An incomplete operation is never collapsed into "Success".
