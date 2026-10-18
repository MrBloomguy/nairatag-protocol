// @ts-nocheck
/**
 * ============================================================================
 * NAIRATAG x ARC OSAKA - WEB PUSH & IN-APP NOTIFICATION ENGINE
 * Configured with VAPID Authentication, Web Audio Synthesizer & Micro-interactions
 * ============================================================================
 */

export const VAPID_CONFIG = {
  subject: 'mailto:bloombetgaming@gmail.com',
  publicKey: 'BO7PJjTvYu123UE593aiOoAHYNMchA0CX5yq7er9r2DebaP_RI6zUYOIGj35Vbt2GYEWRXzJTO8lIlr76K0uzr4',
  privateKey: 'wjhxYWADdo7gspB_F7ML1fOtPdjWo1zS3kcKJmVXOPs',
};

/**
 * Converts a URL-safe Base64 string to a Uint8Array for VAPID applicationServerKey
 */
export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Checks if Web Push & Service Workers are supported in the current environment
 */
export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Registers the background Service Worker
 */
export async function registerServiceWorker() {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    return registration;
  } catch (error) {
    console.warn('[PushNotification] Service worker registration error:', error);
    return null;
  }
}

/**
 * Returns current browser notification permission ('default' | 'granted' | 'denied')
 */
export function getNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

/**
 * Subscribes user to Web Push using the provided VAPID public key
 */
export async function subscribeToPushNotifications() {
  if (!isPushSupported()) {
    return { success: false, reason: 'unsupported' };
  }

  try {
    // 1. Request Browser Notification Permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, reason: 'denied' };
    }

    // 2. Ensure Service Worker is Active
    let registration = await navigator.serviceWorker.ready;
    if (!registration) {
      registration = await registerServiceWorker();
    }

    if (!registration) {
      return { success: false, reason: 'sw_failed' };
    }

    // 3. Check for existing subscription or create new
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(VAPID_CONFIG.publicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });
    }

    // 4. Save subscription locally
    const subJson = subscription.toJSON();
    localStorage.setItem('nairatag_push_subscribed', 'true');
    localStorage.setItem('nairatag_push_subscription', JSON.stringify(subJson));

    // Play tactile audio feedback & dispatch event
    playMicroSound('chime');
    triggerHaptic([30, 40, 30]);

    // Dispatch global event for in-app UI update
    window.dispatchEvent(
      new CustomEvent('nairatag:push-status-changed', {
        detail: { isSubscribed: true, subscription: subJson },
      })
    );

    return { success: true, subscription: subJson };
  } catch (error) {
    console.error('[PushNotification] Subscription failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Unsubscribes from Web Push
 */
export async function unsubscribeFromPushNotifications() {
  if (!isPushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    if (registration) {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }
    }
    localStorage.removeItem('nairatag_push_subscribed');
    localStorage.removeItem('nairatag_push_subscription');
    window.dispatchEvent(
      new CustomEvent('nairatag:push-status-changed', {
        detail: { isSubscribed: false },
      })
    );
    return true;
  } catch (e) {
    console.warn('[PushNotification] Unsubscribe failed:', e);
    return false;
  }
}

/**
 * Triggers both a System Web Push (if permitted) AND an In-App Toast Notification
 */
export async function sendNotificationAlert({
  title,
  body,
  type = 'info',
  icon = '🔔',
  actionLabel = 'View',
  onAction = null,
  url = '/#rewards',
}) {
  // 1. Play tactile sound
  if (type === 'reward' || type === 'claim') {
    playMicroSound('chime');
  } else if (type === 'cash' || type === 'success') {
    playMicroSound('coin');
  } else {
    playMicroSound('pop');
  }
  triggerHaptic([20, 30]);

  // 2. Dispatch in-app notification event (Always visible in UI)
  const inAppPayload = {
    id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    title,
    body,
    type,
    icon,
    actionLabel,
    onAction,
    url,
    timestamp: Date.now(),
  };

  window.dispatchEvent(
    new CustomEvent('nairatag:in-app-notification', {
      detail: inAppPayload,
    })
  );

  // 3. If browser permissions are granted, also trigger real system notification
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          reg.showNotification(title, {
            body,
            icon: '/nairatag-logo.png',
            badge: '/favicon.png',
            vibrate: [120, 60, 120],
            data: { url },
            tag: inAppPayload.id,
          });
          return;
        }
      }
      // Fallback to desktop Notification constructor
      new Notification(title, {
        body,
        icon: '/nairatag-logo.png',
      });
    } catch (e) {
      console.warn('[PushNotification] System notification dispatch fallback:', e);
    }
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * WEB AUDIO API SYNTHESIZER FOR RICH MICRO-INTERACTION SOUNDS
 * Pure browser audio generation with zero dependencies or network lag
 * ─────────────────────────────────────────────────────────────────────────────
 */
let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playMicroSound(type = 'pop') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (type === 'chime') {
      // Harmonic 2-note reward chime (C5 523Hz -> G5 784Hz)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(523.25, now);
      osc2.frequency.setValueAtTime(783.99, now + 0.08);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now + 0.08);
      osc1.stop(now + 0.45);
      osc2.stop(now + 0.45);
    } else if (type === 'coin') {
      // Upbeat metallic ping (E6 1318Hz -> G6 1568Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1318.51, now);
      osc.frequency.exponentialRampToValueAtTime(1567.98, now + 0.06);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.25, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'pop') {
      // Soft gentle tactile pop for clicks and modals
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.06);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'spin') {
      // Quick click tick during wheel spin
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(800, now);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    }
  } catch (err) {
    // Non-blocking if audio policy prevents autoplay
  }
}

/**
 * Mobile Haptic Buzz
 */
export function triggerHaptic(pattern = [20]) {
  try {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch (e) {}
}
