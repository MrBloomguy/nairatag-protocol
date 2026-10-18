# Airlock Privileged Authority Matrix & Attack Surface
## Phase 1.75 Adversarial Verification Gate

**Scope:** Exhaustive audit of all privileged capabilities, governance roles, module registrations, asset recovery vectors, and potential admin exploit surfaces in Doppler's `Airlock.sol`.

---

## 1. Privileged Functions in `Airlock.sol`

The following table documents every function with access control or state-modifying privileges in `Airlock.sol` (`whetstoneresearch/doppler`):

| Function | Access Modifier | Caller / Authority | Parameters Mutable | Funds / Tokens Movable | Creator Influence | Protocol Influence | Risk & Exploit Analysis |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`setModuleState`** | `onlyOwner` | Airlock Contract Owner | `modules[]`, `states[]` | None directly | **ZERO** | **HIGH** | Owner can register new TokenFactories, GovernanceFactories, PoolInitializers, or LiquidityMigrators. If an owner registers a malicious migrator, newly created launches using that migrator could be exploited. **Does not affect already migrated pools.** |
| **`collectProtocolFees`** | `onlyOwner` | Airlock Contract Owner | `to`, `token`, `amount` | Protocol fee balance (`getProtocolFees[token]`) | **ZERO** | **MEDIUM** | Owner can withdraw accrued protocol fees. Underflow-protected: `getProtocolFees[token] -= amount` reverts if `amount > accrued`. Cannot drain pool reserves or user deposits. |
| **`collectIntegratorFees`** | None (Caller must be owed fees) | Front-End Integrator (`msg.sender`) | `to`, `token`, `amount` | Integrator fee balance (`getIntegratorFees[msg.sender][token]`) | **ZERO** | **ZERO** | Only allows the integrator to claim fees credited to `msg.sender`. Underflow protected. |
| **`create`** | None | Permissionless (Any user / integrator) | `CreateParams` | Full initial token supply $\to$ Initializer + Timelock | **FULL (At Genesis)**| **LOW (Module Gate)**| Caller chooses which approved modules to use. Cannot use unapproved modules due to `_validateModuleState`. |
| **`migrate`** | None | Permissionless (Anyone once graduated) | `asset` | Proceeds $\to$ Migrator $\to$ AMM | **ZERO** | **ZERO** | Completely automated: sweeps funds from `poolInitializer` via `exitLiquidity()` and pushes to `liquidityMigrator`. Governed entirely by initializer state. |

---

## 2. Privileged Vectors & Mitigations

### 2.1 Can the Protocol Owner Steal User Deposited `cNGN`?
* **Verdict: NO.**
* **Evidence:** `Airlock.sol` does NOT have an arbitrary `rescueToken()` or `sweep()` function. The only function allowing token transfer out of Airlock is `collectProtocolFees` (which is strictly bounded by `getProtocolFees[token]`) and `migrate()` (which routes directly to the approved `liquidityMigrator`).
* During discovery, `cNGN` sits in the `poolInitializer`, completely unreachable by the Airlock owner.

### 2.2 Can the Creator Influence Migration or AMM Destination?
* **Verdict: NO.**
* **Evidence:** The creator specifies `liquidityMigrator` at genesis inside `CreateParams`. Once `Airlock.create()` completes, the `AssetData` is permanently stored in `getAssetData[asset]`. There is no setter or update function in `Airlock.sol` to alter `liquidityMigrator` or `poolInitializer` post-creation.

### 2.3 Can the Airlock Owner Modify Already Created Launches?
* **Verdict: NO.**
* **Evidence:** Changing module state via `setModuleState()` only affects *future* calls to `Airlock.create()`. Existing launches reference their already stored module addresses in `getAssetData[asset]`.

---

## 3. Reentrancy & Callback Attack Surface

| Call Path | Target Contract | Callback / Hook Risk | Mitigation in Place |
| :--- | :--- | :--- | :--- |
| `Airlock.create` $\to$ `tokenFactory.create` | `NairaTagTokenFactory` | Low (Trusted Factory) | Deploys new token via CREATE2. |
| `Airlock.create` $\to$ `initializer.initialize` | `NairaTagAirlockInitializer` | Low (Module whitelisted) | Pulls tokens via SafeTransferLib. |
| `Initializer.buy` $\to$ `cNGN.transferFrom` | `MockCNGN` | Reentrancy on ERC20 hook | `MockCNGN` is standard ERC20 without hooks. Checks-effects-interactions enforced. |
| `Initializer.buy` $\to$ `token.transfer` | `NairaTagLaunchpadToken` | Reentrancy on ERC20 hook | State updated *before* transfer. Token transfer checks `poolLocked`. |
| `Initializer.sell` $\to$ `cNGN.transfer` | `MockCNGN` | Reentrancy on ERC20 hook | State decremented *before* cNGN transfer. |
| `Airlock.migrate` $\to$ `initializer.exitLiquidity` | `NairaTagAirlockInitializer` | State reentry | State transitioned to `State.Migrated` before transfers. |
| `Airlock.migrate` $\to$ `migrator.migrate` | `NairaTagV2Migrator` | State reentry | Token unlocked, pair created, LP minted and locked in atomic sequence. |
