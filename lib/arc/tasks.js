import { isAddress, verifyMessage } from 'viem';
import { createHash } from 'node:crypto';
import { readArcSession } from './session-auth.js';
import { supabase } from '../supabase.js';

const ARC_CHAIN_ID = 5042002;
const MAX_SIGNATURE_AGE_MS = 5 * 60 * 1000;
const DEMO_TASK_IDS = new Set([
  'b001', 'b002', 'b003', 'b004', 'b005', 'b006',
  'task_defillama_audit', 'task_meteo_delivery_clearance',
  'task_coingecko_fx_quote', 'task_agent_wallet_settlement',
]);

function respond(res, status, payload) {
  return res.status(status).json(payload);
}

function normalizeWallet(wallet) {
  return String(wallet || '').trim().toLowerCase();
}

const TASK_CATEGORIES = {
  dev: 'Engineering', design: 'Design', data: 'Data & AI', content: 'Content', test: 'Testing',
};

function normalizeTaskDetails(value = {}) {
  return {
    title: String(value.title || '').trim().slice(0, 120),
    category: String(value.category || ''),
    description: String(value.description || '').trim().slice(0, 2000),
    deliverable: String(value.deliverable || '').trim().slice(0, 500),
    rewardUSDC: Number(value.rewardUSDC),
    deadline: String(value.deadline || 'Open until closed').trim().slice(0, 80),
  };
}

function signedActionMessage({ action, taskId, walletAddress, timestamp, deliverable = '', task }) {
  const deliverableHash = action === 'submit'
    ? createHash('sha256').update(String(deliverable).trim(), 'utf8').digest('hex')
    : '';
  return [
    'NairaTag Arc Tasks',
    `Action: ${action}`,
    `Task: ${taskId}`,
    `Wallet: ${normalizeWallet(walletAddress)}`,
    `Chain: ${ARC_CHAIN_ID}`,
    `Timestamp: ${timestamp}`,
    ...(action === 'create' ? [`Task details SHA-256: ${createHash('sha256').update(JSON.stringify(task), 'utf8').digest('hex')}`] : []),
    ...(action === 'submit' ? [`Deliverable SHA-256: ${deliverableHash}`] : []),
  ].join('\n');
}

