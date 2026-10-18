/**
 * ₦Tag Protocol Unified Theme Manager (Dark & Light Mode)
 * Persists user choice in localStorage with system preference fallback
 */
(function() {
  const THEME_KEY = 'nairatag_theme';

  function getStoredTheme() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlTheme = urlParams.get('theme');
      if (urlTheme === 'dark' || urlTheme === 'light') {
        localStorage.setItem(THEME_KEY, urlTheme);
        return urlTheme;
      }
      const stored = localStorage.getItem(THEME_KEY);
      if (stored === 'dark' || stored === 'light') return stored;
    } catch (e) {}
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  function applyTheme(theme) {
    const isDark = theme === 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', isDark);

    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {}

    // Update all toggle buttons on page (supports both old .theme-toggle-btn and new sidebar toggle)
    document.querySelectorAll('.theme-toggle-btn, #theme-toggle-btn').forEach(btn => {
      const iconSpan = btn.querySelector('.menu-icon, #theme-toggle-icon');
      const labelSpan = btn.querySelector('.menu-label');
      if (iconSpan) {
        iconSpan.textContent = isDark ? '☀️' : '🌙';
      } else {
        btn.textContent = isDark ? '☀️' : '🌙';
      }
      if (labelSpan) {
        labelSpan.textContent = isDark ? 'Light Mode' : 'Dark Mode';
      }
      btn.setAttribute('title', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
      btn.setAttribute('aria-label', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
    });

    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  }

  // Early execution to eliminate flash of unstyled theme
  const initialTheme = getStoredTheme();
  document.documentElement.setAttribute('data-theme', initialTheme);
  document.documentElement.classList.toggle('dark', initialTheme === 'dark');

  window.toggleTheme = function() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  };

  // Watch system color preference changes if not manually set
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      try {
        if (!localStorage.getItem(THEME_KEY)) {
          applyTheme(e.matches ? 'dark' : 'light');
        }
      } catch (err) {}
    });
  }

  // ─── Minimal Mobile Splash Screen (Only Logo Loading, No Words/Spinners) ───
  let splashStartTime = 0;
  function injectMobileSplash() {
    if (window.innerWidth > 860) return;
    if (document.getElementById('mobile-splash-screen')) return;

    splashStartTime = Date.now();
    const splash = document.createElement('div');
    splash.id = 'mobile-splash-screen';
    splash.setAttribute('aria-hidden', 'true');
    splash.innerHTML = '<div class="splash-logo-mark">₦</div>';

    if (document.body) {
      document.body.insertBefore(splash, document.body.firstChild);
    }
  }

  function dismissMobileSplash() {
    const splash = document.getElementById('mobile-splash-screen');
    if (!splash) return;
    if (splash.classList.contains('splash-hidden')) return;

    const elapsed = Date.now() - (splashStartTime || Date.now());
    const delay = Math.max(0, 420 - elapsed);

    setTimeout(() => {
      splash.classList.add('splash-hidden');
      setTimeout(() => {
        if (splash.parentNode) splash.remove();
      }, 360);
    }, delay);
  }

  // Early injection for zero-flash on mobile
  if (typeof window !== 'undefined' && window.innerWidth <= 860) {
    if (document.body) {
      injectMobileSplash();
    } else {
      const splashObserver = new MutationObserver(() => {
        if (document.body) {
          injectMobileSplash();
          splashObserver.disconnect();
        }
      });
      splashObserver.observe(document.documentElement, { childList: true });
    }

    if (document.readyState === 'complete') {
      dismissMobileSplash();
    } else {
      window.addEventListener('load', dismissMobileSplash);
      // Failsafe timeout to never block user interaction
      setTimeout(dismissMobileSplash, 850);
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    if (window.innerWidth <= 860) injectMobileSplash();
    applyTheme(getStoredTheme());

    document.querySelectorAll('.theme-toggle-btn, #theme-toggle-btn').forEach(btn => {
      btn.removeEventListener('click', window.toggleTheme);
      btn.addEventListener('click', window.toggleTheme);
    });

    // Unified Sidebar & Mobile Sliding Drawer Handling across all pages
    const sidebar = document.getElementById('app-sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle-btn');
    const headerSidebarBtn = document.getElementById('header-sidebar-btn');
    const toggleIcon = document.getElementById('sidebar-toggle-icon');

    // Create or find unified backdrop element
    let backdrop = document.querySelector('.sidebar-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'sidebar-backdrop';
      document.body.appendChild(backdrop);
    }

    if (sidebar) {
      const isMobile = () => window.innerWidth <= 860;

      // Restore persisted desktop sidebar state
      try {
        if (!isMobile() && localStorage.getItem('nairatag_sidebar_collapsed') === '1') {
          sidebar.classList.add('collapsed');
          if (toggleIcon) toggleIcon.textContent = '◧';
        }
      } catch (e) {}

      function openMobileMenu() {
        sidebar.classList.add('mobile-open');
        backdrop.classList.add('active');
        document.body.style.overflow = 'hidden';
      }

      function closeMobileMenu() {
        sidebar.classList.remove('mobile-open');
        backdrop.classList.remove('active');
        document.body.style.overflow = '';
      }

      function toggleMobileMenu() {
        if (sidebar.classList.contains('mobile-open')) {
          closeMobileMenu();
        } else {
          openMobileMenu();
        }
      }

      function doDesktopSidebarToggle() {
        const isCollapsed = sidebar.classList.toggle('collapsed');
        if (toggleIcon) toggleIcon.textContent = isCollapsed ? '◧' : '◨';
        try {
          localStorage.setItem('nairatag_sidebar_collapsed', isCollapsed ? '1' : '0');
        } catch (e) {}
      }

      // Close mobile drawer on backdrop tap
      backdrop.addEventListener('click', () => {
        closeMobileMenu();
      });

      // Close mobile drawer on menu item tap
      sidebar.querySelectorAll('.sidebar-menu-item').forEach(item => {
        item.addEventListener('click', () => {
          if (isMobile()) {
            closeMobileMenu();
          }
        });
      });

      // Escape key to close mobile drawer
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar.classList.contains('mobile-open')) {
          closeMobileMenu();
        }
      });

      // Header button (hamburger menu on mobile, expander on desktop)
      document.querySelectorAll('#header-sidebar-btn, .header-sidebar-btn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          if (isMobile()) {
            toggleMobileMenu();
          } else {
            doDesktopSidebarToggle();
          }
        };
      });

      // Sidebar header button (close button '✕' on mobile, collapse toggle on desktop)
      document.querySelectorAll('#sidebar-toggle-btn, .sidebar-toggle-btn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          if (isMobile()) {
            closeMobileMenu();
          } else {
            doDesktopSidebarToggle();
          }
        };
      });

      // Responsive resize watcher
      window.addEventListener('resize', () => {
        if (!isMobile() && sidebar.classList.contains('mobile-open')) {
          closeMobileMenu();
        }
      });
    }

    // Unified Header Wallet Handling across all pages
    const walletBtn = document.getElementById('header-wallet-btn');
    if (walletBtn) {
      const isHubPath = window.location.pathname.startsWith('/hub/');
      const walletUrl = isHubPath ? '/hub/profile.html' : '/profile';

      let walletPopover = document.getElementById('header-wallet-popover');
      if (!walletPopover) {
        walletPopover = document.createElement('div');
        walletPopover.className = 'header-wallet-popover';
        walletPopover.id = 'header-wallet-popover';
        walletPopover.hidden = true;
        walletPopover.innerHTML = `
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
            <a href="${walletUrl}" class="popover-btn primary" id="popover-open-wallet">Profile &amp; Wallet</a>
            <button type="button" class="popover-btn" id="popover-disconnect-btn">Disconnect</button>
          </div>
        `;
        if (walletBtn.parentElement) {
          walletBtn.parentElement.appendChild(walletPopover);
        }
      }

      function updatePopoverData() {
        const activeTag = localStorage.getItem('nairatag_active_tag') || localStorage.getItem('claimed_tag') || '₦TAG';
        const userAddr = localStorage.getItem('nairatag_wallet') || localStorage.getItem('user_address') || localStorage.getItem('nairatag_account') || '';
        const savedBal = localStorage.getItem('nairatag_cngn_balance') || '0.00';

        const tagEl = document.getElementById('popover-active-tag');
        const addrEl = document.getElementById('popover-active-addr');
        const balEl = document.getElementById('popover-total-balance');
        const headerBal = document.getElementById('header-wallet-balance');

        if (tagEl) tagEl.textContent = activeTag.startsWith('₦') ? activeTag : `₦${activeTag}`;
        if (addrEl) addrEl.textContent = userAddr ? `${userAddr.slice(0, 6)}...${userAddr.slice(-4)}` : 'Not connected';
        if (balEl) balEl.textContent = `₦ ${Number(savedBal).toLocaleString()}`;
        if (headerBal) headerBal.textContent = `${Number(savedBal).toFixed(2)} cNGN`;
      }

      updatePopoverData();

      walletBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        updatePopoverData();
        walletPopover.hidden = !walletPopover.hidden;
      });

      const disconnectBtn = document.getElementById('popover-disconnect-btn');
      if (disconnectBtn) {
        disconnectBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm('Do you want to disconnect your wallet session?')) {
            localStorage.removeItem('nairatag_wallet');
            localStorage.removeItem('nairatag_active_tag');
            if (window.NairaTagSupabase) window.NairaTagSupabase.signOut();
            walletPopover.hidden = true;
            updatePopoverData();
          }
        });
      }

      document.addEventListener('click', (e) => {
        if (!walletPopover.hidden && !walletPopover.contains(e.target) && e.target !== walletBtn && !walletBtn.contains(e.target)) {
          walletPopover.hidden = true;
        }
      });
    }

    // Auto-load interactive notifications system if not already linked
    if (!document.querySelector('link[href*="notifications.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/hub/notifications.css';
      document.head.appendChild(link);
    }
    if (!document.querySelector('script[src*="notifications.js"]') && !window.NairaTagNotifications) {
      const script = document.createElement('script');
      script.src = '/hub/notifications.js';
      document.head.appendChild(script);
    }
  });
})();

