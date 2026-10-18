# NairaTag Launchpad Economic Model & Numerical Scenarios
## Phase 1.5 Verification Audit

**Scope:** Economic analysis across graduation tiers, liquidity depth, price impact, and upstream vs. NairaTag fee structures.

---

## 1. Upstream Doppler Fee Economics vs. NairaTag Economics

### 1.1 Upstream Doppler Default Fee Logic (`Airlock.sol` lines 237–252)
From upstream source:
```solidity
uint256 protocolLpFees = fees / 20;               // 5% of trading fees
uint256 protocolProceedsFees = (balance - fees) / 1000; // 0.1% of proceeds
uint256 protocolFees = Math.max(protocolLpFees, protocolProceedsFees);
uint256 maxProtocolFees = fees / 5;               // Capped at 20% of trading fees
```
* **Proceeds Fee:** Exactly **0.1%** ($1/1000$).
* **Trading Fee Cut:** Up to 20% of collected swap fees.
* **Integrator Share:** Front-end integrators receive the remaining trading fees.

### 1.2 Proposed NairaTag Launchpad Economics (Explicitly Labeled)
For NairaTag Chain 901, we propose the following **NairaTag Economics**:
* **Protocol Fee on Graduation:** 0.5% of accumulated `cNGN` proceeds.
* **Front-End Integrator Fee:** 0.5% of accumulated `cNGN` proceeds.
* **Net Liquidity Deposited to AMM:** **99.0%** of accumulated `cNGN` proceeds.
* **Creator Reward:** 0% upfront drain (creator holds pre-minted team/timelock allocation or can be granted an optional 1.0% creator fee if specified at launch).

---

## 2. Graduation Scenario Analysis

Using the standard continuous token parameters:
* Total Supply: $1,000,000$ tokens ($10^{18}$ decimals)
* Tokens Sold on Curve: $600,000$ tokens ($60\%$)
* Tokens Deposited into AMM: $400,000$ tokens ($40\%$)

| Metric | Scenario A (Micro Tier) | Scenario B (Standard Tier) | Scenario C (Flagship Tier) |
| :--- | :--- | :--- | :--- |
| **`cNGN` Graduation Target ($C_{target}$)** | **10,000 cNGN** | **100,000 cNGN** | **1,000,000 cNGN** |
| **Initial Curve Price ($P_0$)** | 0.00833 cNGN | 0.08333 cNGN | 0.83333 cNGN |
| **Final Curve Price ($P_f$)** | 0.02500 cNGN | 0.25000 cNGN | 2.50000 cNGN |
| **Price Growth During Discovery** | **3.0x** | **3.0x** | **3.0x** |
| **Graduation Market Cap (Circulating)** | 15,000 cNGN | 150,000 cNGN | 1,500,000 cNGN |
| **Graduation Fully Diluted Valuation (FDV)**| 25,000 cNGN | 250,000 cNGN | 2,500,000 cNGN |
| **AMM Initial Reserves (`cNGN`)** | 9,900 cNGN | 99,000 cNGN | 990,000 cNGN |
| **AMM Initial Reserves (`TOKEN`)** | 400,000 tokens | 400,000 tokens | 400,000 tokens |
| **Initial AMM Launch Price** | **0.02475 cNGN** | **0.24750 cNGN** | **2.47500 cNGN** |
| **Price Discontinuity at Migration** | **-1.0% (Fee Delta)** | **-1.0% (Fee Delta)** | **-1.0% (Fee Delta)** |

---

## 3. Post-Migration Liquidity Depth & Price Impact

Using the standard Uniswap V2 constant product formula:
$$\Delta y = \frac{y \cdot \Delta x \cdot 0.997}{x + \Delta x \cdot 0.997}$$

For a user buying with **1,000 cNGN** on the newly migrated pool:

### Scenario A (10,000 cNGN Pool)
* Initial Reserves: $x = 9,900 \text{ cNGN}$, $y = 400,000 \text{ tokens}$.
* Tokens Received: $\approx 36,603 \text{ tokens}$.
* Effective Price: $\approx 0.0273 \text{ cNGN / token}$.
* **Price Impact:** $\approx \mathbf{9.1\%}$. (Appropriate for micro memecoins; encourages gradual trading).

### Scenario B (100,000 cNGN Pool)
* Initial Reserves: $x = 99,000 \text{ cNGN}$, $y = 400,000 \text{ tokens}$.
* Tokens Received: $\approx 3,988 \text{ tokens}$.
* Effective Price: $\approx 0.2507 \text{ cNGN / token}$.
* **Price Impact:** $\approx \mathbf{0.99\%}$. (Deep, institutional-grade liquidity).

### Scenario C (1,000,000 cNGN Pool)
* Initial Reserves: $x = 990,000 \text{ cNGN}$, $y = 400,000 \text{ tokens}$.
* Tokens Received: $\approx 403 \text{ tokens}$.
* **Price Impact:** $\approx \mathbf{0.10\%}$. (Virtually zero slippage for retail trades).
