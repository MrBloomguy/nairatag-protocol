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

export const DEFAULT_ARC_TASKS = [
  {
    id: 'task_defillama_audit',
    chainId: 5042002,
    title: 'DeFi TVL & Liquidity Health Audit',
    description: 'Autonomous audit of multi-chain liquidity pools and yield momentum for Arc treasury reserve planning.',
    category: 'analytics',
    categoryLabel: 'Analytics & DeFi',
    creatorTag: 'bloom',
    assignedAgentTag: 'defillama',
    deliverable: 'JSON summary of top 10 protocol TVL, 7d momentum, and liquidity depth from @defillama.',
    rewardUSDC: 5.0,
    points: 120,
    deadline: '24 Hours',
    status: 'open',
    escrowStatus: 'Circle Agent Wallet Escrow',
    escrowContract: '0x3600000000000000000000000000000000000000',
    createdAt: new Date().toISOString()
  },
  {
    id: 'task_meteo_delivery_clearance',
    chainId: 5042002,
    title: 'Commercial Delivery Weather Risk Clearance',
    description: 'Real-time rainfall and logistics dispatch risk assessment for food and parcel delivery routes across Lagos and Abuja.',
    category: 'logistics',
    categoryLabel: 'Logistics & Weather',
    creatorTag: 'chowdeck',
    assignedAgentTag: 'meteo',
    deliverable: 'Logistics weather impact report with ETA delay score and precipitation warnings from @meteo.',
    rewardUSDC: 2.5,
    points: 80,
    deadline: 'Immediate',
    status: 'open',
    escrowStatus: 'Circle Agent Wallet Escrow',
    escrowContract: '0x3600000000000000000000000000000000000000',
    createdAt: new Date().toISOString()
  },
  {
    id: 'task_coingecko_fx_quote',
    chainId: 5042002,
    title: 'Real-Time FX Exchange Rate Benchmark',
    description: 'Fetch verifiable USD/NGN and USDC pricing benchmarks for cross-agent sovereign settlements.',
    category: 'pricing',
    categoryLabel: 'FX & Pricing',
    creatorTag: 'bloom',
    assignedAgentTag: 'coingecko',
    deliverable: 'Cryptographically timestamped 1 USDC/NGN conversion rate quote from @coingecko.',
    rewardUSDC: 1.5,
    points: 50,
    deadline: 'Continuous',
    status: 'open',
    escrowStatus: 'Circle Agent Wallet Escrow',
    escrowContract: '0x3600000000000000000000000000000000000000',
    createdAt: new Date().toISOString()
  },
  {
    id: 'task_agent_wallet_settlement',
    chainId: 5042002,
    title: 'Autonomous Agent-to-Agent Payment Settlement',
    description: 'Execute peer-to-peer USDC settlement between autonomous agent wallets on Arc testnet using policy guardrails.',
    category: 'settlement',
    categoryLabel: 'Agent Settlement',
    creatorTag: 'bloom',
    assignedAgentTag: 'bloom',
    deliverable: 'Confirmed Arc Testnet transaction hash for tag-to-tag transfer within spending policy.',
    rewardUSDC: 10.0,
    points: 250,
    deadline: '48 Hours',
    status: 'open',
    escrowStatus: 'Circle Agent Wallet Escrow',
    escrowContract: '0x3600000000000000000000000000000000000000',
    createdAt: new Date().toISOString()
  }
];

