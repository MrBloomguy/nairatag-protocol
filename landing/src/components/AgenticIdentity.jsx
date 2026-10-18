import React, { useState } from 'react';

const AGENT_PILLARS = [
  {
    icon: '🏷️',
    badge: 'ON-CHAIN IDENTITY',
    title: 'From Anonymous 0x to Verified Agent',
    desc: 'Raw EVM addresses (0x742d...) carry zero context, reputation, or discovery. A CeloTag transforms an anonymous key into a verifiable machine entity with on-chain ownership and audit history.',
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.12)',
    example: {
      raw: '0x742d...f44e (Unknown)',
      tag: '₦chief_arbitrage (Verified 🇳🇬)',
      reputation: 'Score: 98/100 • 1,420 Tasks'
    }
  },
  {
    icon: '💵',
    badge: 'ECONOMIC RAILS',
    title: 'Agents Transact in Local Currencies',
    desc: 'Agents need to pay API bills, stream micropayments, and compensate other machine workers. With CIP-64, agents earn and spend native stablecoins (cUSD, cREAL, cNGN) with zero native CELO required.',
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.12)',
    example: {
      raw: 'Native Gas Volatility: Eliminated',
      tag: 'CIP-64 Fee Abstraction: Active',
      reputation: 'Avg Cost: < 0.0009 cUSD / Tx'
    }
  },
  {
    icon: '🤖',
    badge: 'MACHINE DISCOVERY',
    title: 'ERC-8004 Capability Manifests',
    desc: 'Autonomous agent runtimes (ElizaOS, LangChain, AutoGPT) dynamically discover each other over HTTP and on-chain RPC. Query any tag to inspect skills, pricing schemas, model endpoints, and SLA terms.',
    color: '#06B6D4',
    bg: 'rgba(6, 182, 212, 0.12)',
    example: {
      raw: 'Endpoint: /.well-known/celotag-agent.json',
      tag: 'Skills: ["dex_arbitrage", "price_oracle"]',
      reputation: 'Price: 0.001 cUSD / query'
    }
  },
  {
    icon: '🛡️',
    badge: 'SECURITY BOUNDARIES',
    title: 'Identity is Not Authority',
    desc: 'Giving an AI agent a tag does not hand over your keys. Owners issue EIP-712 bounded permission grants with cryptographic spend caps, whitelisted contracts, and instant kill-switch revocation.',
    color: '#8B5CF6',
    bg: 'rgba(139, 92, 246, 0.12)',
    example: {
      raw: 'Daily Spend Limit: 50.00 cUSD',
      tag: 'Whitelisted DEX: 0xa379...ec34',
      reputation: 'Kill Switch: Revokable in 1-Click'
    }
  }
];

export default function AgenticIdentity() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <section className="agentic-identity-section" id="agentic-identity">
      <div className="landing-container">
        <div className="eyebrow-pill" style={{ marginBottom: '16px' }}>
          <span style={{ color: '#10B981' }}>🤖</span>
          <span>THE AGENTIC LAYER</span>
        </div>

        <h2 className="title-section">
          Why do AI Agents have <span className="hero-gradient-text">Tags</span>?
        </h2>

        <p className="subtitle-section" style={{ marginTop: '14px' }}>
          Autonomous software machines are becoming first-class economic actors. CeloTags provides the identity, discovery, and financial boundary layer they need to operate safely.
        </p>

        {/* Comparison Callout: Raw Hex vs CeloTag */}
        <div className="agent-comparison-card">
          <div className="comparison-side comparison-raw">
            <div className="comparison-tag-badge raw-badge">❌ Without CeloTag (Raw EVM)</div>
            <div className="comparison-address">0x742d35Cc6634C0532925a3b844Bc454e4438f44e</div>
            <ul className="comparison-list">
              <li>Anonymous hex with zero identity or attribution</li>
              <li>Cannot be discovered by other AI agents or humans</li>
              <li>Requires volatile native gas tokens to operate</li>
              <li>Unbounded private key risk (single leak drains treasury)</li>
            </ul>
          </div>

          <div className="comparison-divider">
            <span className="divider-icon">⚡</span>
          </div>

          <div className="comparison-side comparison-tagged">
            <div className="comparison-tag-badge tagged-badge">✓ With CeloTag (Verified Agent)</div>
            <div className="comparison-tag-title">
              <span className="tag-symbol">₦</span>
              <span className="tag-handle">chief_arbitrage</span>
              <span className="tag-live-badge">Live Node</span>
            </div>
            <ul className="comparison-list tagged-list">
              <li><strong>Verified multi-country handle</strong> on Celo Sepolia</li>
              <li><strong>ERC-8004 machine manifest</strong> auto-discovers agent capabilities</li>
              <li><strong>CIP-64 gasless execution</strong> paying fees directly in cUSD</li>
              <li><strong>EIP-712 Bounded Grants</strong> enforce strict spending limits &amp; kill-switch</li>
            </ul>
          </div>
        </div>

        {/* 4 Pillars Grid */}
        <div className="agentic-pillars-grid">
          {AGENT_PILLARS.map((p, idx) => (
            <div 
              key={idx} 
              className={`pillar-card ${activeTab === idx ? 'pillar-active' : ''}`}
              onClick={() => setActiveTab(idx)}
              style={{
                '--pillar-color': p.color,
                '--pillar-bg': p.bg
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span 
                  className="pillar-badge"
                  style={{
                    background: p.bg,
                    color: p.color
                  }}
                >
                  {p.badge}
                </span>
                <span style={{ fontSize: '24px' }}>{p.icon}</span>
              </div>

              <h3 className="title-card" style={{ fontSize: '18px' }}>{p.title}</h3>

              <p style={{ marginTop: '8px', fontSize: '13.5px', color: 'var(--ink-secondary)', lineHeight: 1.55 }}>
                {p.desc}
              </p>

              <div className="pillar-example-box">
                <div style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                  Live Specification
                </div>
                <div style={{ marginTop: '6px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: p.color, fontWeight: 600 }}>
                  {p.example.tag}
                </div>
                <div style={{ marginTop: '2px', fontSize: '11.5px', color: 'var(--ink-secondary)' }}>
                  {p.example.reputation}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
