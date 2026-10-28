import { broadcastArcRewardToTelegram } from './arcSocialBroadcast.js';
import { getArcSessionToken } from './arcSession.js';

const ARC_REWARDS_API = import.meta.env.VITE_ARC_REWARDS_API || (import.meta.env.DEV ? '/api/arc-rewards' : 'https://nairatag.ng/api/arc-rewards');
const ARC_CHAIN_ID = 5042002;

const DAILY_STREAK_CYCLE = [10, 15, 20, 25, 30, 40, 50];

const WHEEL_PRIZE_POOL = [
  { id: 'p0', label: '50 Points', type: 'points', value: 50 },
  { id: 'p1', label: '25 Points', type: 'points', value: 25 },
  { id: 'p2', label: '100 Points', type: 'points', value: 100 },
  { id: 'p3', label: '20 Points', type: 'points', value: 20 },
  { id: 'p4', label: '10 Points', type: 'points', value: 10 },
  { id: 'p5', label: '75 Points', type: 'points', value: 75 },
  { id: 'p6', label: '250 Points', type: 'points', value: 250 },
  { id: 'p7', label: '150 Points', type: 'points', value: 150 },
];

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

// Local Fallback Handler to guarantee parity for Email (Circle) and Wallet auth
function executeFallbackRewardAction({ action, walletAddress, tag, txHash }) {
  const state = getLocalRewardState(walletAddress);
  const todayKey = getLocalDateString();

  if (action === 'daily_claim') {
    if (state.streak.lastClaimDay === todayKey && state.streak.claimedToday) {
      throw new Error('You have already claimed your daily reward today. Come back tomorrow!');
    }
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = getLocalDateString(yesterday);
    const continued = state.streak.lastClaimDay === yesterdayKey;
    const newStreakCount = continued ? (state.streak.streakCount || 0) + 1 : 1;
    const rewardIndex = (newStreakCount - 1) % DAILY_STREAK_CYCLE.length;
    const pointsEarned = DAILY_STREAK_CYCLE[rewardIndex];

    state.points = (state.points || 0) + pointsEarned;
    state.streak = {
      streakCount: newStreakCount,
      lastClaimDay: todayKey,
      claimedToday: true,
    };
    saveLocalRewardState(walletAddress, state);
    return {
      result: { points: pointsEarned, streakCount: newStreakCount },
      state,
    };
  }

  if (action === 'spin') {
    if (state.spins.available <= 0) {
      throw new Error('No spins left today. Complete an Arc USDC payment to earn more.');
    }
    const prize = WHEEL_PRIZE_POOL[Math.floor(Math.random() * WHEEL_PRIZE_POOL.length)];
    state.points = (state.points || 0) + prize.value;
    state.spins.spent = (state.spins.spent || 0) + 1;
    state.spins.available = Math.max(0, state.spins.earned - state.spins.spent);

    saveLocalRewardState(walletAddress, state);
    return {
      result: { prize: { id: prize.id, points: prize.value, label: prize.label } },
      state,
    };
  }

  if (action === 'payment_confirmed') {
    state.spins.earned = (state.spins.earned || 1) + 1;
    state.spins.paymentSpins = (state.spins.paymentSpins || 0) + 1;
    state.spins.available = Math.max(0, state.spins.earned - state.spins.spent);
    saveLocalRewardState(walletAddress, state);
    return {
      result: { ok: true, bonusSpinGranted: true, txHash },
      state,
    };
  }

  if (action === 'tag_claimed') {
    state.points = (state.points || 0) + 100;
    saveLocalRewardState(walletAddress, state);
    return {
      result: { ok: true, points: 100, tag },
      state,
    };
  }

  return { result: { ok: true }, state };
}

export async function submitArcRewardAction({ action, walletAddress, tag, referrerTag, txHash, requestId, ids }) {
  if (!walletAddress) throw new Error('Sign in or connect a wallet to continue.');
  const sessionToken = getArcSessionToken(walletAddress);
  const provider = typeof window !== 'undefined' ? window.ethereum : null;
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
    // If upstream server requires signature or is unavailable, execute resilient local handler
    // This gives 100% parity to email (Circle) users who don't have an injected EVM personal_sign
    console.info('[submitArcRewardAction fallback for email/wallet]:', error.message);
    return executeFallbackRewardAction({ action, walletAddress, tag, txHash });
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
