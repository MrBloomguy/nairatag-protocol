import { keccak256, stringToHex } from 'viem';
import { getEthereumProvider } from './arcPayment.js';

const ARC_AGENTS_API = import.meta.env?.VITE_ARC_AGENTS_API || (import.meta.env?.DEV ? '/api/arc-agents' : 'https://old.nairatag.ng/api/arc-agents');

export function mapArcAgentRecord(agent = {}) {
  const tag = String(agent.tag || '').trim().replace(/^[₦$@#]/, '').toLowerCase();
  if (!/^[a-z0-9_-]{2,32}$/.test(tag)) return null;
  const stats = agent.stats && typeof agent.stats === 'object' ? agent.stats : {};
  const metrics = agent.metrics && typeof agent.metrics === 'object' ? agent.metrics : {};
  return {
    id: agent.id == null ? null : String(agent.id),
    tag,
    canonicalTag: `₦${tag.toUpperCase()}`,
    name: String(agent.displayName || agent.name || tag),
    owner: agent.owner || agent.ownerAddress || agent.owner_address || agent.walletAddress || agent.wallet_address || agent.identity?.owner || null,
    category: String(agent.category || ''),
    role: String(agent.description || agent.role || ''),
    avatar: agent.avatarUrl || agent.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(tag)}`,
    status: String(agent.status || 'unknown').toLowerCase(),
    points: agent.pointsEarned ?? agent.points_earned ?? agent.earnedPoints ?? agent.earned_points ?? agent.protocolPoints ?? agent.protocol_points ?? agent.totalPoints ?? agent.total_points ?? agent.points ?? stats.pointsEarned ?? stats.points_earned ?? stats.points ?? metrics.pointsEarned ?? metrics.points_earned ?? metrics.points ?? null,
    earnings: agent.earnings ?? agent.totalEarnings ?? agent.total_earnings ?? null,
    earningsCurrency: String(agent.earningsCurrency || agent.earnings_currency || agent.currency || 'USDC'),
    entityType: String(agent.entityType || agent.entity_type || 'agent'),
    aliases: Array.isArray(agent.aliases) ? agent.aliases.filter((value) => typeof value === 'string') : [],
    voiceAliases: Array.isArray(agent.voiceAliases || agent.voice_aliases)
      ? (agent.voiceAliases || agent.voice_aliases).filter((value) => typeof value === 'string')
      : [],
    invocationMethods: Array.isArray(agent.invocationMethods || agent.invocation_methods)
      ? (agent.invocationMethods || agent.invocation_methods).filter((value) => typeof value === 'string')
      : [],
    capabilities: Array.isArray(agent.capabilities) ? agent.capabilities : [],
    provenance: agent.provenance && typeof agent.provenance === 'object' ? agent.provenance : null,
    health: agent.health && typeof agent.health === 'object' ? agent.health : null,
    permissions: Array.isArray(agent.permissions) ? agent.permissions : [],
    identity: agent.identity && typeof agent.identity === 'object' ? agent.identity : null,
    tools: Array.isArray(agent.tools) ? agent.tools : [],
    callableTools: Array.isArray(agent.callableTools || agent.callable_tools)
      ? (agent.callableTools || agent.callable_tools)
      : [],
  };
}

export async function fetchArcAgentDirectory({ signal } = {}) {
  const response = await fetch(ARC_AGENTS_API, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok || !Array.isArray(payload.agents)) {
    throw new Error(payload.error || `Arc agent registry returned ${response.status}.`);
  }
  return payload.agents.map(mapArcAgentRecord).filter(Boolean);
}

async function signAdminPayload({ walletAddress, action, payload }) {
  const provider = getEthereumProvider();
  if (!provider) throw new Error('Connect an injected EVM wallet to authorize platform administration.');
  const accounts = await provider.request({ method: 'eth_accounts' });
  const signer = String(walletAddress || '').toLowerCase();
  if (!Array.isArray(accounts) || !accounts.some((account) => String(account).toLowerCase() === signer)) {
    throw new Error('The connected wallet is not available for signing. Reconnect it and try again.');
  }
  const timestamp = Date.now();
  const payloadHash = keccak256(stringToHex(JSON.stringify(payload)));
  const message = [
    'NairaTag Platform Agent Admin',
    `Action: ${action}`,
    `Wallet: ${signer}`,
    `Timestamp: ${timestamp}`,
    `Payload hash: ${payloadHash}`,
  ].join('\n');
  const signature = await provider.request({ method: 'personal_sign', params: [message, walletAddress] });
  return { walletAddress, timestamp, signature };
}

async function sendAdminPayload({ walletAddress, action, payload }) {
  const auth = await signAdminPayload({ walletAddress, action, payload });
  const response = await fetch(ARC_AGENTS_API, {
    method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, ...auth }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) throw new Error(result.error || `Agent administration failed (${response.status}).`);
  return result;
}

export async function getAdminArcAgentRegistry({ walletAddress }) {
  const result = await sendAdminPayload({ walletAddress, action: 'list', payload: { action: 'list' } });
  return (result.agents || []).map(mapArcAgentRecord).filter(Boolean);
}

export async function transitionArcAgent({ walletAddress, tag, action }) {
  return sendAdminPayload({ walletAddress, action, payload: { action, tag: String(tag || '').trim().replace(/^[₦$@#]/, '').toLowerCase() } });
}

export async function enableArcMcpTool({ walletAddress, tag, toolKey }) {
  const action = 'enable_mcp_tool';
  return sendAdminPayload({ walletAddress, action, payload: { action, tag: String(tag || '').trim().replace(/^[₦$@#]/, '').toLowerCase(), toolKey } });
}

export async function createArcPlatformAgent({ walletAddress, agent }) {
  const payload = {
    tag: String(agent.tag || '').trim().replace(/^[₦$@#]/, '').toLowerCase(),
    displayName: String(agent.displayName || '').trim(),
    category: String(agent.category || '').trim(),
    description: String(agent.description || '').trim(),
    avatarUrl: agent.avatarUrl ? String(agent.avatarUrl).trim() : null,
    entityType: agent.entityType || 'autonomous_agent',
    aliases: [...new Set((Array.isArray(agent.aliases) ? agent.aliases : String(agent.aliases || '').split(','))
      .map((alias) => String(alias || '').normalize('NFKC').trim().toLowerCase()).filter(Boolean))],
    invocationMethods: ['text', 'voice'],
    provenance: 'first_party',
    ...(agent.entityType === 'mcp_server' ? { mcp: {
      endpoint: String(agent.mcpEndpoint || '').trim(),
      authType: agent.mcpAuthType || 'none',
      authHeader: String(agent.mcpAuthHeader || '').trim().toLowerCase(),
      authSecret: String(agent.mcpAuthSecret || ''),
    } } : {}),
  };
  const auth = await signAdminPayload({ walletAddress, action: 'create', payload });
  const response = await fetch(ARC_AGENTS_API, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, ...auth }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) throw new Error(result.error || `Platform agent provisioning failed (${response.status}).`);
  return result.agent;
}

