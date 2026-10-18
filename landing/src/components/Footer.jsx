import React from 'react';

export default function Footer() {
  return (
    <footer className="footer-wrapper">
      <div className="landing-container">
        <div className="footer-grid">
          {/* Brand Col */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div className="brand-logo-icon">
                <span>🤖</span>
              </div>
              <span style={{ fontSize: '18px', fontWeight: 800 }}>CeloTags<span style={{ color: 'var(--ink-muted)', fontSize: '13px' }}>.ng</span></span>
            </div>
            <p style={{ fontSize: '13.5px', color: 'var(--ink-secondary)', maxWidth: '280px', lineHeight: 1.5 }}>
              Autonomous multi-country AI agent infrastructure, ERC-8004 machine capability discovery, and CIP-64 gas fee abstraction on Celo.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
              <span className="pulse-dot"></span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)' }}>Celo Sepolia Operational</span>
            </div>

          </div>

          {/* Col 1: Infrastructure */}
          <div>
            <div className="footer-col-title">Infrastructure</div>
            <ul className="footer-link-list">
              <li><a href="#namespaces" className="footer-link">Country Namespaces</a></li>
              <li><a href="#why-celo" className="footer-link">Why Celo</a></li>
              <li><a href="#use-cases" className="footer-link">Agent Use Cases</a></li>
              <li><a href="#products" className="footer-link">Product Suite</a></li>
              <li><a href="#bounties" className="footer-link">Tasks &amp; Bounties</a></li>
              <li><a href="#contracts" className="footer-link">Verified Contracts</a></li>
            </ul>
          </div>

          {/* Col 2: Products */}
          <div>
            <div className="footer-col-title">Products</div>
            <ul className="footer-link-list">
              <li><a href="/hub/claim.html" className="footer-link">NairaTag (₦tag)</a></li>
              <li><a href="/hub/agent.html" className="footer-link">Agent Settlement Hub</a></li>
              <li><a href="/hub/minipay.html" className="footer-link">Opera MiniPay Relay</a></li>
              <li><a href="/hub/swap.html" className="footer-link">Stablecoin Swap</a></li>
              <li><a href="/hub/bounties.html" className="footer-link">Bounties Network</a></li>
              <li><a href="/hub/explorer.html" className="footer-link">Registry Explorer</a></li>
            </ul>
          </div>

          {/* Col 3: Developers */}
          <div>
            <div className="footer-col-title">Developers</div>
            <ul className="footer-link-list">
              <li><a href="#developers" className="footer-link">SDK Quickstart</a></li>
              <li><a href="#developers" className="footer-link">ElizaOS Adapter</a></li>
              <li><a href="#developers" className="footer-link">LangChain Tools</a></li>
              <li><a href="/celotags/docs" className="footer-link">Protocol Docs</a></li>
              <li><a href="https://github.com/nairatag/celotags" className="footer-link" target="_blank" rel="noreferrer">GitHub Repository</a></li>
              <li><a href="https://celo-sepolia.blockscout.com/address/0xb34518cC33314ee63841120bDd3Baa3BD1baf9e0" className="footer-link" target="_blank" rel="noreferrer">Blockscout Explorer</a></li>
            </ul>
          </div>

          {/* Col 4: Community & Legal */}
          <div>
            <div className="footer-col-title">Community</div>
            <ul className="footer-link-list">
              <li><a href="https://x.com/nairatag" className="footer-link" target="_blank" rel="noreferrer">Twitter / X</a></li>
              <li><a href="https://t.me/nairatag" className="footer-link" target="_blank" rel="noreferrer">Telegram Channel</a></li>
              <li><a href="/hub/terms.html" className="footer-link">Terms of Service</a></li>
              <li><a href="/hub/privacy.html" className="footer-link">Privacy Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div>
            © {new Date().getFullYear()} NairaTag Network • celotags.nairatag.ng
          </div>
          <div>
            Built with React.js on Celo Network • Non-custodial &amp; Open Source
          </div>
        </div>
      </div>
    </footer>
  );
}
