import React, { useState } from 'react';

export default function SecuritySphere() {
  const [rotated, setRotated] = useState(false);

  return (
    <section className="security-sphere-section">
      <div className="landing-container">
        <div className="security-card">
          <div className="security-content">
            <div className="security-badge">
              <span className="pulse-dot"></span>
              <span>BOUNDED AGENT SECURITY ARCHITECTURE</span>
            </div>

            <h2 className="security-title">
              Identity is not authority.
            </h2>

            <p className="security-desc">
              Having an on-chain tag gives an agent a verifiable identity, but <strong>never</strong> blank-check execution rights. 
              The CeloTags protocol enforces strict cryptographic <code>PermissionGrant</code> contracts with bounded spending caps, target whitelists, and instantaneous owner revocation.
            </p>

            <div className="security-pills">
              <div className="pill-item">
                <span style={{ color: 'var(--accent-celo)' }}>✓</span>
                <span>EIP-712 Signed Grants</span>
              </div>
              <div className="pill-item">
                <span style={{ color: 'var(--accent-celo)' }}>✓</span>
                <span>Atomic Nonce Replay Lock</span>
              </div>
              <div className="pill-item">
                <span style={{ color: 'var(--accent-celo)' }}>✓</span>
                <span>Time-Bounded Expiry</span>
              </div>
              <div className="pill-item">
                <span style={{ color: 'var(--accent-celo)' }}>✓</span>
                <span>Instant Kill-Switch Revocation</span>
              </div>
            </div>
          </div>

          <div className="sphere-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div 
              className="sphere-object"
              title="Click to interact with the cryptographic sphere"
              onClick={() => setRotated(!rotated)}
              style={{
                transform: rotated ? 'scale(1.08) rotate(15deg)' : 'scale(1)'
              }}
            >
              <div className="sphere-highlight"></div>
              <div className="sphere-sub-highlight"></div>
            </div>

            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-subtle)', padding: '8px 16px', borderRadius: '9999px', border: '1px solid var(--line)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
              <span style={{ color: '#10B981' }}>🛡️</span>
              <span>EIP-712 Active: 0xb345...f9e0</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
