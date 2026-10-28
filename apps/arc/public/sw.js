/* ==========================================================================
   NAIRATAG x ARC OSAKA - WEB PUSH SERVICE WORKER
   Handles Web Push Notifications, Action Buttons, and Background Sync
   ========================================================================== */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ─── Listen for incoming Web Push events from VAPID server ───────────────────
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'NairaTag Alert', body: event.data.text() };
    }
  } else {
    data = {
      title: '🎁 New Reward Ready!',
      body: 'You have a new voucher and cashback opportunity waiting.',
    };
  }

  const title = data.title || 'NairaTag';
  const options = {
    body: data.body || 'Sub-second payment settlement and reward notification.',
    icon: data.icon || '/nairatag-logo.png',
    badge: data.badge || '/favicon.png',
    vibrate: [150, 80, 150, 80, 200],
    data: {
      url: data.url || '/#rewards',
      timestamp: Date.now(),
      ...data.extra,
    },
    actions: data.actions || [
      { action: 'open', title: 'Open App ↗' },
      { action: 'claim', title: '🎁 Claim Now' },
    ],
    tag: data.tag || 'nairatag-notification',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Handle clicks on system push notifications ──────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  let targetUrl = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/';

  if (action === 'claim') {
    targetUrl = '/#rewards';
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a tab is already open, focus and navigate it
      for (let client of windowClients) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// ─── Listen for subscription changes ─────────────────────────────────────────
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options)
      .then((subscription) => {
        // Broadcast new subscription to active clients
        return self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'PUSH_SUBSCRIPTION_CHANGED',
              subscription: JSON.stringify(subscription),
            });
          });
        });
      })
  );
});
