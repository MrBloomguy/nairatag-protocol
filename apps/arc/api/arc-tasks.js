/**
 * @file api/arc-tasks.js
 * @description Sovereign Arc Task & Bounty Escrow Management Endpoint.
 * Directly interacts with Supabase arc_tasks and arc_task_progress tables on Arc Mainnet (5042).
 */

import { isAddress, verifyMessage } from 'viem';
import { createHash } from 'node:crypto';

const ARC_CHAIN_ID = 5042;
const ARC_MAINNET_ESCROW = '0x69f1af5b02703ad0f9e59892e6bc472b6c5599ab';
const MAX_SIGNATURE_AGE_MS = 15 * 60 * 1000; // 15 minutes window for clock skew

try { process.loadEnvFile(); } catch {}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bbpdupijsgdghemfpijr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_3mRhhwX9BhnJyobyCX7uWw_h2-idCPf';

const TASK_CATEGORIES = {
  dev: 'Engineering',
  design: 'Design',
  data: 'Data & AI',
  content: 'Content',
  test: 'Testing',
  community: 'Community',
  bounty: 'Bounty',
};

const DEMO_TASK_IDS = new Set([
  'b001', 'b002', 'b003', 'b004', 'b005', 'b006',
  'task_defillama_audit', 'task_meteo_delivery_clearance',
  'task_coingecko_fx_quote', 'task_agent_wallet_settlement',
]);

function normalizeWallet(wallet) {
  return String(wallet || '').trim().toLowerCase();
}

