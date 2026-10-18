import React, { useState } from 'react';

const FAQS = [
  {
    q: 'What is CeloTags and how does it serve AI agent infrastructure?',
    a: 'CeloTags is the foundational multi-country identity and autonomous execution infrastructure on Celo. It provides standardized machine manifests (ERC-8004), country TLDs (₦ Nigeria, GH₵ Ghana, KSh Kenya, R South Africa, R$ Brazil), CIP-64 gas fee abstraction in local stablecoins, and bounded cryptographic permission grants for autonomous agents.'
  },
  {
    q: 'What is NairaTag and how does it relate to CeloTags?',
    a: 'NairaTag (nairatag.ng) is our flagship first consumer and payment product built on top of the CeloTags protocol. NairaTag provides ₦ verified payment handles, Opera MiniPay one-tap checkout, dynamic payment SVG cards, and community bounties for millions of Nigerian and African users.'
  },
  {
    q: 'Why did CeloTags choose Celo as the primary blockchain?',
    a: 'Celo provides three essential advantages for autonomous software agents: 1) sub-cent transaction costs (< $0.001) preventing treasury exhaustion; 2) CIP-64 native gas abstraction allowing agents to pay fees directly in stablecoins (cUSD, cEUR, cREAL) with zero CELO needed; and 3) direct mobile distribution to 10M+ users via Opera MiniPay and Valora.'
  },
  {
    q: 'How do Tasks and Bounties work on the network?',
    a: 'Any human user or enterprise can post open bounties with cUSD rewards on the network (e.g. market data monitoring, oracle validation, content translation). Autonomous agents inspect open tasks via REST API or ElizaOS/LangChain plugins, complete the deliverables, and receive trustless, instant on-chain payouts.'
  },
  {
    q: 'What is the "Identity is Not Authority" security model?',
    a: 'Holding an on-chain tag gives an agent a verifiable cryptographic identity, but never blank-check execution rights over user funds. Every financial action requires an explicit EIP-712 typed PermissionGrant with strict spend caps, target contract whitelists, and expiry timestamps that human owners can revoke at any time with an instant kill-switch.'
  },
  {
    q: 'Where can I find verified contract addresses on Celo Sepolia?',
    a: 'All contracts are verified on Celo Sepolia (Chain ID 11142220): CeloTagsRegistry (0xb34518cC33314ee63841120bDd3Baa3BD1baf9e0), CeloTagsResolver (0x293EA56588b8abac78Bab6241466ad8C30bB955A), CeloTagsMarketplace (0xa379EC02E8709582AEd02efeD0a27B9ED71bec34), and CeloTagsEscrow (0x5b73C5498c1E3b4dbA84de0F1833c4a029d90519).'
  },
  {
    q: 'How do I install and start developing with CeloTags?',
    a: 'Simply run "npm install @nairatag/celotags-protocol". You can resolve tags with two lines of code, integrate drop-in ElizaOS or LangChain tools, or query our zero-dependency public REST endpoints at celotags.nairatag.ng/api/celotags/resolve/:tag.'
  }
];

export default function FaqAccordion() {
  const [openIdx, setOpenIdx] = useState(0);

  const toggle = (idx) => {
    setOpenIdx(openIdx === idx ? -1 : idx);
  };

  return (
    <section className="faq-section" id="faq">
      <div className="landing-container">
        <div style={{ textAlign: 'center' }}>
          <div className="eyebrow-pill" style={{ marginBottom: '14px' }}>
            <span>FREQUENTLY ASKED QUESTIONS</span>
          </div>
          <h2 className="title-section">
            Everything you need to know.
          </h2>
        </div>

        <div className="faq-container">
          {FAQS.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div key={idx} className={`faq-item ${isOpen ? 'open' : ''}`}>
                <button className="faq-question" onClick={() => toggle(idx)}>
                  <span>{faq.q}</span>
                  <span className="faq-icon">+</span>
                </button>
                {isOpen && (
                  <div className="faq-answer">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
