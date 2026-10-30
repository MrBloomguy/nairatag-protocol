import { getArcSessionToken } from './arcSession.js';

const ARC_AGENT_FOLLOWS_API = import.meta.env.VITE_ARC_AGENT_FOLLOWS_API
  || '/api/social-alerts';

function normalizeTag(tag) {
  return String(tag || '').trim().replace(/^[₦$@#]/, '').toLowerCase();
}

async function readResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || `Agent follows service returned ${response.status}.`);
  }
  return payload;
}

export async function getArcAgentFollowState(agentId, walletAddress = '') {
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://arc.nairatag.ng';
    const url = new URL(ARC_AGENT_FOLLOWS_API, base);
    url.searchParams.set('agentId', String(agentId));
    if (walletAddress) url.searchParams.set('wallet', walletAddress);
    const token = walletAddress ? getArcSessionToken(walletAddress) : null;
    const payload = await readResponse(await fetch(url, {
      headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    }));
    return {
      followerCount: Number(payload.followerCount) || 0,
      following: Boolean(payload.following),
    };
  } catch {
    return {
      followerCount: 0,
      following: false,
    };
  }
}

export async function setArcAgentFollow({ action, agentId, tag, walletAddress }) {
  if (!walletAddress) throw new Error('Sign in to your NairaTag account to follow an agent.');
  if (!['follow', 'unfollow'].includes(action)) throw new Error('Choose follow or unfollow.');
  const token = getArcSessionToken(walletAddress);
  if (!token) throw new Error('Your sign-in session expired. Please sign in again.');
  const cleanTag = normalizeTag(tag);
  const id = String(agentId);
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://arc.nairatag.ng';
  const url = new URL(ARC_AGENT_FOLLOWS_API, base);
  const payload = await readResponse(await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, agentId: id, tag: cleanTag, walletAddress }),
  }));
  return {
    followerCount: Number(payload.followerCount) || 0,
    following: Boolean(payload.following),
  };
}
