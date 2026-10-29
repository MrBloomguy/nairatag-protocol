import { keccak256, stringToHex } from 'viem';
import { getArcSessionToken } from './arcSession.js';

const ARC_CHAIN_ID = 5042;
const ARC_CHAT_API = import.meta.env.VITE_ARC_CHAT_API || '/api/arc-chat';
const ARC_VOICE_API = import.meta.env.VITE_ARC_VOICE_API || 'https://nairatag.ng/api/arc?route=voice';

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

async function signArcChatAction({ action, walletAddress, conversationId = '', turnId = '', prompt = '', agentTag = '' }) {
  const provider = typeof window !== 'undefined' ? window.ethereum : null;
  const timestamp = Date.now();
  if (!provider?.request) {
    // Email / Circle auth mode - allow seamless interaction without external EVM extension
    return { action, walletAddress: walletAddress.toLowerCase(), conversationId, turnId, timestamp, authMode: 'circle' };
  }
  const contentHash = action === 'send'
    ? keccak256(stringToHex(prompt))
    : action === 'voice'
      ? keccak256(stringToHex(agentTag))
      : '';
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
  try {
    const signature = await provider.request({ method: 'personal_sign', params: [message, walletAddress] });
    return { action, walletAddress, conversationId, turnId, timestamp, signature };
  } catch {
    return { action, walletAddress: walletAddress.toLowerCase(), conversationId, turnId, timestamp, authMode: 'fallback' };
  }
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
  try {
    const cleanWallet = (walletAddress || '0x0000000000000000000000000000000000000000').toLowerCase();
    const token = walletAddress ? getArcSessionToken(cleanWallet) : null;
    const payload = {
      action: 'send',
      walletAddress: cleanWallet,
      conversationId: conversationId || createArcChatConversationId(),
      turnId: turnId || crypto.randomUUID(),
      prompt,
      agentTag,
      title
    };
    return await postArcChat(payload, token);
  } catch (err) {
    console.error('[ArcChat] Service error:', err.message);
    return {
      ok: false,
      reply: `⚠️ Chat service notice: ${err.message}. Please try again shortly.`,
      toolEvents: [],
    };
  }
}

export async function getArcChatHistory({ walletAddress, conversationId }) {
  if (!walletAddress) return { ok: true, messages: [] };
  try {
    const token = getArcSessionToken(walletAddress);
    if (token) return await postArcChat({ action: 'history', walletAddress, conversationId }, token);
    const signed = await signArcChatAction({ action: 'history', walletAddress, conversationId });
    return await postArcChat(signed);
  } catch (err) {
    return { ok: true, messages: [] };
  }
}

export async function listArcChatConversations({ walletAddress }) {
  if (!walletAddress) return { ok: true, conversations: [] };
  try {
    const token = getArcSessionToken(walletAddress);
    if (token) return await postArcChat({ action: 'list', walletAddress }, token);
    const signed = await signArcChatAction({ action: 'list', walletAddress });
    return await postArcChat(signed);
  } catch (err) {
    return { ok: true, conversations: [] };
  }
}

export async function clearArcChatHistory({ walletAddress }) {
  if (!walletAddress) return { ok: true };
  try {
    const token = getArcSessionToken(walletAddress);
    if (token) return await postArcChat({ action: 'clear', walletAddress }, token);
    const signed = await signArcChatAction({ action: 'clear', walletAddress });
    return await postArcChat(signed);
  } catch (err) {
    return { ok: true };
  }
}

export async function createArcVoiceSession({ walletAddress, conversationId, agentTag = 'arc' }) {
  if (!walletAddress) throw new Error('Sign in to start voice mode with your agent.');
  if (!conversationId) throw new Error('Open a conversation before starting voice.');
  const turnId = crypto.randomUUID();
  const token = getArcSessionToken(walletAddress);
  const base = { action: 'voice', walletAddress, conversationId, turnId, agentTag };
  const signed = token ? base : await signArcChatAction({ ...base, prompt: agentTag });
  const response = await fetch(ARC_VOICE_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ ...signed, agentTag }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) throw new Error(result.error || `Voice service returned ${response.status}.`);
  return result;
}
