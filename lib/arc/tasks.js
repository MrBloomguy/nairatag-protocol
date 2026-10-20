import { isAddress, verifyMessage } from 'viem';
import { supabase } from '../supabase.js';

const ARC_CHAIN_ID = 5042002;
const MAX_SIGNATURE_AGE_MS = 5 * 60 * 1000;

function respond(res, status, payload) {
  return res.status(status).json(payload);
}

function normalizeWallet(wallet) {
  return String(wallet || '').trim().toLowerCase();
}

function signedActionMessage({ action, taskId, walletAddress, timestamp }) {
  return [
    'NairaTag Arc Tasks',
    `Action: ${action}`,
    `Task: ${taskId}`,
    `Wallet: ${normalizeWallet(walletAddress)}`,
    `Chain: ${ARC_CHAIN_ID}`,
    `Timestamp: ${timestamp}`
  ].join('\n');
}

async function verifyWalletAction(body) {
  const walletAddress = String(body.walletAddress || '').trim();
  const timestamp = Number(body.timestamp);
  if (!isAddress(walletAddress) || !body.signature || !Number.isFinite(timestamp)) {
    throw new Error('A valid wallet, timestamp, and wallet signature are required.');
  }
  if (Math.abs(Date.now() - timestamp) > MAX_SIGNATURE_AGE_MS) {
    throw new Error('Wallet signature expired. Please try again.');
  }
  const message = signedActionMessage({
    action: body.action,
    taskId: body.taskId,
    walletAddress,
    timestamp
  });
  const valid = await verifyMessage({ address: walletAddress, message, signature: body.signature });
  if (!valid) throw new Error('Wallet signature could not be verified.');
  return normalizeWallet(walletAddress);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (!process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return respond(res, 503, { ok: false, error: 'Arc task storage is not configured.' });
  }
  if (!process.env.SUPABASE_SECRET_KEY) {
    return respond(res, 503, { ok: false, error: 'Arc task storage credentials are not configured.' });
  }

  if (req.method === 'GET') {
    const agentWallet = normalizeWallet(req.query?.agentWallet);
    if (agentWallet) {
      if (!isAddress(agentWallet)) return respond(res, 400, { ok: false, error: 'A valid agent wallet is required.' });
      const { count, error } = await supabase
        .from('arc_task_progress')
        .select('task_id', { count: 'exact', head: true })
        .eq('wallet_address', agentWallet)
        .in('status', ['approved', 'paid']);
      if (error) return respond(res, 503, { ok: false, error: 'Arc task statistics are unavailable.' });
      return respond(res, 200, { ok: true, completedTaskCount: count || 0 });
    }

    const { data: tasks, error } = await supabase
      .from('arc_tasks')
      .select('id, chain_id, title, description, category, category_label, creator_tag, deliverable, reward_usdc, points, deadline_label, status, escrow_status, escrow_contract, created_at')
      .eq('chain_id', ARC_CHAIN_ID)
      .eq('status', 'open')
      .order('created_at', { ascending: false });
    if (error) return respond(res, 503, { ok: false, error: 'Arc task storage is unavailable.' });

    const wallet = normalizeWallet(req.query?.wallet);
    let progress = {};
    if (wallet && isAddress(wallet) && tasks?.length) {
      const { data: rows, error: progressError } = await supabase
        .from('arc_task_progress')
        .select('task_id, status, started_at, submitted_at, reviewed_at, updated_at')
        .eq('wallet_address', wallet)
        .in('task_id', tasks.map((task) => task.id));
      if (progressError) return respond(res, 503, { ok: false, error: 'Arc task progress is unavailable.' });
      progress = Object.fromEntries((rows || []).map((row) => [row.task_id, row]));
    }
    return respond(res, 200, { ok: true, tasks: tasks || [], progress });
  }

  if (req.method !== 'POST') return respond(res, 405, { ok: false, error: 'Method not allowed.' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const action = String(body.action || '');
    const taskId = String(body.taskId || '').trim();
    if (!['start', 'submit'].includes(action) || !taskId) {
      return respond(res, 400, { ok: false, error: 'A valid task action and task ID are required.' });
    }
    const walletAddress = await verifyWalletAction({ ...body, action, taskId });

    const { data: task, error: taskError } = await supabase
      .from('arc_tasks')
      .select('id, status')
      .eq('id', taskId)
      .eq('chain_id', ARC_CHAIN_ID)
      .maybeSingle();
    if (taskError) return respond(res, 503, { ok: false, error: 'Arc task storage is unavailable.' });
    if (!task || task.status !== 'open') return respond(res, 404, { ok: false, error: 'This Arc task is not open.' });

    if (action === 'start') {
      const { data, error } = await supabase
        .from('arc_task_progress')
        .upsert({
          task_id: taskId,
          wallet_address: walletAddress,
          status: 'in_progress',
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'task_id,wallet_address', ignoreDuplicates: true })
        .select('task_id, status, started_at, submitted_at, reviewed_at, updated_at')
        .maybeSingle();
      if (error) return respond(res, 503, { ok: false, error: 'Could not save task start.' });
      if (!data) {
        const existing = await supabase.from('arc_task_progress')
          .select('task_id, status, started_at, submitted_at, reviewed_at, updated_at')
          .eq('task_id', taskId).eq('wallet_address', walletAddress).single();
        if (existing.error) return respond(res, 503, { ok: false, error: 'Could not load task progress.' });
        return respond(res, 200, { ok: true, progress: existing.data });
      }
      return respond(res, 200, { ok: true, progress: data });
    }

    const deliverable = String(body.deliverable || '').trim();
    if (deliverable.length < 8 || deliverable.length > 10000) {
      return respond(res, 400, { ok: false, error: 'Submission must be between 8 and 10,000 characters.' });
    }
    const { data, error } = await supabase
      .from('arc_task_progress')
      .update({ status: 'submitted', deliverable_submission: deliverable, submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('task_id', taskId)
      .eq('wallet_address', walletAddress)
      .eq('status', 'in_progress')
      .select('task_id, status, started_at, submitted_at, reviewed_at, updated_at')
      .maybeSingle();
    if (error) return respond(res, 503, { ok: false, error: 'Could not save task submission.' });
    if (!data) return respond(res, 409, { ok: false, error: 'Start this task before submitting work.' });
    return respond(res, 200, { ok: true, progress: data });
  } catch (error) {
    return respond(res, 400, { ok: false, error: error.message || 'Task action failed.' });
  }
}
