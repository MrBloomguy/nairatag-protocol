# NairaTag Network — Configuration Guide

## Centralized Environment Variables

All network and script parameters are controlled from a single configuration file. Never hardcode network parameters in individual scripts.

### Terminology Reference
* **Ethereum**: The L1 settlement layer.
* **Sepolia**: The public Ethereum L1 testnet.
* **NairaTag Network**: The OP Stack-based Ethereum Layer 2 rollup.
* **NairaTag Devnet**: The local Layer 2 development rollup.

---

### Development Environment (`config/development.env`)

```env
# Layer 2 Rollup Identity
NAIRATAG_NETWORK_NAME=NairaTag Devnet
NAIRATAG_SHORT_NAME=NairaTag
NAIRATAG_ENVIRONMENT=development
NAIRATAG_CHAIN_ID=901
NAIRATAG_NATIVE_SYMBOL=ETH
NAIRATAG_NATIVE_NAME=Ether
NAIRATAG_NATIVE_DECIMALS=18

# Layer 1 Settlement Layer (Local Ethereum Devnet)
L1_NETWORK=local
L1_CHAIN_ID=900
L1_RPC_URL=http://127.0.0.1:8545

# Layer 2 Rollup Endpoints
L2_NETWORK=devnet
L2_RPC_URL=http://127.0.0.1:9545

# OP Stack Internal Services
SEQUENCER_RPC_URL=http://127.0.0.1:9545
BATCHER_RPC_URL=http://127.0.0.1:8548
PROPOSER_RPC_URL=http://127.0.0.1:8549

# Devnet Ports
L1_HTTP_PORT=8545
L2_HTTP_PORT=9545
L2_ENGINE_PORT=8551
OP_NODE_PORT=8547

# Pre-funded Test Accounts
DEV_DEPLOYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
DEV_DEPLOYER_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
DEV_USER_PRIVATE_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
DEV_USER_ADDRESS=0x70997970C51812dc3A010C7d01b50e0d17dc79C8
```

---

### Sepolia Testnet Environment (`config/sepolia.env.example`)

```env
# Layer 2 Rollup Identity
NAIRATAG_NETWORK_NAME=NairaTag Sepolia Testnet
NAIRATAG_SHORT_NAME=NairaTag
NAIRATAG_ENVIRONMENT=testnet
NAIRATAG_CHAIN_ID=902
NAIRATAG_NATIVE_SYMBOL=ETH
NAIRATAG_NATIVE_NAME=Sepolia Ether
NAIRATAG_NATIVE_DECIMALS=18

# Layer 1 Settlement Layer (Ethereum Sepolia)
L1_NETWORK=sepolia
L1_CHAIN_ID=11155111
L1_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com

# Layer 2 Rollup Public RPC
L2_RPC_URL=https://sepolia-rpc.nairatag.network

# OP Stack Operational Keys (Never commit production private keys)
SEPOLIA_DEPLOYER_PRIVATE_KEY=
SEPOLIA_BATCHER_PRIVATE_KEY=
SEPOLIA_PROPOSER_PRIVATE_KEY=
SEPOLIA_SEQUENCER_PRIVATE_KEY=
```

---

### Production Environment (`config/production.env.example`)

```env
# Layer 2 Rollup Identity
NAIRATAG_NETWORK_NAME=NairaTag Network
NAIRATAG_SHORT_NAME=NairaTag
NAIRATAG_ENVIRONMENT=production
NAIRATAG_CHAIN_ID=779
NAIRATAG_NATIVE_SYMBOL=ETH
NAIRATAG_NATIVE_NAME=Ether
NAIRATAG_NATIVE_DECIMALS=18

# Layer 1 Settlement Layer (Ethereum Mainnet)
L1_NETWORK=mainnet
L1_CHAIN_ID=1
L1_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# Layer 2 Rollup Public RPC
L2_RPC_URL=https://rpc.nairatag.network
```
