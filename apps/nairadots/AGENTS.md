# [App Name]

> Built with Arc Studio - money-powered apps in minutes

This is the **project memory** - what Arc Studio remembers about building this app. It helps future agents (or humans) understand and extend the project.

---

## What This App Does

[Brief description of what the app does and its primary use case]

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS
- Web3: wagmi v2, viem v2, ConnectKit
- Contracts: Solidity 0.8.28 + Foundry. Sources in `contracts/`, unit tests in `contracts/test/*.t.sol`. Build with `bun run contracts:build` (`forge build`), test with `bun run contracts:test` (`forge test`).
- Wallet: injected (MetaMask, etc.)
- Chain: Arc Testnet (Chain ID: 5042002, imported from `viem/chains`)
- Token: USDC (6 decimals) (Address: 0x3600000000000000000000000000000000000000, Chain: Arc Testnet)
- Toasts: Sonner

## Key Files

- `src/App.tsx` - Main application logic
- `src/components/` - UI components
- `src/config.ts` - wagmi config (chains, connectors, transports)

## To Run

```bash
bun install
bun run dev
```

## Deployed Contracts (Arc Testnet, Chain ID 5042002)

| Contract | Address | Explorer |
|---|---|---|
| NairaTagRegistry | `0x034f64b644988406ded382ebabb5c981bd19684a` | [View](https://explorer.testnet.arc.io/address/0x034f64b644988406ded382ebabb5c981bd19684a) |
| NairaTagResolver | `0xaee1af632006a5062accdb74f73930439b76efbf` | [View](https://explorer.testnet.arc.io/address/0xaee1af632006a5062accdb74f73930439b76efbf) |

NairaTagResolver was initialized with NairaTagRegistry at `0x034f64b644988406ded382ebabb5c981bd19684a` (immutable constructor arg).

### Security Fixes Applied Before Deploy
- **setNameForAddr reverse-record hijacking**: Restricted to `msg.sender == account` only; removed third-party reverse-record write path.
- **setNameForAddr unverified primary tag**: Added check that `account` actually owns `primaryTag` in the registry before storing.
- **code.length EOA classifier**: Removed `code.length == 0` guards; one-tag-per-user policy now enforced unconditionally for all callers.