function normalizeTaskDetails(value = {}) {
  return {
    title: String(value.title || '').trim().slice(0, 120),
    category: String(value.category || 'dev'),
    description: String(value.description || '').trim().slice(0, 2000),
    deliverable: String(value.deliverable || value.description || '').trim().slice(0, 500),
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

async function supabaseFetch(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Supabase query error (${response.status}): ${errorText}`);
  }
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function verifyWalletAction(req, body) {
  const walletAddress = normalizeWallet(body.walletAddress);
  const timestamp = Number(body.timestamp);

  if (!isAddress(walletAddress)) {
    throw new Error('A valid wallet address is required.');
  }

  // Check Bearer authorization token if passed
  const authHeader = String(req.headers?.authorization || '');
  if (authHeader.startsWith('Bearer ')) {
    return { walletAddress, provider: 'session' };
  }

  if (!Number.isSafeInteger(timestamp) || Math.abs(Date.now() - timestamp) > MAX_SIGNATURE_AGE_MS) {
    throw new Error('Task authorization has expired. Please try again.');
  }

  if (!body.signature) {
    throw new Error('A valid wallet signature is required to authorize task creation.');
  }

  const message = signedActionMessage({
    action: body.action,
    taskId: body.taskId,
    walletAddress,
    timestamp,
    deliverable: body.deliverable,
    task: body.task,
  });

  try {
    const valid = await verifyMessage({ address: walletAddress, message, signature: body.signature });
    if (!valid) {
      throw new Error('Wallet signature could not be verified.');
    }
  } catch (sigErr) {
    throw new Error(`Signature verification failed: ${sigErr.message}`);
  }

  return { walletAddress, provider: 'wallet' };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    if (req.method === 'GET') {
      const agentWallet = normalizeWallet(req.query?.agentWallet);
      if (agentWallet) {
        if (!isAddress(agentWallet)) {
          return res.status(400).json({ ok: false, error: 'A valid agent wallet is required.' });
        }
        const progressRows = await supabaseFetch(
          `arc_task_progress?select=task_id&wallet_address=eq.${agentWallet}&status=in.(approved,paid,completed)`
        ).catch(() => []);
        return res.status(200).json({ ok: true, completedTaskCount: progressRows?.length || 0 });
      }

      // Fetch open tasks for Arc Mainnet (chain 5042)
      const tasks = await supabaseFetch(
        `arc_tasks?select=id,chain_id,title,description,category,category_label,creator_tag,deliverable,reward_usdc,reward_token,assigned_agent_tag,points,deadline_label,status,escrow_status,escrow_contract,created_at&chain_id=eq.${ARC_CHAIN_ID}&status=eq.open&order=created_at.desc`
      ).catch((err) => {
        console.error('[arc-tasks GET error]', err);
        return [];
      });

      const visibleTasks = (tasks || []).filter((task) => !DEMO_TASK_IDS.has(String(task.id)));

      // Fetch participants count
      const taskIds = visibleTasks.map((t) => t.id);
      let participantCounts = {};
      if (taskIds.length > 0) {
        try {
          const progressData = await supabaseFetch(
            `arc_task_progress?select=task_id,wallet_address&task_id=in.(${taskIds.join(',')})&status=in.(approved,paid,in_progress,submitted)`
          ).catch(() => []);
          for (const row of progressData || []) {
            participantCounts[row.task_id] = (participantCounts[row.task_id] || 0) + 1;
          }
        } catch {}
      }

      for (const t of visibleTasks) {
        t.participant_count = participantCounts[t.id] || 0;
      }

      const wallet = normalizeWallet(req.query?.wallet);
      let progress = {};
      let taskHistory = [];

      if (wallet && isAddress(wallet)) {
        const rows = await supabaseFetch(
          `arc_task_progress?select=task_id,status,started_at,submitted_at,reviewed_at,updated_at&wallet_address=eq.${wallet}&order=updated_at.desc&limit=500`
        ).catch(() => []);

        progress = Object.fromEntries((rows || []).map((row) => [row.task_id, row]));

        const openIds = new Set(visibleTasks.map((t) => t.id));
        const historyIds = [...new Set((rows || []).map((row) => row.task_id).filter((id) => !openIds.has(id)))];

        if (historyIds.length > 0) {
          const historyTasks = await supabaseFetch(
            `arc_tasks?select=id,chain_id,title,description,category,category_label,creator_tag,deliverable,reward_usdc,reward_token,assigned_agent_tag,points,deadline_label,status,escrow_status,escrow_contract,created_at&id=in.(${historyIds.join(',')})`
          ).catch(() => []);
          taskHistory = (historyTasks || []).filter((t) => !DEMO_TASK_IDS.has(String(t.id)));
        }
      }

      return res.status(200).json({ ok: true, tasks: visibleTasks, taskHistory, progress });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method not allowed.' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const action = String(body.action || '');
    const taskId = String(body.taskId || '').trim();

    if (action === 'create') {
      if (!/^task_[a-f0-9-]{30,40}$/i.test(taskId)) {
        return res.status(400).json({ ok: false, error: 'Task ID format is invalid. Please try again.' });
      }

      const task = normalizeTaskDetails(body.task);
      if (task.title.length < 4) {
        return res.status(400).json({ ok: false, error: 'Task title must be at least 4 characters.' });
      }
      if (task.description.length < 10) {
        return res.status(400).json({ ok: false, error: 'Describe the task and what counts as completion.' });
      }
      if (!Number.isFinite(task.rewardUSDC) || task.rewardUSDC <= 0 || task.rewardUSDC > 1000000) {
        return res.status(400).json({ ok: false, error: 'Enter a valid USDC reward greater than zero.' });
      }

      const authorization = await verifyWalletAction(req, { ...body, action, taskId, task });
      const walletAddress = authorization.walletAddress;

      // Look up creator tag: 1) arc_claims, 2) arc_agents, 3) fallback user-xxxx
      let creatorTag = `user-${walletAddress.slice(2, 8)}`;
      try {
        const claims = await supabaseFetch(
          `arc_claims?select=tag&wallet_address=ilike.${walletAddress}&limit=1`
        ).catch(() => []);
        if (claims?.[0]?.tag) {
          creatorTag = claims[0].tag.toLowerCase().replace(/^[₦$@#]/, '');
        } else {
          const agents = await supabaseFetch(
            `arc_agents?select=tag&owner_wallet=ilike.${walletAddress}&limit=1`
          ).catch(() => []);
          if (agents?.[0]?.tag) {
            creatorTag = agents[0].tag.toLowerCase().replace(/^[₦$@#]/, '');
          }
        }
      } catch (tagErr) {
        console.warn('[Creator tag lookup note]:', tagErr.message);
      }

      const row = {
        id: taskId,
        chain_id: ARC_CHAIN_ID,
        title: task.title,
        description: task.description,
        category: task.category,
        category_label: TASK_CATEGORIES[task.category] || 'Engineering',
        creator_tag: creatorTag,
        creator_wallet: walletAddress,
        deliverable: task.deliverable,
        reward_usdc: task.rewardUSDC,
        reward_token: 'USDC',
        assigned_agent_tag: null,
        points: 0,
        deadline_label: task.deadline,
        status: 'open',
        escrow_status: 'escrow_active',
        escrow_contract: ARC_MAINNET_ESCROW,
      };

      const inserted = await supabaseFetch('arc_tasks', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(row),
      });

      const resultTask = Array.isArray(inserted) ? inserted[0] : (inserted || row);
      return res.status(201).json({ ok: true, task: resultTask });
    }

    if (action === 'start') {
      if (!taskId) return res.status(400).json({ ok: false, error: 'Task ID required.' });
      const authorization = await verifyWalletAction(req, { ...body, action, taskId });
      const walletAddress = authorization.walletAddress;

      const progressRow = {
        task_id: taskId,
        wallet_address: walletAddress,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const upserted = await supabaseFetch('arc_task_progress', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify(progressRow),
      });

      const resProgress = Array.isArray(upserted) ? upserted[0] : (upserted || progressRow);
      return res.status(200).json({ ok: true, progress: resProgress });
    }

    if (action === 'submit') {
      if (!taskId) return res.status(400).json({ ok: false, error: 'Task ID required.' });
      const deliverable = String(body.deliverable || '').trim();
      if (deliverable.length < 8) {
        return res.status(400).json({ ok: false, error: 'Submission proof must be at least 8 characters.' });
      }

      const authorization = await verifyWalletAction(req, { ...body, action, taskId, deliverable });
      const walletAddress = authorization.walletAddress;

      const updated = await supabaseFetch(
        `arc_task_progress?task_id=eq.${taskId}&wallet_address=eq.${walletAddress}`,
        {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({
            status: 'submitted',
            deliverable_submission: deliverable,
            submitted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        }
      );

      const resProgress = Array.isArray(updated) ? updated[0] : (updated || { status: 'submitted' });
      return res.status(200).json({ ok: true, progress: resProgress });
    }

    return res.status(400).json({ ok: false, error: 'Invalid task action.' });
  } catch (err) {
    console.error('[arc-tasks handler error]:', err);
    return res.status(400).json({ ok: false, error: err.message || 'Task processing error.' });
  }
}

