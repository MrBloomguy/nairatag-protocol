import { createHash } from 'node:crypto';
import { createPublicClient, http, isAddress, keccak256, parseAbi, stringToHex, verifyMessage } from 'viem';
import { readArcSession } from './session-auth.js';
import { supabase } from '../supabase.js';

const CHAIN_ID = 5042002;
const MAX_AGE = 5 * 60 * 1000;
const REGISTRY = '0x034f64b644988406ded382ebabb5c981bd19684a';
const rpc = createPublicClient({ transport: http(process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.io', { timeout: 8000 }) });
const abi = parseAbi(['function ownerOf(string tag) view returns (address)']);
const PROFILE_FIELDS = ['agent_name', 'communication_style', 'response_length', 'language_preference', 'custom_instructions', 'personalization_enabled', 'memory_enabled', 'auto_memory_enabled'];

function fail(message, status = 400) { throw Object.assign(new Error(message), { status }); }
function cleanTag(value) {
  const tag = String(value || '').trim().replace(/^[₦$@#]/, '').toLowerCase();
  if (!/^[a-z0-9_]{2,32}$/.test(tag)) fail('Enter a valid NairaTag.');
  return tag;
}
function cleanWallet(value) {
  if (!isAddress(String(value || ''))) fail('Connect a valid wallet.');
  return String(value).toLowerCase();
}
async function authenticate(body, req) {
  const session = readArcSession(req);
  const requestedWallet = body.walletAddress ? cleanWallet(body.walletAddress) : '';
  const wallet = session ? session.walletAddress : cleanWallet(body.walletAddress);
  if (session && requestedWallet && requestedWallet !== wallet) fail('The account session does not match this wallet.', 403);
  const tag = cleanTag(body.tag);
  const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};
  if (!session) {
    const timestamp = Number(body.timestamp);
    if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > MAX_AGE || !body.signature) fail('Wallet signature expired. Please try again.');
    const payloadHash = keccak256(stringToHex(JSON.stringify(payload)));
    const message = ['NairaTag Personal Agent', 'Action: ' + String(body.action || ''), 'Wallet: ' + wallet, 'Tag: ' + tag, 'Chain: ' + CHAIN_ID, 'Timestamp: ' + timestamp, 'Payload hash: ' + payloadHash].join('\n');
    if (!await verifyMessage({ address: wallet, message, signature: body.signature })) fail('Wallet signature could not be verified.');
  }
  if (await rpc.getChainId() !== CHAIN_ID) fail('The configured Arc RPC is on the wrong network.', 503);
  const owner = await rpc.readContract({ address: REGISTRY, abi, functionName: 'ownerOf', args: [tag] });
  if (String(owner).toLowerCase() !== wallet) fail('This wallet does not currently own that NairaTag.', 403);
  return { wallet, tag, payload };
}
async function profileFor(wallet, tag) {
  const { data, error } = await supabase.from('arc_personal_agent_profiles').upsert({ wallet_address: wallet, tag }, { onConflict: 'wallet_address,tag', ignoreDuplicates: true }).select('id').maybeSingle();
  if (error) fail('Personal agent storage is unavailable.', 503);
  const result = await supabase.from('arc_personal_agent_profiles').select('*').eq('wallet_address', wallet).eq('tag', tag).single();
  if (result.error) fail('Personal agent profile could not be loaded.', 503);
  return result.data;
}
async function audit(profile, wallet, tag, action, objectId = null) {
  await supabase.from('arc_personal_agent_audit_events').insert({ profile_id: profile?.id || null, wallet_address: wallet, tag, action, object_id: objectId });
}
function limited(value, max, label, min = 0) {
  const text = String(value ?? '').trim();
  if (text.length < min || text.length > max) fail(label + ' length is invalid.');
  return text;
}
function validEnum(value, options, label) {
  if (!options.includes(value)) fail(label + ' is invalid.');
  return value;
}
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  if (!process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) return res.status(503).json({ ok: false, error: 'Personal agent storage is not configured.' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const action = String(body.action || '');
    const { wallet, tag, payload } = await authenticate(body, req);
    const profile = await profileFor(wallet, tag);

    if (action === 'get') {
      const [memoryResult, goalResult] = await Promise.all([
        supabase.from('arc_personal_agent_memories').select('id,category,title,content,user_confirmed,is_sensitive,status,source_type,confidence,importance,supersedes_id,expires_at,created_at,updated_at').eq('profile_id', profile.id).eq('wallet_address', wallet).eq('tag', tag).order('updated_at', { ascending: false }).limit(100),
        supabase.from('arc_personal_agent_goals').select('id,title,description,next_action,status,target_date,created_at,updated_at').eq('profile_id', profile.id).eq('wallet_address', wallet).eq('tag', tag).order('updated_at', { ascending: false }).limit(50),
      ]);
      if (memoryResult.error || goalResult.error) fail('Personal agent data could not be loaded.', 503);
      const memoryIds = (memoryResult.data || []).map((memory) => memory.id);
      const sourceResult = memoryIds.length ? await supabase.from('arc_personal_agent_memory_sources')
        .select('memory_id,conversation_id,message_id,created_at').in('memory_id', memoryIds) : { data: [], error: null };
      if (sourceResult.error) fail('Memory source history could not be loaded.', 503);
      const sourcesByMemory = new Map();
      for (const source of sourceResult.data || []) {
        const entries = sourcesByMemory.get(source.memory_id) || [];
        entries.push(source);
        sourcesByMemory.set(source.memory_id, entries);
      }
      const memories = (memoryResult.data || []).map((memory) => ({ ...memory, sources: sourcesByMemory.get(memory.id) || [] }));
      return res.status(200).json({ ok: true, profile, memories, goals: goalResult.data || [] });
    }

    if (action === 'update_profile') {
      const patch = {};
      for (const field of PROFILE_FIELDS) if (Object.hasOwn(payload, field)) patch[field] = payload[field];
      if (patch.agent_name !== undefined) patch.agent_name = limited(patch.agent_name, 48, 'Name');
      if (patch.communication_style !== undefined) patch.communication_style = validEnum(patch.communication_style, ['balanced','direct','friendly','professional','playful'], 'Communication style');
      if (patch.response_length !== undefined) patch.response_length = validEnum(patch.response_length, ['concise','balanced','detailed'], 'Response length');
      if (patch.language_preference !== undefined) patch.language_preference = limited(patch.language_preference, 48, 'Language');
      if (patch.custom_instructions !== undefined) patch.custom_instructions = limited(patch.custom_instructions, 1200, 'Instructions');
      if (patch.personalization_enabled !== undefined && typeof patch.personalization_enabled !== 'boolean') fail('Personalization setting is invalid.');
      if (patch.memory_enabled !== undefined && typeof patch.memory_enabled !== 'boolean') fail('Memory setting is invalid.');
      if (patch.auto_memory_enabled !== undefined && typeof patch.auto_memory_enabled !== 'boolean') fail('Automatic memory setting is invalid.');
      const { data, error } = await supabase.from('arc_personal_agent_profiles').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', profile.id).eq('wallet_address', wallet).eq('tag', tag).select('*').single();
      if (error) fail('Personal agent profile could not be saved.', 503);
      await audit(profile, wallet, tag, 'profile_updated');
      return res.status(200).json({ ok: true, profile: data });
    }

    if (action === 'confirm_memory') {
      const id = String(payload.id || '');
      if (!/^[0-9a-f-]{36}$/i.test(id)) fail('Select a valid memory.');
      const { data: candidate, error: candidateError } = await supabase.from('arc_personal_agent_memories')
        .select('id,supersedes_id').eq('id', id).eq('profile_id', profile.id).eq('wallet_address', wallet).eq('tag', tag).eq('status', 'pending_confirmation').eq('user_confirmed', false).maybeSingle();
      if (candidateError || !candidate) fail('That memory is no longer awaiting review.', 404);
      const { data, error } = await supabase.from('arc_personal_agent_memories').update({ status: 'active', user_confirmed: true, updated_at: new Date().toISOString() })
        .eq('id', id).eq('profile_id', profile.id).eq('wallet_address', wallet).eq('tag', tag).select('id').single();
      if (error) fail('Memory could not be confirmed.', 503);
      if (candidate.supersedes_id) await supabase.from('arc_personal_agent_memories').update({ status: 'superseded', updated_at: new Date().toISOString() })
        .eq('id', candidate.supersedes_id).eq('profile_id', profile.id).eq('status', 'active');
      await audit(profile, wallet, tag, 'memory_updated', id);
      return res.status(200).json({ ok: true, id: data.id });
    }

    if (action === 'create_memory' || action === 'update_memory') {
      const values = {
        category: validEnum(payload.category, ['profile','working','episodic'], 'Memory category'),
        title: limited(payload.title, 96, 'Memory title', 1),
        content: limited(payload.content, 1200, 'Memory content', 1),
        user_confirmed: true,
        is_sensitive: Boolean(payload.is_sensitive),
        status: 'active',
        source_type: 'manual',
        content_hash: createHash('sha256').update(validEnum(payload.category, ['profile','working','episodic'], 'Memory category') + ':' + limited(payload.content, 1200, 'Memory content', 1).normalize('NFKC').trim().toLowerCase()).digest('hex'),
        expires_at: payload.expires_at ? new Date(payload.expires_at).toISOString() : null,
        updated_at: new Date().toISOString(),
      };
      let query;
      if (action === 'create_memory') {
        query = await supabase.from('arc_personal_agent_memories').insert({ ...values, profile_id: profile.id, wallet_address: wallet, tag }).select('id').single();
      } else {
        const id = String(payload.id || '');
        if (!/^[0-9a-f-]{36}$/i.test(id)) fail('Select a valid memory.');
        query = await supabase.from('arc_personal_agent_memories').update(values).eq('id', id).eq('profile_id', profile.id).eq('wallet_address', wallet).eq('tag', tag).select('id').single();
      }
      if (query.error) fail('Memory could not be saved.', 503);
      await audit(profile, wallet, tag, action === 'create_memory' ? 'memory_created' : 'memory_updated', query.data.id);
      return res.status(200).json({ ok: true, id: query.data.id });
    }

    if (action === 'delete_memory' || action === 'delete_goal') {
      const id = String(payload.id || '');
      if (!/^[0-9a-f-]{36}$/i.test(id)) fail('Select a valid item.');
      const table = action === 'delete_memory' ? 'arc_personal_agent_memories' : 'arc_personal_agent_goals';
      const { data, error } = await supabase.from(table).delete().eq('id', id).eq('profile_id', profile.id).eq('wallet_address', wallet).eq('tag', tag).select('id').single();
      if (error || !data) fail('That item was not found.', 404);
      await audit(profile, wallet, tag, action === 'delete_memory' ? 'memory_deleted' : 'goal_deleted', id);
      return res.status(200).json({ ok: true });
    }

    if (action === 'clear_memories') {
      const { data, error } = await supabase.rpc('arc_personal_agent_clear_memories', { p_profile_id: profile.id, p_wallet: wallet, p_tag: tag });
      if (error) fail('Memories could not be cleared.', 503);
      await audit(profile, wallet, tag, 'memories_cleared');
      return res.status(200).json({ ok: true, deleted: Number(data) || 0 });
    }

    if (action === 'create_goal' || action === 'update_goal') {
      const values = {
        title: limited(payload.title, 120, 'Goal title', 2),
        description: limited(payload.description, 1200, 'Description'),
        next_action: limited(payload.next_action, 500, 'Next action'),
        status: validEnum(payload.status || 'active', ['active','paused','completed','archived'], 'Goal status'),
        target_date: payload.target_date ? limited(payload.target_date, 10, 'Target date') : null,
        updated_at: new Date().toISOString(),
      };
      let query;
      if (action === 'create_goal') query = await supabase.from('arc_personal_agent_goals').insert({ ...values, profile_id: profile.id, wallet_address: wallet, tag }).select('id').single();
      else {
        const id = String(payload.id || '');
        if (!/^[0-9a-f-]{36}$/i.test(id)) fail('Select a valid goal.');
        query = await supabase.from('arc_personal_agent_goals').update(values).eq('id', id).eq('profile_id', profile.id).eq('wallet_address', wallet).eq('tag', tag).select('id').single();
      }
      if (query.error) fail('Goal could not be saved.', 503);
      await audit(profile, wallet, tag, action === 'create_goal' ? 'goal_created' : 'goal_updated', query.data.id);
      return res.status(200).json({ ok: true, id: query.data.id });
    }
    return res.status(400).json({ ok: false, error: 'Choose a valid personal agent action.' });
  } catch (error) {
    const status = Number(error.status) || 400;
    if (status >= 500) console.error('[Personal Agent]', error.message);
    return res.status(status).json({ ok: false, error: error.message || 'Personal agent request failed.' });
  }
}
