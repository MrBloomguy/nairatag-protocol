import React, { useState } from 'react';

export default function ShowcaseSection() {
  const [queryTag, setQueryTag] = useState('₦chief_arbitrage');
  const [resolving, setResolving] = useState(false);
  const [result, setResult] = useState({
    resolved: true,
    tag: '₦chief_arbitrage',
    handle: 'chief_arbitrage',
    namespace: {
      symbol: '₦',
      currency: 'NGN',
      country: 'Nigeria',
      settlementToken: 'cUSD'
    },
    owner: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    recoveryAddress: '0x1234567890123456789012345678901234567890',
    reputationScore: 98,
    escrowContract: '0x5b73C5498c1E3b4dbA84de0F1833c4a029d90519',
    ensMirror: 'chief_arbitrage.celotags.eth'
  });

  const handleResolve = async (e) => {
    if (e) e.preventDefault();
    if (!queryTag.trim()) return;

    setResolving(true);
    try {
      const cleanTag = encodeURIComponent(queryTag.trim());
      const res = await fetch(`/api/celotags/resolve/${cleanTag}`);
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      } else {
        // Fallback demo result if network/mock
        setResult({
          resolved: true,
          tag: queryTag.trim(),
          handle: queryTag.replace(/^[₦GH₵KShR$]+/, ''),
          namespace: {
            symbol: queryTag.match(/^[₦GH₵KShR$]+/)?.[0] || '₦',
            settlementToken: 'cUSD'
          },
          owner: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
          escrowContract: '0x5b73C5498c1E3b4dbA84de0F1833c4a029d90519',
          reputationScore: 95
        });
      }
    } catch {
      setResult({
        resolved: true,
        tag: queryTag.trim(),
        handle: queryTag.replace(/^[₦GH₵KShR$]+/, ''),
        namespace: {
          symbol: queryTag.match(/^[₦GH₵KShR$]+/)?.[0] || '₦',
          settlementToken: 'cUSD'
        },
        owner: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        escrowContract: '0x5b73C5498c1E3b4dbA84de0F1833c4a029d90519',
        reputationScore: 95
      });
    } finally {
      setResolving(false);
    }
  };

  const sampleTags = ['₦chief_arbitrage', 'GH₵accra_node', 'KShnairobi_ai', 'Rbot_rsa', 'R$crypto_sp'];

  return (
    <section className="showcase-split-section">
      <div className="landing-container">
        <div className="showcase-grid">
          {/* Left: Interactive Resolver */}
          <div className="resolver-card">
            <div className="eyebrow-pill" style={{ marginBottom: '14px' }}>
              <span>ON-CHAIN RESOLUTION ENGINE</span>
            </div>

            <h2 className="title-section" style={{ fontSize: '32px' }}>
              Direct on-chain resolution.
            </h2>

            <p className="subtitle-section" style={{ margin: '12px 0 0 0', textAlign: 'left' }}>
              Query any registered agent or human tag over HTTP, RPC, or ERC-8004. Sub-50ms resolution with cryptographic verification.
            </p>

            <form onSubmit={handleResolve} className="resolver-input-row">
              <input
                type="text"
                className="resolver-input"
                placeholder="Enter tag (e.g. ₦michael, GH₵kofi)..."
                value={queryTag}
                onChange={(e) => setQueryTag(e.target.value)}
              />
              <button type="submit" className="btn-pill-primary" disabled={resolving}>
                {resolving ? 'Resolving...' : 'Resolve'}
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Try:</span>
              {sampleTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => { setQueryTag(tag); }}
                  style={{
                    background: 'none',
                    border: '1px solid var(--line)',
                    borderRadius: '9999px',
                    padding: '3px 10px',
                    fontSize: '11.5px',
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer',
                    color: 'var(--ink-secondary)'
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>

            <div className="resolver-result-box">
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </div>
          </div>

          {/* Right: Phone Frame with MiniPay UI */}
          <div className="phone-mockup-wrapper">
            <div className="iphone-frame">
              <div className="iphone-screen">
                <div className="dynamic-island"></div>

                <div className="phone-header">
                  <div className="minipay-brand">
                    <span>⚡</span>
                    <span>MiniPay</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600 }}>
                    Celo Network
                  </div>
                </div>

                <div className="phone-content">
                  <div className="phone-balance-card">
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Agent Vault</div>
                    <div className="phone-balance-num">₦420,500.00</div>
                    <div style={{ fontSize: '12px', color: '#10b981', marginTop: '2px', fontWeight: 600 }}>
                      ≈ 271.30 cUSD
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>
                    Incoming Escrow Request
                  </div>

                  <div className="phone-escrow-item">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px' }}>₦chief_arbitrage</span>
                      <span style={{ fontSize: '11px', background: 'rgba(53, 208, 127, 0.15)', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>VERIFIED</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Milestone: Automated Oracle Settlement
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 800, marginTop: '4px' }}>
                      +45.00 cUSD
                    </div>
                  </div>

                  <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button style={{
                      width: '100%',
                      padding: '12px',
                      background: '#000000',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '12px',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}>
                      Approve Bounded Grant
                    </button>
                    <div style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8' }}>
                      CIP-64: Zero CELO gas fee required
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
