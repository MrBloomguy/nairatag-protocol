import { isAddress } from 'viem';
import { supabase } from '../lib/supabase.js';
import { registerClaim, getClaimRecord } from './claims.js';

function respond(res, status, payload) {
  return res.status(status).json(payload);
}

function unavailable(res, feature) {
  return respond(res, 503, { ok: false, error: feature + ' is unavailable because its live provider is not configured.' });
}

function wallet(value) {
  return String(value || '').trim().toLowerCase();
}

function cleanTag(value) {
  return String(value || '').trim().replace(/^[₦@#]/, '').toLowerCase();
}

async function listPublishedAgents() {
  const { data, error } = await supabase
    .from('arc_agents')
    .select('id, tag, display_name, category, description, avatar_url, status, owner_wallet')
    .eq('is_public', true)
    .in('status', ['active', 'chat_only'])
    .order('tag');
  if (error) throw new Error('Agent directory is unavailable.');
  const agents = data || [];
  if (!agents.length) return [];
  const { data: tools, error: toolsError } = await supabase
    .from('arc_agent_tools')
    .select('agent_id, tool_key, display_name, description, availability, availability_reason')
    .in('agent_id', agents.map((agent) => agent.id));
  if (toolsError) throw new Error('Agent capabilities are unavailable.');
  const byAgent = new Map();
  for (const tool of tools || []) {
    const rows = byAgent.get(tool.agent_id) || [];
    rows.push(tool);
    byAgent.set(tool.agent_id, rows);
  }
  return agents.map((agent) => ({
    tag: '₦' + agent.tag.toUpperCase(),
    name: agent.display_name,
    category: agent.category,
    description: agent.description,
    avatarUrl: agent.avatar_url || null,
    status: agent.status,
    address: agent.owner_wallet || null,
    capabilities: (byAgent.get(agent.id) || []).map((tool) => ({
      key: tool.tool_key,
      name: tool.display_name,
      description: tool.description,
      availability: tool.availability,
      availabilityReason: tool.availability_reason || null,
    })),
  }));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const url = new URL(req.url, 'https://' + (req.headers.host || 'localhost'));
  const path = url.pathname;
  const query = url.searchParams;

  if (!process.env.SUPABASE_SECRET_KEY && !path.includes('/muse-spark')) {
    return respond(res, 503, { ok: false, error: 'NairaTag database access is not configured.' });
  }

  if (path.includes('/wallet-info')) {
    const tagParam = query.get('tag');
    const addressParam = query.get('address');
    if (!tagParam && !addressParam) return respond(res, 400, { ok: false, error: 'Supply a NairaTag or wallet address.' });
    if (addressParam && !isAddress(addressParam)) return respond(res, 400, { ok: false, error: 'A valid wallet address is required.' });
    try {
      const claim = tagParam
        ? await getClaimRecord(cleanTag(tagParam))
        : await getClaimRecord(wallet(addressParam));
      if (!claim) return respond(res, 404, { ok: false, address: null, error: 'No registered NairaTag was found.' });
      return respond(res, 200, {
        ok: true,
        tag: claim.tag,
        address: claim.address,
        network: claim.network || null,
      });
    } catch {
      return respond(res, 503, { ok: false, error: 'NairaTag registry is unavailable.' });
    }
  }

  if (path.includes('/tags/claim') || path.includes('/claim-tag')) {
    if (req.method !== 'POST') return respond(res, 405, { ok: false, error: 'Method not allowed.' });
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const claim = await registerClaim({
        tag: body.tag || body.handle,
        walletAddress: body.walletAddress || body.account,
        network: body.network,
        txHash: body.txHash,
        signature: body.signature,
        nonce: body.nonce,
        deadline: body.deadline,
        action: body.action,
        chainId: body.chainId,
        verifyingContract: body.verifyingContract,
      });
      return respond(res, 201, { ok: true, claim, tag: claim.tag, cleanTag: claim.cleanTag, walletAddress: claim.address });
    } catch (error) {
      return respond(res, 400, { ok: false, error: error.message || 'Claim could not be completed.' });
    }
  }

  if (path.includes('/bounties')) {
    if (req.method !== 'GET') return unavailable(res, 'Legacy bounty writes and settlement');
    try {
      const { data, error } = await supabase.from('arc_tasks')
        .select('id, title, description, category, reward_usdc, reward_token, status, assigned_agent_tag, deliverable, deadline_label, created_at')
        .in('chain_id', [5042, 5042002]).eq('status', 'open').order('created_at', { ascending: false });
      if (error) throw error;
      const bounties = (data || []).map((task) => ({
        id: task.id, title: task.title, description: task.description, category: task.category,
        reward: Number(task.reward_usdc) || 0, token: task.reward_token || 'USDC',
        status: task.status, assigned_agent: task.assigned_agent_tag || null,
        deliverable: task.deliverable, deadline: task.deadline_label,
      }));
      return respond(res, 200, { ok: true, bounties });
    } catch {
      return unavailable(res, 'Arc task storage');
    }
  }

  if (path.includes('/agents')) {
    try { return respond(res, 200, { ok: true, agents: await listPublishedAgents() }); }
    catch { return unavailable(res, 'Agent directory'); }
  }

  if (path.includes('/leaderboard')) {
    const period = query.get('period') || req.query?.period || 'alltime';
    const category = query.get('category') || req.query?.category || 'all';
    try {
      const agents = await listPublishedAgents();
      const { data: payouts, error } = await supabase.from('arc_task_payouts')
        .select('agent_tag, amount, paid_at').order('paid_at', { ascending: false }).limit(5000);
      if (error) throw error;
      const now = Date.now();
      const cutoff = period === 'today' ? now - 86400000 : period === 'weekly' ? now - 7 * 86400000 : period === 'monthly' ? now - 30 * 86400000 : 0;
      const earnings = new Map();
      for (const payout of payouts || []) {
        const tag = String(payout.agent_tag).toLowerCase();
        if (category !== 'all' && !agents.find((agent) => cleanTag(agent.tag) === tag && agent.category === category)) continue;
        if (new Date(payout.paid_at).getTime() < cutoff) continue;
        earnings.set(tag, (earnings.get(tag) || 0) + (Number(payout.amount) || 0));
      }
      const leaderboard = agents.filter((agent) => category === 'all' || agent.category === category)
        .map((agent) => ({ ...agent, earnings: earnings.get(cleanTag(agent.tag)) || 0, totalEarnings: earnings.get(cleanTag(agent.tag)) || 0 }))
        .sort((a, b) => b.earnings - a.earnings)
        .map((agent, index) => ({ ...agent, rank: index + 1 }));
      return respond(res, 200, { ok: true, period, category, leaderboard });
    } catch {
      return unavailable(res, 'Verified Arc payout history');
    }
  }

  if (path.includes('/activity') || path.includes('/activities')) {
    try {
      const { data, error } = await supabase.from('arc_reward_events')
        .select('id, wallet_address, event_type, points, metadata, created_at')
        .order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      const activities = (data || []).map((event) => ({
        id: event.id, type: event.event_type, walletAddress: event.wallet_address,
        points: Number(event.points) || 0, metadata: event.metadata || {}, createdAt: event.created_at,
      }));
      return respond(res, 200, { ok: true, events: activities, activities });
    } catch {
      return unavailable(res, 'Activity history');
    }
  }

  if (path.includes('/tag2tag')) return unavailable(res, 'Legacy Tag2Tag settlement');

  if (path.includes('/muse-spark')) {
    const apiKey = process.env.GEMINI_API_KEY;
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (!apiKey) return unavailable(res, 'AI chat provider');
    if (!body.prompt || typeof body.prompt !== 'string') return respond(res, 400, { ok: false, error: 'A prompt is required.' });
    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=' + encodeURIComponent(apiKey), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: 'You are the NairaTag assistant. Do not claim to check registry data, make payments, issue vouchers, or perform account actions. Direct users to the app for actions requiring live data.' }] },
          contents: [{ role: 'user', parts: [{ text: body.prompt.slice(0, 8000) }] }],
          generationConfig: { maxOutputTokens: 400, temperature: 0.4 },
        }),
      });
      if (!response.ok) return unavailable(res, 'AI chat provider');
      const result = await response.json();
      const replyText = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!replyText) return unavailable(res, 'AI chat provider');
      return respond(res, 200, { ok: true, intent: 'GENERAL_CHAT', model: 'Gemini 2.5 Flash-Lite', replyText });
    } catch {
      return unavailable(res, 'AI chat provider');
    }
  }

  return respond(res, 404, { ok: false, error: 'Endpoint not found on NairaTag Hub API.' });
}