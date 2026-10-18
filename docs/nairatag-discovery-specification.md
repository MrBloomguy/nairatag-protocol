# NairaTag Discovery & Integration Specification (NTS-101)

**Status**: Proposed / Draft  
**Version**: 1.0.0  
**Authors**: NairaTag Network Core Contributors  
**Date**: September 2026  
**Companion Specification**: [NairaTag Identity Protocol (NTS-100)](./nairatag-identity-specification.md)

---

## Abstract

This specification defines the canonical discovery, classification, and resolution routing mechanisms for the **NairaTag Identity Protocol (NTS-100)** across external Web3 environments (wallets, decentralized exchanges, payment gateways, and block explorers).

While NTS-100 specifies the smart contract interfaces and on-chain state layout, NTS-101 specifies how off-chain and cross-chain software discovers, disambiguates, and resolves `₦` handles without requiring hardcoded contract addresses or forcing the end-user's wallet to switch networks away from their active transaction chain.

---

## 1. Architectural Model

The long-term ecosystem model explicitly decouples name resolution from hardcoded client configuration:

```text
User Input in Wallet / DEX / App
               │
               ▼
       1. Syntactic Classifier
   (Detects ₦ prefix or ng: fallback)
               │
               ▼
     2. Discovery Metadata
  (Fetches canonical RPC & Contracts)
               │
               ▼
   3. NTS-100 Resolver Pipeline
    (Direct eth_call to Chain 901)
               │
               ▼
    4. EIP-55 Checksum Address
               │
               ▼
  5. Transaction Execution
 (On User's Active Chain, e.g. Base, Ethereum, Polygon)
```

### Architectural Axiom
> **Resolution RPC != Transaction RPC**  
> A wallet connected to Ethereum Mainnet (Chain 1), Base (Chain 8453), or Arbitrum (Chain 42161) queries the NairaTag resolution layer on Chain 901 via a lightweight, read-only `eth_call`. The user's active wallet connection, signer, and gas payment remain entirely on their chosen transaction chain.

---

## 2. Syntactic Discovery & Input Classification

Clients parsing recipient inputs MUST evaluate incoming strings against this prioritized classification pipeline:

```text
Input String
     │
     ├── 1. Hex Address: /^0x[a-fA-F0-9]{40}$/
     │      └── Action: Validate EIP-55 checksum; execute native transfer.
     │
     ├── 2. ENS Domain:   /\.(eth|xyz|kred|luxe)$/i
     │      └── Action: Dispatch to Ethereum Mainnet ENS resolver.
     │
     ├── 3. NairaTag:     /^(?:₦|ng:)[a-z0-9_]{3,32}$/i
     │      └── Action: Dispatch to NairaTag Discovery & Resolution pipeline.
     │
     ├── 4. Other TLD:    /\.(sol|lens|crypto|nft|x)$/i
     │      └── Action: Dispatch to respective registry.
     │
     └── 5. Unmatched
            └── Action: Surface "Invalid recipient identifier" error.
```

### 2.1 Canonical Namespace vs. Compatibility Alias
* **Mandatory Canonical Namespace**: The currency prefix **`₦`** (`U+20A6`, UTF-8: `0xE2 0x82 0xA6`) is the **sole canonical identity prefix** for NairaTag (e.g. `₦micheal`). All official references, verified badges, on-chain reverse records, and smart contracts normalize strictly around this prefix.
* **ASCII Compatibility Alias**: The prefix `ng:` (e.g. `ng:micheal`) is strictly an **interoperability/input fallback** for ASCII-constrained environments (e.g., legacy terminal input or non-UTF8 text boxes). It MUST NEVER be treated as a competing canonical namespace. Clients accept `ng:` as input but MUST normalize and display it canonically as `₦`.
* **Prohibited Prefix**: The `@` symbol (e.g. `@micheal`) is **strictly forbidden**. Any handle containing `@` is malformed and MUST be rejected by all parsers and smart contracts.

