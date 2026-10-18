# NairaTag Social Interaction Layer Specification & Manual

## Architecture: Parser → Resolver → Action Engine

NairaTag is an **identity layer**, NOT a payment rail.

```
                      +-----------------------------------+
                      |   NairaTag Social Interaction     |
                      |              Layer                |
                      +-----------------------------------+
                                        |
        +-------------------------------+-------------------------------+
        |                               |                               |
        v                               v                               v
[Browser Extension]             [@NairaTagBot (X)]              [WhatsApp Bot]
• Manifest V3                   • Native mobile fallback         • Chat command handler
• In-timeline Blink card        • User-initiated mentions       • Natural tag detection
• Interactive send/tip          • Deep-link action cards        • NGN Virtual Account & Voucher
        |                               |                               |
        +-------------------------------+-------------------------------+
                                        |
                                        v
                       +----------------------------------+
                       |    Core Protocol SDK Packages    |
                       +----------------------------------+
                       |  @nairatag/parser                |
                       |  @nairatag/resolver              |
                       |  @nairatag/actions               |
                       |  @nairatag/social-adapter        |
                       +----------------------------------+
```

---

## 1. Protocol Packages

### `@nairatag/parser`
- **Location**: `packages/nairatag-parser`
- **Responsibilities**:
  - Currency disambiguation (`₦5,000`, `₦50k`, `₦10m` are fiat figures, NOT identity handles).
  - Normalization: `₦mikki` -> `₦MIKKI`, `mikki` -> `₦MIKKI`.
  - Canonical identifier extraction: `getCanonicalIdentifier('₦MIKKI')` -> `'MIKKI'`.
  - Non-destructive DOM scanning and fragment replacement.

### `@nairatag/resolver`
- **Location**: `packages/nairatag-resolver`
- **Responsibilities**:
  - Resolves sovereign tags to on-chain identities (Chain 901 OP Stack Rollup + Celo Sepolia) and dedicated NGN virtual bank accounts.
  - In-memory TTL cache to prevent redundant RPC and REST lookups.

### `@nairatag/actions`
- **Location**: `packages/nairatag-actions`
- **Responsibilities**:
  - Validates action schemas (`send`, `tip`, `claim`, `request`, `profile`).
  - Generates cross-platform deep links (`https://nairatag.ng/pay?tag=...`).
  - **ActionEngine**: Enforces pre-execution re-resolution to prevent front-running attacks.

### `@nairatag/social-adapter`
- **Location**: `packages/nairatag-social-adapter`
- **Responsibilities**:
  - Universal interface for integrating third-party social networks (Bluesky, Mastodon, Farcaster, Discord).

---

## 2. Supported Platforms

### Client 1: 𝕏 Web Browser Extension
- **Folder**: `extension/`
- **Type**: Manifest V3 Chrome / Brave / Edge extension.
- **Timeline Integration**: Real-time `MutationObserver` on `[data-testid="tweetText"]`.
- **Card UI**: In-timeline interactive Blink-style card with dual-rail badges, quick amount chips, instant tip, and in-timeline payment simulation.

### Client 2: `@NairaTagBot` (𝕏 Mobile Fallback)
- **Folder**: `bots/x-bot/`
- **Invoked via**: Explicit tweet mention (e.g. `@NairaTagBot check ₦MIKKI`).
- **Policy Compliance**: Zero unsolicited tweets, sliding window rate-limiting.
- **Output**: Formatted reply with pre-filled deep links for immediate action.

### Client 3: WhatsApp Bot Service
- **Folder**: `bots/whatsapp-bot/`
- **Invoked via**: WhatsApp Cloud API webhooks (`/whatsapp/webhook`).
- **Commands**:
  - `check ₦TAG`
  - `claim ₦TAG`
  - `send ₦5,000 to ₦TAG`
  - `tip ₦1,000 to ₦TAG`
  - `my voucher`
  - `my account`
  - Natural sentence tag detection (e.g. *"Please send to ₦MIKKI for food"*).

---

## 3. Test Suites

All packages and bots contain isolated test suites using Node.js built-in test runner:

```bash
# Run all unit test suites
node --test packages/nairatag-parser/test/parser.test.js \
            packages/nairatag-resolver/test/resolver.test.js \
            packages/nairatag-actions/test/actions.test.js \
            packages/nairatag-social-adapter/test/adapter.test.js \
            bots/x-bot/test/x-bot.test.js \
            bots/whatsapp-bot/test/whatsapp-bot.test.js

# Result: 27 / 27 passing tests (0 failures)
```