async function verifyWalletAction(req, body) {
  const walletAddress = String(body.walletAddress || '').trim();
  const timestamp = Number(body.timestamp);
  if (!isAddress(walletAddress) || !Number.isSafeInteger(timestamp)) {
    throw new Error('A valid wallet and recent task authorization are required.');
  }
  if (Math.abs(Date.now() - timestamp) > MAX_SIGNATURE_AGE_MS) {
    throw new Error('Task authorization expired. Please try again.');
  }
  const session = readArcSession(req);
  if (session) {
    if (session.walletAddress !== normalizeWallet(walletAddress))
      throw new Error('The signed-in account does not own this task wallet.');
    return { walletAddress: normalizeWallet(walletAddress), provider: session.provider || 'account' };
  }
  if (!body.signature) throw new Error('A valid wallet signature is required.');
  const message = signedActionMessage({
    action: body.action,
    taskId: body.taskId,
    walletAddress,
    timestamp,
    deliverable: body.deliverable,
    task: body.task,
  });
  const valid = await verifyMessage({ address: walletAddress, message, signature: body.signature });
  if (!valid) throw new Error('Wallet signature could not be verified.');
  return { walletAddress: normalizeWallet(walletAddress), provider: 'wallet' };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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
      .select('id, chain_id, title, description, category, category_label, creator_tag, deliverable, reward_usdc, reward_token, assigned_agent_tag, points, deadline_label, status, escrow_status, escrow_contract, created_at')
      .eq('chain_id', ARC_CHAIN_ID)
      .eq('status', 'open')
      .order('created_at', { ascending: false });
    if (error) return respond(res, 503, { ok: false, error: 'Arc task storage is unavailable.' });

    const visibleTasks = (tasks || []).filter((task) => !DEMO_TASK_IDS.has(String(task.id)));
    const visibleTaskIds = visibleTasks.map((task) => task.id);
    let earnedProgress = [];
    if (visibleTaskIds.length) {
      const { data: approvedProgress, error: countError } = await supabase.from('arc_task_progress')
        .select('task_id,wallet_address')
        .in('task_id', visibleTaskIds)
        .in('status', ['approved', 'paid'])
        .limit(10000);
      if (countError) return respond(res, 503, { ok: false, error: 'Arc task completion counts are unavailable.' });
      earnedProgress = approvedProgress || [];
    }
    const usersByTask = new Map();
    for (const completion of earnedProgress) {
      const users = usersByTask.get(completion.task_id) || new Set();
      users.add(normalizeWallet(completion.wallet_address));
      usersByTask.set(completion.task_id, users);
    }
    for (const task of visibleTasks) task.participant_count = usersByTask.get(task.id)?.size || 0;
    const wallet = normalizeWallet(req.query?.wallet);
    let progress = {};
    let taskHistory = [];
    if (wallet && isAddress(wallet)) {
      const { data: rows, error: progressError } = await supabase
        .from('arc_task_progress')
        .select('task_id, status, started_at, submitted_at, reviewed_at, updated_at')
        .eq('wallet_address', wallet)
        .order('updated_at', { ascending: false })
        .limit(500);
      if (progressError) return respond(res, 503, { ok: false, error: 'Arc task progress is unavailable.' });
      progress = Object.fromEntries((rows || []).map((row) => [row.task_id, row]));
      const openIds = new Set(visibleTasks.map((task) => task.id));
      const historyIds = [...new Set((rows || []).map((row) => row.task_id).filter((id) => !openIds.has(id)))];
      if (historyIds.length) {
        const { data: history, error: historyError } = await supabase.from('arc_tasks')
          .select('id, chain_id, title, description, category, category_label, creator_tag, deliverable, reward_usdc, reward_token, assigned_agent_tag, points, deadline_label, status, escrow_status, escrow_contract, created_at')
          .in('id', historyIds);
        if (historyError) return respond(res, 503, { ok: false, error: 'Arc task history is unavailable.' });
        taskHistory = (history || []).filter((task) => !DEMO_TASK_IDS.has(String(task.id)));
      }
    }
    return respond(res, 200, { ok: true, tasks: visibleTasks, taskHistory, progress });
  }

  if (req.method !== 'POST') return respond(res, 405, { ok: false, error: 'Method not allowed.' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const action = String(body.action || '');
    const taskId = String(body.taskId || '').trim();
    if (action === 'create') {
      if (!/^task_[a-f0-9-]{32,36}$/i.test(taskId)) return respond(res, 400, { ok: false, error: 'Task reference is invalid. Please try again.' });
      const task = normalizeTaskDetails(body.task);
      if (task.title.length < 4 || !TASK_CATEGORIES[task.category]) {
        return respond(res, 400, { ok: false, error: 'Add a task title and choose a valid category.' });
      }
      if (task.description.length < 10 || task.deliverable.length < 8) {
        return respond(res, 400, { ok: false, error: 'Describe the task and explain what counts as completion.' });
      }
      if (!Number.isFinite(task.rewardUSDC) || task.rewardUSDC <= 0 || task.rewardUSDC > 1000000
        || Math.abs(task.rewardUSDC * 1000000 - Math.round(task.rewardUSDC * 1000000)) > 0.000001) {
        return respond(res, 400, { ok: false, error: 'Enter a reward greater than zero with no more than six decimal places.' });
      }
      const authorization = await verifyWalletAction(req, { ...body, action, taskId, task });
      const walletAddress = authorization.walletAddress;
      const [ownedAgent, claimedTag] = await Promise.all([
        supabase.from('arc_agents').select('tag').eq('owner_wallet', walletAddress).eq('is_public', true).limit(1).maybeSingle(),
        supabase.from('user_claims').select('tag').ilike('wallet_address', walletAddress).maybeSingle(),
      ]);
      if (ownedAgent.error || claimedTag.error) return respond(res, 503, { ok: false, error: 'Your posting profile could not be verified. Please try again.' });
      const creatorTag = String(ownedAgent.data?.tag || claimedTag.data?.tag || `user-${walletAddress.slice(2, 10)}`)
        .trim().replace(/^[$₦@#]/, '').toLowerCase();
      const row = {
        id: taskId,
        chain_id: ARC_CHAIN_ID,
        title: task.title,
        description: task.description,
        category: task.category,
        category_label: TASK_CATEGORIES[task.category],
        creator_tag: creatorTag,
        creator_wallet: walletAddress,
        deliverable: task.deliverable,
        reward_usdc: task.rewardUSDC,
        reward_token: 'USDC',
        assigned_agent_tag: null,
        points: 0,
        deadline_label: task.deadline,
        status: 'open',
        escrow_status: 'not_integrated',
        escrow_contract: null,
      };
      const { data, error } = await supabase.from('arc_tasks').insert(row).select('*').single();
      if (error?.code === '23505') {
        const { data: existing, error: existingError } = await supabase.from('arc_tasks').select('*').eq('id', taskId).eq('creator_wallet', walletAddress).maybeSingle();
        if (!existingError && existing && existing.title === row.title && Number(existing.reward_usdc) === row.reward_usdc) {
          return respond(res, 200, { ok: true, task: existing });
        }
        return respond(res, 409, { ok: false, error: 'This task could not be posted twice. Refresh your tasks and try again.' });
      }
      if (error || !data) return respond(res, 503, { ok: false, error: 'Your task could not be saved. Please try again.' });
      return respond(res, 201, { ok: true, task: data });
    }
    if (!['start', 'submit'].includes(action) || !taskId) {
      return respond(res, 400, { ok: false, error: 'A valid task action and task ID are required.' });
    }
    const authorization = await verifyWalletAction(req, { ...body, action, taskId });
    const walletAddress = authorization.walletAddress;

    const { data: task, error: taskError } = await supabase
      .from('arc_tasks')
      .select('id, status')
      .eq('id', taskId)
      .eq('chain_id', ARC_CHAIN_ID)
      .maybeSingle();
    if (taskError) return respond(res, 503, { ok: false, error: 'Arc task storage is unavailable.' });
    if (!task || task.status !== 'open') return respond(res, 404, { ok: false, error: 'This Arc task is not open.' });

    if (action === 'start') {
      const existing = await supabase.from('arc_task_progress')
        .select('task_id, status, started_at, submitted_at, reviewed_at, updated_at')
        .eq('task_id', taskId).eq('wallet_address', walletAddress).maybeSingle();
      if (existing.error) return respond(res, 503, { ok: false, error: 'Could not load task progress.' });
      if (existing.data?.status === 'rejected') {
        const restarted = await supabase.from('arc_task_progress')
          .update({ status: 'in_progress', deliverable_submission: null, submitted_at: null, reviewed_at: null, started_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('task_id', taskId).eq('wallet_address', walletAddress).eq('status', 'rejected')
          .select('task_id, status, started_at, submitted_at, reviewed_at, updated_at').single();
        if (restarted.error) return respond(res, 503, { ok: false, error: 'Could not restart this task.' });
        return respond(res, 200, { ok: true, progress: restarted.data });
      }
      if (existing.data) return respond(res, 200, { ok: true, progress: existing.data });
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
        const current = await supabase.from('arc_task_progress')
          .select('task_id, status, started_at, submitted_at, reviewed_at, updated_at')
          .eq('task_id', taskId).eq('wallet_address', walletAddress).single();
        if (current.error) return respond(res, 503, { ok: false, error: 'Could not load task progress.' });
        return respond(res, 200, { ok: true, progress: current.data });
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
    const { error: notificationError } = await supabase.from('arc_reward_notifications').insert({
      wallet_address: walletAddress,
      title: 'Task proof submitted',
      body: 'Your proof was saved. You will receive a notification when the task team reviews it.',
      type: 'task',
      action_label: 'View task',
      url: '/#tasks',
    });
    if (notificationError) console.warn('[Arc task notification]', notificationError.message);
    if (authorization.provider === 'circle') {
      const digest = createHash('sha256').update(deliverable, 'utf8').digest('hex');
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (botToken) {
        const channel = process.env.TELEGRAM_CHANNEL_ID || '-1003984230029';
        const alert = [
          'NairaTag task submission (Circle email session)',
          `Wallet: ${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`,
          `Task: ${taskId}`,
          `Deliverable SHA-256: ${digest}`,
          'Submission saved; pending task-owner review.',
          'Arc Testnet - https://arc.nairatag.ng/#tasks',
        ].join('\n');
        try {
          const telegram = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: channel, text: alert, disable_web_page_preview: true }),
            signal: AbortSignal.timeout(8000),
          });
          if (!telegram.ok) console.warn('[Arc task alert] Telegram delivery failed.');
        } catch {
          console.warn('[Arc task alert] Telegram delivery failed.');
        }
      }
    }
    return respond(res, 200, { ok: true, progress: data });
  } catch (error) {
    return respond(res, 400, { ok: false, error: error.message || 'Task action failed.' });
  }
}
