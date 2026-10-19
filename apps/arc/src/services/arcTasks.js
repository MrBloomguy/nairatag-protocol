const ARC_TASKS_API = import.meta.env.VITE_ARC_TASKS_API || 'https://nairatag.ng/api/arc-tasks';
const ARC_CHAIN_ID = 5042002;

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

export async function listArcTasks(walletAddress = '') {
  const url = new URL(ARC_TASKS_API);
  if (walletAddress) url.searchParams.set('wallet', walletAddress);
  const payload = await readResponse(await fetch(url, { headers: { Accept: 'application/json' } }));
  return { tasks: (payload.tasks || []).map(mapTask), progress: mapProgress(payload.progress) };
}

export async function getArcAgentCompletedTaskCount(agentWallet) {
  const url = new URL(ARC_TASKS_API);
  url.searchParams.set('agentWallet', agentWallet);
  const payload = await readResponse(await fetch(url, { headers: { Accept: 'application/json' } }));
  return Number(payload.completedTaskCount || 0);
}

async function submitSignedAction({ action, taskId, walletAddress, deliverable }) {
  const provider = typeof window !== 'undefined' ? window.ethereum : null;
  if (!provider?.request) throw new Error('A compatible wallet is required to sign this task action.');
  const timestamp = Date.now();
  const message = [
    'NairaTag Arc Tasks',
    `Action: ${action}`,
    `Task: ${taskId}`,
    `Wallet: ${walletAddress.toLowerCase()}`,
    `Chain: ${ARC_CHAIN_ID}`,
    `Timestamp: ${timestamp}`,
  ].join('\n');
  const signature = await provider.request({ method: 'personal_sign', params: [message, walletAddress] });
  const payload = await readResponse(await fetch(ARC_TASKS_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ action, taskId, walletAddress, timestamp, signature, deliverable }),
  }));
  return mapProgress({ [taskId]: payload.progress })[taskId];
}

export function startArcTask({ taskId, walletAddress }) {
  return submitSignedAction({ action: 'start', taskId, walletAddress });
}

export function submitArcTask({ taskId, walletAddress, deliverable }) {
  return submitSignedAction({ action: 'submit', taskId, walletAddress, deliverable });
}
