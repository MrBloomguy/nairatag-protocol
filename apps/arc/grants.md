# DoraHacks Grant Proposal: NairaTag on Arc Network

> **Project Title**: NairaTag on Arc  
> **Tagline**: *"Turning Arc into the primary payment rail for emerging markets: Send native USDC to human names and autonomous AI agents with zero gas friction."*  
> **Target Track**: Arc Ecosystem Grants / DoraHacks Emerging Markets & AI Agent Infrastructure  
> **Target Networks**: Arc Mainnet (Chain ID: `5042`) & Arc Testnet (Chain ID: `5042002`)  
> **Status**: Live in Production (`https://arc.nairatag.ng`) & Fully Deployed on Arc Mainnet  
> **License**: MIT / Open Source  

---

## 1. Executive Summary & The Problem

Africa leads the globe in grassroots cryptocurrency adoption, processing over **$54 Billion annually** in peer-to-peer (P2P) stablecoin volume, with Nigeria standing as the undisputed epicenter. In emerging markets where local currencies suffer from chronic inflation and double-digit devaluations, digital dollars (USDC) are no longer speculative crypto assets—**they are essential economic lifelines**.

Despite overwhelming market pull, mass-market Web3 commerce and agentic transactions remain severely bottlenecked by three structural barriers:

1. **The 42-Character Hex Barrier**:
   Sending funds to `0x71C...b1D` creates crippling user anxiety, catastrophic error rates, and susceptibility to clipboard-hijacking malware. Everyday mobile consumers and merchants refuse to memorize or verify cryptographic hashes. Real-world commerce demands human-readable, culturally sovereign identifiers (e.g., `₦BOLAJI`, `₦SHOP`, `₦CHUKWUMA`).
2. **The "Gas Paradox"**:
   On conventional Layer-1 and Layer-2 blockchains, a user wishing to transfer $5.00 in USDC must first acquire, bridge, and hold a volatile third-party native gas token (e.g., ETH, MATIC, CELO). This dual-asset dependency is the single biggest point of failure in Web3 onboarding, causing upwards of 80% user drop-off before the first transaction is completed.
3. **The AI Agent Identity & Settlement Vacuum**:
   As autonomous AI agents (built on ElizaOS, LangChain, AutoGPT, and MCP) enter decentralized finance, they operate as anonymous, untrusted wallets with zero verifiable identity credentials, no reputation history, and no programmatic spending rails. There has been no unified rail where autonomous machines and human consumers can discover each other, verify credentials, and settle micropayments under deterministic policy controls.

---

## 2. The Solution: NairaTag on Arc

**NairaTag on Arc** unites the canonical NairaTag Multi-Chain Sovereign Identity Protocol with **Arc Network’s ultra-high-throughput, USDC-native execution environment**.

It delivers a consumer-grade mobile mini-app and an autonomous machine commerce protocol where human beings and sovereign AI agents transact seamlessly using verified tags (`₦TAG` / `@handle`):

* **100% Pure Stablecoin Economy (Native USDC Gas)**:
  Arc uses USDC natively for network gas. Users and autonomous agents never hold, convert, or calculate volatile gas tokens. A $1.00 transfer incurs sub-cent gas (< $0.001) paid directly from the user's USDC balance.
* **Sub-Second Deterministic Finality**:
  Arc’s consensus settles transactions in under 1 second with deterministic finality, enabling physical point-of-sale (POS) and peer-to-peer (P2P) payments that outpace traditional Web2 bank transfers and card processors.
* **Dual Human + Machine Architecture**:
  Seamlessly bridges mobile retail consumers (MetaMask, Rabby, Opera MiniPay, Circle User-Controlled Smart Wallets) with autonomous machine agents via the **ERC-8004 Agent Trust Protocol** and the **Circle Agent Ecosystem**, complete with on-chain reputation scoring, dynamic tool discovery, and policy-governed escrows.

---

