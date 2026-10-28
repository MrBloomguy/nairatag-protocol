import { broadcastArcRewardToTelegram } from './arcSocialBroadcast.js';
import { getArcSessionToken } from './arcSession.js';

const ARC_REWARDS_API = import.meta.env.VITE_ARC_REWARDS_API || (import.meta.env.DEV ? '/api/arc-rewards' : 'https://nairatag.ng/api/arc-rewards');
const ARC_CHAIN_ID = 5042002;

function arcRewardsUrl() {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://nairatag.ng';
  return new URL(ARC_REWARDS_API, base);
}

function getLocalDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function mapState(value = {}) {
  const referrals = value.referrals || {};
  return {
    points: Number(value.points) || 0,
    streak: {
      streakCount: Number(value.streakCount ?? value.streak?.streakCount) || 0,
      lastClaimDay: value.lastStreakDay ?? value.streak?.lastClaimDay ?? null,
      claimedToday: Boolean(value.claimedToday ?? value.streak?.claimedToday),
    },
    spins: {
      earned: Number(value.spins?.earned) || 1,
      spent: Number(value.spins?.spent) || 0,
      available: Number(value.spins?.available) ?? 1,
      paymentSpins: Number(value.spins?.paymentSpins) || 0,
    },
    referrals: {
      points: Number(referrals.points) || 0,
      joinedCount: Number(referrals.joinedCount) || 0,
      completedCount: Number(referrals.completedCount) || 0,
      referrals: (referrals.items || referrals.referrals || []).map((item) => ({
        ...item,
        createdAt: item.createdAt ? new Date(item.createdAt).getTime() : Date.now(),
      })),
      activity: [],
    },
    notifications: Array.isArray(value.notifications) ? value.notifications : [],
  };
}

export function getLocalRewardState(walletAddress) {
  if (typeof window === 'undefined' || !walletAddress) return mapState();
  const key = `nairatag_rewards_state_${String(walletAddress).toLowerCase()}`;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Check if today is a new day to reset claimedToday
      const today = getLocalDateString();
      if (parsed.streak?.lastClaimDay !== today) {
        parsed.streak.claimedToday = false;
      }
      return mapState(parsed);
    }
  } catch {}
  return mapState({
    points: 0,
    streakCount: 0,
    lastStreakDay: null,
    claimedToday: false,
    spins: { earned: 1, spent: 0, available: 1, paymentSpins: 0 },
    referrals: { points: 0, joinedCount: 0, completedCount: 0, items: [] },
    notifications: [],
  });
}

export function saveLocalRewardState(walletAddress, state) {
  if (typeof window === 'undefined' || !walletAddress) return;
  const key = `nairatag_rewards_state_${String(walletAddress).toLowerCase()}`;
  try {
    window.localStorage.setItem(key, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('nairatag:wheel-state-updated', {
      detail: { accountKey: String(walletAddress).toLowerCase(), state }
    }));
    window.dispatchEvent(new CustomEvent('nairatag:reward-state-updated', {
      detail: { walletAddress: String(walletAddress).toLowerCase(), state }
    }));
  } catch {}
}

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) throw new Error(payload.error || `Arc rewards service returned ${response.status}.`);
  return payload;
}

export async function getArcRewardState(walletAddress) {
  if (!walletAddress) return mapState();
  const local = getLocalRewardState(walletAddress);
  try {
    const url = arcRewardsUrl();
    url.searchParams.set('wallet', walletAddress);
    const headers = { Accept: 'application/json' };
    const sessionToken = getArcSessionToken(walletAddress);
    if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;
    const payload = await parseResponse(await fetch(url, { headers }));
    const remote = mapState(payload.state);

    // Merge: preserve local progress if local has higher points or newer activity
    const merged = {
      ...remote,
      points: Math.max(remote.points, local.points),
      streak: (local.streak.claimedToday || local.streak.streakCount > remote.streak.streakCount)
        ? local.streak
        : remote.streak,
      spins: {
        earned: Math.max(remote.spins.earned, local.spins.earned),
        spent: Math.max(remote.spins.spent, local.spins.spent),
        available: Math.max(0, Math.max(remote.spins.earned, local.spins.earned) - Math.max(remote.spins.spent, local.spins.spent)),
        paymentSpins: Math.max(remote.spins.paymentSpins, local.spins.paymentSpins),
      },
    };
    saveLocalRewardState(walletAddress, merged);
    return merged;
  } catch (error) {
    // Graceful offline / local state fallback for both email and wallet auth
    return local;
  }
}

export async function submitArcRewardAction({ action, walletAddress, tag, referrerTag, txHash, requestId, ids }) {
  if (!walletAddress) throw new Error('Sign in to your NairaTag account to continue.');
  const sessionToken = getArcSessionToken(walletAddress);
  const provider = typeof window !== 'undefined' ? window.ethereum : null;
  if (!sessionToken && !provider?.request) throw new Error('Your sign-in session expired. Please sign in again to update your rewards.');
  const timestamp = Date.now();
  const payload = { action, walletAddress, timestamp };
  if (tag) payload.tag = String(tag).trim().replace(/^[₦$@#]/, '').toLowerCase();
  if (referrerTag) payload.referrerTag = String(referrerTag).trim().replace(/^[₦$@#]/, '').toLowerCase();
  if (txHash) payload.txHash = String(txHash).toLowerCase();
  if (requestId) payload.requestId = requestId;
  if (ids) payload.ids = ids;

  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  let signature = null;

  if (sessionToken) {
    headers.Authorization = `Bearer ${sessionToken}`;
  } else if (provider?.request) {
    const signedFields = {
      ...(payload.tag ? { tag: payload.tag } : {}),
      ...(payload.referrerTag ? { referrerTag: payload.referrerTag } : {}),
      ...(payload.txHash ? { txHash: payload.txHash } : {}),
      ...(payload.requestId ? { requestId: payload.requestId } : {}),
      ...(payload.ids ? { ids: payload.ids.join(',') } : {}),
    };
    const message = [
      'NairaTag Arc Rewards', `Action: ${action}`, `Wallet: ${walletAddress.toLowerCase()}`,
      `Chain: ${ARC_CHAIN_ID}`, `Timestamp: ${timestamp}`,
      ...Object.entries(signedFields).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}: ${value}`),
    ].join('\n');
    try {
      signature = await provider.request({ method: 'personal_sign', params: [message, walletAddress] });
      payload.signature = signature;
    } catch (signErr) {
      console.warn('[submitArcRewardAction sign error]', signErr.message);
    }
  }

  try {
    const response = await parseResponse(await fetch(ARC_REWARDS_API, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    }));
    if (['daily_claim', 'spin', 'payment_confirmed', 'referral_signup'].includes(action)) {
      broadcastArcRewardToTelegram(payload).catch((error) => console.warn('[Telegram reward alert]', error.message));
    }
    const state = mapState(response.state);
    saveLocalRewardState(walletAddress, state);
    return { result: response.result, state };
  } catch (error) {
    throw error;
  }
}

export async function markArcNotificationsRead(walletAddress, ids = []) {
  if (!walletAddress) return null;
  try {
    const response = await parseResponse(await fetch(ARC_REWARDS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ action: 'notifications_read', walletAddress, ids }),
    }));
    const state = mapState(response.state);
    saveLocalRewardState(walletAddress, state);
    return state;
  } catch {
    const state = getLocalRewardState(walletAddress);
    return state;
  }
}
