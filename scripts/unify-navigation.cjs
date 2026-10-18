const fs = require('fs');
const path = require('path');

const hubDir = path.resolve(__dirname, '../hub');
const pages = [
  { file: 'claim.html', active: 'menu-claim' },
  { file: 'activities.html', active: 'menu-activities' },
  { file: 'agent.html', active: 'menu-agent' },
  { file: 'wallet.html', active: 'menu-wallet' },
  { file: 'swap.html', active: 'menu-swap' },
  { file: 'explorer.html', active: 'menu-explorer' },
  { file: 'launches.html', active: 'menu-launches' },
  { file: 'bridge.html', active: 'menu-bridge' },
  { file: 'about.html', active: 'menu-about' },
  { file: 'docs.html', active: 'menu-docs' },
  { file: 'faq.html', active: 'menu-faq' },
  { file: 'market.html', active: '' }
];

function getSidebarHtml(activeId) {
  return `    <!-- Left Sidebar Navigation -->
    <aside class="app-sidebar" id="app-sidebar">
      <div class="sidebar-header">
        <a class="brand-logo" href="/agent">
          <div class="brand-mark">
            <img src="/hub/nairatag-icon.png" alt="₦" class="brand-mark-img" />
          </div>
          <span class="brand-text">NairaTag</span>
        </a>
        <button class="sidebar-toggle-btn" id="sidebar-toggle-btn" type="button" title="Collapse sidebar" aria-label="Toggle sidebar">
          <span id="sidebar-toggle-icon">◨</span>
        </button>
      </div>

      <div class="sidebar-scroll">
        <!-- Protocol Group -->
        <div class="sidebar-nav-group">
          <div class="sidebar-nav-title">Protocol</div>
          <nav class="sidebar-menu" aria-label="Protocol Navigation">
            <a class="sidebar-menu-item${activeId === 'menu-claim' ? ' active' : ''}" id="menu-claim" href="/claim" title="Claim ₦Tag">
              <span class="menu-icon">✦</span>
              <span class="menu-label">Claim</span>
            </a>
            <a class="sidebar-menu-item${activeId === 'menu-agent' ? ' active' : ''}" id="menu-agent" href="/agent" title="Open AI Chat">
              <span class="menu-icon">💬</span>
              <span class="menu-label">Chat</span>
              <span class="menu-badge" style="background:#ecfdf5; color:#065f46;">Live</span>
            </a>
            <a class="sidebar-menu-item${activeId === 'menu-tasks' ? ' active' : ''}" id="menu-tasks" href="/tasks" title="Agent Tasks &amp; Bounties">
              <span class="menu-icon">🎯</span>
              <span class="menu-label">Tasks</span>
              <span class="menu-badge" style="background:#eff6ff; color:#1e40af;">New</span>
            </a>
            <a class="sidebar-menu-item${activeId === 'menu-explorer' ? ' active' : ''}" id="menu-explorer" href="/explorer" title="Identity Explorer">
              <span class="menu-icon">🌐</span>
              <span class="menu-label">Explorer</span>
              <span class="menu-badge" style="background:#ecfdf5; color:#065f46;">Live</span>
            </a>
            <a class="sidebar-menu-item${activeId === 'menu-swap' ? ' active' : ''}" id="menu-swap" href="/swap" title="Swap Assets">
              <span class="menu-icon">⇄</span>
              <span class="menu-label">Swap</span>
            </a>
            <a class="sidebar-menu-item${activeId === 'menu-earnings' ? ' active' : ''}" id="menu-earnings" href="/earnings" title="Agent Earnings Leaderboard">
              <span class="menu-icon">🏆</span>
              <span class="menu-label">Earnings</span>
              <span class="menu-badge" style="background:#fefce8; color:#854d0e;">Top</span>
            </a>
          </nav>
        </div>

        <!-- Knowledge & Info Group -->
        <div class="sidebar-nav-group">
          <div class="sidebar-nav-title">Knowledge &amp; Info</div>
          <nav class="sidebar-menu" aria-label="Knowledge and Documentation">
            <a class="sidebar-menu-item${activeId === 'menu-about' ? ' active' : ''}" id="menu-about" href="/about" title="About ₦Tag Network">
              <span class="menu-icon">ℹ</span>
              <span class="menu-label">About</span>
            </a>
            <a class="sidebar-menu-item${activeId === 'menu-docs' ? ' active' : ''}" id="menu-docs" href="/docs" title="Developer Docs &amp; SDK">
              <span class="menu-icon">📖</span>
              <span class="menu-label">Docs</span>
              <span class="menu-badge" style="background:#e0e7ff; color:#4338ca;">Dev</span>
            </a>
            <a class="sidebar-menu-item${activeId === 'menu-faq' ? ' active' : ''}" id="menu-faq" href="/faq" title="Frequently Asked Questions">
              <span class="menu-icon">❓</span>
              <span class="menu-label">FAQ</span>
            </a>
          </nav>
        </div>
      </div>
    </aside>`;
}

