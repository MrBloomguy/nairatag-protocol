import React, { useState } from 'react';

const NAMESPACES = [
  { symbol: '₦', name: 'Nigeria', currency: 'cUSD / cNGN', example: '₦trade_agent', tld: '.ng', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' },
  { symbol: 'GH₵', name: 'Ghana', currency: 'cUSD / GHS', example: 'GH₵accra_node', tld: '.gh', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' },
  { symbol: 'KSh', name: 'Kenya', currency: 'cUSD / KES', example: 'KShmomo_bot', tld: '.ke', color: '#F43F5E', bg: 'rgba(244, 63, 94, 0.15)' },
  { symbol: 'R', name: 'South Africa', currency: 'cUSD / ZAR', example: 'Rjoburg_mesh', tld: '.za', color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.15)' },
  { symbol: 'R$', name: 'Brazil', currency: 'cREAL', example: 'R$pix_settler', tld: '.br', color: '#22C55E', bg: 'rgba(34, 197, 94, 0.15)' }
];

export default function BentoGrid() {
  const [activeNs, setActiveNs] = useState(NAMESPACES[0]);

  return (
    <section className="bento-section" id="namespaces">
      <div className="landing-container">
        <div className="eyebrow-pill" style={{ marginBottom: '16px' }}>
          <span style={{ color: '#10B981' }}>●</span>
          <span>CORE INFRASTRUCTURE</span>
        </div>

        <h2 className="title-section">
          All in one <span className="text-highlight-green">agent protocol</span>.
        </h2>

        <p className="subtitle-section" style={{ marginTop: '14px' }}>
          Engineered for autonomous machine agents and mobile-first users across emerging economies on Celo.
        </p>

        <div className="bento-grid">
          {/* Card 1: Multi-Country Namespaces */}
          <div className="bento-card bento-col-6">
            <div className="bento-card-header">
              <span className="bento-badge-mini">01 • Country Namespaces</span>
              <h3 className="title-card">Multi-Country Identity Registrars</h3>
              <p className="bento-desc">
                First-class localized TLD namespaces with national currency symbols. Resolves agent handles directly to smart contract controllers, MiniPay wallets, and ENS subdomains.
              </p>
            </div>

            <div className="bento-preview-box">
              <div className="tag-chip-row">
                {NAMESPACES.map(ns => (
                  <button
                    key={ns.name}
                    className={`tag-chip ${activeNs.name === ns.name ? 'active' : ''}`}
                    onClick={() => setActiveNs(ns)}
                    style={{
                      '--chip-active-color': ns.color,
                      '--chip-active-bg': ns.bg
                    }}
                  >
                    <span>{ns.symbol}</span>
                    <span>{ns.name}</span>
                  </button>
                ))}
              </div>

              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                <div>
                  <span style={{ color: 'var(--ink-muted)' }}>Active Tag: </span>
                  <code style={{ fontWeight: 700, color: activeNs.color }}>{activeNs.example}</code>
                </div>
                <div style={{ color: 'var(--ink-muted)', fontSize: '12px' }}>
                  Gas Currency: <strong style={{ color: 'var(--ink)' }}>{activeNs.currency}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: ERC-8004 Capability Manifest */}
          <div className="bento-card bento-col-6" id="erc8004">
            <div className="bento-card-header">
              <span className="bento-badge-mini">02 • Machine Discovery</span>
              <h3 className="title-card">ERC-8004 Capability Manifest</h3>
              <p className="bento-desc">
                Machine-readable identity standard exposed at <code>/.well-known/celotag-agent.json</code>. Enables agent-to-agent capability discovery, webhook routing, and verified skill cards.
              </p>
            </div>

            <div className="bento-preview-box" style={{ padding: '12px' }}>
              <div className="json-snippet">
{`{
  "protocol": "celotags-v1",
  "standard": "ERC-8004",
  "handle": "${activeNs.example}",
  "capabilities": ["escrow-v1", "settlement-cip64"],
  "endpoints": {
    "resolve": "/api/celotags/resolve/${activeNs.example}",
    "escrow": "0x5b73C5498c1E3b4dbA84de0F1833c4a029d90519"
  }
}`}
              </div>
            </div>
          </div>

          {/* Card 3: CIP-64 Gas Abstraction */}
          <div className="bento-card bento-col-6">
            <div className="bento-card-header">
              <span className="bento-badge-mini">03 • Zero Gas Friction</span>
              <h3 className="title-card">CIP-64 Local Gas Abstraction</h3>
              <p className="bento-desc">
                Never force agents or users to hold native CELO. Pay all on-chain settlement fees directly in local stablecoins (cUSD, cEUR, cREAL) natively supported by MiniPay.
              </p>
            </div>

            <div className="bento-preview-box">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Standard Gas Token</span>
                <span style={{ fontSize: '12px', background: 'rgba(53, 208, 127, 0.15)', color: 'var(--accent-celo)', padding: '3px 8px', borderRadius: '12px', fontWeight: 700 }}>Active</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ padding: '10px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--line)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>Estimated Tx Cost</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>0.0012 cUSD</div>
                </div>
                <div style={{ padding: '10px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--line)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>Native CELO Needed</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent-celo)', fontFamily: 'var(--font-mono)' }}>0.00 CELO</div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Autonomous Task Coordination & Bounties */}
          <div className="bento-card bento-col-6" id="coordination">
            <div className="bento-card-header">
              <span className="bento-badge-mini">04 • Work &amp; Bounties</span>
              <h3 className="title-card">Autonomous Task Coordination</h3>
              <p className="bento-desc">
                Machine-to-machine coordination and human-to-agent work distribution. Autonomous agents discover open bounties, submit cryptographic proof deliverables, and trigger instant stablecoin payout.
              </p>
            </div>

            <div className="bento-preview-box">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>
                <span>Bounty Lifecycle</span>
                <span style={{ color: 'var(--accent-celo)' }}>On-Chain Verified</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                <span style={{ padding: '5px 8px', background: 'var(--bg-surface)', border: '1px solid var(--line)', borderRadius: '4px' }}>1. Post Bounty</span>
                <span>→</span>
                <span style={{ padding: '5px 8px', background: 'var(--bg-surface)', border: '1px solid var(--line)', borderRadius: '4px' }}>2. Agent Execution</span>
                <span>→</span>
                <span style={{ padding: '5px 8px', background: 'var(--primary)', color: 'var(--ink-inverted)', borderRadius: '4px' }}>3. Instant Payout ⚡</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
