# NairaTag Virtual Bonding Curve Mathematical Specification
## Phase 1.5 Verification Audit

**Status:** Mathematical Specification  
**Architecture Distinction:** This is custom NairaTag financial primitive code implementing Doppler's generic `IPoolInitializer` interface. It is **not** an upstream Doppler hook.

---

## 1. Mathematical Model & Notation

Let:
* $S$: Total supply of token $= 1,000,000 \times 10^{18}$ (18 decimals).
* $T_{sale}$: Tokens allocated for bonding curve sale $= 800,000 \times 10^{18}$ (80% of supply).
* $R_{token}$: Tokens reserved for AMM migration pool $= 200,000 \times 10^{18}$ (20% of supply).
* $C_{target}$: Target `cNGN` proceeds required for graduation $= 10,000 \times 10^{18}$ cNGN.
* $x$: Cumulative tokens sold, where $0 \le x \le T_{sale}$.
* $P(x)$: Marginal price per token at cumulative supply $x$.
* $C(x)$: Cumulative `cNGN` required to buy from $0$ to $x$.

---

## 2. Price Curve Formulation

To ensure smooth price progression, we utilize a **linear affine bonding curve**:
$$P(x) = P_0 + m \cdot x$$

Where:
* $P_0$: Initial price at $x = 0$.
* $P_f$: Final marginal price at $x = T_{sale}$.
* $m$: Slope of the curve $= \frac{P_f - P_0}{T_{sale}}$.

### 2.1 Integral Cost Function
The cumulative `cNGN` required to purchase $x$ tokens from genesis is:
$$C(x) = \int_0^x (P_0 + m \cdot u) \, du = P_0 \cdot x + \frac{m}{2} x^2$$

The total `cNGN` accumulated when all $T_{sale}$ tokens are sold is:
$$C(T_{sale}) = P_0 \cdot T_{sale} + \frac{P_f - P_0}{2} T_{sale} = \left( \frac{P_0 + P_f}{2} \right) T_{sale} = C_{target}$$

---

## 3. AMM Migration Price Continuity (Zero-Discontinuity Theorem)

A critical flaw in naive launchpads is a **price cliff** between the last bonding curve purchase and the initial AMM price.

### 3.1 AMM Initial Price Formula
When migration occurs, the net accumulated `cNGN` ($C_{target}$ minus protocol fees $F$) and the reserved tokens $R_{token}$ are deposited into the AMM:
$$P_{AMM} = \frac{C_{target} - F}{R_{token}}$$

Assuming protocol fees of $1\%$ ($F = 0.01 \cdot C_{target}$):
$$P_{AMM} = \frac{0.99 \cdot C_{target}}{R_{token}}$$

### 3.2 Setting Continuous Parameters
For $C_{target} = 10,000 \text{ cNGN}$ and $R_{token} = 200,000 \text{ tokens}$:
$$P_{AMM} = \frac{9,900}{200,000} = 0.0495 \text{ cNGN / token}$$

To ensure zero price shock upon graduation, we set the final curve price equal to the AMM launch price:
$$P_f = P_{AMM} = 0.0495 \text{ cNGN / token}$$

Solving for initial price $P_0$:
$$\frac{P_0 + P_f}{2} \cdot T_{sale} = C_{target}$$
$$P_0 + 0.0495 = \frac{2 \cdot 10,000}{800,000} = 0.0250$$
$$P_0 = -0.0245 \quad (\text{impossible for linear if } R_{token} \text{ is too small})$$

### 3.3 The Parameter Resolution for Clean Continuity
To maintain $P_0 > 0$ and $P_f = P_{AMM}$, the ratio $\frac{T_{sale}}{R_{token}}$ and the curve shape must satisfy:
$$\frac{P_0 + P_f}{2} = \frac{C_{target}}{T_{sale}}$$
$$P_f = \frac{C_{target}}{R_{token}} \implies \frac{P_0 + \frac{C_{target}}{R_{token}}}{2} = \frac{C_{target}}{T_{sale}}$$
$$P_0 = C_{target} \left( \frac{2}{T_{sale}} - \frac{1}{R_{token}} \right)$$

For $P_0 > 0$, we require:
$$\frac{2}{T_{sale}} > \frac{1}{R_{token}} \iff T_{sale} < 2 R_{token}$$

**Standardized NairaTag Parameters:**
* **Total Supply:** $S = 1,000,000 \times 10^{18}$ tokens.
* **Bonding Curve Sale ($T_{sale}$):** $600,000 \times 10^{18}$ (60%).
* **AMM Liquidity Seeding ($R_{token}$):** $400,000 \times 10^{18}$ (40%).
* **Graduation Target ($C_{target}$):** $10,000 \times 10^{18}$ cNGN.

Calculating continuous prices:
1. $P_f = \frac{10,000}{400,000} = \mathbf{0.0250 \text{ cNGN / token}}$.
2. $P_0 = 10,000 \left( \frac{2}{600,000} - \frac{1}{400,000} \right) = 10,000 \left( \frac{4 - 3}{1,200,000} \right) = \mathbf{0.008333 \text{ cNGN / token}}$.
3. Price appreciation during curve discovery: $\frac{P_f}{P_0} = 3.0\times$ gain.
4. Initial AMM pool launches at **exactly 0.0250 cNGN**, eliminating frontrunning arbitrage between the bonding curve and DEX!

---

## 4. Buy Formula & Discrete Inversion

Given a buyer spending $\Delta c$ of `cNGN` when current cumulative tokens sold is $x_1$:
$$\Delta c = P_0 (x_2 - x_1) + \frac{m}{2} (x_2^2 - x_1^2)$$
$$\frac{m}{2} x_2^2 + P_0 x_2 - \left( \frac{m}{2} x_1^2 + P_0 x_1 + \Delta c \right) = 0$$

Using the quadratic formula:
$$x_2 = \frac{-P_0 + \sqrt{P_0^2 + 2m \left( \frac{m}{2} x_1^2 + P_0 x_1 + \Delta c \right)}}{m}$$
Tokens received: $\Delta x = x_2 - x_1$.

---

## 5. Buy-Only vs. Buy+Sell Decision

| Feature | Buy-Only During Discovery | Buy + Sell During Discovery |
| :--- | :--- | :--- |
| **Solvency Risk** | **Zero.** Curve only accumulates; cannot suffer bank run. | High. Must maintain liquid quote reserves for redemptions. |
| **Reentrancy Exposure** | Low. Standard ERC20 transfer-in. | High. Reentrancy during refund/burn. |
| **MEV / Sandwiching** | Low. Buyers only move price upward. | Severe. Flash-loan pump $\to$ dump in same block. |
| **Exit Mechanism** | Upon graduation to AMM, or full refund on timeout. | Immediate on bonding curve. |

**Final Recommendation:** **BUY-ONLY during price discovery** for Phase 2.
* Buyers cannot dump on the curve during the auction.
* Liquidity is guaranteed to build monotonically towards graduation.
* If a launch fails to graduate within **14 days**, the curve enters `ABANDONED` state, allowing all buyers to redeem 100% of their deposited `cNGN`.
