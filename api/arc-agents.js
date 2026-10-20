import { supabase } from '../lib/supabase.js';
import { timingSafeEqual } from 'node:crypto';
import { isAddress, keccak256, stringToHex, verifyMessage } from 'viem';

function respond(res, status, payload) {
  return res.status(status).json(payload);
}

function normalizeTag(value) {
  return String(value || '').trim().replace(/^[\u20A6$@#]/, '').toLowerCase();
}

function presentTool(tool) {
  return {
    key: tool.tool_key,
    name: tool.display_name,
    description: tool.description,
    inputSchema: tool.input_schema,
    risk: tool.risk_level,
    provider: tool.provider,
    availability: tool.availability,
    ...(tool.availability_reason ? { availabilityReason: tool.availability_reason } : {}),
  };
}

function presentAgent(agent, tools) {
  return {
    id: agent.id,
    tag: agent.tag,
    displayName: agent.display_name,
    category: agent.category,
    description: agent.description,
    avatarUrl: agent.avatar_url || null,
    ownerType: agent.owner_type,
    ownerWallet: agent.owner_wallet || null,
    runtime: { type: agent.runtime_type, version: agent.runtime_version },
    status: agent.status,
    identity: {
      type: agent.erc8004_agent_id ? 'erc8004' : 'platform',
      verifiedOnchain: Boolean(agent.erc8004_agent_id && agent.erc8004_registry),
      ...(agent.erc8004_agent_id ? { erc8004AgentId: String(agent.erc8004_agent_id) } : {}),
      ...(agent.erc8004_registry ? { registry: agent.erc8004_registry } : {}),
      ...(agent.metadata_uri ? { metadataUri: agent.metadata_uri } : {}),
    },
    tools: tools.map(presentTool),
    callableTools: tools.filter((tool) => tool.availability === 'enabled').map((tool) => tool.tool_key),
  };
}

function validAdminRequest(req) {
  const expected = process.env.ARC_AGENT_ADMIN_TOKEN || '';
  const supplied = String(req.headers?.authorization || '').replace(/^Bearer\s+/i, '');
  if (!expected || !supplied) return false;
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes);
}

async function validSignedAdminRequest(body, payload) {
  const walletAddress = String(body.walletAddress || '').trim();
  const timestamp = Number(body.timestamp);
  const signature = String(body.signature || '').trim();
  const allowedWallets = String(process.env.ARC_AGENT_ADMIN_WALLETS || '')
    .split(',').map((wallet) => wallet.trim().toLowerCase()).filter(Boolean);
  if (!isAddress(walletAddress) || !allowedWallets.includes(walletAddress.toLowerCase())
    || !Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > 5 * 60 * 1000
    || !/^0x[0-9a-f]{130}$/i.test(signature)) return false;
  const payloadHash = keccak256(stringToHex(JSON.stringify(payload)));
  const message = [
    'NairaTag Platform Agent Admin',
    'Action: create',
    `Wallet: ${walletAddress.toLowerCase()}`,
    `Timestamp: ${timestamp}`,
    `Payload hash: ${payloadHash}`,
  ].join('\n');
  try {
    return await verifyMessage({ address: walletAddress, message, signature });
  } catch {
    return false;
  }
}

async function createPlatformAgent(req, res) {
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch {
    return respond(res, 400, { ok: false, error: 'Request body must be valid JSON.' });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return respond(res, 400, { ok: false, error: 'Request body must be a JSON object.' });
  }
  const tag = normalizeTag(body.tag);
  const displayName = String(body.displayName || '').trim();
  const category = String(body.category || '').trim();
  const description = String(body.description || '').trim();
  const avatarUrl = body.avatarUrl ? String(body.avatarUrl).trim() : null;
  if (!/^[a-z0-9_]{2,32}$/.test(tag)) return respond(res, 400, { ok: false, error: 'Tag must be 2–32 lowercase letters, numbers, or underscores.' });
  if (!displayName || displayName.length > 80) return respond(res, 400, { ok: false, error: 'Display name is required and must be at most 80 characters.' });
  if (!category || category.length > 64) return respond(res, 400, { ok: false, error: 'Category is required and must be at most 64 characters.' });
  if (description.length > 500) return respond(res, 400, { ok: false, error: 'Description must be at most 500 characters.' });
  if (avatarUrl && (avatarUrl.length > 500 || !/^https:\/\//i.test(avatarUrl))) {
    return respond(res, 400, { ok: false, error: 'Avatar URL must be an HTTPS URL under 500 characters.' });
  }
  const payload = { tag, displayName, category, description, avatarUrl };
  if (!validAdminRequest(req) && !(await validSignedAdminRequest(body, payload))) {
    return respond(res, 401, { ok: false, error: 'Platform agent provisioning is not authorized for this wallet.' });
  }

  const { data, error } = await supabase.from('arc_agents').insert({
    tag,
    display_name: displayName,
    category,
    description,
    avatar_url: avatarUrl,
    owner_type: 'platform',
    status: 'chat_only',
    is_public: true,
  }).select('id, tag, display_name, category, description, status').single();
  if (error?.code === '23505') return respond(res, 409, { ok: false, error: 'That NairaTag is already assigned to an agent.' });
  if (error) throw new Error('Could not add the platform agent to the Arc registry.');
  return respond(res, 201, { ok: true, agent: data, note: 'Created as chat-only. Add reviewed tools separately before enabling actions.' });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!['GET', 'POST'].includes(req.method)) return respond(res, 405, { ok: false, error: 'Method not allowed.' });
  if (!process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return respond(res, 503, { ok: false, error: 'Arc agent registry is not configured.' });
  }
  if (!process.env.SUPABASE_SECRET_KEY) {
    return respond(res, 503, { ok: false, error: 'Arc agent registry credentials are not configured.' });
  }

  try {
    if (req.method === 'POST') return await createPlatformAgent(req, res);
    const requestedTag = normalizeTag(req.query?.tag);
    if (req.query?.tag && !/^[a-z0-9_]{2,32}$/.test(requestedTag)) {
      return respond(res, 400, { ok: false, error: 'A valid Arc agent tag is required.' });
    }
    const [{ data: agents, error: agentsError }, { data: tools, error: toolsError }] = await Promise.all([
      supabase.from('arc_agents')
        .select('id, tag, display_name, category, description, avatar_url, owner_type, owner_wallet, runtime_type, runtime_version, status, erc8004_agent_id, erc8004_registry, metadata_uri')
        .eq('is_public', true)
        .neq('status', 'retired')
        .order('tag', { ascending: true }),
      supabase.from('arc_agent_tools')
        .select('agent_id, tool_key, display_name, description, input_schema, risk_level, provider, availability, availability_reason')
        .neq('availability', 'retired')
        .order('tool_key', { ascending: true }),
    ]);
    if (agentsError || toolsError) throw new Error('Arc agent registry is unavailable. Apply the Arc agent registry migration.');

    const toolsByAgent = new Map();
    for (const tool of tools || []) {
      const entries = toolsByAgent.get(tool.agent_id) || [];
      entries.push(tool);
      toolsByAgent.set(tool.agent_id, entries);
    }
    const responseAgents = (agents || []).map((agent) => presentAgent(agent, toolsByAgent.get(agent.id) || []));
    const filtered = requestedTag ? responseAgents.filter((agent) => agent.tag === requestedTag) : responseAgents;
    if (requestedTag && filtered.length === 0) return respond(res, 404, { ok: false, error: 'Arc agent was not found.' });
    return respond(res, 200, requestedTag ? { ok: true, agent: filtered[0] } : { ok: true, agents: filtered });
  } catch (error) {
    console.error('[Arc Agents]', error.message);
    return respond(res, 503, { ok: false, error: error.message || 'Arc agent registry is unavailable.' });
  }
}
