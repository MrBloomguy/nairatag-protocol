const webpush = require('web-push');

const VAPID_SUBJECT = 'mailto:bloombetgaming@gmail.com';
const VAPID_PUBLIC_KEY = 'BCNv9dOR7ku_ZTcsstYrMq-xhxuhPjxW1KKtkzVYwpVdR5h01QMh7sFBisDsmk11zirI8RzLAYUug2ZywEheEY0';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (err) {
  console.warn('[WebPush] Error setting VAPID details:', err);
}

function createWebPushService(notificationStore) {
  return {
    getPublicKey() {
      return VAPID_PUBLIC_KEY;
    },

    async sendPushToSubscription(subscription, payload) {
      try {
        const pushPayload = JSON.stringify({
          title: payload.title || '₦Tag Network Alert',
          body: payload.body || 'You have a new update on NairaTag.',
          icon: payload.icon || '/hub/banner-card.jpg',
          badge: payload.badge || '/hub/banner-card.jpg',
          tag: payload.tag || 'nairatag-general',
          data: {
            url: payload.url || '/hub/wallet.html',
            timestamp: Date.now(),
            ...payload.data
          },
          actions: [
            { action: 'open', title: 'Open Hub ↗' },
            { action: 'dismiss', title: 'Dismiss' }
          ]
        });

        const result = await webpush.sendNotification(subscription, pushPayload, {
          TTL: 86400,
          urgency: 'high'
        });
        return { success: true, statusCode: result.statusCode };
      } catch (err) {
        console.warn('[WebPush] Send error:', err.statusCode || err.message);
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription expired or invalid
          if (notificationStore && subscription.endpoint) {
            notificationStore.removePushSubscription(subscription.endpoint);
          }
        }
        return { success: false, error: err.message, statusCode: err.statusCode };
      }
    },

    async broadcast(payload) {
      if (!notificationStore) return { sent: 0, failed: 0 };
      const subs = notificationStore.listPushSubscriptions();
      let sent = 0;
      let failed = 0;

      for (const sub of subs) {
        const subObject = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };
        const res = await this.sendPushToSubscription(subObject, payload);
        if (res.success) sent++;
        else failed++;
      }

      // Also create an in-app notification in store
      notificationStore.createInAppNotification({
        walletAddress: payload.walletAddress || null,
        title: payload.title,
        body: payload.body,
        category: payload.category || 'general',
        actionUrl: payload.url || '/hub/wallet.html'
      });

      return { sent, failed, total: subs.length };
    },

    async sendToWallet(walletAddress, payload) {
      if (!notificationStore) return { sent: 0 };
      const subs = notificationStore.getPushSubscriptionsForWallet(walletAddress);
      let sent = 0;

      for (const sub of subs) {
        const subObject = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };
        const res = await this.sendPushToSubscription(subObject, payload);
        if (res.success) sent++;
      }

      notificationStore.createInAppNotification({
        walletAddress: walletAddress,
        title: payload.title,
        body: payload.body,
        category: payload.category || 'wallet',
        actionUrl: payload.url || '/hub/wallet.html'
      });

      return { sent };
    }
  };
}

module.exports = {
  createWebPushService,
  VAPID_PUBLIC_KEY,
  VAPID_SUBJECT
};
