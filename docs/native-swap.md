# NairaTag Native Swap Specification (Chain 901)

## 1. Overview

NairaTag Network Chain 901 provides a native automated market maker (AMM) based on the proven constant-product formula ($x \cdot y = k$). The AMM serves as the settlement and liquidity layer for all NairaTag ecosystem tokens (`cNGN`, `ASAKE`, `BISI`, `KEMI`), allowing instant swaps and direct delivery to human-readable `₦Tag` handles.

---

## 2. Core Architecture

```text
User / Wallet
      │
      │ 1. Approve router (if required)
      ▼
NairaTagRouter (0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0)
      │
      │ 2. Query reserves & enforce slippage / deadline
      ▼
NairaTagPair (Pool: cNGN / ASAKE)
      │
      │ 3. Execute swap (0.3% LP fee)
      ▼
Destination Recipient
(Direct to wallet OR resolved ₦Tag target)
```

---

## 3. Deployed Contracts (Chain 901)

| Contract | Address | Purpose |
|---|---|---|
| **NairaTagAMMFactory** | `0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e` | Pool creation and pair registry |
| **NairaTagRouter** | `0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0` | Multi-hop routing, slippage control, liquidity |
| **MockCNGN** | `0x610178dA211FEF7D417bC0e6FeD39F05609AD788` | Test stablecoin (18 decimals, faucet enabled) |
| **ASAKE Token** | `0x32467b43BFa67273FC7dDda0999Ee9A12F2AaA08` | `₦asake` community token |
| **BISI Token** | `0x4ABEaCA4b05d8fA4CED09D26aD28Ea298E8afaC8` | `₦bisi` community token |
| **cNGN / ASAKE Pair** | `0x752d1B1091b236F77Ecd8d746F93db9712D04979` | Primary constant-product liquidity pool |
| **cNGN / BISI Pair** | `0xFbE58FaF272863F4e7F5b232BC674E0Af2B16778` | Primary constant-product liquidity pool |

---

## 4. Native Swap-to-₦Tag Flow

NairaTag extends standard EVM swaps by allowing the destination parameter `to` to be resolved on-chain from any `₦Tag` handle.

### Execution Steps:
1. **Handle Resolution**: Client queries `NairaTagRegistry.resolve("₦asake")` to obtain the verified recipient address (`0x3246...`).
2. **Quote Calculation**: Client calls `NairaTagRouter.getAmountsOut(amountIn, [cNGN, ASAKE])`.
3. **Slippage Protection**: Minimum output is calculated: `amountOutMin = amountOut * (1000 - slippageBps) / 1000`.
4. **Atomic Execution**: Router pulls `amountIn`, executes the constant-product swap against `NairaTagPair`, and transfers `amountOut` directly to `0x3246...`.

### Code Example (SDK):

```javascript
const { NairaTagAMM, NairaTagClient } = require('@nairatag/sdk');

const client = new NairaTagClient({ rpcUrl: 'http://127.0.0.1:9545' });
const amm = new NairaTagAMM({ rpcUrl: 'http://127.0.0.1:9545' });

// 1. Resolve recipient ₦Tag
const recipientAddr = await client.resolve('₦asake');

// 2. Get live quote for 100 cNGN
const cNGN = '0x610178dA211FEF7D417bC0e6FeD39F05609AD788';
const ASAKE = '0x32467b43BFa67273FC7dDda0999Ee9A12F2AaA08';
const quote = await amm.getQuote(100n * 10n**18n, [cNGN, ASAKE], 0.5);

// 3. Construct swap transaction
const tx = amm.buildSwapTransaction({
  amountIn: quote.amountIn,
  amountOutMin: quote.minReceived,
  path: [cNGN, ASAKE],
  recipient: recipientAddr
});
```

---

## 5. Security & Invariant Guarantees

- **Reentrancy Protection**: All pair reserves are updated prior to token release.
- **Slippage Enforcement**: `require(amounts[amounts.length - 1] >= amountOutMin, "NTRouter: slippage")`.
- **Deadline Check**: `require(block.timestamp <= deadline, "NTRouter: expired")`.
- **Zero Input Rejection**: Reverts if `amountIn == 0`.
- **No Simulated State**: All balances and quotes originate directly from live Chain 901 RPC calls.
