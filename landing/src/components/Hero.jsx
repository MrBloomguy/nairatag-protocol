import React from 'react';

const COUNTRY_PILLS = [
  { symbol: '₦', name: 'Nigeria', color: '#10B981', glow: 'rgba(16, 185, 129, 0.25)' },
  { symbol: 'GH₵', name: 'Ghana', color: '#F59E0B', glow: 'rgba(245, 158, 11, 0.25)' },
  { symbol: 'KSh', name: 'Kenya', color: '#F43F5E', glow: 'rgba(244, 63, 94, 0.25)' },
  { symbol: 'R', name: 'South Africa', color: '#06B6D4', glow: 'rgba(6, 182, 212, 0.25)' },
  { symbol: 'R$', name: 'Brazil', color: '#22C55E', glow: 'rgba(34, 197, 94, 0.25)' }
];

export default function Hero() {
  return (
    <section className="hero-section">
      <div className="hero-ambient-glow"></div>
      
      <div className="landing-container" style={{ position: 'relative', zIndex: 2 }}>
        <div className="eyebrow-pill hero-eyebrow" style={{ marginBottom: '22px' }}>
          <span className="pulse-dot"></span>
          <span className="eyebrow-text">AI AGENT IDENTITY &amp; FINANCIAL PROTOCOL ON CELO</span>
        </div>

        <h1 className="title-hero">
          Every AI Agent has a <span className="hero-gradient-text">Tag</span>.
        </h1>

        <p className="subtitle-hero" style={{ marginTop: '18px' }}>
          Autonomous AI agents need more than anonymous hex addresses. CeloTags gives software machines verified multi-country identities, zero-gas local stablecoin bankrolls, ERC-8004 machine capability discovery, and bounded execution authority on Celo.
        </p>

        {/* Colorful Interactive Country Pill Strip with Agent Tags */}
        <div className="hero-country-strip">
          {COUNTRY_PILLS.map((c) => (
            <a 
              key={c.name} 
              href="#namespaces" 
              className="hero-country-pill"
              style={{ '--pill-color': c.color, '--pill-glow': c.glow }}
              title={`${c.name} namespace for autonomous agents`}
            >
              <span className="pill-symbol">{c.symbol}</span>
              <span className="pill-name">{c.name}</span>
            </a>
          ))}
        </div>

        <div className="hero-cta-group" style={{ marginTop: '28px' }}>
          <a href="/hub/claim.html" className="btn-pill-primary hero-btn-claim">
            <span>Register Agent Tag</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </a>
          <a href="#agentic-identity" className="btn-pill-secondary">
            <span>Why Agents Have Tags</span>
          </a>
          <a href="#why-celo" className="btn-pill-secondary">
            <span>Why Celo</span>
          </a>
        </div>

        {/* Live Feature Stat Ticker */}
        <div className="hero-stats-ticker">
          <div className="ticker-chip">
            <span className="ticker-icon" style={{ color: '#35D07F' }}>⚡</span>
            <span>&lt; $0.001 Gas</span>
          </div>
          <div className="ticker-chip">
            <span className="ticker-icon" style={{ color: '#F59E0B' }}>💵</span>
            <span>CIP-64 Local Gas</span>
          </div>
          <div className="ticker-chip">
            <span className="ticker-icon" style={{ color: '#06B6D4' }}>⏱️</span>
            <span>~1s Finality</span>
          </div>
          <div className="ticker-chip">
            <span className="ticker-icon" style={{ color: '#8B5CF6' }}>🛡️</span>
            <span>EIP-712 Bounded Grants</span>
          </div>
        </div>
      </div>
    </section>
  );
}
