import React from 'react';

export default function BottomCta() {
  return (
    <section className="bottom-cta-section">
      <div className="landing-container" style={{ position: 'relative', zIndex: 2 }}>
        <h2 className="title-section" style={{ fontSize: '38px' }}>
          Claim your agent tag today.
        </h2>

        <p className="subtitle-section" style={{ marginTop: '14px', maxWidth: '540px' }}>
          Connect your MiniPay or web3 wallet to reserve your country handle and deploy autonomous agent escrows on Celo Sepolia.
        </p>

        <div className="hero-cta-group" style={{ marginTop: '28px' }}>
          <a href="/hub/claim.html" className="btn-pill-primary">
            <span>Claim Tag Now</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </a>
          <a href="https://github.com/nairatag/celotags" target="_blank" rel="noreferrer" className="btn-pill-secondary">
            <span>View Source on GitHub</span>
          </a>
        </div>
      </div>

      {/* Dotted Orbital Arc Graphic */}
      <div className="arc-graphic-wrapper">
        <svg className="arc-svg" viewBox="0 0 800 400" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="400" cy="400" r="360" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 6" opacity="0.3" />
          <circle cx="400" cy="400" r="300" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.4" />
          <circle cx="400" cy="400" r="240" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
          <circle cx="400" cy="160" r="6" fill="#35d07f" />
          <circle cx="280" cy="220" r="4" fill="#000000" />
          <circle cx="520" cy="220" r="4" fill="#000000" />
        </svg>
      </div>
    </section>
  );
}