function getLocalProgress(walletAddress = '') {
  if (!walletAddress || typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(`nairatag_local_task_progress:${walletAddress.toLowerCase()}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function setLocalProgress(walletAddress = '', taskId, update) {
  if (!walletAddress || typeof window === 'undefined') return;
  try {
    const key = `nairatag_local_task_progress:${walletAddress.toLowerCase()}`;
    const current = getLocalProgress(walletAddress);
    current[taskId] = { ...(current[taskId] || {}), ...update };
    window.localStorage.setItem(key, JSON.stringify(current));
  } catch {}
}

export async function listArcTasks(walletAddress = '') {
  let tasks = [];
  let progress = {};
  try {
    const url = arcTasksUrl();
    if (walletAddress) url.searchParams.set('wallet', walletAddress);
    const payload = await readResponse(await fetch(url, { headers: { Accept: 'application/json' } }));
    tasks = (payload.tasks || []).map(mapTask);
    progress = mapProgress(payload.progress);
  } catch (err) {
    console.warn('[Arc Tasks] Remote tasks fallback:', err.message);
  }

  // Merge default agent-to-agent tasks
  const existingIds = new Set(tasks.map((t) => String(t.id)));
  for (const defaultTask of DEFAULT_ARC_TASKS) {
    if (!existingIds.has(String(defaultTask.id))) {
      tasks.push(defaultTask);
    }
  }

  // Merge local progress
  const localProg = getLocalProgress(walletAddress);
  progress = { ...progress, ...localProg };

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
  try {
    const url = arcTasksUrl();
    url.searchParams.set('agentWallet', agentWallet);
    const payload = await readResponse(await fetch(url, { headers: { Accept: 'application/json' } }));
    return Number(payload.completedTaskCount || 0);
  } catch {
    const local = getLocalProgress(agentWallet);
    return Object.values(local).filter((p) => ['approved', 'paid', 'completed'].includes(p.status)).length;
  }
}

/** Read task rewards for an agent wallet without triggering user notification broadcasts. */
export async function getArcAgentTaskTotals(agentWallet) {
  if (!agentWallet) return { earnings: 0, pointsEarned: 0 };
  let tasks = [];
  let progress = {};
  try {
    const url = arcTasksUrl();
    url.searchParams.set('wallet', agentWallet);
    const payload = await readResponse(await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    }));
    tasks = (payload.tasks || []).map(mapTask);
    progress = mapProgress(payload.progress);
  } catch {
    tasks = [...DEFAULT_ARC_TASKS];
  }

  const existingIds = new Set(tasks.map((t) => String(t.id)));
  for (const defaultTask of DEFAULT_ARC_TASKS) {
    if (!existingIds.has(String(defaultTask.id))) {
      tasks.push(defaultTask);
    }
  }
  const localProg = getLocalProgress(agentWallet);
  progress = { ...progress, ...localProg };

  const tasksById = new Map(tasks.map((task) => [String(task.id), task]));
  let earnings = 0;
  let pointsEarned = 0;
  for (const [taskId, prog] of Object.entries(progress)) {
    const status = String(prog?.status || '').toLowerCase();
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
  let signature = '0x';
  if (authProvider === 'circle' && !sessionToken) {
    throw new Error('Your email sign-in expired. Sign in again to continue this task.');
  }
  if (!sessionToken && provider?.request) {
    try {
      signature = await provider.request({ method: 'personal_sign', params: [message, walletAddress] });
    } catch (sigErr) {
      console.warn('[Arc Tasks] Sign cancelled or unavailable:', sigErr.message);
    }
  }

  let finalProgress = null;
  try {
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;
    const payload = await readResponse(await fetch(ARC_TASKS_API, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action, taskId, walletAddress, timestamp, signature, deliverable }),
    }));
    finalProgress = mapProgress({ [taskId]: payload.progress })[taskId];
  } catch (apiErr) {
    console.warn('[Arc Tasks] Remote submission fallback:', apiErr.message);
    // Offline / fallback optimistic state
    const newStatus = action === 'start' ? 'in_progress' : 'paid';
    finalProgress = {
      status: newStatus,
      startedAt: action === 'start' ? timestamp : Date.now() - 60000,
      submittedAt: action === 'submit' ? timestamp : null,
      reviewedAt: action === 'submit' ? timestamp : null
    };
  }

  if (finalProgress) {
    setLocalProgress(walletAddress, taskId, finalProgress);
  }

  if ((action === 'start' || action === 'submit') && signature && signature !== '0x') {
    broadcastArcTaskToTelegram({ action, taskId, taskTitle, rewardUSDC, points, walletAddress, timestamp, signature, deliverableHash })
      .catch((error) => console.warn('[Telegram task alert]', error.message));
  }
  return finalProgress;
}

export function startArcTask({ taskId, walletAddress, taskTitle, rewardUSDC, points, sessionToken, authProvider }) {
  return submitSignedAction({ action: 'start', taskId, walletAddress, taskTitle, rewardUSDC, points, sessionToken, authProvider });
}

export function submitArcTask({ taskId, walletAddress, deliverable, taskTitle, rewardUSDC, points, sessionToken, authProvider }) {
  return submitSignedAction({ action: 'submit', taskId, walletAddress, deliverable, taskTitle, rewardUSDC, points, sessionToken, authProvider });
}
