import { broadcastArcRewardToTelegram } from './arcSocialBroadcast.js';
import { getArcSessionToken } from './arcSession.js';

const ARC_REWARDS_API = import.meta.env.VITE_ARC_REWARDS_API || '/api/arc-rewards';
const ARC_CHAIN_ID = 5042;

function arcRewardsUrl() {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://arc.nairatag.ng';
  return new URL(ARC_REWARDS_API, base);
}

const ABSTRACTED_ACCOUNT_KEY = 'nairatag_abstracted_rewards_account';

export function getAbstractedRewardAccount(preferredWallet) {
  if (preferredWallet && typeof preferredWallet === 'string' && preferredWallet.startsWith('0x') && preferredWallet.length === 42) {
    return preferredWallet.toLowerCase();
  }
  if (typeof window === 'undefined') return '0x0000000000000000000000000000000000000001';
  let stored = window.localStorage.getItem(ABSTRACTED_ACCOUNT_KEY);
  if (!stored) {
    const bytes = new Uint8Array(20);
    if (window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < 20; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    stored = '0x' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
    window.localStorage.setItem(ABSTRACTED_ACCOUNT_KEY, stored);
  }
  return stored.toLowerCase();
}

export function mergeAbstractedRewardsIntoWallet(walletAddress) {
  if (!walletAddress || typeof window === 'undefined') return;
  const abstractedAccount = window.localStorage.getItem(ABSTRACTED_ACCOUNT_KEY);
  if (!abstractedAccount || abstractedAccount.toLowerCase() === walletAddress.toLowerCase()) return;
  
  const guestState = getLocalRewardState(abstractedAccount);
  if (guestState.points > 0 || guestState.streak.streakCount > 0) {
    const walletState = getLocalRewardState(walletAddress);
    const merged = {
      ...walletState,
      points: walletState.points + guestState.points,
      streak: {
        streakCount: Math.max(walletState.streak.streakCount, guestState.streak.streakCount),
        lastClaimDay: guestState.streak.lastClaimDay || walletState.streak.lastClaimDay,
        claimedToday: walletState.streak.claimedToday || guestState.streak.claimedToday,
      },
      spins: {
        earned: Math.max(walletState.spins.earned, guestState.spins.earned),
        spent: Math.max(walletState.spins.spent, guestState.spins.spent),
        available: Math.max(0, Math.max(walletState.spins.earned, guestState.spins.earned) - Math.max(walletState.spins.spent, guestState.spins.spent)),
        paymentSpins: walletState.spins.paymentSpins + guestState.spins.paymentSpins,
      }
    };
    saveLocalRewardState(walletAddress, merged);
    saveLocalRewardState(abstractedAccount, mapState({ points: 0, streakCount: 0 }));
  }
}

const LOCAL_STREAK_REWARDS = [10, 15, 20, 25, 30, 40, 50];
const LOCAL_WHEEL_PRIZES = [
  { id: 'p0', points: 50 },
  { id: 'p1', points: 25 },
  { id: 'p2', points: 100 },
  { id: 'p3', points: 20 },
  { id: 'p4', points: 10 },
  { id: 'p5', points: 75 },
  { id: 'p6', points: 250 },
  { id: 'p7', points: 150 },
];

function applyLocalAction(action, targetWallet, extra = {}) {
  const state = getLocalRewardState(targetWallet);
  let result = {};

  if (action === 'daily_claim') {
    if (state.streak.claimedToday) {
      throw new Error('Daily streak already claimed today. Come back tomorrow!');
    }
    const day = (Number(state.streak.streakCount) % 7) + 1;
    const reward = LOCAL_STREAK_REWARDS[day - 1] || 10;
    const newStreakCount = state.streak.streakCount + 1;
    state.points += reward;
    state.streak.streakCount = newStreakCount;
    state.streak.lastClaimDay = getLocalDateString();
    state.streak.claimedToday = true;
    result = { points: reward, streakCount: newStreakCount };
  } else if (action === 'spin') {
    if (state.spins.available <= 0) {
      throw new Error('No spins available today. Check back tomorrow!');
    }
    const prize = LOCAL_WHEEL_PRIZES[Math.floor(Math.random() * LOCAL_WHEEL_PRIZES.length)];
    state.spins.spent += 1;
    state.spins.available = Math.max(0, state.spins.earned - state.spins.spent);
    state.points += prize.points;
    result = { prize };
  } else if (action === 'tag_claimed' || action === 'agent_onboarding_step') {
    const rewardPoints = 250;
    state.points = (state.points || 0) + rewardPoints;
    const notif = {
      id: 'notif-' + Date.now(),
      title: '🎉 Tag Claimed & Activated',
      body: `You claimed ₦${String(extra.tag || 'tag').replace(/^[₦$@#]/, '').toUpperCase()} and earned ${rewardPoints} Protocol Points!`,
      createdAt: Date.now(),
      read: false,
    };
    state.notifications = [notif, ...(state.notifications || [])];
    result = { points: rewardPoints, tag: extra.tag };
  } else if (action === 'referral_signup') {
    const rewardPoints = 100;
    state.points = (state.points || 0) + rewardPoints;
    state.referrals = state.referrals || { points: 0, joinedCount: 0, completedCount: 0, referrals: [] };
    state.referrals.points = (state.referrals.points || 0) + rewardPoints;
    state.referrals.joinedCount = (state.referrals.joinedCount || 0) + 1;
    const friend = extra.tag || 'friend';
    state.referrals.referrals = [
      { tag: friend, milestone: 'signup', points: rewardPoints, createdAt: Date.now() },
      ...(state.referrals.referrals || [])
    ];
    const notif = {
      id: 'notif-' + Date.now(),
      title: '🎁 Referral Bonus Claimed',
      body: `₦${String(friend).replace(/^[₦$@#]/, '').toUpperCase()} joined with your referral! +${rewardPoints} Protocol Points credited.`,
      createdAt: Date.now(),
      read: false,
    };
    state.notifications = [notif, ...(state.notifications || [])];
    result = { points: rewardPoints, referrerTag: extra.referrerTag, tag: friend };
  }

  saveLocalRewardState(targetWallet, state);
  return { result, state };
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
      earned: value.spins?.earned !== undefined ? Number(value.spins.earned) : 1,
      spent: Number(value.spins?.spent) || 0,
      available: value.spins?.available !== undefined ? Number(value.spins.available) : 1,
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
  if (typeof window === 'undefined') return mapState();
  const target = getAbstractedRewardAccount(walletAddress);
  const key = `nairatag_rewards_state_${target}`;
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
  const target = getAbstractedRewardAccount(walletAddress);
  if (!target) return mapState();
  const local = getLocalRewardState(walletAddress);
  try {
    const url = arcRewardsUrl();
    url.searchParams.set('wallet', target);
    const headers = { Accept: 'application/json' };
    const sessionToken = getArcSessionToken(target);
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
  const targetWallet = getAbstractedRewardAccount(walletAddress);
  const sessionToken = getArcSessionToken(targetWallet);
  const provider = typeof window !== 'undefined' ? window.ethereum : null;
  const isDirectOffchain = !sessionToken && (!provider?.request || !walletAddress);

  // For daily streak claim or wheel spin, execute offchain immediately without wallet prompt!
  if (isDirectOffchain && (action === 'daily_claim' || action === 'spin')) {
    const localRes = applyLocalAction(action, targetWallet, { requestId });
    broadcastArcRewardToTelegram({ action, walletAddress: targetWallet, timestamp: Date.now() }).catch(() => {});
    return localRes;
  }

  const timestamp = Date.now();
  const payload = { action, walletAddress: targetWallet, timestamp };
  if (tag) payload.tag = String(tag).trim().replace(/^[₦$@#]/, '').toLowerCase();
  if (referrerTag) payload.referrerTag = String(referrerTag).trim().replace(/^[₦$@#]/, '').toLowerCase();
  if (txHash) payload.txHash = String(txHash).toLowerCase();
  if (requestId) payload.requestId = requestId;
  if (ids) payload.ids = ids;

  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  let signature = null;

  if (sessionToken) {
    headers.Authorization = `Bearer ${sessionToken}`;
  } else if (provider?.request && walletAddress && action !== 'daily_claim' && action !== 'spin' && action !== 'tag_claimed') {
    const signedFields = {
      ...(payload.tag ? { tag: payload.tag } : {}),
      ...(payload.referrerTag ? { referrerTag: payload.referrerTag } : {}),
      ...(payload.txHash ? { txHash: payload.txHash } : {}),
      ...(payload.requestId ? { requestId: payload.requestId } : {}),
      ...(payload.ids ? { ids: payload.ids.join(',') } : {}),
    };
    const message = [
      'NairaTag Arc Rewards', `Action: ${action}`, `Wallet: ${targetWallet}`,
      `Chain: ${ARC_CHAIN_ID}`, `Timestamp: ${timestamp}`,
      ...Object.entries(signedFields).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}: ${value}`),
    ].join('\n');
    try {
      signature = await provider.request({ method: 'personal_sign', params: [message, targetWallet] });
      payload.signature = signature;
    } catch (signErr) {
      console.warn('[submitArcRewardAction sign error]', signErr.message);
    }
  }

  // Dual-layer claim persistence: call /api/claims on tag_claimed
  if (action === 'tag_claimed' && payload.tag && (walletAddress || targetWallet)) {
    fetch('/api/claims', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tag: payload.tag,
        wallet: walletAddress || targetWallet,
        txHash: payload.txHash || null,
      }),
    }).catch((e) => console.warn('[Direct claim sync background note]:', e.message));
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
    saveLocalRewardState(targetWallet, state);
    return { result: response.result, state };
  } catch (error) {
    if (action === 'daily_claim' || action === 'spin' || action === 'tag_claimed' || action === 'agent_onboarding_step' || action === 'referral_signup') {
      const localRes = applyLocalAction(action, targetWallet, { requestId, tag, referrerTag });
      return localRes;
    }
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
