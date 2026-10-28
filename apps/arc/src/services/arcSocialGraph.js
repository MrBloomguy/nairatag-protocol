import { getArcSessionToken } from './arcSession.js';

const API = import.meta.env.VITE_ARC_SOCIAL_API || 'https://nairatag.ng/api/arc-social-graph';

function cleanTag(value) {
  return String(value || '').normalize('NFKC').trim().replace(/^[₦$@#]/, '').toLowerCase();
}

async function send(payload, walletAddress) {
  if (!walletAddress) throw new Error('Sign in to your NairaTag account to use social features.');
  const token = getArcSessionToken(walletAddress);
  if (!token) throw new Error('Your sign-in session expired. Please sign in again to continue.');
  const response = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ...payload, walletAddress }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) throw new Error(result.error || `Social service returned ${response.status}.`);
  if (['profile', 'follow', 'unfollow', 'request_decision'].includes(payload.action) && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nairatag:arc-social-updated'));
  }
  return result;
}

export async function saveSocialProfile({ tag, walletAddress, visibility = 'public', displayName, avatarUrl, bio }) {
  const result = await send({ action: 'profile', tag, visibility, displayName, avatarUrl, bio }, walletAddress);
  return result.profile;
}

export async function loadSocialDashboard({ tag, walletAddress }) {
  return send({ action: 'dashboard', tag }, walletAddress);
}

export async function loadSocialProfileState({ tag, targetTag, walletAddress }) {
  return send({ action: 'profile_state', tag, targetTag }, walletAddress);
}

export async function followSocialProfile({ tag, targetTag, walletAddress }) {
  return send({ action: 'follow', tag, targetTag }, walletAddress);
}

export async function unfollowSocialProfile({ tag, targetTag, walletAddress }) {
  return send({ action: 'unfollow', tag, targetTag }, walletAddress);
}

export async function decideSocialFollowRequest({ tag, requestTag, decision, walletAddress }) {
  return send({ action: 'request_decision', tag, requestTag, decision }, walletAddress);
}
