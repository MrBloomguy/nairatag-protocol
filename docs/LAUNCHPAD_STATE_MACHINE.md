# NairaTag Launchpad State Machine & Token Locking Architecture
## Phase 1.5 Verification Audit

**Scope:** State transitions, failure states, token locking permissions matrix, Registry ownership model, and atomic deployment guarantees.

---

## 1. Launchpad State Machine

```text
       +---------------+
       |  NOT_CREATED  |
       +-------+-------+
               | Airlock.create()
               v
       +---------------+
       |   DISCOVERY   | <-----------------------+
       |    ACTIVE     | (Buyers buy with cNGN)  |
       +-------+-------+                         |
               |                                 |
       +-------+-------------------------+       |
       | Threshold Reached?              | 14-day Timeout Expired?
       v                                 v
+--------------+                 +---------------+
|  GRADUATING  |                 |   ABANDONED   |
+-------+------+                 +-------+-------+
        | Airlock.migrate()              | (Buyers call claimRefund)
        v                                v
+--------------+                 +---------------+
|  MIGRATING   |                 | REFUND_CLOSED |
+-------+------+                 +---------------+
        | Pair.mint() & Lock LP
        v
+--------------+
|   TRADING    | (Permanent AMM Trading Active)
|    ACTIVE    |
+--------------+
```

### State Transition Table

| Current State | Event / Trigger | Guard Condition | Next State | Actions Executed |
| :--- | :--- | :--- | :--- | :--- |
| `NOT_CREATED` | `Airlock.create()` | Whitelisted modules, valid handle | `DISCOVERY_ACTIVE` | Deploys token, claims ₦tag, deposits tokens into Initializer. |
| `DISCOVERY_ACTIVE` | `Initializer.buy()` | $C_{raised} < C_{target}$ | `DISCOVERY_ACTIVE` | Transfers `cNGN` in, updates curve price, records buyer allocation. |
| `DISCOVERY_ACTIVE` | Target Reached | $C_{raised} \ge C_{target}$ | `GRADUATING` | Closes bonding curve to further buys; unlocks `exitLiquidity`. |
| `DISCOVERY_ACTIVE` | 14-Day Timeout | $\Delta t > 14 \text{ days} \land C_{raised} < C_{target}$ | `ABANDONED` | Unlocks emergency refund mechanism for buyers. |
| `GRADUATING` | `Airlock.migrate()` | Called by anyone | `MIGRATING` | `exitLiquidity` transfers funds to Airlock; fees deducted. |
| `MIGRATING` | `Migrator.migrate()` | Atomic sub-call | `TRADING_ACTIVE` | Seeds `NairaTagPair`, mints & locks LP tokens, unlocks token transfers. |
| `ABANDONED` | `claimRefund()` | Buyer holds allocation | `ABANDONED` | Returns 100% of deposited `cNGN` to buyer; burns bought tokens. |

---

## 2. Token Locking State-Transition Matrix (`ILockablePoolToken`)

During the `DISCOVERY_ACTIVE` state, the token's transfers are restricted via `ILockablePoolToken` to prevent external AMM creation and price manipulation:

| Actor | Can Transfer During Discovery? | Can Receive During Discovery? | Can Approve Spender? | Can Create External Pair? | Can Trade on AMM? | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Creator** | **NO** | YES (Genesis excess) | YES | **BLOCKED** | **BLOCKED** | Cannot move tokens until graduation. |
| **Buyer** | **NO** (Allocated in pool) | YES | NO | **BLOCKED** | **BLOCKED** | Cannot transfer tokens outside discovery pool. |
| **Initializer** | **YES** (Internal only) | YES | YES | NO | NO | Custodies auction allocation. |
| **Airlock** | **YES** | YES | YES | NO | NO | Coordinates transfer to migrator during exit. |
| **Migrator** | **YES** (During migration) | YES | YES | **YES** (Authorized) | NO | Creates official AMM pair and deposits. |
| **AMM Pair** | **NO** | YES (Seeding only) | NO | N/A | **BLOCKED** | Trading locked until `unlockPool()` is called. |
| **Router** | **NO** | NO | NO | NO | **BLOCKED** | Reverts if swap is attempted before unlock. |
| **Locker** | N/A | YES (LP tokens only) | NO | NO | NO | Receives and locks LP shares post-migration. |

---

## 3. NairaTag Registry Ownership Model Resolution

The Phase 1.5 audit evaluated four potential ownership models for the `₦tag` node:
* **Model A (Creator owns ₦tag):** Risk of creator re-pointing the handle to a malicious contract or selling the handle after launch.
* **Model B (Token Contract owns ₦tag):** Permanent and immutable. The deployed ERC20 has no private keys and no functions to transfer or modify the node.
* **Model C (Protocol / Timelock owns ₦tag):** Centralized risk; protocol admin could theoretically alter records.
* **Model D (Airlock owns ₦tag):** Unnecessary coupling with launchpad coordinator.

### Recommended Model: Model B (Token Contract Ownership)
```text
Step 1: NairaTagToken is deployed at address `tokenAddr`.
Step 2: TokenFactory calls NairaTagRegistry.claim("₦tag", resolverAddr).
Step 3: Resolver.setAddr(node, tokenAddr).
Step 4: Registry.transfer(node, tokenAddr).
```
**Benefits:**
- **Zero Governance / Rug Vector:** The token contract owns its own handle. Nobody can ever re-point `₦kemi` to a different token.
- **Permanent Resolution:** `NairaTagRegistry.resolve("₦kemi")` permanently resolves to `tokenAddr`.
- **ENS Standard Compliance:** Matches institutional ENS and DNS naming best practices for decentralized assets.

---

## 4. Atomicity & Partial-Failure Analysis

Can `Token creation` + `₦Tag claim` + `resolver configuration` + `Airlock registration` happen atomically?

### **YES.**
When executed via `Airlock.create()` calling `NairaTagTokenFactory`:
1. All steps occur inside a **single EVM transaction execution frame**.
2. If `NairaTagRegistry.claim()` reverts (e.g. `TagAlreadyClaimed`), the entire transaction rolls back. No token contract is deployed, and no state is mutated.
3. If `poolInitializer.initialize()` reverts, the token creation and registry claim roll back completely.
4. **No partial-failure state is possible on-chain.** The launch is either 100% successful or 100% reverted.
