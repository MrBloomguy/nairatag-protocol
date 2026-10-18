import React from 'react';

export default function BuilderVisual() {
  return (
    <section className="builder-banner-section">
      <div className="landing-container">
        <div className="builder-banner-card">
          <div className="builder-banner-overlay"></div>
          <div className="builder-banner-text">
            <div className="eyebrow-pill" style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.25)', color: '#ffffff', marginBottom: '16px' }}>
              <span>MISSION CRITICAL PROTOCOL</span>
            </div>
            <h3 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15 }}>
              Engineered for the next billion autonomous machine-to-machine interactions.
            </h3>
            <p style={{ marginTop: '12px', fontSize: '15px', color: '#d1d5db', lineHeight: 1.6 }}>
              From Lagos to São Paulo, autonomous agents need cryptographic certainty without the burden of custodial fiat rails or high gas volatility.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
