import React, { useState } from 'react';

const CONTRACTS = [
  {
    name: 'CeloTagsRegistry',
    role: 'Canonical Identity & Namespace Controller',
    address: '0xb34518cC33314ee63841120bDd3Baa3BD1baf9e0',
    desc: 'Core on-chain registry tracking tag ownership, expiration nonces, country namespaces, and cryptographic recovery addresses.'
  },
  {
    name: 'CeloTagsResolver',
    role: 'Forward & Reverse Resolver (ENS Interop)',
    address: '0x293EA56588b8abac78Bab6241466ad8C30bB955A',
    desc: 'Translates multi-country handles (₦michael, GH₵kofi) to Celo Sepolia addresses, MiniPay vaults, and derived ENS reverse nodes.'
  },
  {
    name: 'CeloTagsMarketplace',
    role: 'Secondary Tag Exchange & Royalties',
    address: '0xa379EC02E8709582AEd02efeD0a27B9ED71bec34',
    desc: 'Trustless secondary exchange for premium namespace tags, registrar auctions, and automated fee distribution.'
  },
  {
    name: 'CeloTagsEscrow',
    role: 'Autonomous Agent Milestone Settlement',
    address: '0x5b73C5498c1E3b4dbA84de0F1833c4a029d90519',
    desc: 'Non-custodial milestone escrow smart contract for ElizaOS & LangChain agents with cryptographic proof verification and timeout recovery.'
  }
];

export default function ContractsSection() {
  const [copiedAddr, setCopiedAddr] = useState(null);

  const handleCopy = (addr) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddr(addr);
    setTimeout(() => setCopiedAddr(null), 2000);
  };

  return (
    <section className="contracts-section" id="contracts">
      <div className="landing-container">
        <div className="eyebrow-pill" style={{ marginBottom: '14px' }}>
          <span>ON-CHAIN VERIFICATION</span>
        </div>

        <h2 className="title-section">
          Verified <span className="text-highlight-green">Smart Contracts</span>.
        </h2>

        <p className="subtitle-section" style={{ marginTop: '12px' }}>
          Deployed and verifiable on <strong>Celo Sepolia Testnet</strong> (Chain ID: <code>11142220</code>).
        </p>

        <div className="contracts-grid">
          {CONTRACTS.map((c, idx) => (
            <div key={idx} className="contract-card">
              <div style={{ flex: 1, paddingRight: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 className="title-card" style={{ fontSize: '17px' }}>{c.name}</h3>
                  <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 8px', borderRadius: '9999px', fontWeight: 700, letterSpacing: '0.04em' }}>
                    ● VERIFIED
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                  {c.role}
                </div>

                <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', marginTop: '8px', lineHeight: 1.45 }}>
                  {c.desc}
                </p>

                <div style={{ marginTop: '10px' }}>
                  <code className="contract-address-code">
                    {c.address}
                  </code>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '95px' }}>
                <button
                  type="button"
                  onClick={() => handleCopy(c.address)}
                  className="btn-pill-secondary"
                  style={{ 
                    padding: '7px 14px', 
                    fontSize: '12px',
                    transition: 'all 0.2s ease',
                    background: copiedAddr === c.address ? '#10B981' : undefined,
                    color: copiedAddr === c.address ? '#ffffff' : undefined,
                    borderColor: copiedAddr === c.address ? '#10B981' : undefined
                  }}
                >
                  {copiedAddr === c.address ? '✓ Copied!' : 'Copy Address'}
                </button>

                <a
                  href={`https://celo-sepolia.blockscout.com/address/${c.address}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-pill-secondary"
                  style={{ padding: '7px 14px', fontSize: '12px', textAlign: 'center' }}
                >
                  Blockscout ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
