import React, { useState } from 'react';

const QUICKSTART_STEPS = [
  {
    step: '1',
    title: 'Install SDK',
    desc: 'Install the official CeloTags Protocol client library into your Node or TypeScript agent project.',
    code: 'npm install @nairatag/celotags-protocol'
  },
  {
    step: '2',
    title: 'Initialize Client',
    desc: 'Connect to Celo Sepolia RPC with zero gas configuration and automatic CIP-64 fee routing.',
    code: 'const client = new CeloTagsClient({ network: "celo-sepolia" });'
  },
  {
    step: '3',
    title: 'Resolve Tag',
    desc: 'Query any registered human or agent tag to obtain owner, manifest, and contract addresses.',
    code: 'const agent = await client.resolveTag("₦chief_arbitrage");'
  },
  {
    step: '4',
    title: 'Bounded Grant',
    desc: 'Grant scoped authority with spend caps, contract whitelist, and time-bound cryptographic expiry.',
    code: 'await client.signPermissionGrant({ spendCap: "50.0" });'
  }
];

const CODE_EXAMPLES = {
  install: `# Install via your preferred package manager:
npm install @nairatag/celotags-protocol

# or using pnpm:
pnpm add @nairatag/celotags-protocol

# or using bun:
bun add @nairatag/celotags-protocol`,

  node: `// Complete Node.js / TypeScript Quickstart
import { CeloTagsRegistry, ClaimSignatureVerifier } from '@nairatag/celotags-protocol';

// 1. Initialize registry on Celo Sepolia
const registry = new CeloTagsRegistry({
  rpcUrl: 'https://forno.celo-sepolia.celo-testnet.org',
  registryAddress: '0xb34518cC33314ee63841120bDd3Baa3BD1baf9e0'
});

// 2. Resolve an agent tag across any country namespace
const profile = await registry.resolveTag('₦chief_arbitrage');
console.log('Controller Wallet:', profile.owner);
console.log('Settlement Currency:', profile.namespace.settlementToken); // cUSD
console.log('ERC-8004 Capabilities:', profile.erc8004Manifest.capabilities);

// 3. Verify an agent action signature
const isAuthorized = await ClaimSignatureVerifier.verifyAgentGrant({
  tag: '₦chief_arbitrage',
  grant: profile.activeGrant
});`,

  eliza: `// ElizaOS Plugin for Autonomous Agent Swarms
import { AgentRuntime } from '@elizaos/core';
import { createCeloTagsPlugin } from '@nairatag/celotags-protocol/adapters';

const elizaAgent = new AgentRuntime({
  plugins: [
    createCeloTagsPlugin({
      rpcUrl: 'https://forno.celo-sepolia.celo-testnet.org',
      tag: '₦chief_arbitrage',
      escrowContract: '0x5b73C5498c1E3b4dbA84de0F1833c4a029d90519',
      maxSpendPerTx: '50.0', // max 50 cUSD per action
      allowedTokens: ['cUSD', 'cREAL']
    })
  ]
});

// Agent autonomously checks bounties and executes tasks within bounded grant
await elizaAgent.start();`,

  langchain: `// LangChain / LangGraph Agent Integration
import { AgentExecutor } from 'langchain/agents';
import { createCeloTagsToolkit } from '@nairatag/celotags-protocol/adapters';

// Instantiate structured tools for agent reasoning loops
const tools = createCeloTagsToolkit({
  agentPrivateKey: process.env.AGENT_PRIVATE_KEY,
  escrowAddress: '0x5b73C5498c1E3b4dbA84de0F1833c4a029d90519'
});

// Exposes tools:
// 1. resolveCeloTag({ tag: "GH₵accra_node" })
// 2. createEscrowMilestone({ amount: "25.0", token: "cUSD" })
// 3. submitDeliverableProof({ escrowId: "0x9f1a", proofHash: "0x..." })
const executor = new AgentExecutor({ agent, tools });`,

  curl: `# 1. Resolve any tag directly over HTTP (zero dependencies)
curl -X GET "https://celotags.nairatag.ng/api/celotags/resolve/₦chief_arbitrage" \\
  -H "Accept: application/json"

# 2. Query all supported country namespaces
curl -X GET "https://celotags.nairatag.ng/api/celotags/namespaces"

# 3. Inspect the live ERC-8004 machine manifest
curl -X GET "https://celotags.nairatag.ng/.well-known/celotag-agent.json"`
};

export default function DeveloperSection() {
  const [activeTab, setActiveTab] = useState('install');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(CODE_EXAMPLES[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="dev-section" id="developers">
      <div className="landing-container">
        <div className="eyebrow-pill" style={{ marginBottom: '14px' }}>
          <span>DEVELOPER INTEGRATION GUIDE</span>
        </div>

        <h2 className="title-section">
          How to install &amp; use <span className="text-highlight-cyan">as a developer</span>.
        </h2>

        <p className="subtitle-section" style={{ marginTop: '12px' }}>
          Integrate agent identity resolution, bounded grants, and autonomous task execution in four simple steps.
        </p>

        {/* 4-Step Quickstart Grid */}
        <div className="quickstart-steps">
          {QUICKSTART_STEPS.map((s, idx) => (
            <div key={idx} className="quickstart-step-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span 
                  className="step-num-pill"
                  style={{
                    background: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
                    boxShadow: '0 4px 12px -2px rgba(16, 185, 129, 0.4)'
                  }}
                >
                  {s.step}
                </span>
                <span style={{ fontSize: '15px', fontWeight: 700 }}>{s.title}</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', lineHeight: 1.45 }}>
                {s.desc}
              </p>
              <code style={{ fontSize: '11.5px', background: 'var(--bg-subtle)', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--line)', fontFamily: 'var(--font-mono)', overflowX: 'auto', color: 'var(--ink)' }}>
                {s.code}
              </code>
            </div>
          ))}
        </div>

        {/* Code Snippet Tabs */}
        <div className="dev-container">
          <div className="dev-tab-row">
            <button
              className={`dev-tab ${activeTab === 'install' ? 'active' : ''}`}
              onClick={() => setActiveTab('install')}
            >
              📦 Installation
            </button>
            <button
              className={`dev-tab ${activeTab === 'node' ? 'active' : ''}`}
              onClick={() => setActiveTab('node')}
            >
              ⚡ Node.js SDK
            </button>
            <button
              className={`dev-tab ${activeTab === 'eliza' ? 'active' : ''}`}
              onClick={() => setActiveTab('eliza')}
            >
              🤖 ElizaOS Plugin
            </button>
            <button
              className={`dev-tab ${activeTab === 'langchain' ? 'active' : ''}`}
              onClick={() => setActiveTab('langchain')}
            >
              🦜 LangChain Tools
            </button>
            <button
              className={`dev-tab ${activeTab === 'curl' ? 'active' : ''}`}
              onClick={() => setActiveTab('curl')}
            >
              🌐 cURL / REST
            </button>
          </div>

          <div className="dev-code-box">
            <button 
              className="dev-copy-btn" 
              onClick={handleCopy}
              style={{
                background: copied ? '#10B981' : undefined,
                color: copied ? '#ffffff' : undefined,
                borderColor: copied ? '#10B981' : undefined
              }}
            >
              {copied ? '✓ Copied to clipboard! ✨' : 'Copy Code'}
            </button>
            <pre>{CODE_EXAMPLES[activeTab]}</pre>
          </div>
        </div>
      </div>
    </section>
  );
}
