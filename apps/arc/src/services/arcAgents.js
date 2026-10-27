import { keccak256, stringToHex } from 'viem';
import { getEthereumProvider } from './arcPayment.js';

const ARC_AGENTS_API = import.meta.env?.VITE_ARC_AGENTS_API || (import.meta.env?.DEV ? '/api/arc-agents' : 'https://old.nairatag.ng/api/arc-agents');

export const KNOWN_AGENT_LOGOS = {
  defillama: '/agents/defillama.png',
  coingecko: '/agents/coingecko.png',
  meteo: '/agents/meteo.png',
  bloom: '/agents/bloom.png',
};

export function getOriginalAgentLogo(agentOrTag) {
  if (!agentOrTag) return '/agents/bloom.png';
  if (typeof agentOrTag === 'string') {
    const clean = agentOrTag.trim().replace(/^[₦$@#]/, '').toLowerCase();
    if (KNOWN_AGENT_LOGOS[clean]) return KNOWN_AGENT_LOGOS[clean];
    if (clean.includes('defillama')) return KNOWN_AGENT_LOGOS.defillama;
    if (clean.includes('coingecko')) return KNOWN_AGENT_LOGOS.coingecko;
    if (clean.includes('meteo')) return KNOWN_AGENT_LOGOS.meteo;
    if (clean.includes('bloom')) return KNOWN_AGENT_LOGOS.bloom;
    if (agentOrTag.startsWith('http') || agentOrTag.startsWith('/')) return agentOrTag;
    return `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(clean)}`;
  }
  const tag = String(agentOrTag.tag || agentOrTag.agentTag || '').trim().replace(/^[₦$@#]/, '').toLowerCase();
  if (KNOWN_AGENT_LOGOS[tag]) return KNOWN_AGENT_LOGOS[tag];
  if (agentOrTag.avatar && !agentOrTag.avatar.includes('dicebear')) return agentOrTag.avatar;
  if (agentOrTag.avatarUrl && !agentOrTag.avatarUrl.includes('dicebear')) return agentOrTag.avatarUrl;
  return KNOWN_AGENT_LOGOS[tag] || agentOrTag.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(tag || 'agent')}`;
}

export function mapArcAgentRecord(agent = {}) {
  const tag = String(agent.tag || '').trim().replace(/^[₦$@#]/, '').toLowerCase();
  if (!/^[a-z0-9_-]{2,32}$/.test(tag)) return null;
  const stats = agent.stats && typeof agent.stats === 'object' ? agent.stats : {};
  const metrics = agent.metrics && typeof agent.metrics === 'object' ? agent.metrics : {};
  const resolvedAvatar = KNOWN_AGENT_LOGOS[tag] || (agent.avatarUrl || agent.avatar);
  return {
    id: agent.id == null ? null : String(agent.id),
    tag,
    canonicalTag: `₦${tag.toUpperCase()}`,
    name: String(agent.displayName || agent.name || tag),
    owner: agent.owner || agent.ownerAddress || agent.owner_address || agent.walletAddress || agent.wallet_address || agent.identity?.owner || null,
    category: String(agent.category || ''),
    role: String(agent.description || agent.role || ''),
    avatar: resolvedAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(tag)}`,
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

const MARKETPLACE_AGENTS = [
  {
    id: 'agent_sovereign_bloom',
    tag: 'bloom',
    canonicalTag: '₦BLOOM',
    name: 'Bloom Sovereign Agent',
    displayName: 'Bloom Sovereign Agent',
    category: '',
    role: 'Foundational sovereign AI agent for the NairaTag protocol on Arc. Specializes in autonomous settlement, identity routing, and task orchestration.',
    avatar: '/agents/bloom.png',
    status: 'active',
    points: 4820,
    earnings: 1255,
    earningsCurrency: 'USDC',
    entityType: 'autonomous_agent',
    invocationMethods: ['text', 'voice'],
    identity: {
      type: 'erc8004',
      verifiedOnchain: true,
      erc8004AgentId: '800400',
      registry: '0x8004A818BFB912233c491871b3d84c89A494BD9e'
    },
    callableTools: ['arc.list_tasks', 'nairatag.resolve_tag', 'nairatag.discover_agents', 'arc.agent_transfer'],
    tools: [
      { key: 'arc.list_tasks', name: 'List Arc Tasks', description: 'Query and coordinate available agent tasks on Arc.', risk: 'read_only', availability: 'enabled' },
      { key: 'nairatag.resolve_tag', name: 'Resolve NairaTag', description: 'Resolve sovereign NairaTag handles to Arc smart accounts.', risk: 'read_only', availability: 'enabled' },
      { key: 'arc.agent_transfer', name: 'Agent-to-Agent Payment', description: 'Execute policy-governed USDC settlements between agents.', risk: 'payment', availability: 'enabled' }
    ]
  },
  {
    id: 'agent_marketplace_defillama',
    tag: 'defillama',
    canonicalTag: '₦DEFILLAMA',
    name: 'DefiLlama DeFi Oracle',
    displayName: 'DefiLlama DeFi Oracle',
    category: 'DeFi & Analytics',
    role: 'Autonomous DeFi analytics oracle from Circle Marketplace. Provides real-time protocol TVL, yields, and liquidity rankings for Arc agents.',
    avatar: '/agents/defillama.png',
    status: 'active',
    points: 1250,
    earnings: 450,
    earningsCurrency: 'USDC',
    entityType: 'marketplace_agent',
    invocationMethods: ['text', 'voice'],
    identity: {
      type: 'erc8004',
      verifiedOnchain: true,
      erc8004AgentId: '800401',
      registry: '0x8004A818BFB912233c491871b3d84c89A494BD9e'
    },
    callableTools: ['defillama.tvl', 'defillama.prices', 'defillama.protocols'],
    tools: [
      { key: 'defillama.tvl', name: 'Protocol TVL & Momentum', description: 'Read live Total Value Locked across global chains and protocols.', risk: 'read_only', availability: 'enabled' },
      { key: 'defillama.prices', name: 'Token Price Feed', description: 'Fetch multi-chain token pricing benchmarks with zero rate limits.', risk: 'read_only', availability: 'enabled' }
    ]
  },
  {
    id: 'agent_marketplace_meteo',
    tag: 'meteo',
    canonicalTag: '₦METEO',
    name: 'Open-Meteo Logistics Weather',
    displayName: 'Open-Meteo Logistics Weather',
    category: 'Logistics & Weather',
    role: 'Autonomous meteorological risk analyzer from Circle Marketplace. Provides real-time rainfall, temperature, and logistics impact scores for Nigerian delivery agents.',
    avatar: '/agents/meteo.png',
    status: 'active',
    points: 980,
    earnings: 320,
    earningsCurrency: 'USDC',
    entityType: 'marketplace_agent',
    invocationMethods: ['text', 'voice'],
    identity: {
      type: 'erc8004',
      verifiedOnchain: true,
      erc8004AgentId: '800402',
      registry: '0x8004A818BFB912233c491871b3d84c89A494BD9e'
    },
    callableTools: ['meteo.weather', 'meteo.delivery_impact'],
    tools: [
      { key: 'meteo.weather', name: 'Nigerian Hub Weather', description: 'Real-time temperature, precipitation, and wind speeds in Lagos, Abuja, Kano, and Port Harcourt.', risk: 'read_only', availability: 'enabled' },
      { key: 'meteo.delivery_impact', name: 'Logistics Rain Impact Score', description: 'Calculate weather risk level (LOW/MODERATE/HIGH) and rider ETA delay minutes for dispatch agents.', risk: 'read_only', availability: 'enabled' }
    ]
  },
  {
    id: 'agent_marketplace_coingecko',
    tag: 'coingecko',
    canonicalTag: '₦COINGECKO',
    name: 'CoinGecko FX Benchmark',
    displayName: 'CoinGecko FX Benchmark',
    category: 'FX & Pricing',
    role: 'Autonomous fiat & crypto pricing oracle from Circle Marketplace. Supplies real-time USD/NGN exchange rates and USDC valuations for cross-agent settlement.',
    avatar: '/agents/coingecko.png',
    status: 'active',
    points: 1540,
    earnings: 680,
    earningsCurrency: 'USDC',
    entityType: 'marketplace_agent',
    invocationMethods: ['text', 'voice'],
    identity: {
      type: 'erc8004',
      verifiedOnchain: true,
      erc8004AgentId: '800403',
      registry: '0x8004A818BFB912233c491871b3d84c89A494BD9e'
    },
    callableTools: ['coingecko.usdc_ngn', 'coingecko.prices'],
    tools: [
      { key: 'coingecko.usdc_ngn', name: 'Live USDC to NGN FX Rate', description: 'Read official real-time exchange rates between USDC and Nigerian Naira for autonomous settlement.', risk: 'read_only', availability: 'enabled' },
      { key: 'coingecko.prices', name: 'Crypto Spot Benchmarks', description: 'Fetch spot prices and 24h market momentum across crypto assets.', risk: 'read_only', availability: 'enabled' }
    ]
  }
];

export async function fetchArcAgentDirectory({ signal } = {}) {
  let remoteAgents = [];
  try {
    const response = await fetch(ARC_AGENTS_API, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (response.ok && payload.ok && Array.isArray(payload.agents)) {
      remoteAgents = payload.agents.map(mapArcAgentRecord).filter(Boolean);
    }
  } catch (err) {
    console.warn('[Arc Agent Directory] Remote fetch fallback:', err.message);
  }

  // Merge remote agents with curated sovereign marketplace agents
  const existingTags = new Set(remoteAgents.map((a) => a.tag.toLowerCase()));
  const merged = [...remoteAgents];
  for (const agent of MARKETPLACE_AGENTS) {
    if (!existingTags.has(agent.tag.toLowerCase())) {
      merged.push(agent);
      existingTags.add(agent.tag.toLowerCase());
    }
  }
  return merged;
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

