# NairaTag Bridge Provider Specification & Abstraction

## 1. Provider-Agnostic Philosophy

NairaTag does not hard-code a single proprietary bridge provider into its client applications. Instead, the `@nairatag/sdk` defines a provider-agnostic bridge adapter interface (`NairaTagBridgeAdapter`).

```text
NairaTag Hub / DApps
        │
        ▼
NairaTagBridgeAdapter
        │
  ┌────┴──────────────────────────┬──────────────────────────┬──────────────────────────┐
   ▼                               ▼                          ▼
NativeBridgeAdapter     OPStackBridgeAdapter        Future Adapters
(Chain 901 Native)      (OP Standard Bridge)        (Hyperlane / LI.FI)
```

This guarantees:
1. Applications consume a unified interface regardless of the underlying cross-chain mechanism.
2. New bridge technologies can be added without modifying frontends or core contracts.
3. Unsupported routes are truthfully classified without simulated quotes or balances.

---

## 2. Core Interface (`sdk/src/bridge.js`)

```typescript
interface NairaTagBridge {
  /**
   * Returns chains supported by this adapter.
   */
  getSupportedChains(): Promise<Chain[]>;

  /**
   * Returns supported tokens on a given chain.
   */
  getSupportedTokens(chainId: number): Promise<Token[]>;

  /**
   * Computes real cross-chain fee and estimated received output.
   * Returns null if route is in evaluation (NEVER simulates).
   */
  quote(params: BridgeQuoteParams): Promise<BridgeQuote>;

  /**
   * Initiates the cross-chain deposit transaction.
   */
  initiate(params: BridgeParams): Promise<BridgeTransaction>;

  /**
   * Queries status of an active cross-chain transfer.
   */
  getStatus(transactionId: string): Promise<BridgeStatus>;
}
```

---

## 3. Implemented Adapters

### `NativeBridgeAdapter`
- **Provider Type**: `NATIVE`
- **Supported Chains**: `NairaTag Chain 901` (Chain ID `901`)
- **Status**: `SUPPORTED`
- **Behavior**: Zero-hop execution. Direct swap and payment delivery on Chain 901.

### `OPStackBridgeAdapter`
- **Provider Type**: `ROLLUP_STANDARD`
- **Supported Chains**: `Celo Sepolia` (`11142220`), `Ethereum Sepolia` (`11155111`)
- **Status**: `COMING_SOON` / `TESTNET_EVALUATION`
- **Contract Reference**:
  - `L1StandardBridge`: [`contracts/src/op-contracts/L1StandardBridge.sol`](file:///C:/Users/olusegun/.gemini/antigravity-ide/scratch/nairatag-network/contracts/src/op-contracts/L1StandardBridge.sol)
  - `L1CrossDomainMessenger`: [`contracts/src/op-contracts/L1CrossDomainMessenger.sol`](file:///C:/Users/olusegun/.gemini/antigravity-ide/scratch/nairatag-network/contracts/src/op-contracts/L1CrossDomainMessenger.sol)
  - `L2StandardBridge`: Predeploy `0x4200000000000000000000000000000000000010`
- **Behavior**: Truthfully returns `isReady: false` and `estimatedReceived: null` until the external testnet contracts and relayer are deployed and verified.

### `LiFiBridgeAdapter`
- **Provider Type**: `LIFI`
- **Role**: Quote and prepare a real cross-chain transaction for Wallet MCP approval.
- **Behavior**: Calls the LI.FI quote endpoint, validates the returned transaction request, and returns a Wallet MCP `send_calls` payload. It never signs or broadcasts.
- **Status tracking**: Queries the LI.FI status endpoint after the source transaction hash is confirmed.
- **Tag-to-tag use**: The caller must resolve both tags to explicit source and destination wallet addresses before requesting a quote. A tag string is never passed to LI.FI as an address.
- **Production gate**: Only explicitly enabled chain IDs are exposed; destination tag records and token metadata must be verified before enabling a route in the agent.

---

## 4. Multi-Transaction Tracking State Machine

```javascript
const BridgeSwapStage = {
  NOT_STARTED: 0,
  SOURCE_APPROVAL: 1,      // 1. Source token approval (if required)
  SOURCE_BRIDGE_TX: 2,     // 2. Source chain bridge transaction broadcasted
  BRIDGE_PROCESSING: 3,    // 3. Relayer / cross-chain sequencer attestation
  DESTINATION_RECEIPT: 4,  // 4. Inbound funds received on NairaTag Chain 901
  SWAP_EXECUTING: 5,       // 5. Native AMM swap to target asset (e.g. ASAKE)
  RECIPIENT_TRANSFER: 6,   // 6. Direct settlement to resolved ₦Tag handle
  COMPLETED: 7,
  FAILED: -1
};
```
