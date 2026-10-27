import { broadcastArcRewardToTelegram } from './arcSocialBroadcast.js';
import { getArcSessionToken } from './arcSession.js';

const ARC_REWARDS_API = import.meta.env.VITE_ARC_REWARDS_API || (import.meta.env.DEV ? '/api/arc-rewards' : 'https://nairatag.ng/api/arc-rewards');
const ARC_CHAIN_ID = 5042002;

function arcRewardsUrl() {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://nairatag.ng';
  return new URL(ARC_REWARDS_API, base);
}

function mapState(value = {}) {
  const referrals = value.referrals || {};
  return {
    points: Number(value.points) || 0,
    streak: {
      streakCount: Number(value.streakCount) || 0,
      lastClaimDay: value.lastStreakDay || null,
      claimedToday: Boolean(value.claimedToday),
    },
    spins: {
      earned: Number(value.spins?.earned) || 1,
      spent: Number(value.spins?.spent) || 0,
      available: Number(value.spins?.available) || 0,
      paymentSpins: Number(value.spins?.paymentSpins) || 0,
    },
    referrals: {
      points: Number(referrals.points) || 0,
      joinedCount: Number(referrals.joinedCount) || 0,
      completedCount: Number(referrals.completedCount) || 0,
      referrals: (referrals.items || []).map((item) => ({
        ...item,
        createdAt: new Date(item.createdAt).getTime(),
      })),
      activity: [],
    },
    notifications: Array.isArray(value.notifications) ? value.notifications : [],
  };
}

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) throw new Error(payload.error || `Arc rewards service returned ${response.status}.`);
  return payload;
}

export async function getArcRewardState(walletAddress) {
  if (!walletAddress) return mapState();
  const url = arcRewardsUrl();
  url.searchParams.set('wallet', walletAddress);
  const headers = { Accept: 'application/json' };
  const sessionToken = getArcSessionToken(walletAddress);
  if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;
  const payload = await parseResponse(await fetch(url, { headers }));
  return mapState(payload.state);
}

export async function submitArcRewardAction({ action, walletAddress, tag, referrerTag, txHash, requestId, ids }) {
  if (!walletAddress) throw new Error('Connect your Arc wallet to continue.');
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
      payload.signature = await provider.request({ method: 'personal_sign', params: [message, walletAddress] });
    } catch (signErr) {
      console.warn('[submitArcRewardAction sign error]', signErr.message);
      throw signErr;
    }
  }

  const response = await parseResponse(await fetch(ARC_REWARDS_API, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  }));
  if (['daily_claim', 'spin', 'payment_confirmed', 'referral_signup'].includes(action)) {
    broadcastArcRewardToTelegram(payload).catch((error) => console.warn('[Telegram reward alert]', error.message));
  }
  return { result: response.result, state: mapState(response.state) };
}

export async function markArcNotificationsRead(walletAddress, ids = []) {
  if (!walletAddress) return null;
  const response = await parseResponse(await fetch(ARC_REWARDS_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ action: 'notifications_read', walletAddress, ids }),
  }));
  return mapState(response.state);
}
