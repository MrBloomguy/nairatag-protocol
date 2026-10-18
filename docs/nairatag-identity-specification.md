# NairaTag Identity Protocol Specification (NTS-100)

**Status**: Proposed / Draft  
**Version**: 1.0.0  
**Authors**: NairaTag Network Core Contributors  
**Date**: September 2026  
**Target Runtime**: NairaTag Layer 2 Rollup (`Chain ID: 901`)  

---

## Abstract

This document defines the **NairaTag Identity Protocol**, a sovereign, registry-native decentralized naming and identity protocol deployed on the NairaTag OP Stack Layer 2 network. 

The protocol establishes standard human-readable identifiers formatted with the currency symbol prefix **`₦`** (e.g. `₦micheal`, `₦olusegun`). It provides deterministic name-to-address resolution, multi-chain address mapping, text metadata, and reverse resolution (`address → ₦handle`). 

NairaTag selectively adopts battle-tested interface patterns from Ethereum Improvement Proposals and ENS specifications to ensure direct compatibility with Web3 wallets, block explorers, exchanges, and dApps, while intentionally rejecting hierarchical DNS baggage and mandatory base-layer NFT tokenization.

---

## Standards Dependencies & Normative References

To ensure auditable interoperability and avoid proprietary silos, the NairaTag Identity Protocol explicitly maps every protocol capability to canonical Ethereum standards:

### 1. Core Normative Standards

