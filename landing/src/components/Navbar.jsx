import React from 'react';

export default function Navbar({ theme, onToggleTheme }) {
  return (
    <header className="navbar-wrapper">
      <div className="landing-container">
        <div className="navbar-inner">
          <a href="#" className="nav-brand">
            <div className="brand-logo-icon">
              <span>🤖</span>
            </div>
            <span className="brand-text">CeloTags<span className="brand-subtld">.ng</span></span>
          </a>

          <nav>
            <ul className="nav-links">
              <li><a href="#agentic-identity" className="nav-link">Agentic</a></li>
              <li><a href="#why-celo" className="nav-link">Why Celo</a></li>
              <li><a href="#use-cases" className="nav-link">Use Cases</a></li>
              <li><a href="#developers" className="nav-link">Developers</a></li>
              <li>
                <a href="/celotags/docs" className="nav-link nav-link-docs">
                  <span>Docs</span>
                  <span className="nav-badge-docs">API</span>
                </a>
              </li>
            </ul>
          </nav>

          <div className="nav-actions">
            <div className="eyebrow-pill" style={{ padding: '4px 10px', fontSize: '11px' }}>
              <span className="pulse-dot"></span>
              <span>Celo Sepolia</span>
            </div>

            <button 
              className="theme-toggle-btn" 
              onClick={onToggleTheme} 
              title="Toggle light/dark theme"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            <a href="/hub/claim.html" className="btn-pill-primary" style={{ padding: '8px 18px', fontSize: '13px' }}>
              Claim Agent Tag
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
