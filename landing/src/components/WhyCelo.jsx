import React from 'react';

const REASONS = [
  {
    icon: '⚡',
    title: 'Sub-Cent Gas Fees',
    desc: 'Autonomous agents execute hundreds of micro-transactions, state updates, and price checks daily. Celo guarantees sub-$0.001 transaction costs so agents never exhaust treasuries.',
    stat: '< $0.001',
    color: '#10B981',
    accentBg: 'rgba(16, 185, 129, 0.12)',
    borderHover: 'rgba(16, 185, 129, 0.4)'
  },
  {
    icon: '💵',
    title: 'CIP-64 Local Stablecoin Gas',
    desc: 'Agents never need native CELO. Pay on-chain gas fees directly in local stablecoins like cUSD, cEUR, and cREAL. Zero gas volatility, zero token swapping overhead.',
    stat: '0 CELO Needed',
    color: '#F59E0B',
    accentBg: 'rgba(245, 158, 11, 0.12)',
    borderHover: 'rgba(245, 158, 11, 0.4)'
  },
  {
    icon: '📱',
    title: '10M+ Mobile-First Distribution',
    desc: 'Direct interoperability with Opera MiniPay and Valora. Agents can interact, request signatures, or disburse micropayments directly to millions of African and LatAm mobile users.',
    stat: '10M+ Wallets',
    color: '#06B6D4',
    accentBg: 'rgba(6, 182, 212, 0.12)',
    borderHover: 'rgba(6, 182, 212, 0.4)'
  },
  {
    icon: '⏱️',
    title: '1-Second Finality',
    desc: 'Near-instant block confirmation enables high-frequency agent reaction loops, rapid escrow transitions, and real-time cross-chain messaging without waiting for slow L1 blocks.',
    stat: '~1s Finality',
    color: '#8B5CF6',
    accentBg: 'rgba(139, 92, 246, 0.12)',
    borderHover: 'rgba(139, 92, 246, 0.4)'
  },
  {
    icon: '🌍',
    title: 'Multi-Currency Stablecoins',
    desc: 'Native support for fiat-backed and algorithmic localized stablecoins (cUSD, cEUR, cREAL, cKES/cNGN ecosystem) allowing agents to transact in local monetary units.',
    stat: '5+ Currencies',
    color: '#F43F5E',
    accentBg: 'rgba(244, 63, 94, 0.12)',
    borderHover: 'rgba(244, 63, 94, 0.4)'
  },
  {
    icon: '🌱',
    title: 'Carbon-Negative L2 Stack',
    desc: 'Built on a proof-of-stake EVM Layer-2 architecture that offsets 100% of carbon emissions, ensuring green, sustainable execution for compute-heavy AI ecosystems.',
    stat: '100% Offset',
    color: '#22C55E',
    accentBg: 'rgba(34, 197, 94, 0.12)',
    borderHover: 'rgba(34, 197, 94, 0.4)'
  }
];

export default function WhyCelo() {
  return (
    <section className="why-celo-section" id="why-celo">
      <div className="landing-container">
        <div className="eyebrow-pill" style={{ marginBottom: '14px' }}>
          <span style={{ color: '#35D07F' }}>●</span>
          <span>FOUNDATIONAL BLOCKCHAIN</span>
        </div>

        <h2 className="title-section">
          Why Celo for <span className="text-highlight-green">AI Agents</span>?
        </h2>

        <p className="subtitle-section" style={{ marginTop: '12px' }}>
          High-throughput, sub-cent execution, and native stablecoin gas abstraction designed for autonomous software machines.
        </p>

        <div className="why-celo-grid">
          {REASONS.map((r, idx) => (
            <div 
              key={idx} 
              className="why-celo-card"
              style={{
                '--card-accent': r.color,
                '--card-bg': r.accentBg,
                '--card-border': r.borderHover
              }}
            >
              <div>
                <div 
                  className="why-celo-icon"
                  style={{
                    background: r.accentBg,
                    borderColor: r.borderHover,
                    color: r.color
                  }}
                >
                  {r.icon}
                </div>
                <h3 className="title-card" style={{ fontSize: '18px' }}>{r.title}</h3>
                <p style={{ marginTop: '8px', fontSize: '14px', color: 'var(--ink-secondary)', lineHeight: 1.55 }}>
                  {r.desc}
                </p>
              </div>

              <div 
                className="why-celo-stat"
                style={{ color: r.color }}
              >
                {r.stat}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
