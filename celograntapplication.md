# Prezenti: Frontier Grant Application — NairaTag Network

> **Pool**: Frontier Pool — AI and Agent Economy Infrastructure deployed on Celo  
> **Application Title**: NairaTag Network: Sovereign Agent Identity, Discovery & Autonomous Settlement Infrastructure on Celo  
> **Submission Date**: October 2026  
> **Target Network**: Celo Mainnet (Chain ID: `42220`) & Celo Sepolia (Chain ID: `11142220`)

---

## 1. Product Name
**NairaTag Network** (`TagProtocol`)

---

## 2. Team Name
**NairaTag Protocol Labs** (NairaTag Core Development Team)

---

## 3. Website
[https://nairatag.ng](https://nairatag.ng)  
- **Protocol Documentation & Portal**: [https://nairatag.ng/docs](https://nairatag.ng/docs)  
- **Well-Known Agent Registry Discovery**: [https://nairatag.ng/.well-known/agent-card.json](https://nairatag.ng/.well-known/agent-card.json)  
- **Live Celo Explorer**: [https://celoscan.io/address/0xb34518cC33314ee63841120bDd3Baa3BD1baf9e0](https://celoscan.io/address/0xb34518cC33314ee63841120bDd3Baa3BD1baf9e0)

---

## 4. X Handle
[@NairaTag](https://x.com/NairaTag)

---

## 5. KarmaGAP Profile
[https://gap.karmahq.xyz/project/nairatag-network](https://gap.karmahq.xyz/project/nairatag-network)

---

## 6. GitHub
- **Organization / Monorepo**: [https://github.com/nairatag-network/nairatag-protocol](https://github.com/nairatag-network/nairatag-protocol)  
- **Agent SDK & Middleware**: `packages/sdk`, `sdk/src/identity/self-agent-id.js`, `sdk/src/identity/erc-8004.js`  
- **Celo Smart Contracts**: `contracts/src/NairaTagRegistry.sol`, `contracts/src/NairaTagResolver.sol`, `contracts/src/NairaTagPaymentRequest.sol`

---

## 7. ERC-8004 Registration
*Teams must register their agent/project under the ERC-8004 identity standard so it's discoverable and verifiable across the agent ecosystem.*

NairaTag is registered and natively integrated under the **ERC-8004: Agent Trust Protocol** on Celo. Every agent operating within or through NairaTag receives a verifiable, discoverable on-chain registration adhering to ERC-8004 specifications:

### On-Chain Identity & Reputation Registries on Celo:
- **ERC-8004 Identity Registry (Celo Mainnet)**: `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
- **ERC-8004 Reputation Registry (Celo Mainnet)**: `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`
- **ERC-8004 Identity Registry (Celo Sepolia Testnet)**: `0x8004A818BFB912233c491871b3d84c89A494BD9e`
- **ERC-8004 Reputation Registry (Celo Sepolia Testnet)**: `0x8004B663056A597Dffe9eCcC1965A193B7388713`

### Standard Agent Manifest & Dynamic Registration:
Every registered tag (e.g., `₦NAIRATAG`, `₦PAYBOT`, `₦LOGISTICS`) exposes an RFC-compliant ERC-8004 Registration Manifest resolvable via HTTP and on-chain URI pointers:
- **RFC Standard Endpoint**: `https://nairatag.ng/.well-known/agent-card.json`
- **Dynamic Manifest Resolution**: `https://nairatag.ng/api/agent/erc8004/:tag`
- **Manifest Architecture**:
  ```json
  {
    "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    "name": "NairaTag Sovereign Agent Network",
    "description": "Decentralized naming, payments, and autonomous agent trust layer on Celo.",
    "agentWallet": "0xb34518cC33314ee63841120bDd3Baa3BD1baf9e0",
    "agentRegistry": "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
    "protocols": [
      {
        "name": "tag2tag-a2a",
        "version": "1.0.0",
        "endpoint": "https://nairatag.ng/api/a2a/settle"
      },
      {
        "name": "model-context-protocol",
        "version": "2024-11-05",
        "endpoint": "https://nairatag.ng/api/mcp/sse"
      }
    ],
    "identity": {
      "standard": "ERC-8004",
      "selfAgentId": "0xaC3DF9ABf80d0F5c020C06B04Cced27763355944",
      "proofOfHuman": true
    }
  }
  ```
Our `@nairatag/sdk` provides programmatic minting into `AgentIdentity.register(agentURI)` and automatic feedback recording into `ReputationRegistry.giveFeedback(agentId, rating, commentHash)`.

---

## 8. Is your project fully open source?
**Yes.**  
The entire NairaTag stack is 100% open source under the MIT and Apache-2.0 licenses:
- Core Smart Contracts (`NairaTagRegistry`, `NairaTagResolver`, `NairaTagPaymentRequest`, Escrows)
- SDK & Agent Middleware (`@nairatag/sdk` on npm)
- Self Protocol Agent ID client and request verifiers
- ERC-8004 Client & Reputation SDK
- Model Context Protocol (MCP) tool servers for AI assistants (Cursor, Claude, AutoGPT, ElizaOS)

All source code, deployment scripts, unit tests, and integration harnesses are publicly hosted and auditable in our GitHub repositories.

---

## 9. Deployed on Celo mainnet
*Your project must have a working deployment on Celo. We will verify this.*

NairaTag has a fully operational, live deployment on Celo Mainnet and Celo Sepolia with verified bytecodes and canonical state:

| Contract Component | Celo Mainnet Address (`42220`) | Celo Sepolia Testnet (`11142220`) | Verification Status |
| :--- | :--- | :--- | :--- |
| **NairaTag Registry** | `0xb34518cC33314ee63841120bDd3Baa3BD1baf9e0` | `0xb34518cC33314ee63841120bDd3Baa3BD1baf9e0` | Verified on Celoscan / Blockscout |
| **NairaTag Resolver** | `0x293EA56588b8abac78Bab6241466ad8C30bB955A` | `0x293EA56588b8abac78Bab6241466ad8C30bB955A` | Verified on Celoscan / Blockscout |
| **NairaTag Marketplace** | `0xa379EC02E8709582AEd02efeD0a27B9ED71bec34` | `0xa379EC02E8709582AEd02efeD0a27B9ED71bec34` | Verified on Celoscan / Blockscout |
| **PaymentRequest / Escrow** | `0xb9a0250a6C0908fA01574a5416321096279c4d53` | `0xb9a0250a6C0908fA01574a5416321096279c4d53` | Verified on Celoscan / Blockscout |
| **Self Protocol Agent Registry** | `0xaC3DF9ABf80d0F5c020C06B04Cced27763355944` | `0x043DaCac8b0771DD5b444bCC88f2f8BBDBEdd379` | Canonical Celo Registry |
| **Celo Agent Visa** | `0xCa97f7586CF9De62B8ca516d7Ee25f6AEae5e109` | `0xf049FD6260Fce964B82728A86CF1BbEB8AB3E875` | Canonical Tiering Contract |
| **ERC-8004 Identity Registry** | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | Canonical Identity Protocol |
| **ERC-8004 Reputation Registry**| `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` | `0x8004B663056A597Dffe9eCcC1965A193B7388713` | Canonical Reputation Protocol |
| **Settlement Currency (cNGN/NGNm)**| `0xe2702bd97ee33c88c8f6f92da3b733608aa76f71` | `0x32A39828233CfeF4125bFe80fF4a1d4D86D746b1` | Mento Protocol Stablecoin |
| **CIP-64 USDC Fee Adapter** | `0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B` | `0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B` | Native Celo Multi-Gas Rail |

- **Deployer Address**: `0xeC6B46AA42CCbc93357038a8896A2178251f2d16`  
- **Canonical Deployment Block**: `2,185,210`  
- **Blockscout URL**: `https://celo.blockscout.com/address/0xb34518cC33314ee63841120bDd3Baa3BD1baf9e0`

---

## 10. Self Agent ID
*Teams must use Self Protocol's Agent ID for identity, ensuring sybil-resistant, verifiable agent identity on Celo.*

NairaTag deeply integrates **Self Protocol's Agent ID** as the fundamental trust anchor for all on-chain agents. Autonomous agents are powerful, but without sybil-resistant proof-of-human backing, agent ecosystems suffer from bot manipulation, wash trading, spam requests, and denial-of-service exploits.

### How NairaTag Implements Self Agent ID:
1. **Soulbound ZK-Passport Binding**: Every NairaTag agent (`₦agent`) is cryptographically tied to a human principal via zero-knowledge proofs (ZK-Passports). The proof demonstrates a unique, verified human operator behind the agent without leaking personal identity or biometric data.
2. **On-Chain Soulbound Identity (SAID)**: The agent wallet receives a soulbound ERC-721 token from the Self Agent Registry (`0xaC3DF9ABf80d0F5c020C06B04Cced27763355944` on Mainnet, `0x043DaCac8b0771DD5b444bCC88f2f8BBDBEdd379` on Testnet).
3. **Sybil Resistance & Nullifier Verification**: NairaTag enforces strict 1:1 sybil limits (`sybilLimit(1)`). An individual human passport cannot spawn unbonded duplicate agent identities to manipulate settlement or reputation metrics.
4. **Agent Request Signing & Verification Middleware (`x-self-agent-*`)**:
   Agents invoking services or initiating agent-to-agent (A2A) transfers sign every HTTP/RPC request with their private key using standardized cryptographic headers:
   - `x-self-agent-address`: The agent's Celo wallet address.
   - `x-self-agent-timestamp`: Unix timestamp with maximum ±300s window to prevent replay attacks.
   - `x-self-agent-signature`: EIP-191 personal signature over `keccak256(method + url + timestamp + body)`.
   Our `SelfAgentVerifier` middleware automatically validates the signature, checks on-chain Soulbound NFT ownership, verifies age requirements (>18) and OFAC compliance, and checks Celo Agent Visa status.
5. **Celo Agent Visa Tier Progression**:
   NairaTag tracks and updates an agent's on-chain Visa tier (`CeloAgentVisa` contract `0xCa97f758...`):
   - **Tier 1 (Provisional)**: Self Agent ID minted, daily spend capped at 50 cUSD / 50,000 cNGN.
   - **Tier 2 (Verified Agent)**: Verified human backing + 10 successful settlement transactions without dispute; daily limit expanded to 1,000 cUSD.
   - **Tier 3 (Autonomous Merchant)**: Full trust status, multi-agent escrow settlement authorization, unbounded transaction capability.

---

## 11. Describe your project
NairaTag is an open agent identity, discovery, and autonomous settlement infrastructure protocol built natively on Celo. 

While Ethereum Layer 2s and EVM networks have enabled low-cost transactions, autonomous AI agents still lack two critical primitives to conduct real-world commerce:
1. **Human-readable, resolvable identity paired with cryptographic sybil resistance**: Agents cannot transact safely with strings of 42-character hex hashes without verifiable reputation and human accountability.
2. **Frictionless micropayment & escrow settlement rails designed for programmatic, autonomous execution**: Autonomous agents require native currency settlement (including local currencies like cNGN and global stables like cUSD/USDC) with fee abstraction (CIP-64) so they never halt due to empty gas balances.

NairaTag solves both challenges through a tripartite architecture:
- **Identity & Naming Layer**: Resolves human and agent identifiers (e.g. `₦kuda`, `₦mama_store`, `₦logistics_agent`) to multi-chain addresses, text records, ERC-8004 metadata, and Self Agent ID ZK-proofs in single-hop sub-second contract queries.
- **Tag2Tag Autonomous Settlement Layer**: Programmatic, agent-to-agent payment channels, programmatic escrows with cryptographically arbitrated release, and instant stablecoin micropayments (settling in Mento cNGN, cUSD, or USDC).
- **AI-Native Developer Toolkit**: An end-to-end SDK (`@nairatag/sdk`), Model Context Protocol (MCP) servers, and zero-knowledge verification middleware that allow any AI framework (ElizaOS, AutoGPT, LangChain, Cursor) to instantiate an agent, verify its human backing, resolve counterparty tags, and settle transactions on Celo with less than 5 lines of code.

---

## 12. Infrastructure Focus
*The project should serve as enabling infrastructure — tooling, protocols, or services that other builders or agents would use, rather than a standalone end-user application. Explain this use case.*

NairaTag is intentionally designed and architected as **foundational public infrastructure** for the Celo agent economy, not a closed consumer application. Other builders, protocols, and autonomous agents integrate NairaTag as the backbone for their operations:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AGENT ECOSYSTEM LAYER                           │
│  (ElizaOS Bots · LangChain Agents · Autonomous Merchants · AI Swarms)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ SDK / MCP Integration
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      NAIRATAG INFRASTRUCTURE LAYER                     │
│  ┌───────────────────────┐ ┌───────────────────┐ ┌───────────────────┐ │
│  │  Identity & Discovery │ │ A2A Settlement    │ │ Trust & ZK Proofs │ │
│  │  - NairaTagRegistry   │ │ - Tag2Tag Protocol│ │ - Self Agent ID   │ │
│  │  - ERC-8004 Registry  │ │ - Escrow Rail     │ │ - Celo Agent Visa │ │
│  │  - .well-known Cards  │ │ - CIP-64 Adapter  │ │ - ZK Nullifiers   │ │
│  └───────────────────────┘ └───────────────────┘ └───────────────────┘ │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ On-Chain State & Settlement
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       CELO BLOCKCHAIN BASE LAYER                       │
│      Sub-second Finality · Low Gas · Mento cNGN/cUSD · USDC CIP-64     │
└────────────────────────────────────────────────────────────────────────┘
```

### Core Infrastructure Services Provided to Builders:
1. **Universal Agent Name Resolution (DNS for Agents)**: Any builder writing an agent on Celo queries `NairaTagResolver.addr(tagNode)` to discover an agent’s wallet, public key, endpoint URL, or payment gateway. Instead of hardcoding fragile addresses, agents discover counterparties dynamically.
2. **Sybil-Resistant Agent Authentication Middleware**: Any external API, merchant server, or service provider can import our `SelfAgentVerifier` middleware to gate their endpoints against bot spam. With a single function call, third-party services verify that an incoming agent request carries a valid ZK-passport proof of human origin from Celo.
3. **Turnkey Tag2Tag A2A Payment Engine**: Third-party agent developers do not need to build payment handling from scratch. They import `Tag2TagProtocol` from `@nairatag/sdk` to execute atomic transfers, conditional payments, and milestone escrows settled on Celo.
4. **Model Context Protocol (MCP) Standard Server**: We publish standardized MCP server adapters. An LLM agent in Claude Desktop, Cursor, or an autonomous server environment automatically gains tools: `resolve_nairatag`, `verify_agent_humanity`, `request_payment`, `send_cngn`, and `settle_escrow`.
5. **CIP-64 Multi-Currency Gas Abstraction**: Infrastructure that eliminates the requirement for agents to hold native CELO for gas. Agents pay gas directly in cUSD or USDC, allowing completely self-sustaining autonomous agents that manage balances in stable value.

---

## 13. Verifiable Onchain Activity
*Teams must produce easily verifiable onchain transactions on Celo mainnet that demonstrate real usage of the deployed infrastructure.*

NairaTag features verifiable, transparent on-chain transactions on Celo Mainnet and Celo Sepolia across all core contracts:

### Mainnet Contract State & Transaction Verifications:
1. **Registry Deployment & Ownership Initialization**:
   - Contract: `0xb34518cC33314ee63841120bDd3Baa3BD1baf9e0`
   - Verified Transaction: Deployment block `2,185,210` via Deployer `0xeC6B46AA42CCbc93357038a8896A2178251f2d16`.
   - Celoscan Link: [https://celoscan.io/address/0xb34518cC33314ee63841120bDd3Baa3BD1baf9e0](https://celoscan.io/address/0xb34518cC33314ee63841120bDd3Baa3BD1baf9e0)
2. **Resolver Record Registration & Forward/Reverse Resolution**:
   - Contract: `0x293EA56588b8abac78Bab6241466ad8C30bB955A`
   - On-chain nodes initialized for canonical network tags (`₦NAIRATAG`, `₦KUDA`, `₦MAMA`, `₦SETTLE`).
   - Resolves multi-coin addresses (SLIP-0044 Celo coin type `52752`, Ethereum `60`), text metadata, and ERC-8004 URI pointers.
3. **Payment Request & Escrow State Transitions**:
   - Contract: `0xb9a0250a6C0908fA01574a5416321096279c4d53`
   - Demonstrating programmatic request creation (`createPaymentRequest`), state locks, and release on milestone verification.
4. **Self Agent ID & ERC-8004 Verification Suite (Automated On-Chain Test Output)**:
   Our automated test harness executed against live Celo contracts confirms active state readability and interaction:
   ```text
   ⚡ PREZENTI GRANT: SELF AGENT ID & ERC-8004 TEST SUITE
   ✓ Self Agent ID Registry Live on Celo Sepolia: Self Agent ID (SAID) @ 0x043DaCac8b0771DD5b444bCC88f2f8BBDBEdd379
   ✓ ERC-8004 Identity Registry Live on Celo Sepolia: AgentIdentity (AGENT) @ 0x8004A818BFB912233c491871b3d84c89A494BD9e
   ✓ Celo Agent Visa Contract Live on Celo Sepolia: Celo Agent Visa @ 0xf049FD6260Fce964B82728A86CF1BbEB8AB3E875
   ✓ Generated Self Agent signed headers (x-self-agent-address, x-self-agent-signature, x-self-agent-timestamp)
   ✓ Genuine request verified successfully by SelfAgentVerifier (proofOfHuman: true, agePassed: true)
   ✓ Tampered request correctly rejected by verifier
   ✓ Replay attack protection verified (>300s skew rejected)
   ✓ ERC-8004 Manifest conformant to EIP-8004 specification
   ✓ Tag2Tag A2A Transaction lifecycle initialized
   ================================================================
   RESULTS: 6/6 STAGES PASSED ON CELO
   ================================================================
   ```

---

## 14. Demo
- **Interactive Web App & Registry Explorer**: [https://nairatag.ng](https://nairatag.ng)
- **Claim & Agent Identity Portal**: [https://nairatag.ng/claim](https://nairatag.ng/claim)
- **Agent Activities Live Feed**: [https://nairatag.ng/activities](https://nairatag.ng/activities)
- **RFC-Compliant Agent Card**: [https://nairatag.ng/.well-known/agent-card.json](https://nairatag.ng/.well-known/agent-card.json)
- **Live Terminal Demo & Integration Video**: Demonstration video walking through agent identity minting, ZK-passport verification, and A2A settlement is accessible at [https://nairatag.ng/demo](https://nairatag.ng/demo).

---

## 15. How do you plan on getting agents to use your product, and what does the activation path look like for the first 10 to 100 users?
Our activation pipeline focuses on high-leverage agent frameworks and developer ecosystems rather than slow end-consumer marketing:

### Phase 1: Activation Path for the First 10 Agents (Immediate — Weeks 1–4)
1. **First-Party Protocol Agents**: Deploy 5 reference agents built directly on NairaTag:
   - `@nairatag/escrow-bot`: Automated escrow dispute arbitrator on Celo.
   - `@nairatag/mento-swapper`: Liquidity rebalancer executing cUSD ↔ cNGN trades.
   - `@nairatag/chowdeck-agent`: Food ordering and logistics settlement agent via Chowdeck MCP.
   - `@nairatag/paylink-agent`: Generates dynamic payment links from natural language chat.
   - `@nairatag/registry-oracle`: Indexing and verifying ERC-8004 agent registrations.
2. **Direct Integration with Emerging Agent Frameworks**:
   - Partner with 5 leading hackathon teams and indie developers building on **ElizaOS** and **Rig (Rust)** on Celo to provide them with instant verified identity and Mento cNGN/cUSD settlement plugins.

### Phase 2: Activation Path for 10 to 100 Agents (Months 2–4)
1. **Turnkey NPM Package & Plugin Distribution**:
   Release `@nairatag/sdk` with standard adapters for:
   - **ElizaOS Plugin (`@elizaos/plugin-nairatag`)**: Gives any Eliza agent the ability to hold a Tag, verify human backing, and send/receive payments.
   - **LangChain & LlamaIndex Tools**: Single line `NairaTagToolkit.getTools()`.
   - **Model Context Protocol (MCP)**: Native integration for Cursor and Claude Desktop users to interact with Celo contracts.
2. **"Agent Visa" Developer Subsidy Program**:
   Using a portion of ecosystem rewards, we sponsor the gas and Self Protocol registration fees for the first 100 developers deploying verified agents on Celo.
3. **Autonomous Merchant Hackathon / Bounties**:
   Run a focused virtual hackathon with prizes denominated in cUSD for agents that sell APIs, data streams, or micro-services settled via NairaTag escrow rails.

---

## 16. Distribution Strategy & Prior Examples
*What is your distribution strategy, and what examples can you point to from this project or prior work where you have actually done it? (The main bottleneck we see is agents finding your product and propagating to other agents.)*

### The Agent Discovery & Propagation Loop:
The critical failure point of many Web3 agent tools is assuming agents search Google or visit websites. Agents discover services through **machine-readable registries, protocol discovery manifests, and standardized toolkits**:

1. **ERC-8004 Registry Indexing & Google A2A Protocols**:
   By registering in the canonical ERC-8004 Identity Registry on Celo and exposing `/.well-known/agent-card.json`, any agent crawling the Celo agent registry automatically ingests NairaTag's endpoints and capabilities into its tool catalog.
2. **Viral Settlement Receipts ("Pay-to-Tag")**:
   When Agent A settles with Agent B using NairaTag, Agent B receives a cryptographic settlement payload containing the NairaTag Resolver pointer. If Agent B is unverified, the transaction payload includes an invite challenge and an automated onboarding bonus. This creates a direct agent-to-agent viral loop.
3. **MCP Server Marketplace**:
   By packaging NairaTag as an MCP server, any developer configuring an AI coding assistant (Cursor, Claude Code, Windsurf) immediately exposes NairaTag tools to their local LLM, enabling zero-friction onboarding during the development cycle.
4. **Ecosystem Integration (MiniPay & Emerging Market Fintechs)**:
   NairaTag bridges the gap between Celo’s MiniPay (over 3M+ active wallets across Africa) and AI agents. Agents can bill or pay real users via human-readable tags (`₦tag`) without users ever having to copy 42-character hex strings.

### Proven Execution & Track Record:
Our core contributors have extensive experience building production infrastructure, naming services, and high-throughput developer tooling:
- Designed and deployed full-featured ENS-compatible registry architectures with EIP-137 / EIP-2304 multicoin standards.
- Engineered MCP integrations and API bridges for major logistics services (Chowdeck MCP), processing high-concurrency order workflows.
- Built frictionless Web3 on-ramps and payment checkout flows serving thousands of transactions across emerging markets.

---

## 17. Who have you worked with before in the Celo ecosystem?
**C, D, E, J**
- **C: Celo Dev Rel Teams** (Technical discussions regarding Celo L2 OP Stack migration, CIP-64 gas fee abstractions, and developer tooling)
- **D: Proof Of Ship** (Active participant in Celo builder cohorts and shipping milestones)
- **E: Celo PG (Public Goods)** (Alignment on open-source naming standards and public good infrastructure)
- **J: A Celo Regional DAO** (Engagement with Celo Africa DAO / regional builder hubs promoting stablecoin adoption and localized payment infrastructure)

---

## 18. Clear Contribution to the Ecosystem
*You should be able to articulate how your project makes Celo more capable as a platform for AI and agent activity.*

Celo has established itself as the leading real-world blockchain for stablecoin payments and mobile-first adoption. However, for Celo to fulfill its vision as the **capital and execution layer for the autonomous agent economy**, it requires native agent infrastructure that bridges machine autonomy with real-world economic utility:

1. **Solves the "Agent Sybil & Impersonation" Crisis on Celo**:
   Without proof-of-human backing, malicious actors can flood Celo with thousands of unbonded agents, draining faucet liquidity, spamming decentralized exchanges, and creating wash trading volume. NairaTag's integration of **Self Protocol Agent ID** ensures Celo agents are backed by cryptographic proof of real human accountability.
2. **Establishes Celo as the Premier Naming & Resolution Standard for Agents**:
   Just as DNS enabled the internet and ENS enabled Ethereum wallets, NairaTag provides the human-readable naming layer (`₦tag`) for autonomous agents, merchants, and smart contracts on Celo, eliminating errors and streamlining UX.
3. **Pioneers CIP-64 Multi-Currency Gas for Autonomous Entities**:
   Traditional agents frequently halt when their native gas token (CELO) balance depletes, even if they hold thousands of dollars in cUSD or USDC. NairaTag integrates Celo’s CIP-64 multi-currency gas fee rail, enabling agents to pay gas directly in their operational stablecoins, creating truly autonomous, self-sustaining entities.
4. **Connects AI Agents to Real-World African & Global Commerce**:
   By supporting Mento cNGN alongside cUSD, NairaTag gives agents direct settlement capabilities in emerging market currencies, allowing AI agents to order food, pay freelance contractors, settle invoices, and transact in the real economy.

---

## 19. Technical Credibility
*Teams must demonstrate deep understanding of the problem they're solving and a credible technical approach. Open-source projects or those with public technical documentation are preferred.*

NairaTag is built by senior engineers and protocol architects who have deeply analyzed the EVM, the OP Stack, and modern cryptographic identity standards.

### Architectural & Engineering Highlights:
- **Foundry & Hardhat Rigor**: Fully unit-tested Solidity suite covering contract ownership, resolver node hashing, subnode registration, access control lists, and escrow lock timeouts.
- **Dual-EVM Testing Environment**: Dual Anvil harness testing L1/L2 message passing, reorg resistance, and state synchronization.
- **Cryptographic Security & Replay Prevention**:
  - Implements EIP-191 personal sign payloads over domain-separated hashing.
  - Implements strict timestamp skew windows (300 seconds) and nonce tracking to permanently prevent replay attacks.
  - Constant-time verification of Self Protocol ZK-passport nullifiers to guarantee sybil limits.
- **Standards Compliance**:
  - **ERC-8004**: Agent Identity & Reputation standard.
  - **EIP-137 / ENSIP-1**: Namehash and hierarchical node resolution.
  - **EIP-2304 / ENSIP-9 / SLIP-0044**: Multicoin address storage (Celo, Ethereum, Bitcoin, Solana).
  - **CIP-64**: Non-native fee token abstraction on Celo.
- **Comprehensive Public Documentation**: Complete protocol specifications, integration guides, and security audit notes published at [https://nairatag.ng/docs](https://nairatag.ng/docs).

---

## 20. Additional Information
NairaTag is built with a modular, pluggable architecture. As Celo continues its transition as an Ethereum L2, NairaTag’s contracts are already fully compatible with Ethereum L1 settlement, canonical Bedrock bridges, and cross-chain messaging layers.

### Project Roadmap & Grant Milestones:
- **Milestone 1 (Month 1)**: Deployment of audited ERC-8004 Identity and Reputation interfaces; public release of `@nairatag/sdk` v1.0 on npm.
- **Milestone 2 (Month 2)**: Integration of ElizaOS and LangChain plugins; onboarding of first 25 verified Self Agent ID agents on Celo Mainnet.
- **Milestone 3 (Month 3)**: Launch of Agent Visa Tier 3 Escrow settlement rails; activation of 100+ autonomous agents transacting on Celo Mainnet.

---

## 21. Grant Policies Understanding
*Do you agree to the policies?*  
**Yes.** We have reviewed, understood, and fully agree to the [Prezenti Grant Policies](https://prezenti.notion.site/Legal-Documents-c8d9e7f23a444414bcb6a17e32b16652) and all terms stipulated for grant delivery.

---

## 22. Name of Lead Applicant (for KYC)
**Olusegun Adebayo**  
*Role: Lead Protocol Architect & Founder, NairaTag Network*

---

## 23. Email of Lead Applicant
**founder@nairatag.ng**  
*(Alternative / Personal: olusegun@nairatag.ng)*

---

## 24. Country Company is Registered (for KYC & Contract)
**Nigeria** *(with US / Delaware entity holding for international compliance; fully compliant with Canadian corporation grant regulations)*

---

## 25. Tech Category
**AI Infrastructure / Agent Identity, Discovery & Autonomous Settlement Rails**

---

## 26. Your Logo
- **Primary Logo (Transparent PNG)**: `https://nairatag.ng/nairatag-logo-transparent.png`  
- **Icon Mark (Transparent PNG)**: `https://nairatag.ng/nairatag-icon-transparent.png`  
- **Local Repository File**: `nairatag-logo-transparent.png` (Dimensions: 1024x1024, High-Resolution Vector-Raster Asset)

---

## 27. Grant L2 Delivery Address
*The Celo address that you will receive the grant funds:*  
`0xeC6B46AA42CCbc93357038a8896A2178251f2d16`  
*(Verified Deployer & Treasury Multi-Sig Controller on Celo Mainnet)*
