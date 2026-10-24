import { keccak256, stringToHex } from 'viem';
import { getArcSessionToken } from './arcSession.js';

const ARC_CHAIN_ID = 5042002;
const ARC_CHAT_API = import.meta.env.VITE_ARC_CHAT_API || 'https://nairatag.ng/api/arc-chat';

export function createArcChatConversationId() {
  return crypto.randomUUID();
}

export function getOrCreateArcChatConversationId(walletAddress, agentTag = 'arc') {
  const key = `nairatag:arc-chat:${String(walletAddress || '').toLowerCase()}:${String(agentTag || 'arc').toLowerCase()}`;
  const current = window.localStorage.getItem(key);
  if (current && /^[0-9a-f-]{36}$/i.test(current)) return current;
  const conversationId = createArcChatConversationId();
  window.localStorage.setItem(key, conversationId);
  return conversationId;
}

async function signArcChatAction({ action, walletAddress, conversationId = '', turnId = '', prompt = '' }) {
  const provider = typeof window !== 'undefined' ? window.ethereum : null;
  if (!provider?.request) throw new Error('Connect an EVM wallet to save your Arc chat.');
  const timestamp = Date.now();
  const contentHash = action === 'send' ? keccak256(stringToHex(prompt)) : '';
  const message = [
    'NairaTag Arc Chat',
    `Action: ${action}`,
    `Conversation: ${conversationId}`,
    `Turn: ${turnId}`,
    `Wallet: ${walletAddress.toLowerCase()}`,
    `Chain: ${ARC_CHAIN_ID}`,
    `Timestamp: ${timestamp}`,
    `Content hash: ${contentHash}`,
  ].join('\n');
  const signature = await provider.request({ method: 'personal_sign', params: [message, walletAddress] });
  return { action, walletAddress, conversationId, turnId, timestamp, signature };
}

async function postArcChat(payload, token = null) {
  const response = await fetch(ARC_CHAT_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) throw new Error(result.error || `Arc chat service returned ${response.status}.`);
  return result;
}

export async function sendArcChatMessage({ walletAddress, conversationId, turnId, prompt, agentTag = 'arc', title }) {
  if (!walletAddress) throw new Error('Connect your Arc wallet to save this conversation.');
  const token = getArcSessionToken(walletAddress);
  if (token) return postArcChat({ action: 'send', walletAddress, conversationId, turnId, prompt, agentTag, title }, token);
  const signed = await signArcChatAction({ action: 'send', walletAddress, conversationId, turnId, prompt });
  return postArcChat({ ...signed, prompt, agentTag, title });
}

export async function getArcChatHistory({ walletAddress, conversationId }) {
  if (!walletAddress) throw new Error('Connect your Arc wallet to load saved conversations.');
  const token = getArcSessionToken(walletAddress);
  if (token) return postArcChat({ action: 'history', walletAddress, conversationId }, token);
  const signed = await signArcChatAction({ action: 'history', walletAddress, conversationId });
  return postArcChat(signed);
}

export async function listArcChatConversations({ walletAddress }) {
  if (!walletAddress) throw new Error('Connect your Arc wallet to load saved conversations.');
  const token = getArcSessionToken(walletAddress);
  if (token) return postArcChat({ action: 'list', walletAddress }, token);
  const signed = await signArcChatAction({ action: 'list', walletAddress });
  return postArcChat(signed);
}

export async function clearArcChatHistory({ walletAddress }) {
  if (!walletAddress) throw new Error('Connect your Arc wallet to clear saved conversations.');
  const token = getArcSessionToken(walletAddress);
  if (token) return postArcChat({ action: 'clear', walletAddress }, token);
  const signed = await signArcChatAction({ action: 'clear', walletAddress });
  return postArcChat(signed);
}
