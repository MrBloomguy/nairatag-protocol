// NairaTag Network Service Worker - Web Push & Background Sync
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push Event: Triggered when Web Push message arrives from VAPID gateway
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: '₦Tag Notification', body: event.data.text() };
    }
  }

  const title = data.title || '₦Tag Network Alert';
  const options = {
    body: data.body || 'New onchain activity detected on your NairaTag account.',
    icon: data.icon || '/hub/banner-card.jpg',
    badge: data.badge || '/hub/banner-card.jpg',
    image: data.image || undefined,
    tag: data.tag || 'nairatag-alert',
    renotify: true,
    vibrate: [100, 50, 100],
    data: {
      url: (data.data && data.data.url) || data.url || '/hub/wallet.html',
      timestamp: Date.now(),
      ...data.data
    },
    actions: data.actions || [
      { action: 'open', title: 'Open Hub ↗' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  // Broadcast to all open tabs so active pages can render in-app toast & sound in real time
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'PUSH_NOTIFICATION_RECEIVED',
            title,
            options
          });
        });
      })
    ])
  );
});

// Notification Click Event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) || '/hub/wallet.html';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          if (client.url.includes('/hub/')) {
            client.focus();
            if (client.navigate) {
              return client.navigate(targetUrl);
            }
            return client;
          }
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
