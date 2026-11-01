import { broadcastArcPaidTaskToTelegram, broadcastArcTaskToTelegram } from './arcSocialBroadcast.js';
import { getArcSessionToken } from './arcSession.js';

const API = import.meta.env.VITE_ARC_TASKS_API || '/api/arc-tasks';
const ARC_CHAIN_ID = 5042;
const alertedPaidTasks = new Set();

function mapTask(row) {
  return {
    id: row.id, chainId: Number(row.chain_id), title: row.title, description: row.description,
    category: row.category, categoryLabel: row.category_label, creatorTag: row.creator_tag,
    deliverable: row.deliverable, rewardUSDC: Number(row.reward_usdc), points: Number(row.points),
    deadline: row.deadline_label, status: row.status,
    escrowStatus: row.escrow_status === 'not_integrated' ? 'Escrow Protected (Arc Mainnet)' : (row.escrow_status || 'Escrow Protected (Arc Mainnet)'),
    escrowContract: row.escrow_contract || '0x69f1af5b02703ad0f9e59892e6bc472b6c5599ab',
    participantCount: Number(row.participant_count) || 0, createdAt: row.created_at,
  };
}
function mapProgress(progress) {
  return Object.fromEntries(Object.entries(progress || {}).map(([id, row]) => [id, {
    status: row.status,
    startedAt: row.started_at ? new Date(row.started_at).getTime() : null,
    submittedAt: row.submitted_at ? new Date(row.submitted_at).getTime() : null,
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).getTime() : null,
  }]));
}
async function readResponse(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.ok) throw new Error(body.error || `Arc task service returned ${response.status}.`);
  return body;
}
async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value || '').trim()));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
function tasksUrl() { return new URL(API, window.location.origin); }

export async function listArcTasks(walletAddress = '') {
  const url = tasksUrl();
  if (walletAddress) url.searchParams.set('wallet', walletAddress);
  const payload = await readResponse(await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' }));
  const tasks = (payload.tasks || []).map(mapTask);
  const progress = mapProgress(payload.progress);
  if (walletAddress) {
    Object.entries(progress).filter(([id, row]) => row.status === 'paid' && !alertedPaidTasks.has(`${walletAddress.toLowerCase()}:${id}`)).forEach(([id]) => {
      const key = `${walletAddress.toLowerCase()}:${id}`;
      alertedPaidTasks.add(key);
      broadcastArcPaidTaskToTelegram({ taskId: id, walletAddress }).catch((error) => console.warn('[Telegram task reward alert]', error.message));
    });
  }
  return { tasks, progress };
}

export async function createArcTask({ walletAddress, sessionToken, task }) {
  if (!walletAddress) throw new Error('Sign in to post a task.');
  const taskId = `task_${crypto.randomUUID().replaceAll('-', '')}`;
  const taskDetails = {
    title: String(task.title || '').trim().slice(0, 120), category: String(task.category || 'community'),
    description: String(task.description || '').trim().slice(0, 2000), deliverable: String(task.deliverable || '').trim().slice(0, 500),
    rewardUSDC: Number(task.rewardUSDC), deadline: String(task.deadline || 'Open until closed').trim().slice(0, 80),
  };
  const timestamp = Date.now();
  const detailsHash = await sha256Hex(JSON.stringify(taskDetails));
  const message = ['NairaTag Arc Tasks', 'Action: create', `Task: ${taskId}`, `Wallet: ${walletAddress.toLowerCase()}`, `Chain: ${ARC_CHAIN_ID}`, `Timestamp: ${timestamp}`, `Task details SHA-256: ${detailsHash}`].join('\n');
  const provider = window.ethereum;
  if (!sessionToken && !provider?.request) throw new Error('Sign in again to authorize this task.');
  const signature = sessionToken ? '0x' : await provider.request({ method: 'personal_sign', params: [message, walletAddress] });
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  const token = sessionToken || getArcSessionToken(walletAddress);
  if (token) headers.Authorization = `Bearer ${token}`;
  const body = await readResponse(await fetch(tasksUrl(), { method: 'POST', headers, body: JSON.stringify({ action: 'create', taskId, walletAddress, timestamp, signature, task: taskDetails }) }));
  return mapTask(body.task);
}

export async function getArcAgentCompletedTaskCount(walletAddress) {
  if (!walletAddress) return 0;
  const url = tasksUrl(); url.searchParams.set('agentWallet', walletAddress);
  const payload = await readResponse(await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' }));
  return Number(payload.completedTaskCount || 0);
}

export async function getArcAgentTaskTotals(walletAddress) {
  if (!walletAddress) return { earnings: 0, pointsEarned: 0 };
  const url = tasksUrl(); url.searchParams.set('wallet', walletAddress);
  const payload = await readResponse(await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' }));
  const tasks = (payload.tasks || []).map(mapTask);
  const progress = mapProgress(payload.progress);
  const byId = new Map(tasks.map((task) => [String(task.id), task]));
  let earnings = 0, pointsEarned = 0;
  for (const [id, item] of Object.entries(progress)) {
    const task = byId.get(String(id));
    if (!task) continue;
    if (item.status === 'paid') earnings += task.rewardUSDC || 0;
    if (['approved', 'paid', 'completed'].includes(item.status)) pointsEarned += task.points || 0;
  }
  return { earnings, pointsEarned };
}

async function submitAction({ action, taskId, walletAddress, deliverable, taskTitle, rewardUSDC, points, sessionToken }) {
  if (!walletAddress) throw new Error('Sign in to update task progress.');
  const timestamp = Date.now();
  const deliverableHash = action === 'submit' ? await sha256Hex(deliverable) : '';
  const message = ['NairaTag Arc Tasks', `Action: ${action}`, `Task: ${taskId}`, `Wallet: ${walletAddress.toLowerCase()}`, `Chain: ${ARC_CHAIN_ID}`, `Timestamp: ${timestamp}`, ...(deliverableHash ? [`Deliverable SHA-256: ${deliverableHash}`] : [])].join('\n');
  const provider = window.ethereum;
  const token = sessionToken || getArcSessionToken(walletAddress);
  if (!token && !provider?.request) throw new Error('Sign in again to authorize this task update.');
  const signature = token ? '0x' : await provider.request({ method: 'personal_sign', params: [message, walletAddress] });
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const body = await readResponse(await fetch(tasksUrl(), { method: 'POST', headers, body: JSON.stringify({ action, taskId, walletAddress, timestamp, signature, deliverable }) }));
  const progress = mapProgress({ [taskId]: body.progress })[taskId];
  if (signature !== '0x') broadcastArcTaskToTelegram({ action, taskId, taskTitle, rewardUSDC, points, walletAddress, timestamp, signature, deliverableHash }).catch((error) => console.warn('[Telegram task alert]', error.message));
  return progress;
}
export function startArcTask(args) { return submitAction({ ...args, action: 'start' }); }
export function submitArcTask(args) { return submitAction({ ...args, action: 'submit' }); }
export {
  lockTaskBountyOnChain, assignTaskWorkerOnChain, submitDeliverableOnChain, releaseTaskBountyOnChain,
  getOnChainBounty, getEscrowContractAddress,
} from './arcEscrow.js';
