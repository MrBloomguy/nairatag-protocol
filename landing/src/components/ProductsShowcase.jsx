import React from 'react';

const PRODUCTS = [
  {
    isFlagship: true,
    symbol: '₦',
    name: 'NairaTag Network',
    domain: 'nairatag.ng',
    badge: 'FLAGSHIP FIRST PRODUCT',
    desc: 'The original decentralized payment identity for Africa on Celo. Enables instant human-to-human and human-to-agent stablecoin payments, MiniPay one-tap checkout, dynamic SVG identity cards, and referral earnings.',
    features: [
      'Verified ₦ handles (e.g. ₦michael, ₦segun)',
      'Opera MiniPay native 1-tap checkout',
      'Dynamic standalone SVG & OG payment cards',
      'Community bounty pool & referral staking'
    ],
    primaryLink: '/hub/claim.html',
    primaryLabel: 'Launch NairaTag',
    secondaryLink: '/hub/swap.html',
    secondaryLabel: 'Stablecoin Swap'
  },
  {
    isFlagship: false,
    symbol: '🤖',
    name: 'CeloTags Protocol',
    domain: 'celotags.ng',
    badge: 'AGENT INFRASTRUCTURE',
    desc: 'The foundational multi-country namespace protocol (₦, GH₵, KSh, R, R$) for autonomous software agents. Exposes ERC-8004 machine manifests, CIP-64 gas fee abstraction, and bounded authority grants.',
    features: [
      'Multi-country agent namespaces',
      'Machine-readable ERC-8004 discovery',
      'Decoupled identity vs execution authority',
      'Interoperable ENS reverse resolver'
    ],
    primaryLink: '#namespaces',
    primaryLabel: 'Explore Namespaces',
    secondaryLink: '/.well-known/celotag-agent.json',
    secondaryLabel: 'View Agent Manifest'
  }
];

export default function ProductsShowcase() {
  return (
    <section className="products-section" id="products">
      <div className="landing-container">
        <div className="eyebrow-pill" style={{ marginBottom: '14px' }}>
          <span>ECOSYSTEM SUITE</span>
        </div>

        <h2 className="title-section">
          Products built on <span className="text-highlight-gold">CeloTags</span>.
        </h2>

        <p className="subtitle-section" style={{ marginTop: '12px' }}>
          From our flagship consumer payment platform NairaTag to foundational autonomous agent namespaces.
        </p>

        <div className="products-grid">
          {PRODUCTS.map((p, idx) => (
            <div 
              key={idx} 
              className={`product-card ${p.isFlagship ? 'flagship' : 'infrastructure-card'}`}
              style={{
                '--product-accent': p.isFlagship ? '#10B981' : '#06B6D4',
                '--product-glow': p.isFlagship ? 'rgba(16, 185, 129, 0.25)' : 'rgba(6, 182, 212, 0.25)'
              }}
            >
              {p.isFlagship ? (
                <div className="product-flagship-pill">
                  <span style={{ marginRight: '4px' }}>🏆</span> {p.badge}
                </div>
              ) : (
                <div className="product-infra-pill">
                  <span style={{ marginRight: '4px' }}>⚡</span> {p.badge}
                </div>
              )}

              <div>
                <div className="product-badge-row">
                  <div 
                    className="product-icon-wrap"
                    style={{
                      background: p.isFlagship 
                        ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' 
                        : 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
                      color: '#ffffff',
                      boxShadow: p.isFlagship 
                        ? '0 6px 20px -4px rgba(16, 185, 129, 0.45)' 
                        : '0 6px 20px -4px rgba(6, 182, 212, 0.45)'
                    }}
                  >
                    {p.symbol}
                  </div>
                  <div>
                    <h3 className="title-card" style={{ fontSize: '20px' }}>{p.name}</h3>
                    <div style={{ fontSize: '13px', color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>{p.domain}</div>
                  </div>
                </div>

                <p style={{ fontSize: '14px', color: 'var(--ink-secondary)', lineHeight: 1.55, marginTop: '12px' }}>
                  {p.desc}
                </p>

                <ul style={{ listStyle: 'none', margin: '20px 0', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--ink-secondary)' }}>
                  {p.features.map((feat, fIdx) => (
                    <li key={fIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span 
                        style={{ 
                          color: p.isFlagship ? '#10B981' : '#06B6D4', 
                          fontWeight: 'bold',
                          fontSize: '14px' 
                        }}
                      >
                        ✓
                      </span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
                <a 
                  href={p.primaryLink} 
                  className="btn-pill-primary" 
                  style={{ 
                    padding: '9px 18px', 
                    fontSize: '13px',
                    background: p.isFlagship ? 'linear-gradient(135deg, #10B981, #059669)' : undefined,
                    borderColor: p.isFlagship ? '#10B981' : undefined
                  }}
                >
                  {p.primaryLabel}
                </a>
                <a href={p.secondaryLink} className="btn-pill-secondary" style={{ padding: '9px 18px', fontSize: '13px' }}>
                  {p.secondaryLabel}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
