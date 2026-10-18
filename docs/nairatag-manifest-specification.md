# NTS-102: NairaTag Network Discovery Manifest Specification

**Status**: Proposed / Draft  
**Version**: 1.0.0  
**Authors**: NairaTag Network Core Contributors  
**Date**: September 2026  
**Standards Track**: Standards Track / Ecosystem  
**Companion Specifications**:
* [NTS-100: NairaTag Identity Protocol](./nairatag-identity-specification.md)
* [NTS-101: NairaTag Input & Discovery Architecture](./nairatag-discovery-specification.md)
* [EIP-165: Standard Interface Detection](https://eips.ethereum.org/EIPS/eip-165)
* [EIP-55: Mixed-case Checksum Address Encoding](https://eips.ethereum.org/EIPS/eip-55)

---

## 1. Core Principle: Manifest Discovery ≠ Automatic Ecosystem Adoption

A fundamental axiom governs this specification:

> **Hosted Manifest Discovery ≠ Automatic Ecosystem Adoption**  
> Publishing a machine-readable network manifest simplifies configuration and adapter maintenance for participating clients. However, **wallets, exchanges, DEXs, and block explorers must still explicitly opt in, review, and choose to support the NairaTag naming namespace.** A hosted manifest does not bypass wallet governance, security audits, or native client integration requirements.

The purpose of NTS-102 is to establish a deterministic, verifiable, and secure format for distributing deployment parameters (RPC endpoints, contract addresses, supported capabilities) to participating SDKs, browser extensions, mobile wallets, and dApp middleware without requiring hardcoded updates in third-party client codebases.

---

## 2. Canonical Manifest Schema

Participating clients fetch the discovery manifest from a trusted origin (or read from bundled static defaults). The manifest MUST strictly conform to the following JSON structure:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "protocol": "NTS-100",
  "discoveryVersion": "NTS-102",
  "generatedAt": "2026-09-15T10:00:00Z",
  "validUntil": "2027-09-15T10:00:00Z",
  "namespace": {
    "canonicalPrefix": "₦",
    "unicode": "U+20A6",
    "asciiAlias": "ng:",
    "prohibitedPrefixes": ["@"]
  },
  "network": {
    "name": "NairaTag Layer 2",
    "chainId": 901,
    "layer": 2,
    "settlementChainId": 900,
    "settlementNetwork": "Ethereum L1"
  },
  "resolution": {
    "rpcUrls": [
      "https://rpc.nairatag.org",
      "https://rpc-backup.nairatag.network"
    ],
    "registryAddress": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    "resolverAddress": "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    "paymentRequestAddress": "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"
  },
  "capabilities": [
    "forward-resolution",
    "reverse-resolution",
    "text-records",
    "multicoin-addresses"
  ],
  "supportedCoins": [
    {
      "coinType": 60,
      "symbol": "ETH",
      "name": "Ethereum / Universal EVM"
    },
    {
      "coinType": 8453,
      "symbol": "BASE",
      "name": "Base"
    },
    {
      "coinType": 42161,
      "symbol": "ARB",
      "name": "Arbitrum One"
    },
    {
      "coinType": 137,
      "symbol": "POL",
      "name": "Polygon"
    }
  ],
  "verification": {
    "requiredInterfaces": [
      {
        "contract": "registry",
        "interfaceId": "0x01ffc9a7",
        "name": "ERC-165"
      },
      {
        "contract": "registry",
        "interfaceId": "0x89e02318",
        "name": "INairaTagRegistry"
      },
      {
        "contract": "resolver",
        "interfaceId": "0x3b3b57de",
        "name": "addr(bytes32)"
      },
      {
        "contract": "resolver",
        "interfaceId": "0xf1cb7e06",
        "name": "addr(bytes32,uint256)"
      },
      {
        "contract": "resolver",
        "interfaceId": "0x691f3431",
        "name": "name(bytes32)"
      },
      {
        "contract": "resolver",
        "interfaceId": "0x59314e46",
        "name": "text(bytes32,string)"
      }
    ]
  }
}
```

---

## 3. Strict Security & Validation Constraints

Any client consuming an NTS-102 manifest MUST enforce the following security invariants prior to adopting its configuration:

### 3.1 HTTPS-Only Production Endpoints
* All URLs under `resolution.rpcUrls` and hosted discovery endpoints MUST use the `https://` scheme in production.
* Plain HTTP (`http://`) and insecure transports MUST be rejected by default, unless the client explicitly operates in a declared local development mode (`NODE_ENV=development` or `testnet`).

### 3.2 Prohibited Localhost in Public Metadata
* Production manifests MUST NEVER include `localhost`, `127.0.0.1`, `::1`, or RFC 1918 private network IP blocks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) in `rpcUrls`.
* Any manifest claiming to be a production network descriptor that contains loopback or local subnet endpoints MUST be flagged as invalid and rejected.

