# Doppler Core License Audit & Legal Compliance
## Phase 1.5 Verification Audit

**Upstream Repository:** [`whetstoneresearch/doppler`](https://github.com/whetstoneresearch/doppler)  
**License Inspected:** [`LICENSE`](https://raw.githubusercontent.com/whetstoneresearch/doppler/main/LICENSE)  
**Date of Audit:** September 15, 2026  

---

## 1. Upstream License Parameters

```text
License Name:            Business Source License 1.1 (BUSL-1.1)
Licensor:                Whetstone Research
Licensed Work:           Doppler Core, (c) 2024 Whetstone Research
Additional Use Grant:    Defined at doppler-license-grants.whetstoneresearch.eth
Change Date:             Earlier of 2027-12-31 or date specified by Licensor
Change License:          GNU General Public License v2.0 or later (GPL-2.0+)
```

---

## 2. Permitted Uses vs. Production Restrictions

### 2.1 Permitted Uses (Non-Production & Testing)
Under BUSL-1.1 Section Terms:
> *"The Licensor hereby grants you the right to copy, modify, create derivative works, redistribute, and make non-production use of the Licensed Work."*

* **Local Devnet & Testnet:** Deploying on local OP Stack chains (Chain 901), Anvil, and testnets for research, evaluation, and integration testing is fully permitted.
* **Modification & Adaptation:** Modifying files to interface with NairaTag contracts is expressly permitted.

### 2.2 Production Restrictions
* **Commercial Production Restriction:** Any production deployment carrying commercial user value prior to the Change Date (December 31, 2027) requires an Additional Use Grant from Whetstone Research or a commercial license.
* **Effective Change Date:** On or before December 31, 2027, the license automatically converts to **GNU General Public License v2.0 or later**, at which point production use is open-source under GPL terms.

---

## 3. Third-Party Dependency Licenses

All external libraries referenced by Doppler were audited:

| Dependency | Upstream Author | License | Compatibility with NairaTag |
| :--- | :--- | :--- | :--- |
| **OpenZeppelin Contracts** | OpenZeppelin | **MIT** | Fully compatible |
| **Solmate** | transmissions11 / Paradigm | **Apache-2.0 / MIT** | Fully compatible |
| **Solady** | vectorized / Vectorized | **MIT / Apache-2.0** | Fully compatible |
| **Uniswap Core / Periphery** | Uniswap Labs | **BUSL-1.1 / GPL-2.0** | Not imported on Chain 901 |

---

## 4. Mandatory Attribution Notice

All contracts incorporating or adapting Doppler code must include the following header:
```solidity
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2024 Whetstone Research
// Portions adapted for NairaTag Network (Chain 901)
```
This compliance notice will be included on all deployed Airlock and migrator modules.
