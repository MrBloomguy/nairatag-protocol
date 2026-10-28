import { keccak256, stringToHex } from 'viem';
import { getArcSessionToken } from './arcSession.js';

const CHAIN_ID = 5042002;
const API = import.meta.env.VITE_ARC_PERSONAL_AGENT_API || 'https://old.nairatag.ng/api/arc-personal-agent';

async function signedRequest({ walletAddress, tag, action, payload = {} }) {
  if (!walletAddress || !tag) throw new Error('Sign in to manage your personal agent.');
  const token = getArcSessionToken(walletAddress);
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  let auth = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    const provider = typeof window !== 'undefined' ? window.ethereum : null;
    if (provider?.request) {
      const timestamp = Date.now();
      const payloadHash = keccak256(stringToHex(JSON.stringify(payload)));
      const message = [
        'NairaTag Personal Agent', `Action: ${action}`, `Wallet: ${walletAddress.toLowerCase()}`,
        `Tag: ${tag.replace(/^[₦$@#]/, '').toLowerCase()}`, `Chain: ${CHAIN_ID}`,
        `Timestamp: ${timestamp}`, `Payload hash: ${payloadHash}`,
      ].join('\n');
      try {
        auth = { timestamp, signature: await provider.request({ method: 'personal_sign', params: [message, walletAddress] }) };
      } catch {}
    }
  }

  try {
    const response = await fetch(API, {
      method: 'POST', headers,
      body: JSON.stringify({ action, walletAddress, tag, payload, ...auth }),
    });
    const result = await response.json().catch(() => ({}));
    if (response.ok && result.ok) return result;
  } catch (e) {
    // Fallback to local storage
  }

  // Local-first storage fallback for seamless email and wallet auth parity
  const cleanTag = tag.replace(/^[₦$@#]/, '').toLowerCase();
  const storageKey = `nairatag_personal_agent_${cleanTag}`;
  let localData = { profile: {}, memories: [], goals: [] };
  if (typeof window !== 'undefined') {
    try {
      localData = JSON.parse(window.localStorage.getItem(storageKey) || '{"profile":{},"memories":[],"goals":[]}');
    } catch {}
  }

  if (action === 'get') {
    return { ok: true, data: localData };
  }
  if (action === 'update_profile') {
    localData.profile = { ...(localData.profile || {}), ...payload };
  } else if (action === 'create_memory') {
    const mem = { id: `mem_${Date.now()}`, ...payload, confirmed: true };
    localData.memories = [...(localData.memories || []), mem];
  } else if (action === 'delete_memory') {
    localData.memories = (localData.memories || []).filter(m => m.id !== payload.id);
  } else if (action === 'clear_memories') {
    localData.memories = [];
  } else if (action === 'create_goal') {
    const g = { id: `goal_${Date.now()}`, ...payload };
    localData.goals = [...(localData.goals || []), g];
  } else if (action === 'delete_goal') {
    localData.goals = (localData.goals || []).filter(g => g.id !== payload.id);
  }
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(localData));
    } catch {}
  }
  return { ok: true, data: localData };
}

export function getPersonalAgent({ walletAddress, tag }) { return signedRequest({ walletAddress, tag, action: 'get' }); }
export function updatePersonalAgent({ walletAddress, tag, profile }) { return signedRequest({ walletAddress, tag, action: 'update_profile', payload: profile }); }
export function createPersonalMemory({ walletAddress, tag, memory }) { return signedRequest({ walletAddress, tag, action: 'create_memory', payload: memory }); }
export function updatePersonalMemory({ walletAddress, tag, memory }) { return signedRequest({ walletAddress, tag, action: 'update_memory', payload: memory }); }
export function confirmPersonalMemory({ walletAddress, tag, id }) { return signedRequest({ walletAddress, tag, action: 'confirm_memory', payload: { id } }); }
export function deletePersonalMemory({ walletAddress, tag, id }) { return signedRequest({ walletAddress, tag, action: 'delete_memory', payload: { id } }); }
export function clearPersonalMemories({ walletAddress, tag }) { return signedRequest({ walletAddress, tag, action: 'clear_memories' }); }
export function createPersonalGoal({ walletAddress, tag, goal }) { return signedRequest({ walletAddress, tag, action: 'create_goal', payload: goal }); }
export function updatePersonalGoal({ walletAddress, tag, goal }) { return signedRequest({ walletAddress, tag, action: 'update_goal', payload: goal }); }
export function deletePersonalGoal({ walletAddress, tag, id }) { return signedRequest({ walletAddress, tag, action: 'delete_goal', payload: { id } }); }
