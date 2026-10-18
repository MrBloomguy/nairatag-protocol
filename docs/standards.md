# NairaTag Standards Evaluation & Specifications

> [!IMPORTANT]
> The authoritative normative specification for the NairaTag Identity Protocol is located in [NairaTag Identity Protocol Specification (NTS-100)](./nairatag-identity-specification.md).

## Part 1: Canonical Standards Dependencies & Mappings

NairaTag Identity Protocol (NTS-100) selectively adopts battle-tested Ethereum and ENS standards to guarantee interoperability across wallets, exchanges, explorers, and dApps:

### Core Standards Dependencies

| Standard | Role in NairaTag | Canonical Specification |
| :--- | :--- | :--- |
| **EIP-137 / ENSIP-1** | Architecture for Registry, Resolver separation, and `addr(bytes32)` | [EIP-137: Ethereum Domain Name Service](https://eips.ethereum.org/EIPS/eip-137)<br>[ENSIP-1: ENS](https://docs.ens.domains/ensip/1) |
| **EIP-165** | Standard interface introspection via `supportsInterface(bytes4)` | [EIP-165: Standard Interface Detection](https://eips.ethereum.org/EIPS/eip-165) |
| **EIP-181 / ENSIP-3** | Reverse address resolution via `name(bytes32)` | [EIP-181: ENS support for reverse resolution](https://eips.ethereum.org/EIPS/eip-181)<br>[ENSIP-3: Reverse Resolution](https://docs.ens.domains/ensip/3) |
| **EIP-2304 / ENSIP-9** | Multicoin & multi-chain address resolution `addr(bytes32,uint256)` | [EIP-2304: Multichain Address Resolution](https://eips.ethereum.org/EIPS/eip-2304)<br>[ENSIP-9: Multichain Address Resolution](https://docs.ens.domains/ensip/9) |
| **EIP-634 / ENSIP-5** | Text metadata key-value records `text(bytes32,string)` | [EIP-634: Storage of text records in ENS](https://eips.ethereum.org/EIPS/eip-634)<br>[ENSIP-5: Text Records](https://docs.ens.domains/ensip/5) |
| **EIP-55** | Mixed-case checksum address formatting for all resolved EVM addresses | [EIP-55: Mixed-case checksum address encoding](https://eips.ethereum.org/EIPS/eip-55) |
| **SLIP-0044** | Registered cryptocurrency coin types for multicoin resolution | [SLIP-0044: Registered coin types for BIP-0044](https://github.com/satoshilabs/slips/blob/master/slip-0044.md) |

### Optional / Future Standards

| Standard | Status in NairaTag | Canonical Specification |
| :--- | :--- | :--- |
| **EIP-3668 (CCIP Read)** | **Reserved for V2**: Cross-chain resolution gateway (L1, Base, Arbitrum) | [EIP-3668: Secure offchain data retrieval](https://eips.ethereum.org/EIPS/eip-3668) |
| **EIP-3770** | **Integration Standard**: Chain-specific address prefixes (e.g. `nairatag:0x...`) | [EIP-3770: Chain-specific addresses](https://eips.ethereum.org/EIPS/eip-3770) |
| **EIP-1577 / ENSIP-7** | **Optional / Future**: Contenthash storage for decentralized frontends | [EIP-1577: Contenthash field for ENS](https://eips.ethereum.org/EIPS/eip-1577)<br>[ENSIP-7: Contenthash](https://docs.ens.domains/ensip/7) |
| **ERC-1271** | **Supported**: Signature validation for smart contract wallets (Safe, ERC-4337) | [ERC-1271: Standard Signature Validation](https://eips.ethereum.org/EIPS/eip-1271) |

### NairaTag-Specific Protocol Innovations

The following primitives are unique to NairaTag and **not** part of the upstream ENS/EIP standards:
* **NTS-100 Grammar & Normalization**: Stripping of `₦` (`U+20A6`), strict rejection of `@`, ASCII lowercasing, and underscore validation.
* **Registry-Native Architecture**: Direct ownership in `NairaTagRegistry`, explicitly avoiding base-layer ERC-721 tokenization.
* **Forward/Reverse Mutual Anti-Spoofing Rule**: Mandated two-way cross-verification before an address-to-handle claim is verified.
* **`paymentEndpoint(bytes32)`**: Direct payment URI and webhook routing descriptor.

Official ENS Resolver Documentation: [ENS Resolver Interfaces Documentation](https://docs.ens.domains/resolvers/interfaces/).

---

## Part 2: Provisional NairaTag Specifications (NTS)

> [!NOTE]
> These specifications are provisional working drafts and subject to evolution as implementation advances.

### NTS-1: NairaTag Identity Format & Normalization
* **Display Format**: Prefixed with Unicode Naira symbol `₦` (U+20A6), e.g. `₦micheal`.
* **Canonical Machine Format**: UTF-8 alphanumeric lowercase ASCII string without the prefix, e.g. `micheal`.
* **Normalization Rules**:
  1. Strip leading `₦` (U+20A6) or ASCII `N` / `n` prefixes if explicitly used as the currency marker.
  2. Unicode NFKC normalization.
  3. Lowercase conversion (`A-Z` to `a-z`).
  4. Allowed characters: lowercase letters `a-z`, digits `0-9`, and hyphen `-` (hyphen cannot be first or last).
  5. Minimum length: 3 characters; maximum length: 32 characters.
  6. Collision Prevention: `micheal`, `Micheal`, and `MICHEAL` evaluate strictly to the same canonical identifier `micheal`.

### NTS-2: NairaTag Resolution Architecture
* Two-layer separation:
  1. **`NairaTagRegistry`**: Manages tag ownership (`ownerOf`), expiration, and active resolver pointer (`resolverOf`).
  2. **`NairaTagResolver`**: Resolves records for a given tag.
* Standard record types:
  - `EVM Address` (`addr(bytes32 node)` or `addr(bytes32 node, uint256 coinType)`)
  - `Cross-Chain Address` (CAIP-10 compliant text string)
  - `Payment Endpoint` (URI / webhook / P2P endpoint)
  - `Text Metadata` (avatar, email, social verification)

### NTS-3: NairaTag Payment Request
* Encodes dynamic or static payment invoices:
  - Recipient: `₦micheal`
  - Asset: Token address or native ETH (CAIP-19)
  - Amount: Precise atomic units
  - Reference: Unique invoice/order ID
* URI Scheme: `nairatag:₦micheal?amount=50000000000000000&token=0x...&ref=INV-1002`

### NTS-4: Cross-Chain Resolution Gateway
* Utilizes ERC-3668 (CCIP Read) so applications on Ethereum Mainnet, Base, Arbitrum, or Solana can query a gateway that reads from NairaTag Network without keeping redundant state on every chain.

### Official NairaTag Standards (NTS Track)
* **[NTS-100: NairaTag Identity Protocol](./nairatag-identity-specification.md)**: Registry, Resolver, Reverse Resolution, EIP-165, and mutual anti-spoofing verification.
* **[NTS-101: NairaTag Input & Discovery Architecture](./nairatag-discovery-specification.md)**: Canonical `₦` prefix, `ng:` ASCII fallback, resolution RPC vs transaction RPC axiom, and multicoin routing.
* **[NTS-102: NairaTag Network Discovery Manifest](./nairatag-manifest-specification.md)**: Machine-readable discovery manifest, HTTPS-only rules, EIP-55 checksum validation, and ecosystem adoption boundaries.