### 3.3 EIP-55 Checksum Validation
* All Ethereum-style hex addresses (`registryAddress`, `resolverAddress`, `paymentRequestAddress`) MUST match their EIP-55 mixed-case checksum exactly.
* If `getAddress(registryAddress) !== registryAddress`, the manifest is malformed and MUST be rejected to protect clients against address corruption or typographical tampering.

### 3.4 Transport vs. Trust Axiom
* **RPC Endpoints Are Untrusted Transport**: Clients MUST treat public RPC URLs merely as transport conduits, not cryptographic authorities.
* An RPC node cannot forge state if clients independently verify results. When resolving high-value transfers, clients MAY:
  1. Concurrently query at least two distinct endpoints from `resolution.rpcUrls` and require unanimous state responses.
  2. Query the canonical L1 settlement contract (OptimismPortal / OutputOracle) for block header authenticity if operating in trust-minimized mode.

### 3.5 On-Chain Contract Verification Rule
Before executing resolution against addresses specified in a manifest, the client MUST perform an on-chain sanity check:
1. **Chain ID Match**: Call `eth_chainId` on the selected RPC endpoint; the response MUST strictly equal `network.chainId` (e.g. `901`).
2. **ERC-165 Interface Detection**: Call `supportsInterface(0x89e02318)` on `registryAddress`. It MUST return `true`.
3. **Resolver Binding Check**: Call `registry.resolver(namehash("nairatag.reverse"))` on `registryAddress`. The returned address MUST match `resolution.resolverAddress`.

If any check fails, the manifest parameters MUST be discarded, and the client MUST fallback to bundled static defaults.

---

## 4. Manifest Authenticity & Origin Rules

### 4.1 Canonical Distribution Sources
A proposed NairaTag discovery manifest is published at:
* Primary URI: `https://discovery.nairatag.org/.well-known/nairatag.json`
* Static Fallback: Bundled within `@nairatag/viem` and `@nairatag/wagmi` npm packages.

### 4.2 Handling Conflicting Manifests
If a client encounters competing manifests (e.g., from a DNS hijack or divergent network forks):
1. **Origin Verification**: Manifests are only valid if served from the officially pinned domain (`*.nairatag.org` or `*.nairatag.network`) via a trusted TLS certificate.
2. **Chain ID Invariance**: A manifest cannot alter the canonical Chain ID (`901`).
3. **Bundled Fallback Precedence**: In the event of network unreachability or conflicting responses, client libraries MUST default to their hardcoded, audited package constants rather than untrusted remote manifests.

---

## 5. Schema Versioning & Deprecation Policy

1. **Semantic Versioning**: The `discoveryVersion` field follows `NTS-10X` conventions:
   * **Patch / Non-breaking**: Addition of optional fields, new supported coin types, or backup RPC URLs.
   * **Major / Breaking**: Changes to address fields, hashing algorithms, or namespace prefixes require an updated NTS specification number (e.g., `NTS-103`).
2. **Deprecation Grace Period**: If a resolver contract is upgraded:
   * The manifest MUST include both active and deprecated resolver addresses during a declared transition period of no less than 90 days.
   * Deprecated resolvers MUST continue forward-resolution compatibility for existing handles.
3. **Client Cache-Control**:
   * Discovery endpoints SHOULD serve `Cache-Control: public, max-age=3600, stale-while-revalidate=86400` to prevent stale pinning while avoiding excessive endpoint traffic.

---

## 6. Summary: What NTS-102 Accomplishes

| Goal | Mechanism |
| :--- | :--- |
| **Zero-Config SDK Setup** | SDKs pull canonical RPCs and contract addresses automatically |
| **Sanity & Typo Protection** | EIP-55 checksumming and ERC-165 on-chain verification |
| **Multi-RPC Redundancy** | Prioritized `rpcUrls` array with fallback and quorum support |
| **Clear Ecosystem Boundaries** | Explicitly acknowledges that wallet adoption requires opt-in |
