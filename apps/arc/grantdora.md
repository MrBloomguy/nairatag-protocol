# Arc Microgrants: Built with Arc Studio — DoraHacks Submission

> **Project Name**: NairaTag on Arc  
> **Tagline**: Sovereign naming protocol and autonomous USDC payment rails for humans and AI agents on Arc Mainnet.  
> **Live Production App**: [https://arc.nairatag.ng](https://arc.nairatag.ng) (Mirror: [https://arc-one-sigma.vercel.app](https://arc-one-sigma.vercel.app))  
> **Arc Studio Project URL**: [https://studio.arc.io/app/nairatag-arc-mainnet](https://studio.arc.io)  
> **Public Monorepo**: [https://github.com/MrBloomguy/nairatag-protocol](https://github.com/MrBloomguy/nairatag-protocol)  
> **Target Track**: Arc Microgrants: Built with Arc Studio ($4,000 USDC Pool / 8 Grants of $500 USDC)  
> **Execution Network**: Arc Mainnet (Chain ID: `5042`)  
> **Settlement Currency**: Native USDC (`0x3600000000000000000000000000000000000000`)  
> **Lead Builder**: Olusegun ([@MrBloomguy](https://github.com/MrBloomguy))  

---

## 1. What NairaTag on Arc Does

**NairaTag on Arc** transforms digital dollar payments across emerging markets and autonomous machine networks. It replaces 42-character hex addresses (`0x71C...b1D`) with sovereign, human-readable, and agent-friendly tags (`₦TAG` / `@name`) that settle natively in digital dollars (USDC) with sub-second finality (< 1,000ms) and zero gas token friction.

Built from the ground up to fulfill the core themes of the **Arc Microgrants: Built with Arc Studio** program:
1. **Escrow & Conditional Payouts**: Real USDC locked into and released from `NairaTagBountyEscrow` (`0x69f1...99ab`), settling bounties directly to verified workers and autonomous agents upon cryptographic deliverable proof.
2. **Payment Routing Through Smart Contracts**: Peer-to-peer and agent payments routed through smart contracts with on-chain cryptographic memo logging (`0x5294...e505`).
3. **Software-to-Software (Agent-to-Agent) Payments**: Sovereign autonomous AI agents (`₦nairatag`, `₦bloom`, `₦defillama`, `₦meteo`, `₦coingecko`) settling tool calls, weather risk scores, and FX benchmarks programmatically in USDC.

---

## 2. Built With Arc Studio: The Build Story

We used **Arc Studio** as the primary on-chain coding agent environment to conceive, write, test, and deploy the entire protocol:

* **Smart Contracts Written & Refined in Arc Studio**:
  - `NairaTagRegistry.sol`: Universal tag namespace enforcing a strict 1-tag-per-account policy and Unicode homoglyph anti-spoofing.
  - `NairaTagResolver.sol`: Forward and reverse address and text metadata resolver.
  - `NairaTagBountyEscrow.sol`: Trustless escrow contract with state machine (`Open -> Assigned -> Submitted -> Released / Refunded`).
* **Testing in Arc Studio**:
  - Solidity unit tests written with Foundry (`contracts/test/NairaTagBountyEscrow.t.sol` and `NairaTagRegistry.t.sol`), testing full lifecycle: bounty lock, worker assignment, deliverable verification, and atomic USDC release.
* **Building the App Around the Contracts**:
  - React 19 + Viem 2.x application directly calling the verified contracts on Arc Mainnet.
  - Dual wallet engine: Injected Web3 wallets (MetaMask, Rabby) and Circle User-Controlled Smart Wallets (MPC).
  - Voice visualizer and conversational agent UI for autonomous cross-agent commerce.
* **Arc Studio Project Memory (`AGENTS.md`)**:
  - Persistent memory file synchronized at repository root and `apps/arc/AGENTS.md` documenting every contract address, ABI, deployment hash, and agent tool specification.

---

## 3. Verified On-Chain Arc Mainnet Proofs (No Gimmicks, No Mocks)

Every single interaction listed below was executed on **Arc Mainnet (Chain ID `5042`)** with real native USDC. All links lead directly to verified transactions on [ArcScan](https://explorer.arc.io).

### Core Smart Contracts on Arc Mainnet

| Contract | Mainnet Address | Deployment Transaction Hash | Block | ArcScan Link |
|---|---|---|---|---|
| **NairaTagRegistry** | `0xb3a2d06ead0a889485a844a63be309c4df4b17b3` | `0x229fa24c198123b7d7a40fbd0085a13a7baa93f41334e876aae1892b5e22e365` | `28004913` | [View on ArcScan](https://explorer.arc.io/address/0xb3a2d06ead0a889485a844a63be309c4df4b17b3) |
| **NairaTagResolver** | `0xf46dc708be8391090b83fb9a5d54c4a568bd64f3` | `0x1090dbd75d9e2e0a57ee5ad6d205fcf649eaa8df25912c551402074cca119981` | `28004917` | [View on ArcScan](https://explorer.arc.io/address/0xf46dc708be8391090b83fb9a5d54c4a568bd64f3) |
| **NairaTagBountyEscrow** | `0x69f1af5b02703ad0f9e59892e6bc472b6c5599ab` | `0x250e11feca536de2e68722f82643be4dad3568bccc358d356dbf4b843c820436` | `28377554` | [View on ArcScan](https://explorer.arc.io/address/0x69f1af5b02703ad0f9e59892e6bc472b6c5599ab) |
| **Arc Memo Precompile** | `0x5294E9927c3306DcBaDb03fe70b92e01cCede505` | System Precompile | Native | [View on ArcScan](https://explorer.arc.io/address/0x5294E9927c3306DcBaDb03fe70b92e01cCede505) |
| **Canonical Native USDC** | `0x3600000000000000000000000000000000000000` | Native Gas & ERC-20 | System | [View on ArcScan](https://explorer.arc.io/address/0x3600000000000000000000000000000000000000) |

---

### Sovereign AI Agent Registry on Arc Mainnet

Every autonomous agent has a sovereign 1-tag-per-account identity claimed from its own deterministic wallet, bound to its permanent payout address on the `NairaTagResolver`:

| Agent Tag | Sovereign Agent Wallet | Claim Transaction Hash | Resolver Address Binding Tx | ArcScan Profile |
|---|---|---|---|---|
| **`₦NAIRATAG`** (Official Flagship) | `0x653f773C9062e71A6554b42a9525fcD47fCC1693` | [`0x51d9daafb3ad...`](https://explorer.arc.io/tx/0x51d9daafb3ad6afd2492bf38ac317314a808c69fd19b2da8e7d384b7fde800b2) | [`0x85236ad1bda...`](https://explorer.arc.io/tx/0x85236ad1bda7e4e818e6f59c3a6a18f50421cff1e68d15786415a664983999e1) | [View Agent](https://explorer.arc.io/address/0x653f773C9062e71A6554b42a9525fcD47fCC1693) |
| **`₦BLOOM`** (Core Assistant & Oracle) | `0x7c26a1F03339E2Ea74D261D97f5ab9C38181AF26` | [`0xea33f0772ea...`](https://explorer.arc.io/tx/0xea33f0772ea8fc3703c31854c6d4ffa9da0cc20b190a19918488fa1e32cdc584) | [`0xfa9b031829f...`](https://explorer.arc.io/tx/0xfa9b031829f49548e55a07d3d9ecf694593780763ff271df338293e65603305b) | [View Agent](https://explorer.arc.io/address/0x7c26a1F03339E2Ea74D261D97f5ab9C38181AF26) |
| **`₦DEFILLAMA`** (DeFi TVL Oracle) | `0xbfA1f73F632a54bFd04e9925dB6006135FcA6Ce6` | [`0x6957b604fa1...`](https://explorer.arc.io/tx/0x6957b604fa10e7a79263f989231a5fc8ecc5fa37c8477aae4eb3c5fbe56640d8) | [`0x26ddbcd7f51...`](https://explorer.arc.io/tx/0x26ddbcd7f51d6e24f5b05b5152fafdedf5279d4ad608da1d4bcb79782d4f948e) | [View Agent](https://explorer.arc.io/address/0xbfA1f73F632a54bFd04e9925dB6006135FcA6Ce6) |
| **`₦METEO`** (Weather Logistics Oracle) | `0x235d0Aa81F1c375c3325214f2dd7F205487eae36` | [`0x9a45240e8f8...`](https://explorer.arc.io/tx/0x9a45240e8f8f78016113a2468c611c89d005f1101522800bf2ad9183563fb10d) | [`0xf1bc9d2c2d6...`](https://explorer.arc.io/tx/0xf1bc9d2c2d63bb34338e7b0c08bf1fc99775d0e22650cc35db1e78497d2e4476) | [View Agent](https://explorer.arc.io/address/0x235d0Aa81F1c375c3325214f2dd7F205487eae36) |
| **`₦COINGECKO`** (FX Price Benchmark) | `0x1abfC727335489f2914Effd7e19C19C309850Ef8` | [`0x00f59a3ce79...`](https://explorer.arc.io/tx/0x00f59a3ce79b4fec86e787662466a7ea44b176a6c6c9fbb2a1b497caa7acd59f) | [`0x920564d8485...`](https://explorer.arc.io/tx/0x920564d84854f4356ada215f971db06d9c1fe1fad04863ede205b23cb80767b7) | [View Agent](https://explorer.arc.io/address/0x1abfC727335489f2914Effd7e19C19C309850Ef8) |

---

### Software-to-Software (Agent-to-Agent) Micropayments Moving Real USDC

The official protocol agent **`₦NAIRATAG`** initiated autonomous software-to-software USDC micropayments to other marketplace agents via the **Arc Memo Precompile (`0x5294...e505`)**, moving native USDC and emitting on-chain memos:

| Sender Agent | Recipient Agent | Amount | Purpose / Memo | Transaction Hash | Block | ArcScan Link |
|---|---|---|---|---|---|---|
| `₦NAIRATAG` | `₦BLOOM` | `0.000001 USDC` | *"₦nairatag agent micropayment to ₦BLOOM"* | `0x05743478b00c2f4ea1cbd59caa6d5f6f6edf0566f46c50428da63eeab026c5d4` | `28385379` | [View Tx](https://explorer.arc.io/tx/0x05743478b00c2f4ea1cbd59caa6d5f6f6edf0566f46c50428da63eeab026c5d4) |
| `₦NAIRATAG` | `₦DEFILLAMA` | `0.000001 USDC` | *"₦nairatag agent micropayment to ₦DEFILLAMA"* | `0xe6886767219939192c6410f18cb35a9324f362c74501bd74064b807d4cb090e0` | `28385381` | [View Tx](https://explorer.arc.io/tx/0xe6886767219939192c6410f18cb35a9324f362c74501bd74064b807d4cb090e0) |
| `₦NAIRATAG` | `₦METEO` | `0.000001 USDC` | *"₦nairatag agent micropayment to ₦METEO"* | `0xccd20d6265e7592548f301b67e5a90ff5bbcc1f64b2b8709f735af6dca7be838` | `28385383` | [View Tx](https://explorer.arc.io/tx/0xccd20d6265e7592548f301b67e5a90ff5bbcc1f64b2b8709f735af6dca7be838) |
| `₦NAIRATAG` | `₦COINGECKO` | `0.000001 USDC` | *"₦nairatag agent micropayment to ₦COINGECKO"* | `0x743ee8a1abaa72921facfd63d20b2c8113bec38527ad31cad6fbcab34287bf54` | `28385385` | [View Tx](https://explorer.arc.io/tx/0x743ee8a1abaa72921facfd63d20b2c8113bec38527ad31cad6fbcab34287bf54) |

---

### On-Chain Task Escrow & Conditional Payouts (`NairaTagBountyEscrow`)

Real USDC was locked into `NairaTagBountyEscrow` (`0x69f1af5b02703ad0f9e59892e6bc472b6c5599ab`), assigned to sovereign agents, verified through cryptographic deliverable hashes, and released atomically:

* **USDC Approval for Escrow**: [`0x7abbc0177162a76cfc1c465ca939f98aeb969e7838a1823e99e83b216eb6102a`](https://explorer.arc.io/tx/0x7abbc0177162a76cfc1c465ca939f98aeb969e7838a1823e99e83b216eb6102a)

#### Task 1: "Verify Arc Mainnet Sub-Second Settlement & Tag Resolution"
- **Task ID**: `0x4e5f288d76666a8449484c58e8e2f0a8b70cccbc6efd3cffa6e1f40da683ea80`
- **Reward**: `0.00001 USDC` (Locked into Escrow)
- **Assignee**: `₦BLOOM` (`0x7c26a1F03339E2Ea74D261D97f5ab9C38181AF26`)
- **Status**: **Released / Paid Out Directly to Assignee**
- **1. Lock Bounty Tx**: [`0x936d0299f23a6721d45a56f9ce29bd3f691e09defd927cf7836e3285b0791853`](https://explorer.arc.io/tx/0x936d0299f23a6721d45a56f9ce29bd3f691e09defd927cf7836e3285b0791853)
- **2. Assign Agent Tx**: [`0xb7f1cdecd928fef0bf963dff67b3d40f6a986b98759aa6d3274fcda3daf270a1`](https://explorer.arc.io/tx/0xb7f1cdecd928fef0bf963dff67b3d40f6a986b98759aa6d3274fcda3daf270a1)
- **3. Submit Deliverable Tx**: [`0x6867a25bd67920eb830e4a8e36b8e9912a252528613044e396377b6b0cad389c`](https://explorer.arc.io/tx/0x6867a25bd67920eb830e4a8e36b8e9912a252528613044e396377b6b0cad389c)
- **4. Release Bounty Payout Tx**: [`0x05c44d7a279ad6e5567ad1d178f9dbef12aae546115247b5dc5ee61287b00baf`](https://explorer.arc.io/tx/0x05c44d7a279ad6e5567ad1d178f9dbef12aae546115247b5dc5ee61287b00baf) (Block `28385398`)

#### Task 2: "Compute Real-Time Weather Logistics Risk for Nigerian Delivery Hubs"
- **Task ID**: `0x137a8ab98f3473cb88d7d0b65c92f3a9bf09840f266efe2a7483acbbe4fa87e5`
- **Reward**: `0.00001 USDC` (Locked into Escrow)
- **Assignee**: `₦METEO` (`0x235d0Aa81F1c375c3325214f2dd7F205487eae36`)
- **Status**: **Released / Paid Out Directly to Assignee**
- **1. Lock Bounty Tx**: [`0xee9d3d3a0a1eaae45b91045be3cd6892e85681de99ec97a58fcf14812238dbe1`](https://explorer.arc.io/tx/0xee9d3d3a0a1eaae45b91045be3cd6892e85681de99ec97a58fcf14812238dbe1)
- **2. Assign Agent Tx**: [`0xd9dd28753be86a0db0878d589b0bc9d452a95efbed19ad4b06b54717c928ae5e`](https://explorer.arc.io/tx/0xd9dd28753be86a0db0878d589b0bc9d452a95efbed19ad4b06b54717c928ae5e)
- **3. Submit Deliverable Tx**: [`0x36acca6415c7894a538f4e5220fb11b56bf73875025095bd41f8d8dbcfef600b`](https://explorer.arc.io/tx/0x36acca6415c7894a538f4e5220fb11b56bf73875025095bd41f8d8dbcfef600b)
- **4. Release Bounty Payout Tx**: [`0xc67ac0d1d1700ace7260140082e3cdc70760520490b77cd4197a53d0bf6b5b5c`](https://explorer.arc.io/tx/0xc67ac0d1d1700ace7260140082e3cdc70760520490b77cd4197a53d0bf6b5b5c) (Block `28385406`)

#### Task 3: "Supply DeFi TVL & Protocol Liquidity Rankings for Arc Agents"
- **Task ID**: `0x246c1ab416ac3bc70c2d17009e22cf9404e7ef1e26235e03aee1f143bd170f86`
- **Reward**: `0.00001 USDC` (Locked into Escrow)
- **Assignee**: Open Bounty (Available for any verified worker or AI agent)
- **Status**: **Open / Active in Escrow Contract**
- **1. Lock Bounty Tx**: [`0xf5b31d1beb70d2bb97f7345d46729174bdb389ce36242eea2f61587be40a867c`](https://explorer.arc.io/tx/0xf5b31d1beb70d2bb97f7345d46729174bdb389ce36242eea2f61587be40a867c) (Block `28385409`)

---

## 4. The Three Core Hackathon Use Cases Delivered

| Use Case | How It Works on Arc Mainnet | Verifiable Evidence |
|---|---|---|
| **1. Claim a Tag & Get a USDC-Receiving Address** | User claims a handle (`₦TAG`). Contract writes to `NairaTagRegistry` (`0xb3a2...17b3`) and binds the address on `NairaTagResolver` (`0xf46d...64f3`). Profile displays a permanent USDC address with instant copy button and QR code. | Every claimed tag generates an ArcScan transaction link. Verified on-chain across 5 sovereign agents. |
| **2. Send USDC to Another Tag Through Contract** | Sender enters recipient handle (`@bloom`). The app resolves it on-chain and routes USDC through the Arc Memo Precompile (`0x5294...e505`), attaching cryptographically logged tag memos with sub-cent gas paid natively in USDC. | Live transactions `0x0574...`, `0xe688...`, `0xccd2...`, `0x743e...` moving real USDC on ArcScan. |
| **3. Complete Tasks & Get Paid via On-Chain Escrow** | Creators lock real USDC into `NairaTagBountyEscrow` (`0x69f1...99ab`). Assignees record cryptographic deliverable hashes. Release transfers USDC directly from the escrow contract to the worker. | Verified lifecycle on ArcScan (`0x936d...` locked -> `0x05c4...` released to `₦bloom`; `0xee9d...` locked -> `0xc67a...` released to `₦meteo`). |

---

## 5. Circle Agent Ecosystem Integration

- **Circle Agent Readiness Score**: **37 / 100** (Top quartile of registered origin-hosted agents)
- **Discovery & Structure**: **30 / 30 (100% Perfect Score)**
- **Public OpenAPI 3.1 Spec**: [https://arc.nairatag.ng/openapi.json](https://arc.nairatag.ng/openapi.json)
- **ERC-8004 Identity Standard**: Identity, reputation, and validation registry schemas integrated into agent records.

---

## 6. Submission Links & Resources

- **Production App**: [https://arc.nairatag.ng](https://arc.nairatag.ng)
- **Production Mirror**: [https://arc-one-sigma.vercel.app](https://arc-one-sigma.vercel.app)
- **GitHub Monorepo**: [https://github.com/MrBloomguy/nairatag-protocol](https://github.com/MrBloomguy/nairatag-protocol)
- **Arc Studio Project**: [https://studio.arc.io](https://studio.arc.io)
- **ArcScan Block Explorer**: [https://explorer.arc.io](https://explorer.arc.io)
- **Lead Builder Profile**: [GitHub: @MrBloomguy](https://github.com/MrBloomguy)
