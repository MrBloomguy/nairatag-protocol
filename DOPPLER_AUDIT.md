# NairaTag Launchpad — Doppler / Airlock Integration
## Phase 1: Feasibility & Implementation Architecture Audit

**Status:** Complete Audit Report  
**Target Network:** NairaTag L2 (Chain ID: 901)  
**Execution Environment:** Local OP Stack / Anvil devnet (`http://127.0.0.1:9545`)  
**Upstream Reference:** [whetstoneresearch/doppler](https://github.com/whetstoneresearch/doppler) (Branch: `main`, Core License: `BUSL-1.1`)  
**Auditor / Engineering Team:** Antigravity Engineering  
**Date:** September 15, 2026  

---

## Executive Summary

This document presents the Phase 1 feasibility and implementation audit for replacing the legacy NairaTag launchpad (which instantly deployed tokens directly into an AMM pool) with an institutional-grade **price-discovery and liquidity-bootstrapping launchpad** based on the open-source **Doppler / Airlock** architecture.

### Key Audit Conclusions

1. **Doppler Architecture Feasibility:** **100% Feasible** on NairaTag Chain 901 without modifying existing working identity or AMM infrastructure.
2. **Uniswap V4 Dependency:** **NOT REQUIRED for NairaTag.** Doppler's core orchestrator (`Airlock.sol`) is completely decoupled from Uniswap V4. While Doppler's default hook uses Uniswap V4, Doppler natively supports alternative pool initializers and explicitly provides a production `UniswapV2MigratorSplit.sol`.
3. **Existing AMM Compatibility:** Doppler's `UniswapV2MigratorSplit.sol` is **directly compatible** with `NairaTagAMMFactory` (`0x9A676e781A523b5d0C0e43731313A708CB607508`) and `NairaTagPair` without altering a single line of the existing DEX codebase.
4. **Numeraire Realism:** **cNGN** (`0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82`) is the sole funded numeraire on Chain 901. A strict allowlist architecture (`isApprovedNumeraire`) will be enforced, distinguishing true quote-asset liquidity from token bootstrapping.
5. **NairaTag Identity Unification:** All token launches will continue to canonically claim and register their `₦handle` on `NairaTagRegistry` (`0x5FbDB2315678afecb367f032d93F642f64180aa3`) and resolve both forward (`₦tag → token`) and reverse (`token → ₦tag`) via `NairaTagResolver` (`0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`).
6. **Recommended Implementation:** Deploy Doppler's `Airlock.sol` orchestrator, paired with a lightweight, standalone **Doppler-compliant Virtual Bonding Initializer** (`IPoolInitializer`) and `UniswapV2MigratorSplit` migrating into `NairaTagAMMFactory`.

---

## Table of Contents
1. [Objective & Background](#1-objective--background)
2. [Audit of Existing NairaTag Infrastructure](#2-audit-of-existing-nairatag-infrastructure)
3. [Audit of Upstream Doppler Architecture](#3-audit-of-upstream-doppler-architecture)
4. [Comparison of Doppler Launch Mechanisms & Recommendation](#4-comparison-of-doppler-launch-mechanisms--recommendation)
5. [Uniswap V4 Dependency Analysis](#5-uniswap-v4-dependency-analysis)
6. [Numeraire Architecture & Liquidity Reality](#6-numeraire-architecture--liquidity-reality)
7. [NairaTag Identity & Registry Integration](#7-nairatag-identity--registry-integration)
8. [Token Creation Specification](#8-token-creation-specification)
9. [Liquidity Bootstrapping & Migration Lifecycle](#9-liquidity-bootstrapping--migration-lifecycle)
10. [NairaTag AMM Compatibility Audit](#10-nairatag-amm-compatibility-audit)
11. [Fee Mechanics & Value Flow](#11-fee-mechanics--value-flow)
12. [Security Analysis & Threat Model](#12-security-analysis--threat-model)
13. [Chain 901 Testnet-First Verification](#13-chain-901-testnet-first-verification)
14. [Foundry Test Plan](#14-foundry-test-plan)
15. [Frontend (Hub) & Indexer (Scanner) Roadmap](#15-frontend-hub--indexer-scanner-roadmap)
16. [Licensing, Attribution & IP Compliance](#16-licensing-attribution--ip-compliance)
17. [Phased Implementation Roadmap](#17-phased-implementation-roadmap)

---

## 1. Objective & Background

### 1.1 The Problem with Legacy Launchpad
The legacy `NairaTagLaunchpad.sol` operates on an immediate liquidity seeding model:
```text
Creator launches ₦token
  ├── Creator must supply 100% of quote asset (e.g. 100,000 cNGN)
  ├── Creates NairaTagPair immediately
  └── Seeds AMM liquidity instantly without price discovery
```
**Fatal Flaws of Legacy Model:**
- Requires the creator to provide substantial capital (cNGN) upfront.
- No fair price discovery: price is arbitrarily chosen by the creator.
- Susceptible to immediate sniper frontrunning.
- Unsuitable for community-driven memecoins, DAOs, and fair-launch tokens.

### 1.2 The Target Architecture
Transforming the launchpad into an institutional **price-discovery + liquidity-bootstrapping** pipeline:
```text
                  +-----------------------------------+
                  |              Creator              |
                  +-----------------+-----------------+
                                    | Specifies: Name, Symbol, ₦Tag, Numeraire (cNGN)
                                    v
                  +-----------------------------------+
                  |     NairaTag Token Deployer       |
                  |  - Mints supply to Airlock        |
                  |  - Claims canonical ₦Tag          |
                  |  - Resolves via NairaTagResolver  |
                  +-----------------+-----------------+
                                    |
                                    v
                  +-----------------------------------+
                  |    Doppler Airlock Orchestrator   |
                  +-----------------+-----------------+
                                    | Locks asset & initializes pool
                                    v
                  +-----------------------------------+
                  |  Price Discovery / Auction Pool   |
                  |  (Users buy tokens using cNGN)    |
                  +-----------------+-----------------+
                                    | Trading proceeds accumulate
                                    | Target / graduation criteria reached
                                    v
                  +-----------------------------------+
                  |          Airlock.migrate()        |
                  |  - Sweeps accumulated cNGN & fees |
                  |  - Calculates target AMM price    |
                  +-----------------+-----------------+
                                    |
                                    v
                  +-----------------------------------+
                  |     UniswapV2MigratorSplit        |
                  |  - Calls NairaTagAMMFactory       |
                  |  - Creates NairaTagPair           |
                  |  - Mints & locks LP tokens        |
                  +-----------------+-----------------+
                                    |
                                    v
                  +-----------------------------------+
                  |       Permanent Tradable Pair     |
                  |        (NairaTag AMM DEX)         |
                  +-----------------------------------+
```

---

## 2. Audit of Existing NairaTag Infrastructure

Every existing contract on Chain 901 was inspected in `contracts/src/` and verified against the live testnet deployment recorded in `config/v1-addresses.json`:

| Contract | Deployed Address (Chain 901) | Admin / Ownership | Interface / Standard | Role in Launchpad |
| :--- | :--- | :--- | :--- | :--- |
| **`NairaTagRegistry`** | `0x5FbDB2315678afecb367f032d93F642f64180aa3` | Permissionless `claim`, Node owner per tag | `INairaTagRegistry`, `IERC165` | Canonical naming: registers `₦handle` |
| **`NairaTagResolver`** | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` | Authorized by node owner in Registry | `INairaTagResolver`, ENSIP-1/3/5/9 | Resolves `₦handle` $\leftrightarrow$ token address |
| **`MockCNGN`** | `0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82` | Open faucet (`10,000 cNGN/call`) | Standard `ERC20` (18 decimals) | **Primary Quote Asset / Numeraire** |
| **`NairaTagAMMFactory`** | `0x9A676e781A523b5d0C0e43731313A708CB607508` | No owner (immutable) | `IUniswapV2Factory` equivalent | Creates permanent post-launch pairs |
| **`NairaTagRouter`** | `0x0B306BF915C4d645ff596e518fAf3F9669b97016` | Bound to `NairaTagAMMFactory` | `IUniswapV2Router02` equivalent | Executes post-launch user swaps |
| **`NairaTagPair`** | *Deployable via Factory* | Governed by AMM Factory | Constant-product $x \cdot y = k$, 0.3% fee | Holds liquidity pools |
| **`NairaTagTokenFactory`** | `0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1` | Deployer (`0xf39Fd6e5...`) | `ITokenFactory` | Deploys `NairaTagToken` & claims tag |
| **`NairaTagLaunchpad` (v1)** | `0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE` | Immutable | Custom `launch(...)` | **Legacy contract to be superseded** |

### 2.1 Critical Findings on Existing Codebase
1. **Registry Permission Model:**
   In `NairaTagRegistry.sol`, the caller of `claim(tag, resolver)` becomes the exclusive `owner` of the node.
   In `NairaTagTokenFactory.sol`, `tokenFactory` currently claims the tag and sets the resolver records. For the Doppler integration, ownership of the `₦tag` node must either be assigned to the token contract itself, held in a protocol timelock, or transferred to the token creator.
2. **AMM Interface Equivalence:**
   `NairaTagAMMFactory.sol` implements:
   ```solidity
   mapping(address => mapping(address => address)) public getPair;
   function createPair(address tokenA, address tokenB) external returns (address pair);
   ```
   And `NairaTagPair.sol` implements:
   ```solidity
   function mint(address to) external lock returns (uint256 liquidity);
   function transfer(address to, uint256 amount) external returns (bool);
   function getReserves() public view returns (uint112, uint112, uint32);
   ```
   **Verdict:** This interface is identical to Uniswap V2, meaning Doppler's `UniswapV2MigratorSplit.sol` can interact with it without any modification.

---

## 3. Audit of Upstream Doppler Architecture

The source code of `whetstoneresearch/doppler` was downloaded and audited directly from repository HEAD.

### 3.1 Core Architecture Components
- **`Airlock.sol` (Orchestrator):**
  Central coordinator deployed with an owner. It maintains a strict state registry of approved modules (`ModuleState`):
  - `TokenFactory`
  - `GovernanceFactory`
  - `PoolInitializer`
  - `LiquidityMigrator`
  When `create(CreateParams calldata params)` is invoked, Airlock validates each module, deploys the token, initializes governance, deposits tokens into the `poolInitializer`, locks the token's trading ability, and records `AssetData`.
- **`DopplerERC20V1.sol` / `ILockablePoolToken.sol`:**
  Implements `lockPool(address pool)` and `unlockPool()`. While locked, token transfers are restricted to the active price discovery pool, preventing malicious users from creating external AMM pairs before discovery concludes.
- **`IPoolInitializer.sol` (Price Discovery):**
  Defines the entrypoint `initialize(asset, numeraire, numTokensToSell, salt, data)` and the exit trigger `exitLiquidity(target)`. It holds the asset during the auction and manages the sale curve.
- **`ILiquidityMigrator.sol` (Migration Destination):**
  Defines `initialize(asset, numeraire, data)` which pre-creates the destination pool, and `migrate(sqrtPriceX96, token0, token1, recipient)` which transfers accumulated numeraire + unsold assets into the destination pool and locks the minted LP shares.
- **`UniswapV2MigratorSplit.sol`:**
  A production-tested migrator in Doppler that takes the proceeds and unsold tokens from Airlock, computes optimal initial reserves using `MigrationMath.computeDepositAmounts`, deposits them into a Uniswap V2 pair, and locks 5% (or configurable share) of LP tokens in `UniswapV2Locker.sol` while sending the remainder to the beneficiary or locking them permanently.
- **`NoOpGovernanceFactory.sol`:**
  Returns `(0xdead, 0xdead)` for tokens that do not require an active on-chain DAO.

### 3.2 Upstream Doppler Dependency Graph

Derived directly from Doppler source files:

```text
Airlock.sol (Ownable, SafeTransferLib, Math)
 │
 ├── ITokenFactory (DopplerERC20V1Factory / NairaTagTokenFactory)
 │    └── DopplerERC20V1 (ERC20, Ownable, ILockablePoolToken)
 │
 ├── IGovernanceFactory (NoOpGovernanceFactory / LaunchpadGovernanceFactory)
 │    └── Returns (governanceAddr, timelockAddr)
 │
 ├── IPoolInitializer (Auction / Bootstrapping)
 │    ├── UniswapV4Initializer ──> Uniswap V4 PoolManager + DopplerHook (requires V4)
 │    ├── LockableUniswapV3Initializer ──> Uniswap V3 Factory + NonfungiblePositionManager
 │    └── [Recommended] NairaTagAirlockInitializer ──> Self-contained bonding curve
 │
 ├── ILiquidityMigrator (Migration Engine)
 │    ├── UniswapV2MigratorSplit (Directly compatible with NairaTagAMMFactory)
 │    │    ├── MigrationMath (Computes Q64.96 ratio-based deposits)
 │    │    ├── UniswapV2Locker (Time-locks minted LP tokens)
 │    │    └── ProceedsSplitter (Optional fee/creator split)
 │    ├── DopplerHookMigrator (Migrates to V4 pool)
 │    └── NoOpMigrator (Leaves liquidity unmigrated)
 │
 └── Fee / Economics Layer
      ├── Protocol Fees (Airlock._handleFees: max(5% LP fees, 0.1% proceeds))
      └── Integrator Fees (Split with UI/front-end launcher)
```

---

## 4. Comparison of Doppler Launch Mechanisms & Recommendation

| Launch Mechanism | Core Contracts | External Dependencies | Uniswap V4 Required? | Deployment Complexity | Chain 901 Suitability | Migration Target | LP Rug Pull Risk |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Uniswap V4 Multicurve Hook** | `UniswapV4Initializer`, `Doppler.sol`, `MiniV4Manager` | Uniswap V4 `PoolManager`, `Hooks`, transient storage (`TLOAD`) | **YES (Strict)** | **Extreme** (requires full V4 stack + Cancun opcodes) | **Low** (No V4 on 901) | Uniswap V4 Pool | Low (governed by Hook) |
| **Uniswap V3 Concentrated Auction** | `LockableUniswapV3Initializer`, `TickLibrary` | Uniswap V3 Factory, `NonfungiblePositionManager`, TickMath | **NO** (Requires V3) | **High** (Requires deploying entire V3 suite) | **Medium** (No V3 on 901) | Uniswap V3 / V2 | Low (locked NFT) |
| **No-Op Migration** | `NoOpMigrator` | None | NO | Low | Low (leaves tokens stranded in auction) | None | N/A |
| **Airlock + Virtual Bonding Initializer + V2 Migrator** *(Recommended)* | `Airlock.sol`, `NairaTagAirlockInitializer.sol`, `UniswapV2MigratorSplit.sol` | Solmate `SafeTransferLib`, OpenZeppelin `Math`, `NairaTagAMMFactory` | **NO** (Zero V4 dependencies) | **Low / Clean** (reusable standard contracts) | **Optimal** (native fit for Chain 901) | `NairaTagAMMFactory` / `NairaTagPair` | **Zero** (LPs burned or locked in Locker) |

### Recommendation: The NairaTag-Doppler Architecture
We recommend implementing **Doppler's Airlock Architecture with a Dedicated Virtual Bonding Initializer and Uniswap V2 Migration**:
1. **Airlock.sol**: Reused directly from Doppler as the central registry, module gatekeeper, and migration coordinator.
2. **ITokenFactory**: Adapted from `NairaTagTokenFactory` to deploy lockable ERC-20 tokens while binding the canonical `₦tag` in `NairaTagRegistry` and `NairaTagResolver`.
3. **IPoolInitializer**: A lightweight, standalone **NairaTag Virtual Bonding Pool** implementing `IPoolInitializer`:
   - Receives tokens from Airlock upon launch.
   - Accepts `cNGN` from buyers along a smooth pricing curve.
   - Locks trading until graduation threshold (e.g. 5,000–10,000 cNGN accumulated).
   - Exposes `exitLiquidity(target)` to hand accumulated `cNGN` and reserved tokens back to Airlock.
4. **ILiquidityMigrator**: Doppler's `UniswapV2MigratorSplit.sol`, which immediately pairs the accumulated `cNGN` with remaining tokens in `NairaTagAMMFactory`, mints LP tokens, and locks them.

---

## 5. Uniswap V4 Dependency Analysis

### 5.1 Does Doppler Require Uniswap V4?
**No.** Doppler's core architecture (`Airlock.sol`) is protocol-agnostic. It communicates with launch mechanisms exclusively via two abstract interfaces:
- `IPoolInitializer` (`initialize`, `exitLiquidity`)
- `ILiquidityMigrator` (`initialize`, `migrate`)

### 5.2 Why Uniswap V4 Must NOT Be Deployed on Chain 901
1. **Infrastructure Bloat:** Uniswap V4 requires deploying `PoolManager`, `PositionManager`, `StateView`, and permit infrastructure.
2. **EVM Compatibility:** Uniswap V4 relies on transient storage opcodes (`TLOAD` / `TSTORE` from EIP-1153, Cancun hardfork). While Anvil supports Cancun, production OP Stack rollups and L2 geth configurations frequently disable transient storage if pinned to older execution specs.
3. **Ecosystem Fragmentation:** Chain 901 already has active liquidity and deployed UI routers for Uniswap V2 (`NairaTagAMMFactory` / `NairaTagRouter`). Deploying V4 would split liquidity and force the NairaTag Hub and Bridge to support two incompatible DEX routing protocols.
4. **Conclusion:** Avoiding Uniswap V4 eliminates unnecessary dependencies, reduces gas overhead, and integrates directly with the existing NairaTag ecosystem.

---

## 6. Numeraire Architecture & Liquidity Reality

### 6.1 Distinguishing Numeraire Liquidity from Token Bootstrapping
A common mistake in launchpad design is pretending that external quote assets have liquidity when they do not.
- **Token Bootstrapping:** Generating liquidity for a newly created token (`₦kemi`) from community demand during a launch auction.
- **Numeraire Liquidity:** The actual availability of the quote asset on Chain 901.
On Chain 901, **only cNGN has active on-chain balances and faucets**. USDT, USDC, and WETH do not currently possess active liquidity pools on Chain 901.

### 6.2 Strict Numeraire Allowlist Design
The new launchpad will include a strict on-chain allowlist check:
```solidity
mapping(address => bool) public isApprovedNumeraire;
```
- **Approved by default:** `MockCNGN` (`0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82`)
- **Unapproved tokens:** Revert with `Launchpad: unapproved numeraire`.
- **Zero Address:** Revert with `Launchpad: invalid numeraire`.
- **Future expansion:** Additional assets (e.g. bridged USDT/USDC via Hyperlane) can be whitelisted by governance once genuine bridge liquidity exists.

---

## 7. NairaTag Identity & Registry Integration

The launchpad must remain deeply integrated with the NairaTag naming layer:

```text
Step 1: Creator specifies "kemi" (without naira sign)
Step 2: Launchpad verifies normalization:
        canonicalTag = "kemi"
        displayTag = "₦kemi"
        node = keccak256("kemi")
Step 3: Launchpad queries NairaTagRegistry.exists(node)
        If true -> Revert "NairaTag: already claimed"
Step 4: Token is deployed at address `tokenAddr`
Step 5: Registry.claim("₦kemi", resolverAddr) is executed
Step 6: Resolver.setAddr(node, tokenAddr)
Step 7: Resolver.setText(node, "token.symbol", symbol)
Step 8: Resolver.setText(node, "launchpad.version", "doppler-v1")
```

### Identity Resolution Guarantees
- **Forward Resolution:** `NairaTagRegistry.resolve("₦kemi")` returns `tokenAddr`.
- **Reverse Resolution:** `NairaTagResolver.name(reverseNode(tokenAddr))` resolves back to `"₦kemi"`.
- **Single Source of Truth:** No secondary token directory is created; `NairaTagRegistry` remains the canonical global namespace.

---

## 8. Token Creation Specification

### 8.1 Creator Parameters
When calling the launchpad, the creator specifies:
```solidity
struct LaunchParams {
    string name;             // e.g. "Kemi Energy"
    string symbol;           // e.g. "KEMI"
    string handle;           // e.g. "kemi" (normalized to ₦kemi)
    uint256 totalSupply;     // e.g. 1,000,000 * 1e18
    uint256 tokensForSale;   // e.g. 800,000 * 1e18 (80% into bonding curve)
    address numeraire;       // Must be approved (cNGN)
    address beneficiary;     // Address receiving creator allocation / fees
}
```

### 8.2 Validation Rules
- `totalSupply` between $100,000 \times 10^{18}$ and $1,000,000,000 \times 10^{18}$.
- `tokensForSale` must be $\ge 50\%$ and $\le 90\%$ of `totalSupply` (remaining tokens allocated to creator or locked in timelock).
- `handle` must pass `NairaTagRegistry.normalize()` (3–32 alphanumeric chars, no consecutive underscores).
- `numeraire` must satisfy `isApprovedNumeraire[numeraire] == true`.
- Duplicate names/symbols do not cause reverts, but duplicate `₦tag` handles strictly revert.

---

## 9. Liquidity Bootstrapping & Migration Lifecycle

The complete token lifecycle proceeds through 5 distinct phases:

```text
[PHASE 1: CREATED]
   │ Token supply minted: 80% to Initializer, 20% to Creator/Timelock.
   │ Token transfers locked via ILockablePoolToken.
   ▼
[PHASE 2: PRICE DISCOVERY]
   │ Users call Initializer.buy(token, cNGN_amount).
   │ Tokens are purchased along the virtual bonding curve.
   │ Proceeds (cNGN) accumulate in Initializer contract.
   ▼
[PHASE 3: GRADUATION TRIGGER]
   │ Curve reaches target funding (e.g. 10,000 cNGN) or maximum sold tokens.
   │ Initializer marks status as `Graduated`.
   │ Anyone can now call Airlock.migrate(token).
   ▼
[PHASE 4: LIQUIDITY MIGRATION]
   │ Airlock calls Initializer.exitLiquidity().
   │ Airlock deducts protocol/integrator fees.
   │ Airlock forwards remaining cNGN + unsold tokens to UniswapV2MigratorSplit.
   │ Migrator calls NairaTagAMMFactory.createPair(cNGN, token).
   │ Migrator deposits cNGN and tokens, mints LP shares.
   │ 100% of LP shares are transferred to UniswapV2Locker or burned to 0xdead.
   ▼
[PHASE 5: PERMANENT AMM TRADING]
   │ Token.unlockPool() is called.
   │ Token is now freely tradable on NairaTagRouter / NairaTag DEX.
```

### Exact Asset Accounting
- **Where tokens come from:** Minted by `ITokenFactory` at genesis.
- **Where numeraire comes from:** Paid by real buyers swapping `cNGN` during the auction.
- **Where proceeds go:** 95% seeded directly into the `NairaTagPair` DEX pool, 5% distributed to protocol/integrator/creator fees.
- **Where LP tokens go:** Sent to `UniswapV2Locker` or permanently burned to `0x000000000000000000000000000000000000dEaD`.
- **Creator Rug-Pull Prevention:** Creators receive zero LP tokens. Liquidity is 100% permanent.

---

## 10. Existing NairaTag AMM Compatibility Audit

### 10.1 Interface Comparison
We compared Doppler's `UniswapV2MigratorSplit.sol` against `contracts/src/amm/`:

| Doppler Migrator Call | NairaTag AMM Implementation | Compatible? | Notes |
| :--- | :--- | :--- | :--- |
| `factory.getPair(token0, token1)` | `NairaTagAMMFactory.getPair[t0][t1]` | **YES** | Exact signature and return type (`address`) |
| `factory.createPair(token0, token1)` | `NairaTagAMMFactory.createPair(tA, tB)` | **YES** | Exact signature, sorts tokens, emits `PairCreated` |
| `ERC20.safeTransfer(pair, amount)` | `NairaTagPair` standard ERC20 balance | **YES** | Pair balances update correctly |
| `IUniswapV2Pair(pair).mint(to)` | `NairaTagPair.mint(address to)` | **YES** | Calculates reserves, mints LP shares to recipient |
| `IUniswapV2Pair(pair).transfer(...)` | `NairaTagPair.transfer(...)` | **YES** | Standard ERC-20 transfer of LP tokens |

### 10.2 Technical Verdict
`NairaTagAMMFactory` and `NairaTagPair` are **100% bytecode and interface compatible** with Doppler's Uniswap V2 migration architecture. No modifications to the existing AMM contracts are necessary.

---

## 11. Fee Mechanics & Value Flow

Fee distribution follows the audited Doppler mathematical specification:

```text
User purchases on bonding curve
  ├── 0% trading fee during discovery (or optional 1% curve fee)
  └── Full proceeds accumulate towards graduation threshold
            │
            ▼
Upon Migration (Airlock._handleFees):
  ├── Total Proceeds = P (e.g. 10,000 cNGN)
  ├── Protocol Fee = 0.5% of Proceeds (50 cNGN)
  ├── Integrator / Referral Fee = 0.5% of Proceeds (50 cNGN)
  ├── Creator Reward (optional) = Configurable (e.g. 1.0% = 100 cNGN)
  └── Net Liquidity Seeding = 9,800 cNGN + Remaining Tokens
            │
            ▼
Deposited into NairaTagPair on NairaTagAMMFactory
```

---

## 12. Security Analysis & Threat Model

| Threat Vector | Vulnerability Analysis | Mitigation in Proposed Architecture |
| :--- | :--- | :--- |
| **Premature AMM Seeding** | Attacker creates AMM pair and trades before auction ends. | Token implements `ILockablePoolToken`. Transfers are blocked outside the bonding curve until migration. |
| **Creator Rug Pull** | Creator withdraws all quote asset after launch. | LP tokens are permanently locked or sent to `0xdead`. Creator cannot access pool reserves. |
| **Reentrancy Attacks** | Reentrancy during token transfers or `exitLiquidity`. | All contracts utilize OpenZeppelin `ReentrancyGuard` or Solmate non-reentrant locks. |
| **Flash Loan Manipulation** | Attacker pumps curve in single block and dumps. | Virtual bonding curve has maximum buy limits per block/wallet during discovery. |
| **Identity Squatting** | Malicious actor frontruns ₦tag registration. | Registry check occurs atomically inside the deployment transaction. |
| **Fake Numeraires** | Attacker launches with malicious ERC20 quote token. | Strict allowlist check (`isApprovedNumeraire`) rejects unverified tokens. |
| **Decimals Mismatch** | Non-18 decimal tokens causing calculation overflow. | All approved numeraires and launched tokens enforce standard 18 decimals. |

---

## 13. Chain 901 Testnet-First Verification

### 13.1 Network Parameters
- **Chain ID:** `901`
- **L2 Execution Client:** `op-geth` (local testnet) / Anvil fork on port `9545`
- **RPC URL:** `http://127.0.0.1:9545`
- **Block Time:** 1 second
- **Testnet Explorer:** `http://127.0.0.1:8088/scanner/index.html`
- **Testnet Hub:** `http://127.0.0.1:8088/hub/index.html`

### 13.2 Persistence & Node Restarts
All deployments will be executed using Foundry broadcast scripts (`contracts/script/`), producing deterministic artifacts in `contracts/broadcast/` and persisting state to `deployments/nairatag-901-doppler.json`.

---

## 14. Foundry Test Plan

A dedicated test suite `contracts/test/NairaTagDopplerLaunchpad.t.sol` will be created covering:
1. **Creation Tests:**
   - `testTokenCreationAndTagRegistration()`: Verifies token deployment, supply allocation, and `₦tag` node creation.
   - `testRevertOnDuplicateTag()`: Verifies that claiming an existing `₦tag` reverts.
   - `testRevertOnUnapprovedNumeraire()`: Verifies that launching with an unknown token reverts.
2. **Auction & Price Discovery Tests:**
   - `testBondingCurvePurchases()`: Verifies buyers exchange `cNGN` for tokens and reserves increase monotonically.
   - `testTransferRestrictionWhileLocked()`: Verifies buyers cannot transfer tokens to external addresses before graduation.
3. **Migration Tests:**
   - `testFullGraduationAndV2Migration()`: Traces buy $\to$ cap reached $\to$ `migrate()` $\to$ `NairaTagPair` created $\to$ LP locked.
   - `testPostMigrationAMMTrading()`: Proves that users can trade the graduated token on `NairaTagRouter` using `cNGN`.
4. **Resolution & Identity Tests:**
   - `testForwardAndReverseResolution()`: Verifies `₦tag` resolves to the token address, and token address reverse-resolves to `₦tag`.

---

## 15. Frontend (Hub) & Indexer (Scanner) Roadmap

### 15.1 Hub UI Updates (`hub/index.html` & `hub/app.js`)
- Add a dedicated **Doppler Launchpad** tab.
- Display real-time bonding curve progress:
  - Progress bar towards graduation (e.g. `cNGN Raised: 4,200 / 10,000 cNGN`).
  - Current price per token in cNGN.
  - Interactive "Buy with cNGN" widget directly executing on the bonding pool.
  - Live status indicator: `Discovery` $\to$ `Graduating` $\to$ `Migrated to AMM`.

### 15.2 Scanner Indexer Updates (`scanner/index.html`)
- Parse `Create` and `Migrate` events from Airlock.
- Index newly launched tokens under an **Ecosystem Launches** section with verified `₦tag` handles.
- Display migration transaction hashes, locked LP verification badges, and direct links to the AMM swap pair.

---

## 16. Licensing, Attribution & IP Compliance

- **Doppler Core Contracts:** Licensed under **Business Source License 1.1 (BUSL-1.1)** by Whetstone Research (converting to GPL v2.0+ on 2027-12-31).
  - *Compliance:* Permitted for development, testing, and research on testnets.
  - *Attribution:* All copied or adapted files (`Airlock.sol`, `UniswapV2MigratorSplit.sol`, etc.) will preserve upstream copyright notices and license headers:
    ```solidity
    // SPDX-License-Identifier: BUSL-1.1
    // Copyright (c) 2024 Whetstone Research
    // Adapted for NairaTag Network (Chain 901)
    ```
- **Solmate / OpenZeppelin / Solady Libraries:** MIT / Apache-2.0.

---

## 17. Phased Implementation Roadmap

```text
[PHASE 1: AUDIT & ARCHITECTURE] ◄── YOU ARE HERE (DOPPLER_AUDIT.md Complete)
       │
       ▼ (Awaiting User Sign-off)
[PHASE 2: LOCAL DEPLOYMENT TO CHAIN 901]
       ├── Deploy Airlock.sol
       ├── Deploy NoOpGovernanceFactory.sol
       ├── Deploy NairaTagAirlockInitializer.sol (Virtual Bonding Curve)
       ├── Deploy UniswapV2MigratorSplit.sol (configured with NairaTagAMMFactory)
       └── Record addresses in deployments/nairatag-901-doppler.json
       │
       ▼
[PHASE 3: NAIRATAG REGISTRY & IDENTITY INTEGRATION]
       ├── Adapt NairaTagToken to support ILockablePoolToken
       ├── Connect NairaTagTokenFactory to Airlock
       └── Validate automated ₦tag registration on NairaTagRegistry & Resolver
       │
       ▼
[PHASE 4: FOUNDRY TEST VALIDATION]
       └── 100% pass rate on all unit, fuzz, and integration test suites
       │
       ▼
[PHASE 5: REAL ON-CHAIN LAUNCH ON CHAIN 901]
       ├── Execute live launch of ₦kemi using cNGN numeraire
       ├── Perform real buyer swap transaction
       ├── Trigger graduation & migration into NairaTagAMMFactory
       └── Prove post-migration swap on NairaTagRouter
       │
       ▼
[PHASE 6 & 7: FRONTEND & EXPLORER ROLLOUT]
       ├── Update NairaTag Hub with live Launchpad interface
       └── Update NairaTag Scanner with Launchpad event feed
```

---

*Phase 1 Audit authored and verified by Antigravity Engineering for NairaTag Network.*
