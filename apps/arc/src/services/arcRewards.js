import { broadcastArcRewardToTelegram } from './arcSocialBroadcast.js';
import { getArcSessionTokenForLinkedWallet } from './arcSession.js';

const ARC_REWARDS_API = import.meta.env.VITE_ARC_REWARDS_API || '/api/arc-rewards';

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
      earned: Number(value.spins?.earned) || 0,
      spent: Number(value.spins?.spent) || 0,
      available: Number(value.spins?.available) || 0,
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

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) throw new Error(payload.error || `Arc rewards service returned ${response.status}.`);
  return payload;
}

function requireWallet(walletAddress) {
  const wallet = String(walletAddress || '').toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(wallet)) throw new Error('Connect and sign in with a wallet to use rewards.');
  return wallet;
}

// Kept for initial UI state only. Reward balances and claim status always come from the server.
export function getLocalRewardState() { return mapState(); }
export function mergeAbstractedRewardsIntoWallet() {}
export function getAbstractedRewardAccount(walletAddress) {
  return /^0x[a-f0-9]{40}$/i.test(String(walletAddress || '')) ? String(walletAddress).toLowerCase() : null;
}

export async function getArcRewardState(walletAddress) {
  const wallet = requireWallet(walletAddress);
  const url = new URL(ARC_REWARDS_API, window.location.origin);
  url.searchParams.set('wallet', wallet);
  const token = getArcSessionTokenForLinkedWallet(wallet);
  if (!token) throw new Error('Sign in again to view Arc rewards.');
  const payload = await parseResponse(await fetch(url, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    cache: 'no-store',
  }));
  return mapState(payload.state);
}

export async function submitArcRewardAction({ action, walletAddress, tag, referrerTag, txHash, requestId, ids }) {
  const wallet = requireWallet(walletAddress);
  const token = getArcSessionTokenForLinkedWallet(wallet);
  if (!token) throw new Error('Sign in again to claim Arc rewards.');
  const payload = { action, walletAddress: wallet, timestamp: Date.now() };
  if (tag) payload.tag = String(tag).trim().replace(/^[\u00a3$@#]/, '').toLowerCase();
  if (referrerTag) payload.referrerTag = String(referrerTag).trim().replace(/^[\u00a3$@#]/, '').toLowerCase();
  if (txHash) payload.txHash = String(txHash).toLowerCase();
  if (requestId) payload.requestId = requestId;
  if (ids) payload.ids = ids;

  const headers = { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` };

  const response = await parseResponse(await fetch(ARC_REWARDS_API, {
    method: 'POST', headers, body: JSON.stringify(payload),
  }));
  if (['daily_claim', 'spin', 'payment_confirmed', 'referral_signup'].includes(action)) {
    broadcastArcRewardToTelegram(payload).catch((error) => console.warn('[Telegram reward alert]', error.message));
  }
  return { result: response.result, state: mapState(response.state) };
}

export async function markArcNotificationsRead(walletAddress, ids = []) {
  const wallet = requireWallet(walletAddress);
  const token = getArcSessionTokenForLinkedWallet(wallet);
  if (!token) throw new Error('Sign in again to update notifications.');
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  headers.Authorization = `Bearer ${token}`;
  const response = await parseResponse(await fetch(ARC_REWARDS_API, {
    method: 'POST', headers,
    body: JSON.stringify({ action: 'notifications_read', walletAddress: wallet, ids }),
  }));
  return mapState(response.state);
}