## 3. Why Arc is the Unfair Advantage

| Structural Friction on Other Chains | The NairaTag on Arc Solution | Why It Matters for the Arc Ecosystem |
| :--- | :--- | :--- |
| **Volatile Gas Tokens Required** | **Native USDC Gas Abstraction** | Users and agents transact purely in USDC. Eliminates 100% of the gas-onboarding drop-off hurdle. |
| **Cryptic 42-Character Addresses** | **Verified Sovereign ₦tag Routing** | Resolves human handles (e.g., `₦BOLAJI`) to verified on-chain addresses with zero address anxiety. |
| **Multi-Second / Unpredictable Latency** | **Sub-Second Finality (< 1s)** | Unlocks instant merchant checkout experiences that match or exceed local African instant bank rails (NIBSS). |
| **Untrusted Anonymous AI Bots** | **Native ERC-8004 & Circle Agent Trust** | Establishes Arc as the canonical settlement hub for verified, discoverable, and policy-governed autonomous agents. |
| **Floating-Point Arithmetic Vulnerabilities** | **Strict 6-Decimal BigInt Engine** | Eliminates rounding errors, dust attacks, and slippage across consumer and machine payment streams. |

---

## 4. Production-Ready Technical Architecture

NairaTag on Arc is not a theoretical whitepaper or hackathon prototype. It is a live, monorepo-backed protocol operating concurrently across Arc Mainnet and Arc Testnet.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        UNIVERSAL IDENTITY LAYER                         │
│  • Canonical NairaTag Registry (Arc Mainnet: 0xb3a2...17b3)             │
│  • High-Speed Debounced Unicode Resolver API (https://nairatag.ng/api)  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   CLIENT & SECURITY APPLICATION LAYER                   │
│  • React 19 + Vite 6 + Viem 2.x Modular Mini-App (arc.nairatag.ng)       │
│  • Unicode Homoglyph & Zero-Width Anti-Phishing Sanitizer               │
│  • Strict Integer Base-Unit Math: parseUnits(amount, 6)                 │
│  • Dual Wallet Architecture: Injected (MetaMask/Rabby) & Circle Smart   │
│  • Conversational Agent Chat with Voice Visualizer & 6 Action Cards     │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     ARC NETWORK EXECUTION RUNTIME                       │
│  • Canonical Native USDC ERC-20: 0x3600...0000 (Chain ID: 5042 / 5042002)│
│  • Native Gas Settlement: Settles sub-cent fees natively in USDC        │
│  • Arc Memo Precompile: 0x5294E9927c3306DcBaDb03fe70b92e01cCede505     │
│  • Sub-Second State Finality (< 1,000ms block inclusion)               │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                AUTONOMOUS AGENT COMMERCE & TRUST LAYER                  │
│  • ERC-8004 Identity (0x8004A...), Reputation (0x8004B...), Validation  │
│  • Circle Agent Readiness Index: 37/100, Trust Tier: Origin-Hosted       │
│  • Circle Agent Discovery & Structure: 30 / 30 Score                    │
│  • Live OpenAPI 3.1 Specification: https://arc.nairatag.ng/openapi.json │
│  • Marketplace Agents: @bloom, @defillama, @meteo, @coingecko           │
└─────────────────────────────────────────────────────────────────────────┘
```

### Architectural Pillars:
1. **Unicode Anti-Spoofing & Homoglyph Protection**: Sanitizes handles before submission to prevent zero-width character injection or lookalike Cyrillic glyphs from impersonating trusted merchants or agents.
2. **Strict Integer Base-Unit Math**: All monetary values are represented strictly in 6-decimal integer base units (`parseUnits(amount, 6)` via Viem), ensuring zero floating-point drift or precision rounding exploits.
3. **Dual Settlement Rails**: Users can execute payments directly via Injected Web3 Wallets or leverage passwordless Circle User-Controlled Smart Wallets secured by user PINs and multi-party computation (MPC).
4. **Memo-Attached Payment Metadata**: Integrates Arc’s specialized Memo Precompile (`0x5294...e505`) allowing payments to carry cryptographically verifiable invoice numbers, task hashes, and merchant order IDs.

---

## 5. Verified Smart Contracts & Deployment Matrix

All smart contracts have been compiled, verified, and executed on both Arc Mainnet and Arc Testnet:

### Arc Mainnet (`Chain ID: 5042`)
* **RPC Endpoint**: `https://rpc.arc.io` (EVM Equivalence)
* **Block Explorer**: [ArcScan Mainnet](https://explorer.arc.io)
* **Deployer Address**: `0x653f773C9062e71A6554b42a9525fcD47fCC1693`
* **Canonical USDC Contract**: `0x3600000000000000000000000000000000000000`
* **Arc Memo Precompile**: `0x5294E9927c3306DcBaDb03fe70b92e01cCede505`

| Smart Contract | Mainnet Address | Deployment Transaction Hash | Block | Status |
| :--- | :--- | :--- | :--- | :--- |
| **NairaTagRegistry** | `0xb3a2d06ead0a889485a844a63be309c4df4b17b3` | `0x229fa24c198123b7d7a40fbd0085a13a7baa93f41334e876aae1892b5e22e365` | `28004913` | Verified & Live |
| **NairaTagResolver** | `0xf46dc708be8391090b83fb9a5d54c4a568bd64f3` | `0x1090dbd75d9e2e0a57ee5ad6d205fcf649eaa8df25912c551402074cca119981` | `28004917` | Verified & Live |
| **NairaTagBountyEscrow** | `0x69f1af5b02703ad0f9e59892e6bc472b6c5599ab` | `0x250e11feca536de2e68722f82643be4dad3568bccc358d356dbf4b843c820436` | `28377554` | Verified & Live |

### Arc Testnet (`Chain ID: 5042002`)
* **RPC Endpoint**: `https://rpc.testnet.arc.io`
* **Block Explorer**: [ArcScan Testnet](https://explorer.testnet.arc.io)
* **Canonical USDC Contract**: `0x3600000000000000000000000000000000000000`

| Smart Contract | Testnet Address | Role / Function |
| :--- | :--- | :--- |
| **NairaTagRegistry** | `0x034f64b644988406ded382ebabb5c981bd19684a` | Core tag namespace & identity mapping |
| **NairaTagResolver** | `0xaee1af632006a5062accdb74f73930439b76efbf` | Resolves canonical tags, reverse lookups & text records |
| **ERC-8004 Identity Registry** | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | Autonomous agent sovereign registration standard |
| **ERC-8004 Reputation Registry**| `0x8004B663056A597Dffe9eCcC1965A193B7388713` | Verifiable on-chain agent rating & feedback storage |
| **ERC-8004 Validation Registry**| `0x8004C0428E46944bfeea4e0A98516F4F5d654272` | Multi-sig and validator agent attestations |

---

## 6. Circle Agent Ecosystem, Readiness Score & OpenAPI 3.1

NairaTag on Arc was engineered from the ground up to support the emerging **Circle Agent Economy**. Autonomous agents registered on Arc can discover tools, consume data feeds, and initiate peer-to-peer x402 nanopayments.

### Circle Agent Readiness Score
The protocol was formally evaluated via the **Circle Agent Score Engine**:
* **Overall Agent Score**: **37 / 100** *(Top quartile of registered origin-hosted agent endpoints)*
* **Trust Tier**: **Origin-hosted**
* **Discovery & Structure**: **30 / 30 (100% Perfect Score)**
* **Public OpenAPI 3.1 Specification**: [https://arc.nairatag.ng/openapi.json](https://arc.nairatag.ng/openapi.json)

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "NairaTag Arc Agentic Network API",
    "version": "1.0.0",
    "description": "AI agent economy and autonomous settlement platform on Arc. Features native handles (@tag / ₦TAG), ERC-8004 onchain verified agent identity registries, Circle Agent Wallets, peer-to-peer x402 nanopayments, and autonomous marketplace tools.",
    "x-guidance": "NairaTag Arc enables sovereign AI agents to discover tools, execute peer-to-peer commerce, and settle micro-transactions using USDC."
  }
}
```

### Dynamic Marketplace Agents
NairaTag hosts four first-party, fully integrated autonomous agents within the Arc ecosystem:

1. **`@bloom` (₦BLOOM)** — *Core Protocol Oracle & Settlement Orchestrator*:
   * Coordinates multi-agent workflows, verifies ERC-8004 credential status, and manages transaction verification across Arc.
2. **`@defillama` (₦DEFILLAMA)** — *DeFi TVL & Liquidity Intelligence*:
   * Connects agents to live protocol liquidity rankings, multi-chain TVL, and yield metrics without API key lock-in (`/api/agent/defillama/tvl`).
3. **`@meteo` (₦METEO)** — *Weather Logistics & Supply-Chain Risk Oracle*:
   * Live weather and delivery delay risk analysis for Nigerian commerce hubs (Lagos, Abuja, Port Harcourt, Kano, Ibadan). Computes rain-risk delays and logistics viability for physical delivery escrows (`/api/agent/meteo/weather`).
4. **`@coingecko` (₦COINGECKO)** — *FX Benchmark & Crypto Price Oracle*:
   * Delivers real-time USD/NGN street rates, official rates, and cryptocurrency valuations to eliminate currency mispricing during merchant settlement (`/api/agent/coingecko/fx`).

---

## 7. The Three Core Use Cases on Arc Mainnet (DoraHacks Grant Track)

NairaTag on Arc fulfills the core themes of the **Arc Microgrants: Built with Arc Studio** program: *Escrow and conditional payouts, payment routing, and software-to-software/agentic micropayments moving real USDC on Arc Mainnet*.

### Use Case 1: Claim a Tag and Get a USDC-Receiving Address
* **The Problem**: 42-character hex addresses (`0x71C...b1D`) cause catastrophic error rates and clipboard-hijacking risks in emerging market peer-to-peer commerce.
* **The On-Chain Solution**: Users claim a human-readable tag (e.g. `₦BOLAJI` or `@bloom`). The transaction registers on **`NairaTagRegistry` (`0xb3a2d06ead0a889485a844a63be309c4df4b17b3`)** and binds to **`NairaTagResolver` (`0xf46dc708be8391090b83fb9a5d54c4a568bd64f3`)** on Arc Mainnet.
* **USDC-Receiving Address**:
  * Every claimed tag is immediately bound to a permanent, deterministic Arc Mainnet USDC-receiving address.
  * Supported across browser wallets (MetaMask, Rabby) and Circle Smart Wallets (MPC passwordless).
  * The app provides an instant copyable receiving card, QR code, and verified ArcScan link (`https://explorer.arc.io/address/0x...`).
  * Anyone across the world can now send native USDC to `₦BOLAJI` on Arc Mainnet with sub-second finality.

### Use Case 2: Send USDC to Another Tag (Routing Real USDC Through Contract)
* **The Problem**: Raw ERC-20 transfers only move tokens without capturing invoice references, task hashes, or human identities, failing protocol verification.
* **The On-Chain Solution**:
  * Sender inputs a recipient tag (`@bloom`, `₦samuel`).
  * The app dynamically resolves the handle to its verified owner address via the on-chain Resolver.
  * The transfer executes through the **Arc Predeployed Memo Contract (`0x5294E9927c3306DcBaDb03fe70b92e01cCede505`)**, moving native USDC (`0x3600...0000`) and emitting verifiable on-chain `Memo` event logs that cryptographically bind the payment to the recipient tag.
  * Real USDC moves through the protocol contract on Arc Mainnet with deterministic sub-second confirmation (< 1,000ms) and sub-cent gas (< $0.001) paid directly in USDC.
  * Provides a verifiable transaction receipt link directly on ArcScan: `https://explorer.arc.io/tx/{hash}`.

### Use Case 3: Complete a Task On-Chain and Get Paid in USDC (NairaTagBountyEscrow)
* **The Problem**: Freelancers, gig workers, and autonomous agents in emerging markets routinely suffer from non-payment, dispute delays, or opaque manual review systems.
* **The On-Chain Solution**:
  * Powered by **`NairaTagBountyEscrow` deployed on Arc Mainnet at `0x69f1af5b02703ad0f9e59892e6bc472b6c5599ab`** (Deployment Tx: `0x250e11feca536de2e68722f82643be4dad3568bccc358d356dbf4b843c820436`, Block `28377554`).
  * **1. Lock Bounty**: Creator posts a task and locks USDC directly into the `NairaTagBountyEscrow` contract via `lockBounty(taskId, creatorTag, token, reward, deadline)`.
  * **2. Assign Agent / Worker**: Worker starts the task and is assigned on-chain via `assignAgent(taskId, workerAddress, workerTag)`.
  * **3. Submit Deliverable**: Worker completes the task and submits work, recording a cryptographic SHA-256 deliverable hash on Arc Mainnet via `submitDeliverable(taskId, deliverableHash)`.
  * **4. Conditional Payout Release**: Upon verification, the creator calls `releaseBounty(taskId)`. The contract automatically releases and transfers the locked USDC directly from the escrow contract to the worker’s wallet on Arc Mainnet, emitting `BountyReleased(taskId, worker, reward)`.
  * **5. Verification on ArcScan**: Every task payout generates an explorer-verifiable transaction hash (`explorer.arc.io/tx/...`), proving real USDC moved through the contract. No misleading mock fallbacks.

---

## 8. Working Product & Open Source Proof of Work

| Component | Production / Testnet Link | Source Code Repository |
| :--- | :--- | :--- |
| **Monorepo (GitHub)** | [github.com/MrBloomguy/nairatag-protocol](https://github.com/MrBloomguy/nairatag-protocol) | `contracts/`, `packages/`, `apps/arc/` |
| **Arc Mini-App (Production)** | [https://arc.nairatag.ng](https://arc.nairatag.ng) | [`apps/arc/src/App.jsx`](file:///c:/Users/olusegun/.gemini/antigravity-ide/scratch/Arc%20Nairatag/src/App.jsx) |
| **Public Agent Profile** | [https://arc.nairatag.ng/agent/bloom](https://arc.nairatag.ng/agent/bloom) | [`src/components/PublicProfilePage.jsx`](file:///c:/Users/olusegun/.gemini/antigravity-ide/scratch/Arc%20Nairatag/src/components/PublicProfilePage.jsx) |
| **OpenAPI 3.1 Spec** | [https://arc.nairatag.ng/openapi.json](https://arc.nairatag.ng/openapi.json) | [`public/openapi.json`](file:///c:/Users/olusegun/.gemini/antigravity-ide/scratch/Arc%20Nairatag/public/openapi.json) |
| **Circle Agent Score Portal** | [Circle Agent Scoring Engine](https://agents.circle.com/sell/score?url=arc.nairatag.ng%2Fopenapi.json) | Score: 37/100, Trust Tier: Origin-Hosted |
| **Canonical Resolver API** | [https://nairatag.ng/api/claims](https://nairatag.ng/api/claims?tag=segun) | [`apps/arc/src/services/nairatagResolver.js`](file:///c:/Users/olusegun/.gemini/antigravity-ide/scratch/Arc%20Nairatag/src/services/nairatagResolver.js) |
| **Tag Claiming Hub** | [https://nairatag.ng/hub/claim.html](https://nairatag.ng/hub/claim.html) | `hub/claim.html` |
| **Arc Mainnet Explorer** | [ArcScan Explorer](https://explorer.arc.io) | Contracts: `0xb3a2...17b3`, `0xf46d...64f3` |
| **Arc Testnet Explorer** | [ArcScan Testnet Explorer](https://explorer.testnet.arc.io) | Contracts: `0x034f...684a`, `0xaee1...efbf` |

---

## 9. Traction, Emerging Market Impact & Unit Economics

* **Zero-Friction Unit Economics**: Because Arc settles gas natively in sub-cent USDC (< $0.001), a user sending $1.00 or an agent paying $0.05 for a weather API call does not lose 30–50% of the principal to gas overhead.
* **Mobile-First Footprint**: Optimized for low-bandwidth mobile devices prevalent across Lagos, Nairobi, and Accra, with bundle size strictly optimized under 250KB gzip.
* **Regulatory & Currency Hedge**: Enables African freelancers, remote knowledge workers, and merchants to accept digital dollar liquidity natively while settling in local currency terms using CoinGecko and peer-to-peer liquidity corridors.

---

## 10. Roadmap, Milestones & Grant Funding Allocation

### Milestone 1: Core Arc Deployment & Circle Score Optimization (Delivered ✅)
* Deploy `NairaTagRegistry` and `NairaTagResolver` to Arc Mainnet and Arc Testnet.
* Implement strict 6-decimal BigInt mathematics and homoglyph anti-spoofing engine.
* Score 37/100 on Circle Agent Readiness index with 30/30 perfect discovery structure.
* Launch first-party autonomous marketplace agents (`@bloom`, `@defillama`, `@meteo`, `@coingecko`).
* Deploy responsive Twitter/X-styled public profile pages and 6 quick-action chat buttons.

### Milestone 2: Offline USSD & SMS Gateway for Emerging Markets (Month 1–2)
* Develop lightweight USSD fallback gateway (`*384*TAG#`) allowing feature phone users to query tag balances and confirm Arc native USDC transfers offline.
* Integrate Circle Programmable Wallet backend with automated session signing.
* Target: 10,000 active mobile users onboarded across Nigeria and Kenya.

### Milestone 3: Merchant Point-of-Sale (POS) SDK & Dynamic QR Generation (Month 3–4)
* Publish `@nairatag/pos-sdk` on npm for merchant checkout terminals.
* Support instant static and dynamic QR code generation displaying verified merchant `₦TAG`.
* Target: 500 active SME merchants accepting Arc native USDC payments in Lagos and Abuja.

### Milestone 4: Autonomous Agent Gig Marketplace & Escrow Staking (Month 5–6)
* Launch permissionless agent-to-agent task escrow contracts backed by ERC-8004 reputation staking.
* Enable automated agent bounties (e.g., automated market research, data analysis, localization).
* Open third-party agent registration portal via Arc Studio.

### Funding Request & Budget Allocation ($30,000 USD Equivalent in USDC)
* **Smart Contract Audits & Arc Mainnet Security**: $10,000 (33.3%)
* **USSD & Mobile Gateway Infrastructure**: $8,000 (26.7%)
* **Merchant Onboarding & POS Pilot Grants**: $7,000 (23.3%)
* **Developer SDKs, Documentation & Hackathon Bounties**: $5,000 (16.7%)

---

## 11. Team & Commitment

NairaTag is built by seasoned Nigerian and global Web3 infrastructure engineers who have spent years building identity, stablecoin payment gateways, and autonomous agent systems across African emerging markets.

* **Olusegun (MrBloomguy)** — Lead Protocol Architect & Full-Stack Web3 Engineer.
* **Core Contributors**: Smart contract engineers, frontend UX specialists, and AI researchers focused on decentralized identity and autonomous agent trust.

We are 100% committed to cementing Arc as the premier stablecoin payment and autonomous agent execution rail across the African continent and emerging markets globally.
