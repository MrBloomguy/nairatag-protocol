import { randomBytes } from 'node:crypto';
import { createPublicClient, http, parseAbi } from 'viem';
import { supabase } from '../supabase.js';
import { readArcSession } from './session-auth.js';
import { createAgentTagCandidate, isReservedAgentTag } from './agent-identity.js';

const REGISTRY = '0x034f64b644988406ded382ebabb5c981bd19684a';
const client = createPublicClient({ transport: http(process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.io', { timeout: 8000 }) });
const registryAbi = parseAbi(['function resolve(string name) view returns (address)']);

function respond(res, status, payload) { return res.status(status).json(payload); }
function bodyOf(req) {
  if (typeof req.body === 'string') return JSON.parse(req.body);
  return req.body || {};
}

async function verifiedOwnerTag(tag, wallet) {
  const normalized = String(tag || '').trim().replace(/^₦/, '').toLowerCase();
  if (!/^[a-z0-9_]{2,32}$/.test(normalized)) return false;
  const resolved = await client.readContract({ address: REGISTRY, abi: registryAbi, functionName: 'resolve', args: [normalized] });
  return String(resolved).toLowerCase() === wallet;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!['GET', 'POST'].includes(req.method)) return respond(res, 405, { ok: false, error: 'Method not allowed.' });

  let session;
  try { session = readArcSession(req); }
  catch (error) { return respond(res, Number(error.status) || 401, { ok: false, error: error.message }); }
  if (!session) return respond(res, 401, { ok: false, error: 'Sign in with your NairaTag wallet to manage agents.' });
  const wallet = session.walletAddress.toLowerCase();

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('arc_agents')
      .select('id, tag, display_name, category, description, avatar_url, status, is_public, created_at')
      .eq('owner_type', 'user').eq('owner_wallet', wallet).order('created_at', { ascending: false }).limit(100);
    if (error) return respond(res, 503, { ok: false, error: 'Could not load your NairaTag agents.' });
    return respond(res, 200, { ok: true, agents: data || [] });
  }

  let body;
  try { body = bodyOf(req); }
  catch { return respond(res, 400, { ok: false, error: 'Request body must be valid JSON.' }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return respond(res, 400, { ok: false, error: 'Request body must be a JSON object.' });
  const action = String(body.action || 'create');
  if (action !== 'create') return respond(res, 400, { ok: false, error: 'Only agent creation is available from this route.' });

  const identityTag = String(body.identityTag || '').trim().replace(/^₦/, '').toLowerCase();
  const externalId = String(body.externalId || '').trim();
  const displayName = String(body.displayName || '').trim();
  const category = String(body.category || 'personal').trim();
  const description = String(body.description || '').trim();
  if (!displayName || displayName.length > 80) return respond(res, 400, { ok: false, error: 'Agent name is required and must be at most 80 characters.' });
  if (!/^[0-9a-f-]{36}$/i.test(externalId)) return respond(res, 400, { ok: false, error: 'A valid OpenDots agent id is required.' });
  if (!category || category.length > 64 || description.length > 500) return respond(res, 400, { ok: false, error: 'Category or description is too long.' });
  let ownsIdentity;
  try { ownsIdentity = await verifiedOwnerTag(identityTag, wallet); }
  catch { return respond(res, 503, { ok: false, error: 'Arc tag ownership could not be checked. Try again.' }); }
  if (!ownsIdentity) return respond(res, 403, { ok: false, error: 'Verify a NairaTag owned by this wallet before creating an agent.' });

  const metadataUri = `nairadots://agent/${wallet}/${externalId}`;
  const existing = await supabase.from('arc_agents').select('id, tag, display_name, category, description, avatar_url, status, is_public, created_at')
    .eq('owner_type', 'user').eq('owner_wallet', wallet).eq('metadata_uri', metadataUri).maybeSingle();
  if (existing.error) return respond(res, 503, { ok: false, error: 'Could not check your existing NairaTag agent.' });
  if (existing.data) return respond(res, 200, { ok: true, agent: existing.data, existing: true });

  const { count, error: countError } = await supabase.from('arc_agents').select('id', { count: 'exact', head: true })
    .eq('owner_type', 'user').eq('owner_wallet', wallet).neq('status', 'retired');
  if (countError) return respond(res, 503, { ok: false, error: 'Could not check your agent limit.' });
  if ((count || 0) >= 30) return respond(res, 409, { ok: false, error: 'This wallet has reached the 30 agent limit.' });

  let base;
  try { base = createAgentTagCandidate(displayName); }
  catch { return respond(res, 400, { ok: false, error: 'Choose a name that can be used for an agent NairaTag.' }); }
  const tag = `${base.slice(0, 25)}_${randomBytes(3).toString('hex')}`;
  if (isReservedAgentTag(tag)) return respond(res, 400, { ok: false, error: 'That NairaTag is reserved.' });
  const { data, error } = await supabase.from('arc_agents').insert({
    tag, display_name: displayName, category, description,
    owner_type: 'user', owner_wallet: wallet,
    entity_type: 'autonomous_agent', provenance: 'first_party',
    invocation_methods: ['text'], runtime_type: 'opendots', runtime_version: '1.0.0',
    status: 'chat_only', is_public: false, created_by: wallet, metadata_uri: metadataUri,
  }).select('id, tag, display_name, category, description, avatar_url, status, is_public, created_at').single();
  if (error?.code === '23505') {
    const retried = await supabase.from('arc_agents').select('id, tag, display_name, category, description, avatar_url, status, is_public, created_at')
      .eq('owner_type', 'user').eq('owner_wallet', wallet).eq('metadata_uri', metadataUri).maybeSingle();
    if (retried.data) return respond(res, 200, { ok: true, agent: retried.data, existing: true });
    return respond(res, 409, { ok: false, error: 'That agent NairaTag is already in use. Try again.' });
  }
  if (error) return respond(res, 503, { ok: false, error: 'Could not create your NairaTag agent.' });
  const { error: toolsError } = await supabase.from('arc_agent_tools').upsert([
    {
      agent_id: data.id, tool_key: 'nairatag.discover_agents', display_name: 'Discover agents by capability',
      description: 'Find public agents with an enabled registered capability that matches the requested task.',
      input_schema: { type: 'object', properties: { query: { type: 'string', minLength: 2, maxLength: 160 } }, required: ['query'], additionalProperties: false },
      risk_level: 'read_only', provider: 'nairatag-registry', availability: 'enabled', executor_key: 'discover_agents',
    },
    {
      agent_id: data.id, tool_key: 'arc.list_tasks', display_name: 'Find Arc reward tasks',
      description: 'Find open Arc reward tasks assigned to this NairaTag agent.',
      input_schema: { type: 'object', properties: { category: { type: 'string', maxLength: 32 } }, additionalProperties: false },
      risk_level: 'read_only', provider: 'nairatag-database', availability: 'enabled', executor_key: 'list_arc_tasks',
    },
  ], { onConflict: 'agent_id,tool_key' });
  if (toolsError) {
    await supabase.from('arc_agents').delete().eq('id', data.id).eq('owner_wallet', wallet);
    return respond(res, 503, { ok: false, error: 'Could not activate agent discovery. Agent creation was rolled back.' });
  }
  const { error: auditError } = await supabase.from('arc_agent_audit_log').insert({
    agent_id: data.id, agent_tag: data.tag, actor_wallet: wallet,
    actor_type: 'wallet', action: 'created', from_status: null, to_status: 'chat_only',
    details: { runtime: 'opendots', external_id: externalId },
  });
  if (auditError) {
    await supabase.from('arc_agents').delete().eq('id', data.id).eq('owner_wallet', wallet);
    return respond(res, 503, { ok: false, error: 'Could not save the agent audit record. Creation was rolled back.' });
  }
  return respond(res, 201, { ok: true, agent: data, note: 'Created as your private NairaTag agent.' });
}
