# Doppler Airlock Lifecycle Specification
## Phase 1.5 Verification Audit

**Scope:** Step-by-step trace of `Airlock.sol` execution from upstream source (`whetstoneresearch/doppler`).

---

## 1. Complete Execution Trace

```text
========================================================================================
                                1. CREATION PHASE: Airlock.create()
========================================================================================
Caller: Creator / Front-end Integrator
Entrypoint: Airlock.create(CreateParams calldata createData)

Step 1.1: Module Whitelist Validation
    - require(getModuleState[tokenFactory] == ModuleState.TokenFactory)
    - require(getModuleState[governanceFactory] == ModuleState.GovernanceFactory)
    - require(getModuleState[poolInitializer] == ModuleState.PoolInitializer)
    - require(getModuleState[liquidityMigrator] == ModuleState.LiquidityMigrator)

Step 1.2: Token Deployment
    - asset = tokenFactory.create(initialSupply, address(this), address(this), salt, data)
    - Ownership of initial token supply initially belongs to Airlock.

Step 1.3: Governance / Timelock Setup
    - (governance, timelock) = governanceFactory.create(asset, governanceFactoryData)
    - For NoOp governance, returns (0xdead, 0xdead) or (0xdead, creator/multisig).

Step 1.4: Pool Initialization (Price Discovery Setup)
    - ERC20(asset).approve(poolInitializer, numTokensToSell)
    - pool = poolInitializer.initialize(asset, numeraire, numTokensToSell, salt, data)
    - poolInitializer pulls `numTokensToSell` from Airlock.

Step 1.5: Migration Destination Pre-Creation
    - migrationPool = liquidityMigrator.initialize(asset, numeraire, data)
    - Pre-creates destination AMM pair on NairaTagAMMFactory.

Step 1.6: Asset Transfer Restriction (Locking)
    - ILockablePoolToken(asset).lockPool(migrationPool)
    - Disallows transfers to arbitrary third-party pools during discovery.

Step 1.7: Excess Token Sweep & Storage
    - excessAsset = ERC20(asset).balanceOf(address(this))
    - If excessAsset > 0: ERC20(asset).safeTransfer(timelock, excessAsset)
    - getAssetData[asset] saved to storage.
    - Emits Create(asset, numeraire, poolInitializer, pool).

========================================================================================
                              2. PRICE DISCOVERY PHASE
========================================================================================
Active Contract: poolInitializer (NairaTag custom bonding curve)
Asset Custody: poolInitializer holds `numTokensToSell`
Numeraire Custody: poolInitializer holds all incoming `cNGN` proceeds

Actions:
    - Buyers call poolInitializer.buy(token, cNGN_amount)
    - cNGN is transferred from buyer to poolInitializer
    - Purchased tokens are allocated or transferred to buyer
    - Price advances along the deterministic mathematical curve

========================================================================================
                                3. MIGRATION PHASE: Airlock.migrate()
========================================================================================
Caller: Permissionless (Anyone may trigger once conditions are met)
Entrypoint: Airlock.migrate(address asset)

Step 3.1: Unlock Token & Transfer Ownership
    - ILockablePoolToken(asset).unlockPool()
    - Ownable(asset).transferOwnership(assetData.timelock)

Step 3.2: Liquidity Exit from Initializer
    - (sqrtPriceX96, token0, fees0, balance0, token1, fees1, balance1) = 
          assetData.poolInitializer.exitLiquidity(assetData.pool)
    - poolInitializer transfers accumulated numeraire and remaining asset to Airlock.
    - If graduation threshold has NOT been met: poolInitializer REVERTS here.

Step 3.3: Fee Calculation & Accounting (Airlock._handleFees)
    - Protocol and integrator fees are deducted from balance0 and balance1.
    - getProtocolFees[token] and getIntegratorFees[integrator][token] updated.

Step 3.4: Transfer to Liquidity Migrator
    - ERC20(token0).safeTransfer(liquidityMigrator, balance0 - fees0)
    - ERC20(token1).safeTransfer(liquidityMigrator, balance1 - fees1)

Step 3.5: Execute AMM Seeding (UniswapV2MigratorSplit.migrate)
    - liquidityMigrator computes exact deposit amounts matching sqrtPriceX96.
    - liquidityMigrator deposits token0 and token1 into NairaTagPair on NairaTagAMMFactory.
    - Calls NairaTagPair.mint(address(this)).
    - Splits LP tokens between locker and recipient.
    - Sweeps remaining dust to recipient.
    - Emits Migrate(asset, migrationPool).

========================================================================================
                            4. POST-MIGRATION TRADING PHASE
========================================================================================
Active Pool: NairaTagPair on NairaTagAMMFactory
Trading Router: NairaTagRouter
Status: Fully liquid, decentralized constant-product AMM trading active.
```

---

## 2. Ownership and Custody Matrix

| Stage | Token Asset Custody | Numeraire (`cNGN`) Custody | Token Ownership / Admin | LP Token Ownership |
| :--- | :--- | :--- | :--- | :--- |
| **At Genesis (`create`)** | `Airlock` briefly, then `numTokensToSell` $\to$ `poolInitializer`, excess $\to$ `timelock` | None | `Airlock` | Not created yet |
| **During Discovery** | `poolInitializer` (held in escrow) | `poolInitializer` (accumulating proceeds) | `Airlock` | Not created yet |
| **At Exit (`exitLiquidity`)**| Transferred to `Airlock` | Transferred to `Airlock` | Transferred to `timelock` | Not created yet |
| **During Migration** | Transferred to `liquidityMigrator` $\to$ `NairaTagPair` | Transferred to `liquidityMigrator` $\to$ `NairaTagPair` | `timelock` | `liquidityMigrator` (briefly) |
| **Post-Migration** | `NairaTagPair` (AMM pool reserves) | `NairaTagPair` (AMM pool reserves) | `timelock` / `0xdead` | Split: `UniswapV2Locker` / Burn address |

---

## 3. Permissions & Guardrails

1. **Who can call `Airlock.create()`?**
   Permissionless. Any user or front-end integrator can create a token launch, provided they use approved module addresses.
2. **Who can call `poolInitializer.buy()`?**
   Permissionless. Any user holding approved numeraire (`cNGN`).
3. **Who can call `Airlock.migrate()`?**
   Permissionless, **BUT guarded by `poolInitializer.exitLiquidity()`**. If graduation criteria (target funding / token threshold) are not reached, `exitLiquidity` reverts, blocking premature migration.
4. **What happens if `poolInitializer` fails?**
   If `initialize()` fails during creation, the entire transaction reverts atomically. No tokens are created.
5. **What happens if migration fails?**
   `Airlock.migrate()` is an atomic transaction. If `exitLiquidity`, fee handling, or `liquidityMigrator.migrate` reverts, state rewinds cleanly. The pool remains in its discovery state.
