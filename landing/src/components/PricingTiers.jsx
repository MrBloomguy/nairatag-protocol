import React, { useState } from 'react';

export default function PricingTiers() {
  const [billingCycle, setBillingCycle] = useState('monthly');

  const isAnnual = billingCycle === 'annual';

  return (
    <section className="pricing-section" id="pricing">
      <div className="landing-container">
        <div className="eyebrow-pill" style={{ marginBottom: '14px' }}>
          <span>SIMPLE PROTOCOL PRICING</span>
        </div>

        <h2 className="title-section">
          Transparent, predictable tiers.
        </h2>

        <p className="subtitle-section" style={{ marginTop: '12px' }}>
          Deploy human identities or autonomous machine agents with zero hidden fees.
        </p>

        {/* Billing Toggle */}
        <div style={{ display: 'inline-flex', padding: '4px', background: 'var(--bg-subtle)', borderRadius: '9999px', border: '1px solid var(--line)', marginTop: '28px' }}>
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            style={{
              padding: '6px 18px',
              borderRadius: '9999px',
              border: 'none',
              background: !isAnnual ? 'var(--primary)' : 'transparent',
              color: !isAnnual ? 'var(--ink-inverted)' : 'var(--ink-secondary)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('annual')}
            style={{
              padding: '6px 18px',
              borderRadius: '9999px',
              border: 'none',
              background: isAnnual ? 'var(--primary)' : 'transparent',
              color: isAnnual ? 'var(--ink-inverted)' : 'var(--ink-secondary)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Annual <span style={{ fontSize: '11px', color: 'var(--accent-celo)', marginLeft: '4px' }}>-20%</span>
          </button>
        </div>

        {/* 3 Pricing Cards */}
        <div className="pricing-grid">
          {/* Tier 1: Personal Tag */}
          <div className="pricing-card">
            <div>
              <div className="pricing-tier-name">Personal ₦TAG</div>
              <div className="pricing-tier-desc">Verified personal identity for payments, MiniPay wallets, and ENS routing.</div>
              <div className="pricing-price-wrap">
                <span className="pricing-price">$0</span>
                <span className="pricing-interval"> / forever</span>
              </div>

              <ul className="pricing-features-list">
                <li><span className="feature-check">✓</span> 1 country tag handle</li>
                <li><span className="feature-check">✓</span> MiniPay one-tap deep links</li>
                <li><span className="feature-check">✓</span> Standalone SVG card &amp; QR code</li>
                <li><span className="feature-check">✓</span> Base &amp; Celo Sepolia routing</li>
                <li><span className="feature-check">✓</span> Zero annual renewal fee</li>
              </ul>
            </div>

            <a href="/hub/claim.html" className="btn-pill-secondary" style={{ width: '100%' }}>
              Get Started Free
            </a>
          </div>

          {/* Tier 2: Verified Agent (PRO) */}
          <div className="pricing-card featured">
            <div className="pricing-badge-popular">MOST POPULAR</div>
            <div>
              <div className="pricing-tier-name">Verified Agent</div>
              <div className="pricing-tier-desc">Autonomous machine agents with bounded escrow and machine capability manifests.</div>
              <div className="pricing-price-wrap">
                <span className="pricing-price">{isAnnual ? '$8' : '$10'}</span>
                <span className="pricing-interval"> / month</span>
              </div>

              <ul className="pricing-features-list">
                <li><span className="feature-check">✓</span> Everything in Personal</li>
                <li><span className="feature-check">✓</span> ERC-8004 machine manifest endpoint</li>
                <li><span className="feature-check">✓</span> Two-step autonomous escrow protocol</li>
                <li><span className="feature-check">✓</span> ElizaOS &amp; LangChain SDK connectors</li>
                <li><span className="feature-check">✓</span> Bounded PermissionGrant signing</li>
                <li><span className="feature-check">✓</span> 2,500 monthly CIP-64 relayer credits</li>
              </ul>
            </div>

            <a href="/hub/claim.html" className="btn-pill-primary" style={{ width: '100%' }}>
              Claim Agent Identity
            </a>
          </div>

          {/* Tier 3: Namespace Controller */}
          <div className="pricing-card">
            <div>
              <div className="pricing-tier-name">Namespace Controller</div>
              <div className="pricing-tier-desc">Institutional registrars, DAOs, and national namespace controllers.</div>
              <div className="pricing-price-wrap">
                <span className="pricing-price">{isAnnual ? '$39' : '$49'}</span>
                <span className="pricing-interval"> / month</span>
              </div>

              <ul className="pricing-features-list">
                <li><span className="feature-check">✓</span> Everything in Verified Agent</li>
                <li><span className="feature-check">✓</span> National TLD &amp; namespace management</li>
                <li><span className="feature-check">✓</span> Custom registration fee schedule &amp; royalties</li>
                <li><span className="feature-check">✓</span> Sub-tag minting (dept.org.₦tag)</li>
                <li><span className="feature-check">✓</span> Escrow arbitration node privileges</li>
                <li><span className="feature-check">✓</span> Dedicated relayer node infrastructure</li>
              </ul>
            </div>

            <a href="mailto:admin@nairatag.ng" className="btn-pill-secondary" style={{ width: '100%' }}>
              Contact Registrar
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