| Standard | What NairaTag Uses It For | Canonical Specification |
| :--- | :--- | :--- |
| **EIP-137 / ENSIP-1** | ENS Registry architecture & primary EVM resolution `addr(bytes32)` | [EIP-137: Ethereum Domain Name Service](https://eips.ethereum.org/EIPS/eip-137)<br>[ENSIP-1: ENS](https://docs.ens.domains/ensip/1) |
| **EIP-165** | Standard interface detection via `supportsInterface(bytes4)` | [EIP-165: Standard Interface Detection](https://eips.ethereum.org/EIPS/eip-165) |
| **EIP-181 / ENSIP-3** | Reverse address resolution via `name(bytes32)` | [EIP-181: ENS support for reverse resolution](https://eips.ethereum.org/EIPS/eip-181)<br>[ENSIP-3: Reverse Resolution](https://docs.ens.domains/ensip/3) |
| **EIP-2304 / ENSIP-9** | Multichain & multi-coin address resolution `addr(bytes32,uint256)` | [EIP-2304: Multichain Address Resolution](https://eips.ethereum.org/EIPS/eip-2304)<br>[ENSIP-9: Multichain Address Resolution](https://docs.ens.domains/ensip/9) |
| **EIP-634 / ENSIP-5** | Text metadata key-value storage `text(bytes32,string)` | [EIP-634: Storage of text records in ENS](https://eips.ethereum.org/EIPS/eip-634)<br>[ENSIP-5: Text Records](https://docs.ens.domains/ensip/5) |
| **EIP-55** | Mixed-case checksum encoding for all displayed EVM addresses | [EIP-55: Mixed-case checksum address encoding](https://eips.ethereum.org/EIPS/eip-55) |
| **SLIP-0044** | Standard cryptocurrency coin-type identifiers for multicoin resolution | [SLIP-0044: Registered coin types for BIP-0044](https://github.com/satoshilabs/slips/blob/master/slip-0044.md) |

### 2. Optional & Future Standards

| Standard | Status in NairaTag | Canonical Specification |
| :--- | :--- | :--- |
| **EIP-3668 (CCIP Read)** | **Reserved for V2**: Cross-chain resolution gateway (L1, Base, Arbitrum) | [EIP-3668: Secure offchain data retrieval](https://eips.ethereum.org/EIPS/eip-3668) |
| **EIP-3770** | **Integration Standard**: Chain-specific address prefixing (e.g. `nairatag:0x...`) | [EIP-3770: Chain-specific addresses](https://eips.ethereum.org/EIPS/eip-3770) |
| **EIP-1577 / ENSIP-7** | **Optional / Future**: Decentralized content hash storage (`contenthash()`) | [EIP-1577: Contenthash field for ENS](https://eips.ethereum.org/EIPS/eip-1577)<br>[ENSIP-7: Contenthash](https://docs.ens.domains/ensip/7) |
| **ERC-1271** | **Supported**: Signature validation for smart contract wallets (Safe, ERC-4337) | [ERC-1271: Standard Signature Validation](https://eips.ethereum.org/EIPS/eip-1271) |

### 3. NairaTag-Specific Protocol Innovations

The following components are native to the NairaTag Identity Protocol and **not** part of the upstream ENS/EIP standards:
* **NTS-100 Grammar & Normalization**: Deterministic stripping of `₦` (`U+20A6`), strict rejection of `@`, ASCII lowercasing, and underscore validation.
* **Registry-Native Architecture**: Handles are identity records managed directly within `NairaTagRegistry`, deliberately avoiding base-layer ERC-721 tokenization.
* **Forward/Reverse Mutual Anti-Spoofing Rule**: Mandated two-way verification before an address-to-handle claim is accepted by client applications.
* **`paymentEndpoint(bytes32)`**: A NairaTag-specific resolver record for direct P2P endpoints, fiat gateways, or invoice webhooks.

Canonical reference for resolver interface IDs and selector definitions: [ENS Resolver Interfaces Documentation](https://docs.ens.domains/resolvers/interfaces/).

---

## 1. NairaTag Naming Rules & Normalization

### 1.1 Human-Facing Display Format
* **Prefix**: Every NairaTag identifier MUST begin with the Unicode Naira symbol:
  * Symbol: `₦`
  * Unicode Code Point: `U+20A6`
  * UTF-8 Byte Sequence: `0xE2 0x82 0xA6`
* **Prohibition of `@`**: The `@` symbol (e.g., `@micheal`) is **strictly forbidden**. Any handle containing `@` is malformed and MUST be rejected by all parsers and smart contracts.

### 1.2 Canonical Machine Format
* The canonical machine identifier is the normalized label **without** the `₦` prefix.
* Example: Display handle `₦micheal` has the canonical label `micheal`.

### 1.3 Character Set Constraints
A valid canonical label MUST satisfy all of the following rules:
1. **Length**: Minimum 3 characters, maximum 32 characters (`3 <= length <= 32`).
2. **Allowed Characters**:
   * Lowercase ASCII letters: `a`–`z` (`0x61`–`0x7A`)
   * ASCII digits: `0`–`9` (`0x30`–`0x39`)
   * Separator: Underscore `_` (`0x5F`)
3. **Separator Rules**:
   * An underscore `_` CANNOT be the first character.
   * An underscore `_` CANNOT be the last character.
   * Consecutive underscores (`__`) are strictly forbidden.
4. **Homoglyph & Unicode Security**:
   * Non-ASCII Unicode characters (outside the leading `₦` prefix) are rejected.
   * Zero-width characters (`U+200B`, `U+FEFF`), invisible spaces, emojis, and lookalike Cyrillic/Greek alphabets are prohibited to prevent phishing and spoofing attacks.

### 1.4 Normalization Pipeline
Clients and smart contracts MUST execute the following deterministic normalization procedure on any input string before computing node identifiers:

```text
Raw Input: "  ₦Micheal_Pay  "
      │
      ▼ [1. Trim whitespace]
"₦Micheal_Pay"
      │
      ▼ [2. Verify & strip '₦' prefix]
"Micheal_Pay"
      │
      ▼ [3. Unicode NFKC & ASCII lowercasing]
"micheal_pay"
      │
      ▼ [4. Validate character set [a-z0-9_] & length 3..32]
Valid Canonical Label: "micheal_pay"
      │
      ▼ [5. Compute node hash: keccak256("micheal_pay")]
0x... (32-byte Node ID)
```

---

## 2. Architecture & Registry Interface (`INairaTagRegistry`)

### 2.1 Registry-Native vs. NFT-Backed Identity
NairaTag adopts a **Registry-Native Identity Architecture** (Option A). Handles are stored as protocol-native identity records directly inside the registry:

```text
       Display Handle: ₦micheal
                 │
                 ▼
     Canonical Label: micheal
                 │
                 ▼ keccak256(canonical)
             Node Hash
                 │
                 ▼
       NairaTagRegistry
    ┌─────────────────────────┐
    │ owner:    0x123...      │
    │ resolver: 0x456...      │
    │ created:  1789433000    │
    └─────────────────────────┘
```

**Design Rationale**:
* **Identity-First**: A handle is an addressable identity and payment endpoint, not a speculative trading card.
* **Low Overhead**: Zero ERC-721 minting/transfer gas overhead on core claims.
* **Extensibility**: An optional ERC-721 or ERC-1155 wrapper contract can be deployed as an auxiliary adapter in the future for users wishing to tokenize their handles on secondary marketplaces, without polluting the core identity registry.

### 2.2 Solidity Interface: `INairaTagRegistry`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

interface INairaTagRegistry is IERC165 {
    struct Record {
        address owner;
        address resolver;
        uint64 registeredAt;
        string canonical;
    }

    // Events
    event TagClaimed(bytes32 indexed node, string indexed canonical, address indexed owner, address resolver);
    event Transfer(bytes32 indexed node, address indexed newOwner);
    event NewResolver(bytes32 indexed node, address indexed resolver);
    event TagReleased(bytes32 indexed node, string indexed canonical, address indexed previousOwner);

    // Custom Errors
    error TagAlreadyClaimed(bytes32 node);
    error TagDoesNotExist(bytes32 node);
    error Unauthorized();
    error InvalidOwner();
    error InvalidTagLength(uint256 length);
    error InvalidTagCharacter(bytes1 char);

    // Core Read Functions
    function owner(bytes32 node) external view returns (address);
    function resolver(bytes32 node) external view returns (address);
    function exists(bytes32 node) external view returns (bool);
    function getRecord(bytes32 node) external view returns (Record memory);

    // Core Write Functions
    function claim(string calldata rawTag, address targetResolver) external returns (bytes32 node);
    function transfer(bytes32 node, address newOwner) external;
    function setResolver(bytes32 node, address newResolver) external;
    function release(bytes32 node) external;

    // Convenience Resolution
    function resolve(string calldata rawTag) external view returns (address);
}
```

---

## 3. Resolver Architecture & Interface (`INairaTagResolver`)

### 3.1 Separation of Responsibilities
* **`NairaTagRegistry`** answers: *Who owns this handle, and which resolver contract holds its data?*
* **`NairaTagResolver`** answers: *What is the EVM address, cross-chain address, payment endpoint, and text metadata for this handle?*

### 3.2 Standard Resolver Records
1. **Primary EVM Address (`addr(bytes32 node)`)**: Standard [EIP-137](https://eips.ethereum.org/EIPS/eip-137) / [ENSIP-1](https://docs.ens.domains/ensip/1) signature returning `address payable`.
2. **Multi-Chain Address (`addr(bytes32 node, uint256 coinType)`)**: [EIP-2304](https://eips.ethereum.org/EIPS/eip-2304) / [ENSIP-9](https://docs.ens.domains/ensip/9) multicoin format via [SLIP-0044](https://github.com/satoshilabs/slips/blob/master/slip-0044.md) (e.g., Bitcoin = 0, Ethereum = 60, Solana = 501).
3. **Reverse Name (`name(bytes32 node)`)**: [EIP-181](https://eips.ethereum.org/EIPS/eip-181) / [ENSIP-3](https://docs.ens.domains/ensip/3) record mapping an address reverse node to its canonical handle string.
4. **Text Records (`text(bytes32 node, string key)`)**: [EIP-634](https://eips.ethereum.org/EIPS/eip-634) / [ENSIP-5](https://docs.ens.domains/ensip/5) key-value metadata strings (e.g., `avatar`, `email`, `url`, `com.twitter`, `com.github`, `description`).
5. **Payment Endpoint (`paymentEndpoint(bytes32 node)`)**: NairaTag-native direct webhook, QR URI, or payment routing descriptor.

> [!NOTE]
> **`paymentEndpoint(bytes32)` is a NairaTag-specific protocol innovation.** It is not part of the upstream ENS or Ethereum EIP specifications. It provides an optimized, native entry point for African payments, P2P invoicing, and fiat ramp webhooks.

### 3.3 Solidity Interface: `INairaTagResolver`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

interface INairaTagResolver is IERC165 {
    // Events
    event AddrChanged(bytes32 indexed node, address a);
    event AddressChanged(bytes32 indexed node, uint256 coinType, bytes newAddress);
    event NameChanged(bytes32 indexed node, string name);
    event TextChanged(bytes32 indexed node, string indexed indexedKey, string key, string value);
    event PaymentEndpointChanged(bytes32 indexed node, string endpoint);

    // EVM Address Resolution (ENSIP-1 / EIP-137)
    function addr(bytes32 node) external view returns (address payable);
    function setAddr(bytes32 node, address a) external;

    // Multi-Coin Address Resolution (ENSIP-9)
    function addr(bytes32 node, uint256 coinType) external view returns (bytes memory);
    function setAddr(bytes32 node, uint256 coinType, bytes calldata a) external;

    // Reverse Resolution (ENSIP-3)
    function name(bytes32 node) external view returns (string memory);
    function setName(bytes32 node, string calldata newName) external;

    // Text Records (ENSIP-5)
    function text(bytes32 node, string calldata key) external view returns (string memory);
    function setText(bytes32 node, string calldata key, string calldata value) external;

    // NairaTag Payment Endpoint
    function paymentEndpoint(bytes32 node) external view returns (string memory);
    function setPaymentEndpoint(bytes32 node, string calldata endpoint) external;
}
```

---

## 4. Standard Interface IDs (ERC-165)

Both the Registry and Resolver MUST implement **ERC-165** (`supportsInterface(bytes4 interfaceId)`).

### 4.1 Interface Identifier Derivation Table

| Interface | Specification | Function Selectors Included | 4-Byte Interface ID |
| :--- | :--- | :--- | :--- |
| **`IERC165`** | ERC-165 | `supportsInterface(bytes4)` (`0x01ffc9a7`) | `0x01ffc9a7` |
| **`IAddrResolver`** | ENSIP-1 | `addr(bytes32)` (`0x3b3b57de`) | `0x3b3b57de` |
| **`IMulticoinResolver`**| ENSIP-9 | `addr(bytes32,uint256)` (`0xf1cb7e06`) | `0xf1cb7e06` |
| **`INameResolver`** | ENSIP-3 | `name(bytes32)` (`0x691f3431`) | `0x691f3431` |
| **`ITextResolver`** | ENSIP-5 | `text(bytes32,string)` (`0x59d1d43c`) | `0x59d1d43c` |
| **`INairaTagRegistry`** | NTS-100 | Registry methods XOR sum | `0x8f31b2e1` |
| **`INairaTagResolver`** | NTS-100 | Combined resolver methods XOR sum | `0x7b2354c4` |

---

## 5. ENS Compatibility Decisions

To maximize integration across the broader Web3 ecosystem while maintaining identity sovereignty, NairaTag establishes clear compatibility boundaries:

### 5.1 What NairaTag Adopts
1. **Selector-Level Compatibility**: Standard resolver getters (`addr(bytes32)`, `addr(bytes32,uint256)`, `name(bytes32)`, `text(bytes32,string)`) match canonical ENS selectors. Any existing wallet or tool expecting an ENS resolver can execute calls against `NairaTagResolver` without ABI modification.
2. **ERC-165 Interface Detection**: Standard interface querying guarantees automated discovery.
3. **Two-Phase Registry/Resolver Separation**: Complete isolation of ownership logic from metadata logic.
4. **SLIP-0044 Multi-Coin Standards**: Standardized coin types for cross-chain addressing.

### 5.2 What NairaTag Explicitly Rejects
1. **Hierarchical DNS Dot-Syntax (`.eth`, `.xyz`)**: NairaTag is a single-level flat namespace. Handles are prefixes (`₦handle`), not DNS subdomains.
2. **Mandatory Base-Layer NFT Minting**: Eliminates transfer friction, unwanted royalties, and speculative domain squatting on core identity primitives.
3. **Auction Registrars & Commit-Reveal Schemes**: Registration on NairaTag L2 is instant, final, and takes 2 seconds (1 block), rendering commit-reveal anti-frontrunning schemes unnecessary on local/sovereign sequencing.

### 5.3 Tooling Interoperability Guide
* **`viem` / `ethers.js`**:
  ```typescript
  // Direct resolution using standard contract call
  const node = keccak256(toUtf8Bytes("micheal"));
  const resolverAddress = await registryContract.read.resolver([node]);
  const resolvedAddress = await resolverContract.read.addr([node]);
  ```
* **Blockscout Explorer**:
  Blockscout indexes `AddrChanged` and `NameChanged` events, automatically rendering `₦micheal` badges next to addresses.

---

## 6. EIP-3668 / CCIP-Read Strategy

### 6.1 Version 1 Scope (Current)
* **Status**: **Fully On-Chain (L2 Native)**.
* Resolution of NairaTag handles occurs strictly on-chain on NairaTag Layer 2 (`Chain ID: 901`).
* With 2-second block times and minimal gas costs, all read and write queries are executed directly against L2 EVM RPC nodes.

### 6.2 Version 2 Scope (Cross-Chain Gateway)
* **Status**: **Future Extension**.
* When applications on external chains (Ethereum L1, Base, Arbitrum, Solana) need to resolve `₦handles`, an **EIP-3668 CCIP-Read** gateway server will expose an authenticated off-chain resolution endpoint that serves Merkle proofs of NairaTag L2 state to the foreign chain's resolver.

---

## 7. Reverse Resolution (`address → ₦handle`)

Reverse resolution allows applications to look up the primary `₦handle` for an Ethereum address.

### 7.1 Reverse Node Derivation
Reverse records are stored in the canonical `NairaTagResolver` under a deterministic reverse node hash:

$$\text{REVERSE\_NAMESPACE} = \text{keccak256}("nairatag.reverse") = \mathtt{0x11df080ac2434bfc6a41d7d54fdf1d3347cecce959d86d43a9b12ef7364dc224}$$

$$\text{reverseNode}(\text{addr}) = \text{keccak256}(\text{abi.encodePacked}(\text{REVERSE\_NAMESPACE}, \text{addr}))$$

### 7.2 Mutual Verification (Anti-Spoofing Rule)
To prevent malicious addresses from falsely claiming association with a prestigious `₦handle`, clients and dApps **MUST** enforce forward-reverse mutual verification:

```text
Step 1: Reverse Lookup
        Query: resolver.name(reverseNode(0xABC...))
        Result: "₦micheal"

Step 2: Forward Verification
        Compute: node = keccak256("micheal")
        Query: registry.resolve("₦micheal")
        Result: 0xABC...

Step 3: Assertion
        if (forwardAddress == queriedAddress) {
            Display: "₦micheal" (Verified ✅)
        } else {
            Reject / Fallback to truncated address (Unverified ❌)
        }
```

---

## 8. Client SDK Specification (`@nairatag/sdk`)

A lightweight, zero-dependency TypeScript library MUST provide standard resolution functions.

### 8.1 EIP-55 Address Checksumming Requirement
All EVM addresses returned by `@nairatag/sdk` (e.g. from `resolve()` or `addr()`) **MUST** be formatted using [EIP-55: Mixed-case checksum address encoding](https://eips.ethereum.org/EIPS/eip-55). Raw lowercase addresses (e.g. `0x1111111111111111111111111111111111111111`) are considered unformatted and MUST NOT be presented to end users.

### 8.2 Client API Interface

```typescript
export interface NairaTagClientConfig {
  rpcUrl: string;
  registryAddress: `0x${string}`;
}

export class NairaTagClient {
  constructor(config: NairaTagClientConfig);

  /** Validates and normalizes raw input according to NTS-100 */
  normalize(rawTag: string): string;

  /** Computes the 32-byte node hash */
  namehash(rawTag: string): `0x${string}`;

  /** Encodes an address in EIP-55 mixed-case checksum format */
  toChecksumAddress(address: string): `0x${string}`;

  /** Resolves a handle to an EIP-55 checksummed EVM address */
  resolve(rawTag: string): Promise<`0x${string}` | null>;

  /** Resolves an address to its mutually verified primary NairaTag handle */
  lookupAddress(address: `0x${string}`): Promise<string | null>;

  /** Retrieves multi-coin address by SLIP-0044 coin type */
  getCoinAddress(rawTag: string, coinType: number): Promise<string | null>;

  /** Retrieves metadata text record (avatar, email, url, etc.) */
  getText(rawTag: string, key: string): Promise<string | null>;

  /** Retrieves NairaTag-specific payment endpoint */
  getPaymentEndpoint(rawTag: string): Promise<string | null>;
}
```

---

## 9. Application Integration Guidelines

### 9.1 Wallet Send Flow
1. User types `₦` in the recipient field.
2. The wallet triggers client-side validation (`length >= 3`).
3. As user types `₦micheal`, debounced RPC query calls `registry.resolve("₦micheal")`.
4. If found, UI renders a verified checkmark and shows the checksummed address: `0x123... (₦micheal)`.
5. If not found, UI warns: *"Handle ₦micheal is not registered."*

### 9.2 Payment Request URI (EIP-681 Extension)
Payment invoices encode the recipient handle:
```text
nairatag:₦micheal?amount=50000000000000000&token=0x...&ref=INV-2026-001
```

---

## 10. Security & Ownership Model

1. **Owner Authority**: Only the address recorded as `owner` in `NairaTagRegistry` may:
   * Reassign ownership via `transfer(node, newOwner)`.
   * Change the active resolver via `setResolver(node, newResolver)`.
   * Modify records in the canonical `NairaTagResolver`.
2. **Smart Contract Wallets (ERC-1271)**: When an owner is a contract (e.g. Safe, ERC-4337 account), off-chain signatures authorizing record updates MUST be validated via `IERC1271.isValidSignature`.
3. **Re-entrancy Guarding**: All state changes in Registry and Resolver follow the Checks-Effects-Interactions pattern.

---

## 11. Events and Indexer Schema

Subgraphs and indexing nodes index the following event streams:

```graphql
type Tag @entity {
  id: ID! # 32-byte node hex
  canonical: String!
  display: String!
  owner: Bytes!
  resolver: Bytes!
  registeredAt: BigInt!
  resolvedAddress: Bytes
  avatar: String
  paymentEndpoint: String
}

type Account @entity {
  id: ID! # Ethereum address hex
  primaryTag: Tag
  ownedTags: [Tag!]! @derivedFrom(field: "owner")
}
```

---

## 12. Normative Test Vectors

The following test vectors MUST be used to validate compliant implementations across all languages:

| Raw Input | Expected Valid? | Canonical Label | Computed Node Hash (`bytes32`) | Error Code (if invalid) |
| :--- | :---: | :--- | :--- | :--- |
| `₦micheal` | **YES** | `micheal` | `0x643dbd58af0b489c995d96b0539c960ce6cbca0add0c6a046f919f2d4cff8dce` | — |
| `₦olusegun` | **YES** | `olusegun` | `0x2615226f9f029b91e71063a0adba23ff2b910e12afdffe849ee9b9bdda0db0dd` | — |
| `₦dev_wallet` | **YES** | `dev_wallet` | `0x2457c65a32a77a57340fe0a47eb7abccd39104b30521e91afdb75e357cef700a` | — |
| `₦MICHEAL` | **YES** | `micheal` | `0x643dbd58af0b489c995d96b0539c960ce6cbca0add0c6a046f919f2d4cff8dce` | Case folded to lowercase |
| `micheal` | **YES** | `micheal` | `0x643dbd58af0b489c995d96b0539c960ce6cbca0add0c6a046f919f2d4cff8dce` | Prefix-optional in input |
| `@micheal` | **NO** | — | — | `InvalidTagCharacter('@')` |
| `₦ab` | **NO** | — | — | `InvalidTagLength(2)` (< 3 chars) |
| `₦_leading` | **NO** | — | — | `InvalidTagCharacter('_')` (leading) |
| `₦trailing_` | **NO** | — | — | `InvalidTagCharacter('_')` (trailing) |
| `₦double__under`| **NO** | — | — | `InvalidTagCharacter('_')` (consecutive)|
| `₦micheal.eth` | **NO** | — | — | `InvalidTagCharacter('.')` |

### Reverse Resolution Test Vector

* **Test Account**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
* **Reverse Namespace Constant**: `0x11df080ac2434bfc6a41d7d54fdf1d3347cecce959d86d43a9b12ef7364dc224`
* **Derived Reverse Node**: `0xe72ae76df44257e3c1ee3a1593bc7d1200974dae5330f74ed9f41b3ec32bab58`
* **Expected `name(node)` Result**: `"₦micheal"`
