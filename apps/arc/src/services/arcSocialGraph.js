import { getEthereumProvider } from './arcPayment.js';

const API = import.meta.env.VITE_ARC_SOCIAL_API || '/api/social-graph';
const CHAIN_ID = 5042002;

function cleanTag(value) {
  return String(value || '').normalize('NFKC').trim().replace(/^[₦$@#]/, '').toLowerCase();
}

function signedFields(body) {
  return {
    action: String(body.action || ''),
    tag: cleanTag(body.tag),
    ...(body.targetTag ? { targetTag: cleanTag(body.targetTag) } : {}),
    ...(body.requestTag ? { requestTag: cleanTag(body.requestTag) } : {}),
    ...(body.visibility ? { visibility: body.visibility } : {}),
    ...(body.decision ? { decision: body.decision } : {}),
    ...(body.displayName ? { displayName: String(body.displayName).trim().slice(0, 48) } : {}),
    ...(body.avatarUrl ? { avatarUrl: String(body.avatarUrl).slice(0, 500) } : {}),
    ...(body.bio ? { bio: String(body.bio).trim().slice(0, 160) } : {}),
    walletAddress: String(body.walletAddress || '').toLowerCase(),
    chainId: Number(body.chainId),
    timestamp: Number(body.timestamp),
  };
}

function authMessage(fields) {
  return [
    'NairaTag Social Graph',
    ...Object.entries(fields).sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => `${key}: ${value}`),
  ].join('\n');
}

function sessionKey(tag, walletAddress) {
  return `nairatag_arc_social_session_v1:${String(walletAddress).toLowerCase()}:${cleanTag(tag)}`;
}

async function createSession(tag, walletAddress, provider) {
  const body = { action: 'session', tag, walletAddress, chainId: CHAIN_ID, timestamp: Date.now() };
  const fields = signedFields(body);
  body.signature = await provider.request({ method: 'personal_sign', params: [authMessage(fields), walletAddress] });
  const response = await fetch(API, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok || !result.sessionToken) throw new Error(result.error || `Social sign-in returned ${response.status}.`);
  try { window.localStorage.setItem(sessionKey(tag, walletAddress), JSON.stringify({ token: result.sessionToken, expiresAt: result.expiresAt })); } catch {}
  return result.sessionToken;
}

async function send(payload, walletAddress) {
  if (!walletAddress) throw new Error('Connect your NairaTag account to use social features.');
  const provider = getEthereumProvider();
  if (!provider?.request) throw new Error('Your wallet session is unavailable. Reconnect and try again.');
  const key = sessionKey(payload.tag, walletAddress);
  let cached;
  try { cached = JSON.parse(window.localStorage.getItem(key) || 'null'); } catch {}
  let token = cached?.expiresAt > Date.now() ? cached.token : null;
  if (!token) token = await createSession(payload.tag, walletAddress, provider);
  const makeRequest = async (bearer) => {
    const response = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${bearer}` },
      body: JSON.stringify({ ...payload, walletAddress }),
    });
    const result = await response.json().catch(() => ({}));
    return { response, result };
  };
  let { response, result } = await makeRequest(token);
  if (response.status === 401 && cached?.token) {
    try { window.localStorage.removeItem(key); } catch {}
    token = await createSession(payload.tag, walletAddress, provider);
    ({ response, result } = await makeRequest(token));
  }
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
