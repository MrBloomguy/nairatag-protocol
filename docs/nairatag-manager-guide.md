# NairaTag Manager — Identity Protocol Management & Resolution Guide

## 1. Executive Summary & App Classification

**NairaTag Manager** is a fully functional, ENS-style identity management reference decentralized application (dApp) built for the NairaTag Layer 2 Network (`Chain ID: 901`).

### Protocol Capability Statement
> **Classification: FULLY FUNCTIONAL IDENTITY MANAGEMENT & RESOLUTION DAPP**
> 
> Unlike read-only send-flow demos or simulated mockups, NairaTag Manager performs real on-chain state mutations and reads directly against the deployed `NairaTagRegistry` and `NairaTagResolver` contracts on NairaTag L2 (`http://127.0.0.1:9545`, Chain ID 901).
> - **Claim**: Single-transaction atomic registration and resolver binding.
> - **Manage**: On-chain configuration of primary EVM addresses (EIP-137), profile text records (ENSIP-5), payment endpoint metadata (NTS-100), and reverse records (EIP-181).
> - **Resolve**: Bidirectional resolution with mutual anti-spoofing verification.
> - **Transfer & Release**: Full ERC-173 ownership handover and tag release lifecycles.
> - **Blockscout Indexing**: Live transaction hashes and contract event links to Blockscout Explorer.

---

## 2. Contract Capability Matrix

An audit of the deployed contracts (`NairaTagRegistry.sol` and `NairaTagResolver.sol`) reveals the following feature breakdown:

| Capability | Interface / Standard | Contract | Status | On-Chain Function |
| :--- | :--- | :--- | :--- | :--- |
| **Handle Claim** | NTS-100 | `NairaTagRegistry` | **Supported** | `claim(string tag, address resolver)` |
| **Availability Check** | NTS-100 | `NairaTagRegistry` | **Supported** | `exists(bytes32 node)` |
| **Ownership Query** | ERC-173 / EIP-137 | `NairaTagRegistry` | **Supported** | `owner(bytes32 node)` |
| **Resolver Binding** | EIP-137 | `NairaTagRegistry` | **Supported** | `resolver(bytes32 node)`, `setResolver(...)` |
| **Ownership Transfer** | ERC-173 | `NairaTagRegistry` | **Supported** | `transfer(bytes32 node, address newOwner)` |
| **Tag Release** | NTS-100 | `NairaTagRegistry` | **Supported** | `release(bytes32 node)` |
| **Primary EVM Address** | EIP-137 / ENSIP-1 | `NairaTagResolver` | **Supported** | `addr(bytes32 node)`, `setAddr(bytes32, address)` |
| **Multi-Coin Address** | EIP-2304 / ENSIP-9 | `NairaTagResolver` | **Supported** | `addr(bytes32, uint256)`, `setAddr(bytes32, uint256, bytes)` |
| **Profile Text Records** | EIP-634 / ENSIP-5 | `NairaTagResolver` | **Supported** | `text(bytes32, string)`, `setText(bytes32, string, string)` |
| **Payment Metadata** | NTS-100 | `NairaTagResolver` | **Supported** | `paymentEndpoint(bytes32)`, `setPaymentEndpoint(bytes32, string)` |
| **Reverse Resolution** | EIP-181 / ENSIP-3 | `NairaTagResolver` | **Supported** | `name(bytes32)`, `setName(bytes32, string)`, `setNameForAddr(address, string)` |
| **Interface Detection** | ERC-165 | Both | **Supported** | `supportsInterface(bytes4)` |

### Currently Omitted by Protocol Design
1. **Commit-Reveal Registrar**: Not currently needed on local L2 / devnet because gas priority auctions and MEV frontrunning are absent on sequencer L2.
2. **Subdomain Hierarchy (`subnodes`)**: The current NTS-100 specification treats handles as flat canonical identifiers (`₦handle`). If subdomains (e.g. `pay.₦micheal`) are introduced in Phase 5, registry subnode delegation functions (`setSubnodeOwner`) will be introduced.

---

## 3. Automated Test Matrix Results

The integration test suite (`test/manager-matrix.test.js`) and component suites were executed against live NairaTag L2 Chain 901.

| Test Suite | File | Tests Executed | Passed | Failed | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Manager Integration Matrix** | `test/manager-matrix.test.js` | 29 | 29 | 0 | **100% PASS** |
| **Viem Adapter Suite** | `packages/viem/test/resolver.test.js` | 21 | 21 | 0 | **100% PASS** |
| **SDK Core Suite** | `sdk/test.js` | 19 | 19 | 0 | **100% PASS** |
| **Wagmi React Suite** | `packages/wagmi/test/wagmi.test.js` | 9 | 9 | 0 | **100% PASS** |
| **Foundry Contract Suite** | `contracts/test/*.t.sol` | 11 | 11 | 0 | **100% PASS** |
| **TOTALS** | — | **89** | **89** | **0** | **100% PASS** |