### 2.2 Normalization Rules
Before dispatching a resolution query, the client MUST normalize the input according to NTS-100:
1. Strip leading `₦` or `ng:`.
2. Convert all ASCII characters to lowercase (`A-Z` → `a-z`).
3. Validate length: between 3 and 32 characters inclusive.
4. Validate character set: `[a-z0-9_]`.
5. Enforce separator rules: No leading underscore, no trailing underscore, no consecutive underscores (`__`).

---

## 3. Canonical Discovery Metadata Schema

To avoid brittle, hardcoded contract addresses in third-party client codebases, NairaTag publishes canonical discovery metadata through standard endpoints.

### 3.1 Metadata JSON Schema
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "name": "NairaTag Discovery Descriptor",
  "version": "1.0.0",
  "protocol": "NTS-100",
  "namespace": {
    "symbol": "₦",
    "unicode": "U+20A6",
    "asciiPrefix": "ng:"
  },
  "network": {
    "name": "NairaTag Layer 2",
    "chainId": 901,
    "layer": 2,
    "settlementChainId": 900,
    "rpcUrls": [
      "https://rpc.nairatag.org",
      "http://127.0.0.1:9545"
    ],
    "blockExplorerUrls": [
      "https://scan.nairatag.org"
    ]
  },
  "contracts": {
    "registry": {
      "address": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
      "standard": "NTS-100 / EIP-137",
      "deployBlock": 0
    },
    "resolver": {
      "address": "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
      "standard": "NTS-100 / EIP-137 / EIP-181 / EIP-2304 / EIP-634",
      "deployBlock": 0
    },
    "paymentRequest": {
      "address": "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
      "standard": "NTS-100",
      "deployBlock": 0
    }
  },
  "namespaces": {
    "reverse": "nairatag.reverse"
  }
}
```

### 3.2 Proposed Discovery Distribution
Clients may discover and verify network configuration through the following sources:
1. **Bundled Client Defaults**: Embedded inside `@nairatag/sdk` or `@nairatag/viem` for instant, offline zero-configuration resolution.
2. **Proposed Discovery Manifest (`/.well-known/nairatag.json`)**: A proposed NairaTag discovery manifest hosted at `https://discovery.nairatag.org/.well-known/nairatag.json` for SDKs, adapters, explorers, and participating wallets. This is a proposed discovery manifest to assist participating clients, not an established universal wallet-discovery standard.
3. **Decentralized Fallback**: Stored in a verified GitHub registry (`nairatag/networks`).

---

## 4. Cross-Chain Resolution & Execution Model

### 4.1 Native Chain Resolution (Same-Chain)
When the user's active wallet connection is on NairaTag Layer 2 (`Chain ID: 901`):
1. Client resolves `₦micheal` via `addr(bytes32)` on `NairaTagResolver`.
2. Returned address is verified with EIP-55 checksumming.
3. Transaction executes directly on Chain 901.

### 4.2 Cross-Chain Resolution (Foreign-Chain Target)
When the user is transacting on a foreign network (e.g. Ethereum Mainnet, Base, Optimism, Polygon):

```text
User on Base (Chain 8453) sends to ₦micheal
                         │
                         ▼
             Query NairaTag Resolution RPC (Chain 901)
                         │
        Does resolver have multicoin record for Base?
        (EIP-2304 addr(node, 8453) / SLIP-0044)
                  /                     \
                YES                      NO
                 │                        │
                 ▼                        ▼
        Use Base Address         Fallback to Default EVM Address
        (addr(node, 8453))       (addr(node) / coinType 60)
                 │                        │
                 └──────────┬─────────────┘
                            │
                            ▼
               Encode EIP-55 Checksum
                            │
                            ▼
          Dispatch Transaction on Base (Chain 8453)
```

1. **Multicoin Record Check (EIP-2304 / SLIP-0044) — Authoritative**:
   - If a destination-specific coin type or chain ID record exists (e.g. Base, Arbitrum, Polygon), that address is authoritative and MUST be prioritized. This guarantees correct routing for smart accounts, contract wallets, or users who maintain separate destination addresses across chains.
