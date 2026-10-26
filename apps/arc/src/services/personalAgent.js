import { keccak256, stringToHex } from 'viem';
import { getArcSessionToken } from './arcSession.js';

const CHAIN_ID = 5042002;
const API = import.meta.env.VITE_ARC_PERSONAL_AGENT_API || 'https://old.nairatag.ng/api/arc-personal-agent';

async function signedRequest({ walletAddress, tag, action, payload = {} }) {
  if (!walletAddress || !tag) throw new Error('Connect the wallet that owns your NairaTag.');
  const token = getArcSessionToken(walletAddress);
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  let auth = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    const provider = typeof window !== 'undefined' ? window.ethereum : null;
    if (!provider?.request) throw new Error('Sign in again to manage your personal agent.');
    const timestamp = Date.now();
    const payloadHash = keccak256(stringToHex(JSON.stringify(payload)));
    const message = [
      'NairaTag Personal Agent', `Action: ${action}`, `Wallet: ${walletAddress.toLowerCase()}`,
      `Tag: ${tag.replace(/^[₦$@#]/, '').toLowerCase()}`, `Chain: ${CHAIN_ID}`,
      `Timestamp: ${timestamp}`, `Payload hash: ${payloadHash}`,
    ].join('\n');
    auth = { timestamp, signature: await provider.request({ method: 'personal_sign', params: [message, walletAddress] }) };
  }
  const response = await fetch(API, {
    method: 'POST', headers,
    body: JSON.stringify({ action, walletAddress, tag, payload, ...auth }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) throw new Error(result.error || `Personal agent service returned ${response.status}.`);
  return result;
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
