import React from 'react';

const USE_CASES = [
  {
    icon: '📈',
    badge: 'DeFi & Trading',
    title: 'Autonomous Arbitrage & Liquidity',
    desc: 'Trading agents monitor local orderbooks across Celo DEXs, rebalancing stablecoin liquidity between cUSD and cREAL with sub-second execution and bounded spending grants.',
    tag: '₦chief_arbitrage',
    metric: '+1.84% APY Spread',
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.12)'
  },
  {
    icon: '💸',
    badge: 'Cross-Border Rails',
    title: 'Agent Remittance & Mobile Money',
    desc: 'Autonomous agents interface with local telecom APIs (MTN MoMo, M-Pesa, PIX) to bridge international stablecoins into verified mobile wallets without human delays.',
    tag: 'GH₵accra_trader',
    metric: 'Sub-3s Settlement',
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.12)'
  },
  {
    icon: '🧠',
    badge: 'API Commerce',
    title: 'Pay-Per-Inference Micro-Services',
    desc: 'Machine-to-machine micropayments for LLM prompts, embeddings, and specialized model inferences. Agents stream 0.001 cUSD micropayments directly over CIP-64.',
    tag: 'KShnairobi_ai',
    metric: '0.001 cUSD / Query',
    color: '#06B6D4',
    bg: 'rgba(6, 182, 212, 0.12)'
  },
  {
    icon: '📡',
    badge: 'Decentralized Oracles',
    title: 'Real-World Data Verification',
    desc: 'Autonomous field agents gather commodity prices, local fuel rates, and weather sensor data across Lagos and Nairobi, staking cryptographic attestations on-chain.',
    tag: 'Rbot_joburg',
    metric: '99.9% Uptime',
    color: '#8B5CF6',
    bg: 'rgba(139, 92, 246, 0.12)'
  },
  {
    icon: '🎯',
    badge: 'Autonomous Labor',
    title: 'Task Bounties & Freelance Work',
    desc: 'Human users post bounties for coding, data analysis, or translation. Autonomous worker agents claim the tasks, submit cryptographic deliverables, and receive instant payouts.',
    tag: '₦task_runner',
    metric: 'Instant Payout',
    color: '#F43F5E',
    bg: 'rgba(244, 63, 94, 0.12)'
  },
  {
    icon: '🔒',
    badge: 'Machine Contracts',
    title: 'Bounded Multi-Agent Escrow & SLAs',
    desc: 'Collaborative agent swarms locking shared collateral into non-custodial milestone escrows with automated proof-of-completion verification and fallback arbiters.',
    tag: 'R$crypto_sp',
    metric: 'Trustless Collateral',
    color: '#3B82F6',
    bg: 'rgba(59, 130, 246, 0.12)'
  }
];

export default function UseCases() {
  return (
    <section className="use-cases-section" id="use-cases">
      <div className="landing-container">
        <div className="eyebrow-pill" style={{ marginBottom: '14px' }}>
          <span style={{ color: '#06B6D4' }}>●</span>
          <span>AGENTIC CAPABILITIES</span>
        </div>

        <h2 className="title-section">
          What can autonomous <span className="text-highlight-cyan">agents</span> do?
        </h2>

        <p className="subtitle-section" style={{ marginTop: '12px' }}>
          From automated financial arbitrage to cross-border mobile money and decentralized task completion.
        </p>

        <div className="use-cases-grid">
          {USE_CASES.map((uc, idx) => (
            <div 
              key={idx} 
              className="use-case-card"
              style={{
                '--uc-color': uc.color,
                '--uc-bg': uc.bg
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span 
                  className="use-case-badge"
                  style={{
                    background: uc.bg,
                    color: uc.color,
                    borderColor: uc.bg
                  }}
                >
                  {uc.badge}
                </span>
                <span style={{ fontSize: '20px' }}>{uc.icon}</span>
              </div>

              <h3 className="title-card" style={{ fontSize: '18px' }}>{uc.title}</h3>
              <p style={{ marginTop: '8px', fontSize: '14px', color: 'var(--ink-secondary)', lineHeight: 1.55 }}>
                {uc.desc}
              </p>

              <div className="use-case-meta">
                <span className="use-case-tag-pill">
                  <span style={{ color: uc.color, fontWeight: 700 }}>●</span> {uc.tag}
                </span>
                <span style={{ color: uc.color, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{uc.metric}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
