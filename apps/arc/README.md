# NairaTag Pay • Arc Mini-App

> **"Send USDC to a name, not an address."**  
> A mobile-first Web3 mini-app for sending USDC on Arc using human-readable NairaTag identities.

---

## ⚡ Overview
NairaTag Pay bridges the **NairaTag Identity Protocol** (resolution and identity layer) with **Arc** (payment execution network).

- **Identity Layer**: Reuses the canonical NairaTag registry and resolver without duplicating identity databases or creating an Arc-only namespace.
- **Payment Layer**: Native USDC on **Arc Testnet** (Chain ID `5042002`) with sub-second deterministic settlement.
- **Security**: Strict integer base unit conversions (`parseUnits(amount, 6)`), zero floating-point math, Unicode homoglyph anti-spoofing, and explicit wallet authorization.

---

## 🚀 Quickstart

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_ARC_NETWORK` | Target Arc environment (`testnet` \| `mainnet`) | `testnet` |
| `VITE_ARC_TESTNET_RPC` | Arc Testnet RPC URL | `https://rpc.testnet.arc.io` |
| `VITE_ARC_TESTNET_CHAIN_ID` | Arc Testnet Chain ID | `5042002` |
| `VITE_ARC_TESTNET_USDC` | Canonical USDC ERC-20 address on Arc | `0x3600000000000000000000000000000000000000` |
| `VITE_NAIRATAG_RESOLVER_API` | Canonical identity resolution endpoint | `https://nairatag.ng/api/claims` |

### Circle User-Controlled Wallets

Circle login uses email OTP and creates an Arc Testnet smart-contract wallet through Circle W3S. Configure Circle's User-Controlled Wallets email authentication and SMTP settings in the Circle Console, then set:

| Variable | Where it is used | Description |
| :--- | :--- | :--- |
| `VITE_CIRCLE_APP_ID` | Browser | Public Circle Wallet App ID from the Circle Console configurator |
| `CIRCLE_API_KEY` | Server only | Circle Standard API key used by `/api/circle`; never expose it with a `VITE_` prefix |

For local development, place these in `.env`. For Vercel, add them as project environment variables and redeploy. The Circle API key must be server-side. The Vite dev server provides the same `/api/circle` route locally.

### 3. Run Development Server
```bash
npm run dev
```

### 4. Run Automated Tests
```bash
npm test
```

### 5. Production Build
```bash
npm run build
```

---

## 🛠️ Complete Screen Flows
1. **Home / Send Screen**: Recipient `₦tag` input, USDC amount, quick balance, and Review Payment action.
2. **Wallet Connection**: Connects browser wallets (MetaMask, Rabby, Coinbase, Rainbow) with one-click Arc Testnet auto-switch.
3. **Identity Resolution**: Canonical debounced resolution against NairaTag registry displaying verified onchain badges and resolved destination addresses.
4. **Payment Review**: Clear summary of destination address, recipient tag, amount, estimated Arc gas fee (`< $0.001`), and onchain finality notice.
5. **Wallet Authorization**: Broadcasts transaction directly to Arc via Viem `writeContract`.
6. **Processing**: Tracks transaction submission and awaits Arc deterministic sub-second receipt.
7. **Verified Receipt**: Confirms receipt with explorer link (`https://explorer.testnet.arc.io/tx/{hash}`) and copyable receipt data.
8. **Transaction History**: Real local history of confirmed payments.
9. **Claim / Link Tag**: Allows users to check availability and claim their own tag.
