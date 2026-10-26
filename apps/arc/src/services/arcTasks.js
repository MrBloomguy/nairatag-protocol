import { broadcastArcPaidTaskToTelegram, broadcastArcTaskToTelegram } from './arcSocialBroadcast.js';
const ARC_TASKS_API = import.meta.env.VITE_ARC_TASKS_API || (import.meta.env.DEV ? '/api/arc-tasks' : 'https://old.nairatag.ng/api/arc-tasks');
const ARC_CHAIN_ID = 5042002;

function arcTasksUrl() {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://old.nairatag.ng';
  return new URL(ARC_TASKS_API, base);
}

function mapTask(row) {
  return {
    id: row.id,
    chainId: Number(row.chain_id),
    title: row.title,
    description: row.description,
    category: row.category,
    categoryLabel: row.category_label,
    creatorTag: row.creator_tag,
    deliverable: row.deliverable,
    rewardUSDC: Number(row.reward_usdc),
    points: Number(row.points),
    deadline: row.deadline_label,
    status: row.status,
    escrowStatus: row.escrow_status === 'not_integrated' ? 'Arc escrow contract not connected' : row.escrow_status,
    escrowContract: row.escrow_contract || null,
    createdAt: row.created_at,
  };
}

function mapProgress(progress) {
  return Object.fromEntries(Object.entries(progress || {}).map(([taskId, row]) => [taskId, {
    status: row.status,
    startedAt: row.started_at ? new Date(row.started_at).getTime() : null,
    submittedAt: row.submitted_at ? new Date(row.submitted_at).getTime() : null,
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).getTime() : null,
  }]));
}

async function readResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || `Arc task service returned ${response.status}.`);
  }
  return payload;
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(String(value || '').trim());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function listArcTasks(walletAddress = '') {
  const url = arcTasksUrl();
  if (walletAddress) url.searchParams.set('wallet', walletAddress);
  const payload = await readResponse(await fetch(url, { headers: { Accept: 'application/json' } }));
  const tasks = (payload.tasks || []).map(mapTask);
  const progress = mapProgress(payload.progress);
  if (walletAddress && typeof window !== 'undefined') {
    const storageKey = `nairatag_paid_task_alerts_v1:${walletAddress.toLowerCase()}`;
    let alerted = [];
    try { alerted = JSON.parse(window.localStorage.getItem(storageKey) || '[]'); } catch { alerted = []; }
    Object.entries(progress).filter(([taskId, row]) => row.status === 'paid' && !alerted.includes(taskId)).forEach(([taskId]) => {
      broadcastArcPaidTaskToTelegram({ taskId, walletAddress }).then(() => {
        alerted = [...new Set([...alerted, taskId])];
        window.localStorage.setItem(storageKey, JSON.stringify(alerted));
      }).catch((error) => console.warn('[Telegram task reward alert]', error.message));
    });
  }
  return { tasks, progress };
}

export async function getArcAgentCompletedTaskCount(agentWallet) {
  const url = arcTasksUrl();
  url.searchParams.set('agentWallet', agentWallet);
  const payload = await readResponse(await fetch(url, { headers: { Accept: 'application/json' } }));
  return Number(payload.completedTaskCount || 0);
}

/** Read task rewards for an agent wallet without triggering user notification broadcasts. */
export async function getArcAgentTaskTotals(agentWallet) {
  if (!agentWallet) return { earnings: 0, pointsEarned: 0 };
  const url = arcTasksUrl();
  url.searchParams.set('wallet', agentWallet);
  const payload = await readResponse(await fetch(url, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  }));
  const tasksById = new Map((payload.tasks || []).map((task) => [String(task.id), task]));
  let earnings = 0;
  let pointsEarned = 0;
  for (const [taskId, progress] of Object.entries(payload.progress || {})) {
    const status = String(progress?.status || '').toLowerCase();
    const task = tasksById.get(String(taskId));
    if (!task) continue;
    if (status === 'paid') earnings += Number(task.reward_usdc ?? task.rewardUSDC) || 0;
    if (['approved', 'paid', 'completed'].includes(status)) pointsEarned += Number(task.points) || 0;
  }
  return { earnings, pointsEarned };
}

async function submitSignedAction({ action, taskId, walletAddress, deliverable, taskTitle, rewardUSDC, points, sessionToken, authProvider }) {
  const provider = typeof window !== 'undefined' ? window.ethereum : null;
  const deliverableHash = action === 'submit' ? await sha256Hex(deliverable) : '';
  const timestamp = Date.now();
  const message = [
    'NairaTag Arc Tasks',
    `Action: ${action}`,
    `Task: ${taskId}`,
    `Wallet: ${walletAddress.toLowerCase()}`,
    `Chain: ${ARC_CHAIN_ID}`,
    `Timestamp: ${timestamp}`,
    ...(action === 'submit' ? [`Deliverable SHA-256: ${deliverableHash}`] : []),
  ].join('\n');
  let signature;
  if (authProvider === 'circle' && !sessionToken) {
    throw new Error('Your email sign-in expired. Sign in again to continue this task.');
  }
  if (!sessionToken) {
    if (!provider?.request) throw new Error('Sign in again to authorize this task action.');
    signature = await provider.request({ method: 'personal_sign', params: [message, walletAddress] });
  }
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;
  const payload = await readResponse(await fetch(ARC_TASKS_API, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, taskId, walletAddress, timestamp, signature, deliverable }),
  }));
  if ((action === 'start' || action === 'submit') && signature) {
    broadcastArcTaskToTelegram({ action, taskId, taskTitle, rewardUSDC, points, walletAddress, timestamp, signature, deliverableHash })
      .catch((error) => console.warn('[Telegram task alert]', error.message));
  }
  return mapProgress({ [taskId]: payload.progress })[taskId];
}

export function startArcTask({ taskId, walletAddress, taskTitle, rewardUSDC, points, sessionToken, authProvider }) {
  return submitSignedAction({ action: 'start', taskId, walletAddress, taskTitle, rewardUSDC, points, sessionToken, authProvider });
}

export function submitArcTask({ taskId, walletAddress, deliverable, taskTitle, rewardUSDC, points, sessionToken, authProvider }) {
  return submitSignedAction({ action: 'submit', taskId, walletAddress, deliverable, taskTitle, rewardUSDC, points, sessionToken, authProvider });
}