### Key Matrix Invariants Tested:
1. **Canonical Input Classification**: `₦micheal` is classified as canonical NairaTag; `ng:micheal` is permitted as ASCII fallback alias; `@micheal` and unprefixed `micheal` are rejected.
2. **Cross-Chain Axiom**: Resolution RPC queries NairaTag L2 (Chain 901) directly while user transacts on Base (Chain 8453) or Ethereum (Chain 1) without network switching.
3. **NTS-102 Manifest Security**: Enforces HTTPS endpoints, EIP-55 checksummed contract addresses, and strictly prohibits localhost URLs in production manifests.
4. **On-Chain Lifecycle**:
   - Availability checked before claim (`exists(node) == false`).
   - Claim submitted and mined with resolver bound.
   - Duplicate claim rejected with `TagAlreadyClaimed`.
   - Record writes by authorized owner succeed (`setAddr`, `setText`, `setPaymentEndpoint`).
   - Record writes by unauthorized parties revert.
   - Ownership transferred to Account B.
   - Previous owner (Account A) writes immediately revert.
   - Account B releases tag to public; tag becomes available again.

---

## 4. Manual Test Walkthrough with Blockscout

### Prerequisites
1. **NairaTag L2 RPC**: Running on `http://127.0.0.1:9545` (Chain ID: `901`).
2. **Blockscout Explorer**: Running on `http://localhost:4000` (or configured block explorer).
3. **Manager Application**: Open `manager/index.html` in your browser.

### Recommended Step-by-Step Test Sequence

```text
┌──────────────────────────────────────────────────────────┐
│ STEP 1: Connect Account A                                │
│ Select "Account A (0xf39F...)" from header dropdown      │
└────────────────────────────┬─────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────┐
│ STEP 2: Availability & Claim                             │
│ Navigate to "Claim Handle" tab                           │
│ Enter "testuser" -> Displays "₦testuser"                 │
│ Click "Check Availability" -> Green "Available" pill     │
│ Click "Claim ₦handle"                                    │
│ Verify mined receipt, gas used, and tx hash              │
│ Click "View Transaction in Blockscout Explorer"          │
└────────────────────────────┬─────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────┐
│ STEP 3: Configure Resolver Records                       │
│ Navigate to "Manage Records" tab                         │
│ Enter "testuser" -> Authorization: "Authorized Owner ✓"  │
│ Set Primary Address to 0x2222222222222222222222222222... │
│ Click "Update Primary Address"                           │
│ Add Avatar ("ipfs://bafybei...") & Bio ("Fintech dev")   │
│ Click "Save Text Records"                                │
│ Set Payment Endpoint ("https://pay.example.com/test")    │
│ Click "Update Payment Endpoint"                          │
└────────────────────────────┬─────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────┐
│ STEP 4: Set Reverse Identity                             │
│ Click "Set as Primary NairaTag for Wallet"               │
│ Emits ReverseRecordSet on live Chain 901                 │
└────────────────────────────┬─────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────┐
│ STEP 5: Public Resolution & Anti-Spoofing                │
│ Navigate to "Public Resolver" tab                        │
│ Input "₦testuser"                                        │
│ Verify:                                                  │
│ - Forward Target Address: 0x2222...2222                  │
│ - Reverse Record: ₦testuser                              │
│ - Anti-Spoofing Badge: "🛡️ MUTUAL MATCH CONFIRMED ✓"    │
└────────────────────────────┬─────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────┐
│ STEP 6: Ownership Transfer & Unauthorized Check          │
│ In "Manage Records", input Account B address in Transfer │
│ Click "Transfer Ownership"                               │
│ Switch Wallet Mode to "Account B (0x7099...)"            │
│ Verify Account B is now "Authorized Owner ✓"             │
│ Switch back to Account A -> Verify "Read-Only ⚠️"        │
└────────────────────────────┬─────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────┐
│ STEP 7: Tag Release                                      │
│ As Account B, click "Release Handle to Public"           │
│ Go back to "Claim Handle" -> "₦testuser" is available!   │
└──────────────────────────────────────────────────────────┘
```

### Inspecting Blockscout Activity
Navigate to the **Activity & Blockscout** tab in `manager/index.html`:
- Click **Refresh On-Chain Events** to query the past 500 blocks for `TagClaimed`, `AddrChanged`, `TextChanged`, and `Transfer` events.
- Each event row includes a direct deep link to the transaction on Blockscout:
  `http://localhost:4000/tx/0x...`