function getHeaderHtml() {
  return `    <!-- Main Viewport Container -->
    <div class="main-viewport">
      <!-- Top Navigation Header -->
      <header class="app-header">
        <div class="header-left">
          <button class="header-sidebar-btn" id="header-sidebar-btn" type="button" title="Open menu" aria-label="Open menu" style="display:none;">☰</button>
        </div>
        <div class="header-right">
          <button class="theme-toggle-btn" id="theme-toggle-btn" type="button" title="Toggle Theme" aria-label="Toggle dark mode">🌙</button>
          <button type="button" class="header-auth-btn" id="header-auth-btn" onclick="window.NairaTagSupabase.openAuthModal('signin')" title="Sign In or Sign Up">
            <span id="auth-btn-icon">👤</span>
            <span id="auth-btn-text">Sign In</span>
          </button>
          <div style="position:relative;">
            <a href="/wallet" class="header-btn" id="header-wallet-btn" title="Open Wallet Dashboard" style="font-family:var(--font-mono); font-weight:700; text-decoration:none;">
              <span>👛</span>
              <span id="header-wallet-balance">0.00 cNGN</span>
            </a>
            <!-- Wallet Balance Dropdown Popover -->
            <div class="header-wallet-popover" id="header-wallet-popover" hidden>
              <div class="popover-header">
                <div class="popover-user-info">
                  <div class="popover-tag" id="popover-active-tag">₦TAG</div>
                  <div class="popover-addr" id="popover-active-addr">Not connected</div>
                </div>
                <div class="popover-status-badge">Active</div>
              </div>
              <div class="popover-balance-section">
                <div class="popover-balance-label">Total Balance</div>
                <div class="popover-balance-val" id="popover-total-balance">₦ 0.00</div>
              </div>
              <div class="popover-actions">
                <a href="/wallet" class="popover-btn primary" id="popover-open-wallet">Wallet Dashboard</a>
                <button type="button" class="popover-btn" id="popover-disconnect-btn">Disconnect</button>
              </div>
            </div>
          </div>
        </div>
      </header>`;
}

pages.forEach(page => {
  const filePath = path.join(hubDir, page.file);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace <aside class="app-sidebar"...>...</aside>
  const sidebarRegex = /<!--\s*(?:Left Sidebar|UNIFIED SIDEBAR|COLLAPSIBLE SIDEBAR)[\s\S]*?-->\s*<aside\s+class="app-sidebar"[\s\S]*?<\/aside>/i;
  const newSidebar = getSidebarHtml(page.active);
  if (sidebarRegex.test(content)) {
    content = content.replace(sidebarRegex, newSidebar);
  } else {
    const simpleAsideRegex = /<aside\s+class="app-sidebar"[\s\S]*?<\/aside>/;
    if (simpleAsideRegex.test(content)) {
      content = content.replace(simpleAsideRegex, newSidebar);
    }
  }

  // Replace everything between </aside> and </header> with the clean Main Viewport + Header (no breadcrumbs)
  const headerSectionRegex = /(<\/aside>)([\s\S]*?<header\s+class="app-header"[\s\S]*?<\/header>)/i;
  if (headerSectionRegex.test(content)) {
    content = content.replace(headerSectionRegex, `$1\n\n${getHeaderHtml()}`);
  }

  // Replace any remaining internal /hub/links with clean /links across the file
  content = content
    .replace(/href="\/hub\/claim\.html"/g, 'href="/claim"')
    .replace(/href="\/hub\/agent\.html"/g, 'href="/agent"')
    .replace(/href="\/hub\/wallet\.html"/g, 'href="/wallet"')
    .replace(/href="\/hub\/swap\.html"/g, 'href="/swap"')
    .replace(/href="\/hub\/explorer\.html"/g, 'href="/explorer"')
    .replace(/href="\/hub\/launches\.html"/g, 'href="/launches"')
    .replace(/href="\/hub\/bridge\.html"/g, 'href="/bridge"')
    .replace(/href="\/hub\/about\.html"/g, 'href="/about"')
    .replace(/href="\/hub\/docs\.html"/g, 'href="/docs"')
    .replace(/href="\/hub\/faq\.html"/g, 'href="/faq"')
    .replace(/href="\/hub\/activities\.html"/g, 'href="/activities"');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✓ Successfully unified navigation (clean header) for:', page.file);
});
