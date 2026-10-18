# Doppler / NairaTag AMM Behavioral Compatibility Matrix
## Phase 1.5 Verification Audit

**Status:** Verified via Static Source Audit & Dynamic Foundry Integration Test  
**Test File:** [`contracts/test/DopplerNairaTagCompatibility.t.sol`](file:///C:/Users/olusegun/.gemini/antigravity-ide/scratch/nairatag-network/contracts/test/DopplerNairaTagCompatibility.t.sol) (Test Suite Result: `PASS`)  
**Scope:** Behavioral compatibility between Doppler's `UniswapV2MigratorSplit.sol` / `UniswapV2Locker.sol` and the existing NairaTag DEX infrastructure (`NairaTagAMMFactory.sol`, `NairaTagPair.sol`, `NairaTagRouter.sol`).

---

## 1. Comprehensive Behavioral Comparison

The following table documents every operational assumption made by Doppler's `UniswapV2MigratorSplit` and `UniswapV2Locker`, mapped directly against the real implementation in `contracts/src/amm/`:

| Operation / Assumption | Doppler Migrator Expectation (`UniswapV2MigratorSplit`) | NairaTag AMM Implementation (`NairaTagAMMFactory` / `NairaTagPair`) | Compatible? | Exact Source Evidence & Behavioral Notes |
| :--- | :--- | :--- | :--- | :--- |
| **`factory.getPair`** | Returns `address` of pair for `(token0, token1)`, or `address(0)` if not created. | `mapping(address => mapping(address => address)) public getPair;` | **YES** | Exact match. `NairaTagAMMFactory.sol` line 8. Returns `address(0)` if pair does not exist. |
| **`factory.createPair`** | Creates pair via CREATE2, initializes it, emits `PairCreated`, returns `pair`. | `function createPair(address tokenA, address tokenB) external returns (address pair)` | **YES** | Exact match. Uses CREATE2 salt `keccak256(abi.encodePacked(t0, t1))`, calls `NairaTagPair(pair).initialize(t0, t1)`. |
| **Token Ordering** | Requires `token0 < token1`. | `(address t0, address t1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);` | **YES** | Exact match. `NairaTagAMMFactory.sol` line 17 strictly enforces `t0 < t1`. |
| **Pair Initialization** | Only `factory` may call `pair.initialize(t0, t1)`. | `require(msg.sender == factory, "NTPair: forbidden");` | **YES** | Exact match. `NairaTagPair.sol` line 46 guarantees atomic factory-only initialization. |
| **`pair.mint(to)`** | Takes pre-transferred tokens (`bal0 - r0`, `bal1 - r1`), calculates liquidity, mints LP to `to`. | `function mint(address to) external lock returns (uint256 liquidity)` | **YES** | Exact match. `NairaTagPair.sol` lines 76–93. Updates reserves, returns minted LP shares. |
| **`MINIMUM_LIQUIDITY`** | Permanently burns initial minimum liquidity shares on first mint. | `uint256 private constant MINIMUM_LIQUIDITY = 1000; _lpMint(address(0xdead), 1000);` | **YES (Harmless Difference)** | Uniswap V2 burns to `address(0)`; NairaTag burns to `address(0xdead)`. Migrator only checks returned `liquidity` to caller, so this difference is completely harmless. |
| **LP `balanceOf`** | ERC-20 `balanceOf(address) returns (uint256)` on pair. | `mapping(address => uint256) public balanceOf;` | **YES** | Exact match. Standard public mapping generates expected getter. |
| **LP `totalSupply`** | ERC-20 `totalSupply() returns (uint256)` on pair. | `uint256 public totalSupply;` | **YES** | Exact match. Public variable generates expected getter. |
| **LP `transfer`** | ERC-20 `transfer(to, value) returns (bool)` on pair. | `function transfer(address to, uint256 amount) external returns (bool)` | **YES** | Exact match. `NairaTagPair.sol` line 57. Used to distribute LP shares to locker/recipient. |
| **`pair.getReserves`** | Returns `(uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)`. | `function getReserves() public view returns (uint112 _r0, uint112 _r1, uint32 _ts)` | **YES** | Exact match. `NairaTagPair.sol` lines 51–53 returns 3-tuple with matching types. |
| **`pair.token0` / `token1`**| Public getters for token addresses on pair. | `address public token0; address public token1;` | **YES** | Exact match. Public storage variables generate matching view functions. |
| **`pair.sync()`** | Forces reserves to match balances. | `function sync() external lock` | **YES** | Exact match. `NairaTagPair.sol` line 133. |
| **`pair.burn(to)`** | Burns LP tokens held by pair, transfers underlying `(amount0, amount1)` to `to`. | `function burn(address to) external lock returns (uint256 amount0, uint256 amount1)` | **YES** | Exact match. `NairaTagPair.sol` line 96. Called by `UniswapV2Locker.claimFeesAndExit`. |
| **`factory.feeTo`** | Uniswap V2 protocol fee switch receiver. | **NOT IMPLEMENTED** in `NairaTagAMMFactory`. | **HARMLESS** | `UniswapV2MigratorSplit.sol` does NOT call `feeTo()` or `feeToSetter()`. |
| **`pair.kLast`** | Invariant $k$ recorded after fee calculation. | **NOT IMPLEMENTED** in `NairaTagPair`. | **HARMLESS** | Migrator does not call `pair.kLast()`. `UniswapV2Locker.sol` calculates `kLast = state.amount0 * state.amount1` locally. |
| **`pair.skim`** | Force-balances pool to reserves by sending excess to caller. | **NOT IMPLEMENTED** in `NairaTagPair`. | **HARMLESS** | Migrator does not use `skim`; it sweeps remaining dust via standard ERC-20 `balanceOf` transfers. |
| **`pair.swap` with data** | Flash-swap overload `swap(out0, out1, to, bytes data)`. | `NairaTagPair` only has `swap(out0, out1, to)` (no calldata). | **HARMLESS FOR MIGRATION** | Migrator never executes swaps. For user swaps, `NairaTagRouter.sol` calls the 3-argument `swap(...)`. |
| **EIP-2612 `permit`** | Gasless approvals on LP tokens. | **NOT IMPLEMENTED** in `NairaTagPair`. | **HARMLESS** | Neither `UniswapV2MigratorSplit` nor `UniswapV2Locker` calls `permit`. |

---

## 2. Critical Discrepancies Uncovered in Phase 1.5

### 2.1 LP Token Allocation Discrepancy (Crucial Finding)
* **Initial Audit Claim:** *"100% of LP shares are transferred to a locker or burned."*
* **Actual Upstream Source Inspection (`UniswapV2MigratorSplit.sol` lines 146–149):**
  ```solidity
  liquidity = IUniswapV2Pair(pool).mint(address(this));
  uint256 liquidityToLock = liquidity / 20; // 5% (1/20) locked!
  IUniswapV2Pair(pool).transfer(recipient, liquidity - liquidityToLock); // 95% sent to recipient!
  IUniswapV2Pair(pool).transfer(address(locker), liquidityToLock);
  locker.receiveAndLock(pool, recipient);
  ```
* **Implication:** In upstream Doppler, only **5%** of LP shares are locked in `UniswapV2Locker`. The remaining **95%** of LP tokens are sent directly to `recipient` (which is `assetData.timelock` passed by `Airlock`). If `recipient` is configured as a creator address or multisig, the creator gains control of 95% of the pool's LP tokens.
* **Required NairaTag Action:** For NairaTag launches, `UniswapV2MigratorSplit` must either:
  1. Pass `address(0xdead)` as the `recipient`, permanently burning the 95% LP allocation, OR
  2. Be configured/adapted to lock 100% of the LP tokens in `UniswapV2Locker`.

### 2.2 512-Bit Fixed-Point Math Requirement (`FullMath.mulDiv`)
* When computing `depositAmount0` and `depositAmount1` from `sqrtPriceX96`:
  $$\text{ratioX192} = \text{sqrtPriceX96}^2$$
  $$\text{depositAmount0} = \text{balance1} \cdot \frac{2^{192}}{\text{ratioX192}}$$
* Because $10,000 \times 10^{18} \times 2^{192} \approx 6.27 \times 10^{79}$, this multiplication **strictly overflows uint256** ($2^{256} - 1 \approx 1.15 \times 10^{77}$).
* Doppler requires a full 512-bit `mulDiv` implementation with all 6 Newton-Raphson Hensel-lifting steps to avoid precision truncation and EVM reverts during migration.

---

## 3. Dynamic Integration Test Verification

The integration test [`DopplerNairaTagCompatibility.t.sol`](file:///C:/Users/olusegun/.gemini/antigravity-ide/scratch/nairatag-network/contracts/test/DopplerNairaTagCompatibility.t.sol) was executed against the exact NairaTag AMM bytecode:

1. **Pre-initialization:** `factory.createPair(token, cNGN)` created `NairaTagPair`.
2. **Deposit & Mint:** 200,000 `TEST` and 10,000 `cNGN` were transferred into the migrator.
3. **Migration:** `executeMigration` deposited the calculated reserve amounts, called `pair.mint()`, and split LP shares.
4. **Post-Migration DEX Trading:**
   - Real buyer called `NairaTagRouter.swapExactTokensForTokens(500 cNGN, ...)` and received `TEST` tokens.
   - Real buyer swapped `TEST` back to `cNGN` through `NairaTagRouter`.
5. **Result:** `[PASS] testDopplerMigrationToNairaTagPair() (gas: 2017767)` in `43.09ms`.

### Verdict
The existing `NairaTagAMMFactory` and `NairaTagPair` contracts are **behaviorally compatible** with Doppler's Uniswap V2 migration path, provided that LP token distribution parameters and 512-bit `mulDiv` routines are strictly enforced.
