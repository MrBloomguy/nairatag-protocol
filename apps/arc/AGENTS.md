# NairaTag on Arc

> Built with Arc Studio — money-powered apps and autonomous agent rails in minutes.

This is the **Arc Studio project memory** — what Arc Studio remembers about building this application, its smart contracts, and on-chain integrations. It helps agents and human builders understand, test, extend, and deploy the project on Arc Mainnet.

---

## 1. What This App Does

**NairaTag on Arc** is a sovereign naming and autonomous payment protocol built on **Arc Network**. It replaces 42-character hex addresses (`0x71C...b1D`) with human-readable and agent-friendly tags (`₦TAG` / `@name`) that settle natively in pure digital dollars (USDC) with sub-second finality (< 1,000ms) and zero gas token friction.

It is purpose-built to deliver the core tracks of the **Arc Microgrants: Built with Arc Studio** program:
1. **Claim a Tag & Get a USDC-Receiving Address**: Users and AI agents claim sovereign tags bound to permanent Arc Mainnet USDC addresses, with instant QR code sharing and ArcScan verification.
2. **Send USDC to Another Tag**: Real native USDC routed through smart contracts with cryptographic tag memo logging (`0x5294...e505`).
3. **Complete Tasks & Get Paid via On-Chain Escrow**: Real USDC locked into and released from `NairaTagBountyEscrow` (`0x69f1...99ab`), settling bounties directly to verified workers and autonomous agents.
4. **Agent-to-Agent Micro-Commerce**: First-party and marketplace AI agents (`₦nairatag`, `₦bloom`, `₦defillama`, `₦meteo`, `₦coingecko`) settling tool calls and bounties programmatically in USDC.

---

## 2. Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Viem 2.x, Lucide Icons, Canvas Confetti
- **Smart Contracts**: Solidity `^0.8.20`, Foundry (`forge build`, `forge test`)
- **Execution Network**: Arc Mainnet (`Chain ID: 5042`)
- **Gas & Settlement Currency**: Native USDC (`0x3600000000000000000000000000000000000000`, 6 decimals on ERC-20, 18 decimals on native gas)
- **Wallets Supported**: Injected browser wallets (MetaMask, Rabby, Opera MiniPay) and Circle User-Controlled Smart Wallets (MPC)
- **Hosting & CI/CD**: Vercel Edge Network (`https://arc.nairatag.ng`)

---

## 3. Verified Smart Contracts on Arc Mainnet (`Chain ID: 5042`)

All contracts are compiled, tested, deployed, and confirmed on Arc Mainnet:

| Contract | Mainnet Address | Deployment Transaction Hash | Block | Explorer |
|---|---|---|---|---|
| **NairaTagRegistry** | `0xb3a2d06ead0a889485a844a63be309c4df4b17b3` | `0x229fa24c198123b7d7a40fbd0085a13a7baa93f41334e876aae1892b5e22e365` | `28004913` | [ArcScan](https://explorer.arc.io/address/0xb3a2d06ead0a889485a844a63be309c4df4b17b3) |
| **NairaTagResolver** | `0xf46dc708be8391090b83fb9a5d54c4a568bd64f3` | `0x1090dbd75d9e2e0a57ee5ad6d205fcf649eaa8df25912c551402074cca119981` | `28004917` | [ArcScan](https://explorer.arc.io/address/0xf46dc708be8391090b83fb9a5d54c4a568bd64f3) |
| **NairaTagBountyEscrow** | `0x69f1af5b02703ad0f9e59892e6bc472b6c5599ab` | `0x250e11feca536de2e68722f82643be4dad3568bccc358d356dbf4b843c820436` | `28377554` | [ArcScan](https://explorer.arc.io/address/0x69f1af5b02703ad0f9e59892e6bc472b6c5599ab) |
| **Arc Memo Precompile** | `0x5294E9927c3306DcBaDb03fe70b92e01cCede505` | Precompiled System Contract | Native | [ArcScan](https://explorer.arc.io/address/0x5294E9927c3306DcBaDb03fe70b92e01cCede505) |

---

## 4. Official In-House Platform Agent: `₦nairatag`

The official flagship agent of the protocol has been permanently claimed and activated on Arc Mainnet:
- **Canonical Tag**: `₦NAIRATAG` (`nairatag`)
- **Node Hash**: `0x44e39f7d0c916fe1be55ac17a3748f3df5fda5be09e7f85b592043c37cce4afb`
- **Owner & Payout Address**: `0x653f773C9062e71A6554b42a9525fcD47fCC1693`
- **Claim Transaction**: [`0x51d9daafb3ad6afd2492bf38ac317314a808c69fd19b2da8e7d384b7fde800b2`](https://explorer.arc.io/tx/0x51d9daafb3ad6afd2492bf38ac317314a808c69fd19b2da8e7d384b7fde800b2)
- **Resolver Address Binding**: [`0x85236ad1bda7e4e818e6f59c3a6a18f50421cff1e68d15786415a664983999e1`](https://explorer.arc.io/tx/0x85236ad1bda7e4e818e6f59c3a6a18f50421cff1e68d15786415a664983999e1)
- **Resolver Metadata Binding**: [`0xa5531ec41d0e4c7411bc67ca416b6d6b86193a533737c0a13c8cb0daffc6ba14`](https://explorer.arc.io/tx/0xa5531ec41d0e4c7411bc67ca416b6d6b86193a533737c0a13c8cb0daffc6ba14)
- **Role**: Master protocol orchestrator. Handles tag resolution, bounty escrow payouts, and cross-agent settlements.

---

## 5. Key Architecture & File Map

- `src/App.jsx` — Core UI, tabs (`Swap`, `Chat`, `Tasks`, `Earn`, `Hub`), wallet connectors, and live state.
- `src/services/arcEscrow.js` — Client integration for `NairaTagBountyEscrow` (`lockBounty`, `assignAgent`, `submitDeliverable`, `releaseBounty`).
- `src/services/arcPayment.js` — Arc Mainnet USDC transfers, fee quotes, and memo precompile execution (`0x5294...e505`).
- `src/services/arcTasks.js` — Task bounty repository, status tracking (`open` -> `assigned` -> `submitted` -> `paid`).
- `src/services/arcAgents.js` — Directory of registered autonomous agents, ERC-8004 identity specs, and tool definitions.
- `src/services/nairatagResolver.js` — Real-time on-chain lookup for tags to EVM addresses via `NairaTagResolver`.
- `contracts/src/NairaTagBountyEscrow.sol` — Solidity escrow contract for locking and releasing USDC bounties.
- `contracts/src/NairaTagRegistry.sol` — Universal namespace registry mapping `bytes32` nodes to owners.
- `contracts/src/NairaTagResolver.sol` — Forward/reverse address and metadata resolver.
- `contracts/arc-mainnet-deployment.json` — Deployment registry recording all contract addresses, deployment hashes, and blocks.

---

## 6. Development & Testing Commands

```bash
# Install dependencies
npm install

# Build frontend
npm run build

# Start local development server
npm run dev

# Run Solidity contract tests (Foundry)
forge test -vvv
```

---

## 7. Live Links

- **Production App**: [https://arc.nairatag.ng](https://arc.nairatag.ng)
- **Production Mirror**: [https://arc-one-sigma.vercel.app](https://arc-one-sigma.vercel.app)
- **GitHub Monorepo**: [https://github.com/MrBloomguy/nairatag-protocol](https://github.com/MrBloomguy/nairatag-protocol)
- **ArcScan Block Explorer**: [https://explorer.arc.io](https://explorer.arc.io)
