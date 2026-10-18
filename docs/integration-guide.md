# NairaTag Identity Integration Guide

This guide provides normative instructions and code snippets for integrating the **NairaTag Identity Protocol (NTS-100)** into Web3 wallets, DEXs, payment applications, and block explorers.

---

## Standards Alignment

All NairaTag interfaces adhere to canonical Ethereum and ENS specifications:
* **EIP-137 / ENSIP-1**: Architecture & [`addr(bytes32)`](https://eips.ethereum.org/EIPS/eip-137) ([ENSIP-1](https://docs.ens.domains/ensip/1))
* **EIP-165**: Interface detection via [`supportsInterface(bytes4)`](https://eips.ethereum.org/EIPS/eip-165)
* **EIP-181 / ENSIP-3**: Reverse address lookup via [`name(bytes32)`](https://eips.ethereum.org/EIPS/eip-181) ([ENSIP-3](https://docs.ens.domains/ensip/3))
* **EIP-2304 / ENSIP-9**: Multichain resolution via [`addr(bytes32,uint256)`](https://eips.ethereum.org/EIPS/eip-2304) ([ENSIP-9](https://docs.ens.domains/ensip/9))
* **EIP-634 / ENSIP-5**: Text records via [`text(bytes32,string)`](https://eips.ethereum.org/EIPS/eip-634) ([ENSIP-5](https://docs.ens.domains/ensip/5))
* **EIP-55**: Checksummed address encoding for all displayed EVM addresses ([EIP-55](https://eips.ethereum.org/EIPS/eip-55))
* **SLIP-0044**: Registered coin types for multicoin resolution ([SLIP-0044](https://github.com/satoshilabs/slips/blob/master/slip-0044.md))
* **NairaTag Innovations**: `paymentEndpoint(bytes32)` is a native NairaTag protocol feature, not an ENS standard. Resolver details: [ENS Resolver Interfaces Documentation](https://docs.ens.domains/resolvers/interfaces/).

---

## 1. Quick Start with `@nairatag/sdk`

The official zero-dependency client SDK handles normalization, EIP-55 address checksumming, node hashing, and mutual reverse resolution.

### Installation
```bash
npm install @nairatag/sdk
```

### Initializing the Client
```javascript
const { NairaTagClient } = require('@nairatag/sdk');

const nairatag = new NairaTagClient({
  rpcUrl: 'http://127.0.0.1:9545', // NairaTag L2 RPC
  registryAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  resolverAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'
});
```

---

## 2. Viem Adapter Integration (`@nairatag/viem`)

For modern Web3 frontends, DEXs, and wallets built on Viem:

### Installation
```bash
npm install @nairatag/viem viem
```

### Initializing the Viem Resolver
```typescript
import { createNairaTagResolver, classifyRecipientInput } from '@nairatag/viem';

// Resolution RPC != Transaction RPC
// You can use this resolver while the user is connected to Ethereum, Base, Arbitrum, etc.
const nairatag = createNairaTagResolver({
  rpcUrl: 'http://127.0.0.1:9545', // or 'https://rpc.nairatag.org'
});

// 1. Syntactic classification
const kind = classifyRecipientInput('₦micheal'); // 'nairatag'

// 2. Forward resolution (always returns EIP-55 checksummed address)
const address = await nairatag.resolveName('₦micheal');
// '0x1111111111111111111111111111111111111111'

// 3. Reverse lookup with automatic bidirectional anti-spoofing verification
const handle = await nairatag.lookupAddress('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
// '₦nairatag'
```

---

## 3. Wallet Integration Specification

### 3.1 Forward Resolution in Send Flows
When a user types into the recipient input of a wallet (e.g., MetaMask, Rainbow, Safe), the input should detect `₦` handles and resolve them dynamically:

```javascript
async function handleRecipientInput(userInput) {
  // Check if input looks like a NairaTag
  if (userInput.startsWith('₦') || !userInput.startsWith('0x')) {
    try {
      const resolvedAddress = await nairatag.resolve(userInput);
      if (resolvedAddress) {
        // Render verified green pill with EIP-55 checksummed address
        return {
          valid: true,
          display: userInput,
          address: resolvedAddress // e.g. "0x1111111111111111111111111111111111111111"
        };
      }
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }
  return null;
}
```

### 3.2 Address Book & Account Badge (Reverse Lookup)
To display human-readable handles instead of hex strings (`0x1111...1111`), wallets MUST use the **Mutual Anti-Spoofing Rule**:

```javascript
async function getAccountDisplayName(address) {
  // lookupAddress automatically verifies forward == reverse
  const verifiedHandle = await nairatag.lookupAddress(address);
  
  if (verifiedHandle) {
    return `${verifiedHandle} (${address.slice(0, 6)}...${address.slice(-4)})`;
  }
  
  return address; // Fallback to raw hex if unverified or unregistered
}
```

---

## 4. DEX & Payment dApp Integration

### 4.1 Token Transfer / Swap Recipient
```javascript
import { formatDisplayTag, toChecksumAddress } from '@nairatag/sdk';

async function executeTransfer(tokenContract, recipientTagOrAddress, amount) {
  let targetAddress;

  if (recipientTagOrAddress.startsWith('0x')) {
    targetAddress = toChecksumAddress(recipientTagOrAddress);
  } else {
    targetAddress = await nairatag.resolve(recipientTagOrAddress);
    if (!targetAddress) {
      throw new Error(`NairaTag ${formatDisplayTag(recipientTagOrAddress)} is not registered.`);
    }
  }

  return tokenContract.transfer(targetAddress, amount);
}
```

### 4.2 Payment Request URI (EIP-681 Extension)
Payment invoices encode the recipient handle:
```text
nairatag:₦micheal?amount=50000000000000000&token=0x...&ref=INV-2026-001
```

---

## 5. Low-Level Direct JSON-RPC Integration (Without SDK)

Applications without NPM dependencies can query the contracts directly using standard `eth_call`:

### 4.1 Forward Resolution via Registry (`resolve(string)`)
* **Contract**: `NairaTagRegistry` (`0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`)
* **Method**: `resolve(string)`
* **Selector**: `0x461a4478`

**Raw Calldata Format for `₦micheal`**:
```text
0x461a4478
0000000000000000000000000000000000000000000000000000000000000020  // offset
000000000000000000000000000000000000000000000000000000000000000a  // length (10 bytes)
e282a66d69636865616c00000000000000000000000000000000000000000000  // UTF-8 bytes for ₦micheal
```

### 4.2 Standard Resolver Lookup (`addr(bytes32)`)
* **Contract**: `NairaTagResolver` (`0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0`)
* **Method**: `addr(bytes32)`
* **Selector**: `0x3b3b57de`
* **Node for `₦micheal`**: `0x643dbd58af0b489c995d96b0539c960ce6cbca0add0c6a046f919f2d4cff8dce`

**Calldata**:
```text
0x3b3b57de643dbd58af0b489c995d96b0539c960ce6cbca0add0c6a046f919f2d4cff8dce
```

---

## 6. Reverse Resolution Mutual Anti-Spoofing Algorithm

Any application displaying an identity badge for an address MUST execute this two-step verification:

```text
               Address to Inspect: 0x1111...1111
                                │
                                ▼ Step 1
   Compute: reverseNode = keccak256(REVERSE_NAMESPACE + address)
   Query:   resolver.name(reverseNode)
                                │
                                ▼
                   Claimed Handle: "₦micheal"
                                │
                                ▼ Step 2
   Compute: node = keccak256("micheal")
   Query:   registry.resolve("₦micheal")
                                │
                                ▼
                 Forward Address: 0x1111...1111
                                │
                                ▼ Step 3
            Is Forward Address == Inspected Address?
               /                         \
             YES                          NO
              │                            │
              ▼                            ▼
   VERIFIED BADGE DISPLAYED       REJECTED / UNVERIFIED
      [₦micheal ✅]                 Display raw address
```

This prevents malicious accounts from pointing their reverse record to handles they do not own.
