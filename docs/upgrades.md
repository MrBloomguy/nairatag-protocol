# NairaTag Network — OP Stack Upgrades Guide

## Philosophy: Clean Upstream Alignment

NairaTag does not fork OP Stack consensus or execution logic. By keeping all NairaTag identity logic in application-layer smart contracts and client SDKs, network upgrades mirror upstream OP Stack standard hard forks.

## Version Pinning

| Layer | Component | Pinned Version | Tracking Branch / Tag |
| :--- | :--- | :--- | :--- |
| Execution | `op-reth` | `v1.2.0` | `main` |
| Rollup Node | `op-node` | `v1.11.0` | `optimism/v1.11.0` |
| Batcher | `op-batcher` | `v1.11.0` | `optimism/v1.11.0` |
| Proposer | `op-proposer` | `v1.11.0` | `optimism/v1.11.0` |
| Contracts | `op-contracts` | `v1.8.0` | `op-contracts/v1.8.0` |

## Upgrade Procedure
1. **Network Fork Activation**: Configure activation timestamps in `rollup.json` (e.g., Granite, Holocene, Isthmus, Interop).
2. **Client Binary Updates**: Upgrade node binaries (`op-node`, `op-reth`) prior to the fork timestamp.
3. **Contract Proxy Upgrades**: Upstream contracts use OpenZeppelin-compatible proxy patterns managed by the `ProxyAdmin` contract. Upgrades are staged on Sepolia before Mainnet application.
4. **State Preservation**: The `NairaTagRegistry` state, tag balances, and resolution mappings remain untouched across OP Stack hard forks.