2. **Default EVM Address Fallback (EIP-137 / coinType 60)**:
   - If no chain-specific record exists, the primary EVM address `addr(bytes32)` is utilized as an EOA fallback. A primary EVM address may be reused across EVM networks, but chain-specific records are authoritative when the destination asset or network requires them. While the same secp256k1 private key controls the same address across EVM chains for standard Externally Owned Accounts (EOAs), integrations MUST NOT assume contract accounts (Safe, ERC-4337, multi-sigs) are automatically controlled or deployed across all chains.
3. **EIP-55 Checksum Verification & Identity Protections**:
   - The resolved address MUST be encoded into mixed-case checksum format before display or execution. EIP-55 checksumming helps users detect address transcription errors, but it does not itself prevent typos in a NairaTag handle. Handle normalization, registry lookup, and forward/reverse verification provide the identity protections.

---

## 5. Reverse Resolution & Anti-Spoofing Protocol

When displaying an account badge for an address `0x...` in an explorer or wallet header, clients MUST execute the **Mutual Anti-Spoofing Rule**:

```text
1. Compute Reverse Node:
   reverseNamespace = keccak256("nairatag.reverse")
   reverseNode = keccak256(reverseNamespace + rawAddressBytes)

2. Query Resolver for Name:
   claimedHandle = resolver.name(reverseNode)
   If claimedHandle is empty -> Return raw EIP-55 address.

3. Forward Cross-Verification:
   forwardAddress = resolver.addr(namehash(claimedHandle))

4. Assertion:
   If forwardAddress == targetAddress:
       Display: [ ₦handle ✅ ]
   Else:
       Reject claim! Display raw EIP-55 address (Spoofing attempt thwarted).
```

---

## 6. Standards Classification Matrix

To ensure clarity for auditors, wallet developers, and integration teams:

| Capability | Standard / Spec | Status | Role |
| :--- | :--- | :--- | :--- |
| **Handle Grammar (`₦`)** | **NTS-100** | Canonical | Prefix syntax, character constraints, underscore rules |
| **Input Classification** | **NTS-101** | Canonical | Priority routing in wallet input bars |
| **Discovery Schema** | **NTS-101** | Canonical | Decentralized RPC & contract discovery metadata |
| **Primary EVM Resolution** | **EIP-137 / ENSIP-1** | Core Standard | `addr(bytes32)` ABI & selector compatibility |
| **Interface Detection** | **EIP-165** | Core Standard | `supportsInterface(bytes4)` introspection |
| **Reverse Resolution** | **EIP-181 / ENSIP-3** | Core Standard | `name(bytes32)` reverse records |
| **Multicoin Records** | **EIP-2304 / ENSIP-9** | Core Standard | `addr(bytes32,uint256)` cross-chain routing |
| **Text Metadata** | **EIP-634 / ENSIP-5** | Core Standard | `text(bytes32,string)` key-value records |
| **Address Checksumming** | **EIP-55** | Core Standard | Mixed-case address formatting |
| **Coin Identifiers** | **SLIP-0044** | Core Standard | Registered cryptocurrency types |
| **Payment Endpoints** | **NTS-100** | NairaTag-Specific | `paymentEndpoint(bytes32)` P2P / webhook record |
| **Anti-Spoofing Rule** | **NTS-100 / NTS-101** | NairaTag-Specific | Mandatory bidirectional reverse assertion |
| **Chain Prefixes** | **EIP-3770** | Integration-Only | Optional display prefix (e.g. `nairatag:0x...`) |
| **CCIP-Read Gateway** | **EIP-3668** | Future / V2 | Off-chain state verification for legacy ENS clients |

---

## 7. Reference Implementation

Refer to:
* Client SDK: [`sdk/src/index.js`](../sdk/src/index.js)
* Viem Adapter: [`packages/viem/src/index.ts`](../packages/viem/src/index.ts)
* Integration Guide: [`docs/integration-guide.md`](./integration-guide.md)
