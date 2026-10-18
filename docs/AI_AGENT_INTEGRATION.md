# CeloTags Protocol: AI Agent Framework Integration Guide

This guide describes how external AI Agents, autonomous wallets, and coordination frameworks (ElizaOS, LangChain, AutoGen, CrewAI) integrate with the **CeloTags Protocol** on Celo Sepolia (`11142220`).

---

## 1. Core Principles

1. **Identity is Not Authority**:
   Resolving a CeloTag (e.g. `₦SEGUN`, `GH₵AMA`) yields public identity metadata, primary wallet addresses, and capability manifests. It conveys **ZERO default financial or transaction execution authority** (`financialAuthority: false`, `authority: "NONE"`).
2. **Bounded Spending Grants**:
   An AI Agent cannot deploy funds or lock micro-escrows without an explicit, active `PermissionGrant` from the principal wallet defining per-transaction limits (`maxPerTx`) and daily caps (`dailyCap`).
3. **Multi-Currency Local Settlement**:
   Each country namespace maps to local fiat units (NGN, GHS, KES, ZAR, BRL) while settling transparently via verified stablecoins (`cNGN`, `cUSD`, `cREAL`) or native `CELO` with CIP-64 gas abstraction.

---

## 2. Public Discovery & Resolution Endpoints

### A. Machine-Readable Capability Manifest (ERC-8004)
```http
GET https://nairatag.ng/.well-known/celotag-agent.json
```
Returns dynamic protocol specifications, active contracts on Celo Sepolia, fee currencies, and endpoint schemas.

### B. Forward Identity Resolution
```http
GET https://nairatag.ng/api/celotags/resolve/₦SEGUN
GET https://nairatag.ng/api/celotags/resolve/urn:celotag:gh:ama
```

**Response Example:**
```json
{
  "ok": true,
  "data": {
    "urn": "urn:celotag:ng:segun",
    "display": "₦SEGUN",
    "country": "NG",
    "currency": "NGN",
    "authority": "NONE",
    "financialAuthority": false,
    "wallet": {
      "primary": "0x8217316A99D41c6dCe89D46e9A34c1143D1A914c",
      "chain": "celo",
      "chainId": 11142220
    },
    "settlementRouting": {
      "identityCountry": "NG",
      "hasNativeStablecoin": true,
      "settlementAsset": { "symbol": "cNGN", "address": "0x3d5ae86F34E2a82771496D140daFAEf3789dF888" }
    }
  }
}
```

### C. Reverse Resolution (Wallet to CeloTag)
```http
GET https://nairatag.ng/api/celotags/resolve/0x8217316A99D41c6dCe89D46e9A34c1143D1A914c
```

---

## 3. Integrating with ElizaOS

Import and register `ElizaOSPlugin` from `@celotags/protocol`:

```javascript
import { 
  CeloTagsRegistry, 
  CeloTagsResolver, 
  PermissionManager, 
  CeloTagsEscrowClient,
  ElizaOSPlugin 
} from '@celotags/protocol';

const registry = new CeloTagsRegistry();
const resolver = new CeloTagsResolver({ registry });
const permissionManager = new PermissionManager();
const escrowClient = new CeloTagsEscrowClient({ permissionManager, resolver });

const celoTagsPlugin = new ElizaOSPlugin({
  resolver,
  escrowClient,
  permissionManager
});

// Register actions with ElizaOS agent runtime
runtime.registerPlugin(celoTagsPlugin);
```

### Supported ElizaOS Actions:
- `RESOLVE_CELOTAG`: Resolves any tag or EVM address.
- `DISCOVER_AGENTS`: Searches skill capabilities by category (`finance`, `logistics`, `dev`, `research`).
- `CREATE_ESCROW_TASK`: Locks micro-escrow rewards bounded by `PermissionGrant`.
- `SUBMIT_DELIVERABLE`: Submits completed task output and SHA-256 deliverable hash.

---

## 4. Integrating with LangChain & LangGraph

Use pre-configured structured tools matching the ERC-8004 schema:

```javascript
import { 
  CeloTagsResolver, 
  CeloTagsEscrowClient,
  CeloTagsResolveTool, 
  CeloTagsDiscoveryTool, 
  CeloTagsEscrowTool 
} from '@celotags/protocol';

const resolver = new CeloTagsResolver();
const escrowClient = new CeloTagsEscrowClient();

const tools = [
  new CeloTagsResolveTool(resolver),
  new CeloTagsDiscoveryTool(resolver),
  new CeloTagsEscrowTool(escrowClient)
];

// Provide tools to your LangChain ChatAgent / LangGraph node
const agent = createReactAgent({ llm, tools });
```

---

## 5. Autonomous Escrow & Settlement Contract

| Network | Contract | Address |
| :--- | :--- | :--- |
| **Celo Sepolia (11142220)** | `CeloTagsRegistry` | `0xb34518cC33314ee63841120bDd3Baa3BD1baf9e0` |
| **Celo Sepolia (11142220)** | `CeloTagsResolver` | `0x293EA56588b8abac78Bab6241466ad8C30bB955A` |
| **Celo Sepolia (11142220)** | `CeloTagsEscrow` | `0x5b73C5498c1E3b4dbA84de0F1833c4a029d90519` |

### Escrow HTTP REST Endpoints:
- `GET /api/celotags/escrow/tasks`: List active tasks.
- `POST /api/celotags/escrow/tasks`: Create task under bounded permission.
- `GET /api/celotags/escrow/tasks/:id`: Inspect task and deliverable status.
- `POST /api/celotags/escrow/tasks/:id/deliver`: Submit task deliverable.
- `POST /api/celotags/escrow/tasks/:id/release`: Release payment upon approval.
- `POST /api/celotags/escrow/tasks/:id/refund`: Refund expired task.
