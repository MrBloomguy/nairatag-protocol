const MAX_NOTIFICATIONS = 50;
let inbox = [];

function readInbox() {
  return inbox;
}

function writeInbox(items) {
  inbox = items.slice(0, MAX_NOTIFICATIONS);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('nairatag:notification-inbox-updated'));
  return true;
}

export function getNotificationInbox() {
  return readInbox();
}

export function replaceNotificationInbox(items) {
  return writeInbox(Array.isArray(items) ? items.filter((item) => item && typeof item.id === 'string') : []);
}

export function addInboxNotification(notification) {
  const item = {
    id: notification.id || `notif_${Date.now()}_${crypto.randomUUID?.() || Math.random().toString(36).slice(2, 8)}`,
    title: String(notification.title || 'NairaTag update'),
    body: String(notification.body || ''),
    type: notification.type || 'info',
    actionLabel: notification.actionLabel || 'View',
    url: notification.url || '/#rewards',
    timestamp: Number(notification.timestamp) || Date.now(),
    readAt: null,
  };
  const current = readInbox();
  writeInbox([item, ...current.filter((entry) => entry.id !== item.id)]);
  return item;
}

export function markInboxNotificationRead(id) {
  const items = readInbox();
  let changed = false;
  const next = items.map((item) => {
    if (item.id !== id || item.readAt) return item;
    changed = true;
    return { ...item, readAt: Date.now() };
  });
  if (changed) writeInbox(next);
  return next;
}

export function markAllInboxNotificationsRead() {
  const now = Date.now();
  const next = readInbox().map((item) => item.readAt ? item : { ...item, readAt: now });
  writeInbox(next);
  return next;
}
