/**
 * ═══════════════════════════════════════════════════════════════════════
 * ₦TAG NETWORK — INTERACTIVE IN-APP & WEB PUSH NOTIFICATION SYSTEM
 * VAPID Web Push · SQLite In-App Store · Realtime Web Audio Chimes
 * ═══════════════════════════════════════════════════════════════════════
 */

(function () {
  const BOT_API = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://127.0.0.1:8787'
    : '';

  const VAPID_FALLBACK_PUBLIC_KEY = 'BCNv9dOR7ku_ZTcsstYrMq-xhxuhPjxW1KKtkzVYwpVdR5h01QMh7sFBisDsmk11zirI8RzLAYUug2ZywEheEY0';
  let vapidPublicKey = VAPID_FALLBACK_PUBLIC_KEY;
  let serviceWorkerReg = null;
  let pushSubscription = null;
  let currentWalletAddress = null;
  let notificationsList = [];
  let currentTab = 'all';

  // Helper: Base64 URL to Uint8Array for PushManager
  function urlB64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Audio Chime Synthesizer using Web Audio API (crisp D5 / A5 chord)
  function playNotificationChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc2.frequency.setValueAtTime(880.00, ctx.currentTime); // A5

      gain.gain.setValueAtTime(0.14, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.38);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.38);
      osc2.stop(ctx.currentTime + 0.38);
    } catch (e) {
      // Audio context might be restricted before first user interaction
    }
  }

  // Relative Time Formatter
  function formatRelativeTime(timestamp) {
    if (!timestamp) return 'Just now';
    const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 30) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  // Toast System
  function showToast(title, body, url, category = 'system') {
    playNotificationChime();

    let container = document.getElementById('nt-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'nt-toast-container';
      container.className = 'nt-toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `nt-toast ${category}`;

    const iconMap = {
      claim: '✦',
      wallet: '👛',
      transfer: '💸',
      payment: '⚡',
      processing: '⏳',
      error: '⚠️',
      drop: '🚀',
      system: '🔔'
    };
    const icon = iconMap[category] || '🔔';

    toast.innerHTML = `
      <div class="nt-toast-icon">${icon}</div>
      <div class="nt-toast-content">
        <div class="nt-toast-title">
          <span>${escapeHtml(title)}</span>
          <button class="nt-toast-close" type="button" aria-label="Close">✕</button>
        </div>
        <div class="nt-toast-body">${escapeHtml(body)}</div>
      </div>
    `;

    toast.addEventListener('click', (e) => {
      if (e.target.classList.contains('nt-toast-close')) {
        e.stopPropagation();
        dismissToast(toast);
        return;
      }
      if (url) {
        window.location.href = url;
      } else {
        togglePanel(true);
      }
      dismissToast(toast);
    });

    const closeBtn = toast.querySelector('.nt-toast-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dismissToast(toast);
      });
    }

    container.appendChild(toast);

    // Auto dismiss after 5.5s
    setTimeout(() => {
      dismissToast(toast);
    }, 5500);
  }

  function dismissToast(toast) {
    if (!toast || toast.classList.contains('fade-out')) return;
    toast.classList.add('fade-out');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 220);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Check active connected wallet
  function getDetectedWallet() {
    try {
      const stored = localStorage.getItem('nairatag_active_subaccount') ||
                     localStorage.getItem('nairatag_active_wallet') ||
                     localStorage.getItem('nt_connected_wallet');
      if (stored && stored.startsWith('0x')) return stored.toLowerCase();
    } catch (e) {}
    if (window.ethereum?.selectedAddress) return window.ethereum.selectedAddress.toLowerCase();
    return null;
  }

  // Fetch VAPID Public Key from server
  async function fetchVapidKey() {
    try {
      const res = await fetch(`${BOT_API}/api/notifications/vapid-public-key`);
      const data = await res.json();
      if (data.ok && data.publicKey) {
        vapidPublicKey = data.publicKey;
      }
    } catch (e) {
      console.warn('[Notifications] Using fallback VAPID key');
    }
  }

  // Register Service Worker
  async function initServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.warn('[Notifications] Service Worker not supported');
      return;
    }

    try {
      serviceWorkerReg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      console.log('[Notifications] Service Worker active with scope:', serviceWorkerReg.scope);

      // Check current subscription
      pushSubscription = await serviceWorkerReg.pushManager.getSubscription();
      updatePushStatusUI();

      // Listen for messages dispatched by service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'PUSH_NOTIFICATION_RECEIVED') {
          showToast(
            event.data.title,
            event.data.options?.body || 'New onchain notification.',
            event.data.options?.data?.url,
            'system'
          );
          fetchInAppNotifications();
        }
      });
    } catch (err) {
      console.warn('[Notifications] Service Worker registration failed:', err.message);
      // Fallback try registering with ./hub/sw.js
      try {
        serviceWorkerReg = await navigator.serviceWorker.register('/hub/sw.js', { scope: '/hub/' });
        pushSubscription = await serviceWorkerReg.pushManager.getSubscription();
        updatePushStatusUI();
      } catch (e2) {}
    }
  }

  // Web Push Subscription Handlers
  async function subscribePush() {
    if (!serviceWorkerReg) {
      await initServiceWorker();
      if (!serviceWorkerReg) {
        alert('Service workers are not supported or blocked in this browser.');
        return;
      }
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Push notification permission was denied. Please allow notifications in browser site settings.');
        updatePushStatusUI();
        return;
      }

      await fetchVapidKey();
      const convertedVapidKey = urlB64ToUint8Array(vapidPublicKey);

      const sub = await serviceWorkerReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      pushSubscription = sub;

      // Send to server
      const wallet = getDetectedWallet();
      await fetch(`${BOT_API}/api/notifications/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: wallet,
          subscription: sub.toJSON()
        })
      });

      updatePushStatusUI();
      hidePromptBanner();
      showToast('🔔 Web Push Activated', 'You will now receive super active onchain alerts even when this tab is closed!', null, 'system');
      fetchInAppNotifications();
    } catch (err) {
      console.error('[Notifications] Subscribe failed:', err);
      alert(`Could not subscribe to push alerts: ${err.message}`);
    }
  }

  async function unsubscribePush() {
    if (!pushSubscription) return;
    try {
      const endpoint = pushSubscription.endpoint;
      await pushSubscription.unsubscribe();
      pushSubscription = null;

      await fetch(`${BOT_API}/api/notifications/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint })
      });

      updatePushStatusUI();
      showToast('Push Notifications Paused', 'You have unsubscribed from browser push alerts.', null, 'system');
    } catch (err) {
      console.error('[Notifications] Unsubscribe failed:', err);
    }
  }

  // Persistent Local In-App Notifications
  function getLocalNotifications() {
    try {
      return JSON.parse(localStorage.getItem('nairatag_local_notifications') || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveLocalNotifications(list) {
    try {
      localStorage.setItem('nairatag_local_notifications', JSON.stringify(list));
    } catch (e) {}
  }

  // Dispatch interactive notification locally (both parties, task lifecycle, instant chime & toast)
  function dispatchNotification(opts) {
    if (!opts || !opts.title) return;
    const newNotif = {
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      title: opts.title,
      body: opts.body || '',
      category: opts.category || 'system',
      action_url: opts.url || null,
      recipient: opts.recipient || null,
      is_read: 0,
      created_at: new Date().toISOString()
    };

    const locals = getLocalNotifications();
    locals.unshift(newNotif);
    saveLocalNotifications(locals.slice(0, 100));

    // Prepend to active in-memory list
    notificationsList.unshift(newNotif);
    renderNotifications();
    updateBadge();

    if (opts.showPopup !== false) {
      showToast(opts.title, opts.body, opts.url, opts.category || 'system');
    } else if (opts.playSound !== false) {
      playNotificationChime();
    }
    return newNotif;
  }

  // Fetch In-App Notifications
  async function fetchInAppNotifications() {
    const wallet = getDetectedWallet();
    currentWalletAddress = wallet;
    const localList = getLocalNotifications();

    let serverList = [];
    try {
      const url = wallet
        ? `${BOT_API}/api/notifications?wallet=${encodeURIComponent(wallet)}&limit=40`
        : `${BOT_API}/api/notifications?limit=40`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.ok && Array.isArray(data.notifications)) {
        serverList = data.notifications;
      }
    } catch (err) {
      console.warn('[Notifications] fetch failed:', err.message);
    }

    // Merge local notifications with server notifications
    const combined = [...localList];
    serverList.forEach(item => {
      if (!combined.some(c => c.id === item.id)) {
        combined.push(item);
      }
    });

    if (combined.length === 0) {
      // Standard baseline alerts if empty
      notificationsList = [
        {
          id: 991,
          title: '⚡ Notification Engine Online',
          body: 'Real-time Web Push & in-app alerts are active for all ₦Tag actions.',
          category: 'system',
          action_url: '/hub/wallet.html',
          is_read: 0,
          created_at: new Date().toISOString()
        },
        {
          id: 992,
          title: '🚀 Sub Accounts Enabled',
          body: 'Every claimed NairaTag now controls its own dedicated Base Sub Account.',
          category: 'wallet',
          action_url: '/hub/wallet.html',
          is_read: 0,
          created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString()
        },
        {
          id: 993,
          title: '✦ Identity Explorer Live',
          body: 'Inspect live claims updating by the second on Chain 901 and Base Sepolia.',
          category: 'claim',
          action_url: '/hub/explorer.html',
          is_read: 1,
          created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString()
        }
      ];
    } else {
      notificationsList = combined;
    }

    renderNotifications();
    updateBadge();
  }

  // Trigger Interactive Test Push
  async function triggerTestPush() {
    const wallet = getDetectedWallet();
    showToast('⚡ Test Alert Sent', 'Simulating onchain Sub Account activity and Web Push...', null, 'wallet');

    try {
      await fetch(`${BOT_API}/api/notifications/test-push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: wallet,
          title: '💸 Sub Account Transfer Received',
          body: 'Sub Account #0 received 250.00 cNGN · Tag verified on Base Sepolia',
          category: 'wallet',
          url: '/hub/wallet.html'
        })
      });
      setTimeout(fetchInAppNotifications, 400);
    } catch (err) {
      console.warn('[Notifications] test push failed:', err);
    }
  }

  // Mark Read
  async function markAllAsRead() {
    const wallet = getDetectedWallet();
    notificationsList.forEach(n => n.is_read = 1);
    const locals = getLocalNotifications();
    locals.forEach(n => n.is_read = 1);
    saveLocalNotifications(locals);
    renderNotifications();
    updateBadge();

    try {
      await fetch(`${BOT_API}/api/notifications/mark-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: wallet })
      });
    } catch (e) {}
  }

  async function markSingleRead(id) {
    const item = notificationsList.find(n => n.id === id);
    if (item) item.is_read = 1;
    const locals = getLocalNotifications();
    const lItem = locals.find(n => n.id === id);
    if (lItem) lItem.is_read = 1;
    saveLocalNotifications(locals);
    renderNotifications();
    updateBadge();

    try {
      await fetch(`${BOT_API}/api/notifications/mark-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
    } catch (e) {}
  }

  // Clear All
  async function clearAll() {
    const wallet = getDetectedWallet();
    notificationsList = [];
    saveLocalNotifications([]);
    renderNotifications();
    updateBadge();

    try {
      await fetch(`${BOT_API}/api/notifications/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: wallet })
      });
    } catch (e) {}
  }

  // Update Badge Count
  function updateBadge() {
    const badges = document.querySelectorAll('.nt-notify-badge');
    const unreadCount = notificationsList.filter(n => !n.is_read).length;

    badges.forEach(b => {
      if (unreadCount > 0) {
        b.textContent = unreadCount > 99 ? '99+' : unreadCount;
        b.classList.remove('hidden');
        b.classList.add('pulse');
        setTimeout(() => b.classList.remove('pulse'), 400);
      } else {
        b.textContent = '0';
        b.classList.add('hidden');
      }
    });
  }

  // Update Push Status UI (Toggle button and dot)
  function updatePushStatusUI() {
    const isSubscribed = Boolean(pushSubscription);
    const toggles = document.querySelectorAll('.nt-notify-push-toggle');
    const dots = document.querySelectorAll('.nt-push-dot');
    const statusTexts = document.querySelectorAll('.nt-notify-push-text');

    toggles.forEach(btn => {
      if (isSubscribed) {
        btn.classList.add('active');
        btn.innerHTML = '● Push Active';
        btn.title = 'Click to disable Web Push alerts';
      } else {
        btn.classList.remove('active');
        btn.innerHTML = '○ Enable Push';
        btn.title = 'Click to enable Web Push alerts';
      }
    });

    dots.forEach(d => {
      if (isSubscribed) d.classList.add('active');
      else d.classList.remove('active');
    });

    statusTexts.forEach(t => {
      t.textContent = isSubscribed ? 'Web Push Active' : 'Web Push Off';
    });
  }

  // Render List
  function renderNotifications() {
    const listEl = document.getElementById('nt-notify-list');
    if (!listEl) return;

    const filtered = notificationsList.filter(item => {
      if (currentTab === 'all') return true;
      if (currentTab === 'claims') return item.category === 'claim';
      if (currentTab === 'transfers') return item.category === 'transfer' || item.category === 'wallet';
      if (currentTab === 'drops') return item.category === 'drop' || item.category === 'launch';
      if (currentTab === 'system') return item.category === 'system';
      return true;
    });

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="nt-notify-empty">
          <span class="nt-notify-empty-icon">🔔</span>
          <span class="nt-notify-empty-text">No ${currentTab === 'all' ? '' : currentTab} notifications yet.</span>
        </div>
      `;
      return;
    }

    const iconMap = {
      claim: '✦',
      wallet: '👛',
      transfer: '💸',
      drop: '🚀',
      system: '🔔'
    };

    listEl.innerHTML = filtered.map(item => {
      const cat = item.category || 'system';
      const icon = iconMap[cat] || '🔔';
      const unreadClass = !item.is_read ? 'unread' : '';
      const url = item.action_url || '/hub/wallet.html';

      return `
        <div class="nt-notify-item ${unreadClass}" data-id="${item.id}" data-url="${url}">
          <div class="nt-notify-item-icon ${cat}">${icon}</div>
          <div class="nt-notify-item-content">
            <div class="nt-notify-item-head">
              <span class="nt-notify-item-title">${escapeHtml(item.title)}</span>
              <span class="nt-notify-item-time">${formatRelativeTime(item.created_at)}</span>
            </div>
            <div class="nt-notify-item-body">${escapeHtml(item.body)}</div>
            ${item.action_url ? `<span class="nt-notify-item-link">View Action ↗</span>` : ''}
          </div>
          ${!item.is_read ? '<span class="nt-notify-unread-dot"></span>' : ''}
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.nt-notify-item').forEach(itemEl => {
      itemEl.addEventListener('click', () => {
        const id = Number(itemEl.getAttribute('data-id'));
        const targetUrl = itemEl.getAttribute('data-url');
        markSingleRead(id);
        if (targetUrl) window.location.href = targetUrl;
      });
    });
  }

  // Toggle Panel
  function togglePanel(forceOpen) {
    const panel = document.getElementById('nt-notify-panel');
    if (!panel) return;
    const isHidden = panel.classList.contains('hidden');
    const shouldOpen = forceOpen !== undefined ? forceOpen : isHidden;

    if (shouldOpen) {
      panel.classList.remove('hidden');
      fetchInAppNotifications();
    } else {
      panel.classList.add('hidden');
    }
  }

  // Web Push Prompt Banner
  function checkPromptBanner() {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'default') return;
    if (localStorage.getItem('nt_push_prompt_dismissed')) return;

    let banner = document.getElementById('nt-push-prompt-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'nt-push-prompt-banner';
      banner.className = 'nt-push-prompt-banner';
      banner.innerHTML = `
        <div class="nt-push-prompt-head">
          <span class="nt-push-prompt-icon">🔔</span>
          <div class="nt-push-prompt-text">
            <div class="nt-push-prompt-title">Enable Real-Time Alerts</div>
            <div class="nt-push-prompt-sub">Get super active notifications for claims, Sub Account transfers, and launch drops even when offline.</div>
          </div>
        </div>
        <div class="nt-push-prompt-actions">
          <button class="nt-push-prompt-btn-secondary" id="nt-prompt-dismiss" type="button">Maybe Later</button>
          <button class="nt-push-prompt-btn-primary" id="nt-prompt-enable" type="button">Enable Push</button>
        </div>
      `;
      document.body.appendChild(banner);

      document.getElementById('nt-prompt-enable')?.addEventListener('click', () => {
        subscribePush();
      });
      document.getElementById('nt-prompt-dismiss')?.addEventListener('click', () => {
        hidePromptBanner();
        localStorage.setItem('nt_push_prompt_dismissed', 'true');
      });
    }
  }

  function hidePromptBanner() {
    const banner = document.getElementById('nt-push-prompt-banner');
    if (banner) banner.classList.add('hidden');
  }

  // Inject UI Components into Document
  function mountUI() {
    // 1. Locate header container
    const headerRight = document.querySelector('.header-right') || document.querySelector('.nt-nav-right');
    if (!headerRight) return;

    // Don't mount twice
    if (document.getElementById('nt-notify-wrap')) return;

    const wrap = document.createElement('div');
    wrap.id = 'nt-notify-wrap';
    wrap.style.position = 'relative';
    wrap.style.display = 'inline-flex';
    wrap.style.alignItems = 'center';

    wrap.innerHTML = `
      <button class="nt-notify-btn" id="nt-notify-btn" type="button" title="Open Notifications" aria-label="Notifications">
        <span>🔔</span>
        <span class="nt-notify-badge hidden">0</span>
      </button>

      <!-- Interactive Popover Panel -->
      <div class="nt-notify-panel hidden" id="nt-notify-panel">
        <div class="nt-notify-header">
          <div class="nt-notify-title-group">
            <span class="nt-notify-title">Notifications</span>
          </div>
          <div class="nt-notify-actions">
            <button class="nt-notify-act-btn" id="nt-btn-mark-all" type="button" title="Mark all read">
              <span>✓ Read</span>
            </button>
            <button class="nt-notify-close-btn" id="nt-btn-close-panel" type="button" title="Close">✕</button>
          </div>
        </div>

        <!-- Filter Tabs -->
        <div class="nt-notify-tabs">
          <button class="nt-notify-tab active" data-tab="all" type="button">All</button>
          <button class="nt-notify-tab" data-tab="claims" type="button">Claims</button>
          <button class="nt-notify-tab" data-tab="transfers" type="button">Transfers</button>
          <button class="nt-notify-tab" data-tab="drops" type="button">Drops</button>
          <button class="nt-notify-tab" data-tab="system" type="button">System</button>
        </div>

        <!-- Notification List -->
        <div class="nt-notify-list" id="nt-notify-list">
          <div class="nt-notify-empty">
            <span class="nt-notify-empty-icon">🔔</span>
            <span class="nt-notify-empty-text">Loading notifications...</span>
          </div>
        </div>
      </div>
    `;

    // Insert right before theme-toggle-btn or as first item in header-right
    const themeBtn = headerRight.querySelector('.theme-toggle-btn') || headerRight.firstElementChild;
    if (themeBtn) {
      headerRight.insertBefore(wrap, themeBtn);
    } else {
      headerRight.appendChild(wrap);
    }

    // Attach Event Listeners
    document.getElementById('nt-notify-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePanel();
    });

    document.getElementById('nt-btn-close-panel')?.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePanel(false);
    });

    document.getElementById('nt-btn-test-push')?.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerTestPush();
    });

    document.getElementById('nt-btn-mark-all')?.addEventListener('click', (e) => {
      e.stopPropagation();
      markAllAsRead();
    });

    document.getElementById('nt-btn-clear-all')?.addEventListener('click', (e) => {
      e.preventDefault();
      clearAll();
    });

    document.getElementById('nt-push-toggle-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (pushSubscription) {
        unsubscribePush();
      } else {
        subscribePush();
      }
    });

    // Tab buttons
    wrap.querySelectorAll('.nt-notify-tab').forEach(tabBtn => {
      tabBtn.addEventListener('click', (e) => {
        wrap.querySelectorAll('.nt-notify-tab').forEach(b => b.classList.remove('active'));
        tabBtn.classList.add('active');
        currentTab = tabBtn.getAttribute('data-tab') || 'all';
        renderNotifications();
      });
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) {
        togglePanel(false);
      }
    });

    updatePushStatusUI();
    renderNotifications();
    updateBadge();
  }

  // Public API exposed on window
  window.NairaTagNotifications = {
    subscribePush,
    unsubscribePush,
    showToast,
    triggerTestPush,
    fetchInAppNotifications,
    dispatchNotification,
    markAllAsRead,
    playChime: playNotificationChime
  };

  // Lifecycle Initialization
  window.addEventListener('DOMContentLoaded', async () => {
    mountUI();
    await fetchVapidKey();
    await initServiceWorker();
    await fetchInAppNotifications();

    // Check if permission prompt banner should appear
    setTimeout(checkPromptBanner, 2000);

    // Periodically poll for new alerts every 12 seconds
    setInterval(fetchInAppNotifications, 12000);
  });

  // Re-mount if DOM dynamically replaced
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    mountUI();
    fetchInAppNotifications();
  }
})();
