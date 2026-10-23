import { createPublicClient, decodeEventLog, defineChain, http, isAddress, keccak256, parseAbi, parseUnits, stringToHex, verifyMessage } from 'viem';
import { randomUUID } from 'node:crypto';
import { supabase } from '../supabase.js';

const CHAIN_ID = 5042002;
const ARC_USDC = '0x3600000000000000000000000000000000000000';
const arcClient = createPublicClient({ chain: defineChain({ id: CHAIN_ID, name: 'Arc Testnet', nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: 18 }, rpcUrls: { default: { http: [process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.io'] } } }), transport: http(process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.io') });
const transferAbi = parseAbi(['event Transfer(address indexed from,address indexed to,uint256 value)']);
const WALLET_SET = () => String(process.env.ARC_AGENT_ADMIN_WALLETS || '').split(',').map((v) => v.trim().toLowerCase()).filter(Boolean);
const respond = (res, status, payload) => res.status(status).json(payload);
const cleanWallet = (value) => String(value || '').trim().toLowerCase();

async function authorize(body, action, payload) {
  const address = String(body.walletAddress || '').trim();
  const timestamp = Number(body.timestamp);
  const signature = String(body.signature || '');
  if (!isAddress(address) || !WALLET_SET().includes(address.toLowerCase()) || !Number.isFinite(timestamp)
    || Math.abs(Date.now() - timestamp) > 5 * 60 * 1000 || !/^0x[0-9a-f]{130}$/i.test(signature)) return false;
  const message = ['NairaTag Platform Agent Admin', `Action: ${action}`, `Wallet: ${address.toLowerCase()}`,
    `Timestamp: ${timestamp}`, `Payload hash: ${keccak256(stringToHex(JSON.stringify(payload)))}`].join('\n');
  try { return await verifyMessage({ address, message, signature }); } catch { return false; }
}

async function verifyVoucherClaim(body) {
  const address = String(body.walletAddress || '').trim();
  const timestamp = Number(body.timestamp);
  if (!isAddress(address) || !body.signature || !Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > 5 * 60 * 1000) return false;
  const message = ['NairaTag Arc Vouchers', 'Action: claim_voucher', `Voucher: ${String(body.voucherId || '')}`,
    `Wallet: ${address.toLowerCase()}`, `Chain: ${CHAIN_ID}`, `Timestamp: ${timestamp}`, `Proof: ${String(body.proof || '')}`].join('\n');
  try { return await verifyMessage({ address, message, signature: body.signature }); } catch { return false; }
}

async function verifyClaimList(query) {
  const address = String(query.walletAddress || '').trim();
  const timestamp = Number(query.timestamp);
  if (!isAddress(address) || !query.signature || !Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > 5 * 60 * 1000) return false;
  const message = ['NairaTag Arc Vouchers', 'Action: list_claims', `Wallet: ${address.toLowerCase()}`, `Chain: ${CHAIN_ID}`, `Timestamp: ${timestamp}`].join('\n');
  try { return await verifyMessage({ address, message, signature: query.signature }); } catch { return false; }
}

async function listUserVoucherClaims(walletAddress) {
  const { data, error } = await supabase.from('arc_voucher_claims')
    .select('id,voucher_id,wallet_address,proof,status,created_at,reviewed_at,arc_vouchers(title,points)')
    .eq('wallet_address', cleanWallet(walletAddress)).order('created_at', { ascending: false });
  if (error) throw new Error('Voucher claim records are unavailable.');
  return data || [];
}

async function submitVoucherClaim(body) {
  const voucherId = String(body.voucherId || '').trim();
  const proof = String(body.proof || '').trim().slice(0, 1000);
  if (!/^[a-z0-9_-]{3,64}$/i.test(voucherId) || proof.length < 3) throw new Error('Task completion details are required.');
  const { data: voucher, error: voucherError } = await supabase.from('arc_vouchers').select('id,title,status').eq('id', voucherId).maybeSingle();
  if (voucherError || !voucher || voucher.status !== 'active') throw new Error('This voucher task is not available.');
  const { data, error } = await supabase.from('arc_voucher_claims').insert({ voucher_id: voucherId, wallet_address: cleanWallet(body.walletAddress), proof, status: 'pending' }).select('id,voucher_id,wallet_address,status,created_at').single();
  if (error?.code === '23505') throw new Error('You already submitted this voucher task.');
  if (error || !data) throw new Error('Your voucher task submission could not be saved.');
  return data;
}

async function loadDashboard() {
  const [tasks, progress, vouchers, claims, referrals, rewards, agents, payouts] = await Promise.all([
    supabase.from('arc_tasks').select('*').eq('chain_id', CHAIN_ID).order('created_at', { ascending: false }),
    supabase.from('arc_task_progress').select('task_id,wallet_address,status,deliverable_submission,started_at,submitted_at,reviewed_at,updated_at').order('updated_at', { ascending: false }).limit(1000),
    supabase.from('arc_vouchers').select('*').order('created_at', { ascending: false }),
    supabase.from('arc_voucher_claims').select('id,voucher_id,wallet_address,proof,status,created_at,reviewed_at').order('created_at', { ascending: false }).limit(1000),
    supabase.from('arc_referrals').select('referred_wallet,referrer_wallet,referrer_tag,referred_tag,signup_points,payment_points,first_payment_hash,created_at,first_payment_at').order('created_at', { ascending: false }).limit(1000),
    supabase.from('arc_reward_events').select('wallet_address,event_type,points,idempotency_key,metadata,created_at').order('created_at', { ascending: false }).limit(500),
    supabase.from('arc_agents').select('tag,display_name,status,is_public').order('tag', { ascending: true }),
    supabase.from('arc_task_payouts').select('*').order('paid_at', { ascending: false }).limit(1000),
  ]);
  const failed = [tasks, progress, vouchers, claims, referrals, rewards, agents, payouts].find((item) => item.error);
  if (failed) throw new Error(failed.error.message || 'Admin data could not be loaded.');
  return { tasks: tasks.data || [], progress: progress.data || [], vouchers: vouchers.data || [], claims: claims.data || [], referrals: referrals.data || [], rewards: rewards.data || [], agents: agents.data || [], payouts: payouts.data || [] };
}

async function updateTask(body) {
  const id = String(body.task?.id || `admin-${randomUUID()}`).trim();
  const task = body.task || {};
  if (!/^[a-z0-9_-]{3,64}$/i.test(id) || String(task.title || '').trim().length < 4) throw new Error('Task ID and title are required.');
  const assignedAgentTag = String(task.assignedAgentTag || task.assigned_agent_tag || '').trim().replace(/^[?$@#]/, '').toLowerCase() || null;
  if (assignedAgentTag) {
    const { data: assignedAgent, error: agentError } = await supabase.from('arc_agents').select('tag').eq('tag', assignedAgentTag).eq('is_public', true).maybeSingle();
    if (agentError || !assignedAgent) throw new Error('Choose a published agent tag for this task.');
  }
  const row = {
    id, chain_id: CHAIN_ID, title: String(task.title).trim().slice(0, 120), description: String(task.description || '').trim().slice(0, 2000),
    category: String(task.category || 'community').trim().slice(0, 40), category_label: String(task.categoryLabel || task.category || 'Community').trim().slice(0, 60),
    creator_tag: 'NAIRATAG_ADMIN', creator_wallet: cleanWallet(body.walletAddress), deliverable: String(task.deliverable || '').trim().slice(0, 500),
    reward_usdc: Math.max(0, Number(task.rewardUSDC ?? task.reward_usdc) || 0), reward_token: 'USDC', assigned_agent_tag: assignedAgentTag, points: Math.max(0, Math.floor(Number(task.points) || 0)),
    deadline_label: String(task.deadline || '').trim().slice(0, 80), status: ['open', 'closed', 'completed'].includes(task.status) ? task.status : 'open',
    escrow_status: 'not_integrated', escrow_contract: null, updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from('arc_tasks').upsert(row, { onConflict: 'id' }).select('*').single();
  if (error) throw new Error('Task could not be saved.');
  return data;
}

async function reviewTask(body) {
  const taskId = String(body.taskId || '').trim();
  const walletAddress = cleanWallet(body.userWallet);
  const status = body.status;
  if (!taskId || !isAddress(walletAddress) || !['approved', 'rejected'].includes(status)) throw new Error('A valid task submission review is required.');
  const { data, error } = await supabase.rpc('arc_admin_review_task', { p_task_id: taskId, p_wallet: walletAddress, p_status: status });
  if (error || !data) throw new Error(error?.message || 'Task submission review could not be saved.');
  return data;
}

async function recordTaskPayout(body) {
  const taskId = String(body.taskId || '').trim();
  const walletAddress = cleanWallet(body.userWallet);
  const transactionHash = String(body.transactionHash || '').trim();
  const adminWallet = cleanWallet(body.walletAddress);
  if (!taskId || !isAddress(walletAddress) || !/^0x[0-9a-f]{64}$/i.test(transactionHash)) throw new Error('A task, recipient wallet, and valid Arc transaction hash are required.');
  if (!WALLET_SET().includes(adminWallet)) throw new Error('The connected admin wallet is not authorized to pay task rewards.');
  const { data: task, error: taskError } = await supabase.from('arc_tasks')
    .select('id,assigned_agent_tag,reward_usdc,reward_token').eq('id', taskId).maybeSingle();
  if (taskError || !task || !task.assigned_agent_tag) throw new Error('Assign this task to an agent before recording its payout.');
  if (task.reward_token !== 'USDC' || Number(task.reward_usdc) <= 0) throw new Error('This task has no payable USDC reward.');
  const { data: progress, error: progressError } = await supabase.from('arc_task_progress')
    .select('status').eq('task_id', taskId).eq('wallet_address', walletAddress).maybeSingle();
  if (progressError || progress?.status !== 'approved') throw new Error('Approve the task submission before recording its payout.');
  let tx, receipt;
  try {
    [tx, receipt] = await Promise.all([
      arcClient.getTransaction({ hash: transactionHash }),
      arcClient.getTransactionReceipt({ hash: transactionHash }),
    ]);
  } catch { throw new Error('The transaction could not be found on Arc Testnet.'); }
  if (receipt.status !== 'success' || tx.from.toLowerCase() !== adminWallet) throw new Error('The transaction must succeed on Arc Testnet and be sent by the authorized admin wallet.');
  const transfers = [];
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== ARC_USDC || log.topics[0]?.toLowerCase() !== '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') continue;
    try {
      const decoded = decodeEventLog({ abi: transferAbi, data: log.data, topics: log.topics });
      if (String(decoded.args.from).toLowerCase() === adminWallet && String(decoded.args.to).toLowerCase() === walletAddress) transfers.push({ amount: decoded.args.value, logIndex: log.logIndex });
    } catch {}
  }
  const expected = parseUnits(String(Number(task.reward_usdc)), 6);
  const matching = transfers.filter((transfer) => transfer.amount === expected);
  if (matching.length !== 1) throw new Error(`Send exactly ${task.reward_usdc} USDC from the admin wallet to the submitting wallet in this transaction.`);
  const { data, error } = await supabase.rpc('arc_admin_record_task_payout', {
    p_task_id: taskId, p_wallet: walletAddress, p_agent_tag: task.assigned_agent_tag, p_amount: Number(task.reward_usdc),
    p_transaction_hash: transactionHash.toLowerCase(), p_log_index: matching[0].logIndex, p_verified_by: adminWallet,
  });
  if (error || !data) throw new Error(error?.message || 'Verified payout could not be saved.');
  return data;
}

async function updateVoucher(body) {
  const voucher = body.voucher || {};
  const id = String(voucher.id || `admin-${randomUUID()}`).trim();
  if (!/^[a-z0-9_-]{3,64}$/i.test(id) || String(voucher.title || '').trim().length < 4) throw new Error('Voucher ID and title are required.');
  const { data, error } = await supabase.from('arc_vouchers').upsert({
    id, title: String(voucher.title).trim().slice(0, 120), description: String(voucher.description || '').trim().slice(0, 2000),
    category: String(voucher.category || 'community').trim().slice(0, 40), points: Math.max(0, Math.floor(Number(voucher.points) || 0)),
    action_url: String(voucher.actionUrl || '').trim().slice(0, 500), status: ['active', 'paused', 'retired'].includes(voucher.status) ? voucher.status : 'active', updated_at: new Date().toISOString(),
  }, { onConflict: 'id' }).select('*').single();
  if (error) throw new Error('Voucher offer could not be saved.');
  return data;
}

async function grantPoints(body, adminWallet) {
  const target = cleanWallet(body.userWallet);
  const points = Number(body.points);
  const reason = String(body.reason || '').trim().slice(0, 300);
  const requestId = String(body.requestId || '').trim();
  if (!isAddress(target) || !Number.isInteger(points) || points < 1 || points > 100000 || reason.length < 4 || !/^[a-z0-9_-]{8,80}$/i.test(requestId)) {
    throw new Error('Enter a valid wallet, 1–100,000 points, a reason, and a unique grant reference.');
  }
  const { data, error } = await supabase.rpc('arc_admin_credit_points', {
    p_wallet: target, p_points: points, p_key: `admin:${requestId}`, p_event: 'admin_grant', p_metadata: { reason, grantedBy: adminWallet },
  });
  if (error || data !== true) throw new Error(error?.message || 'Reward grant could not be recorded.');
  return { walletAddress: target, points, requestId };
}

async function reviewVoucher(body, adminWallet) {
  const claimId = String(body.claimId || '');
  const status = body.status;
  if (!/^[0-9a-f-]{36}$/i.test(claimId) || !['approved', 'rejected'].includes(status)) throw new Error('A valid voucher claim review is required.');
  const { data, error: updateError } = await supabase.rpc('arc_admin_review_voucher', { p_claim_id: claimId, p_status: status, p_admin: adminWallet });
  if (updateError || !data) throw new Error(updateError?.message || 'Voucher claim status could not be updated.');
  return data;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!process.env.SUPABASE_SECRET_KEY) return respond(res, 503, { ok: false, error: 'Arc admin storage credentials are not configured.' });
  try {
    if (req.method === 'GET') {
      if (req.query?.action === 'claims') {
        if (!(await verifyClaimList(req.query))) return respond(res, 401, { ok: false, error: 'Sign with your wallet to load voucher claims.' });
        return respond(res, 200, { ok: true, claims: await listUserVoucherClaims(req.query.walletAddress) });
      }
      const auth = { walletAddress: req.query?.walletAddress, timestamp: req.query?.timestamp, signature: req.query?.signature };
      const action = 'dashboard'; const payload = { action };
      if (!(await authorize(auth, action, payload))) return respond(res, 401, { ok: false, error: 'Connect an authorized admin wallet to load operational data.' });
      return respond(res, 200, { ok: true, dashboard: await loadDashboard() });
    }
    if (req.method !== 'POST') return respond(res, 405, { ok: false, error: 'Method not allowed.' });
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const action = String(body.action || '');
    if (action === 'claim_voucher') {
      if (!(await verifyVoucherClaim(body))) return respond(res, 401, { ok: false, error: 'Sign in with the wallet that completed this task.' });
      return respond(res, 200, { ok: true, result: await submitVoucherClaim(body) });
    }
    const payload = Object.fromEntries(Object.entries(body).filter(([key]) => !['walletAddress', 'timestamp', 'signature'].includes(key)));
    if (!(await authorize(body, action, payload))) return respond(res, 401, { ok: false, error: 'This operation is not authorized for the connected wallet.' });
    let result;
    if (action === 'save_task') result = await updateTask(body);
    else if (action === 'review_task') result = await reviewTask(body);
    else if (action === 'record_task_payout') result = await recordTaskPayout(body);
    else if (action === 'save_voucher') result = await updateVoucher(body);
    else if (action === 'review_voucher') result = await reviewVoucher(body, cleanWallet(body.walletAddress));
    else if (action === 'grant_points') result = await grantPoints(body, cleanWallet(body.walletAddress));
    else return respond(res, 400, { ok: false, error: 'Choose a supported admin operation.' });
    return respond(res, 200, { ok: true, result });
  } catch (error) {
    return respond(res, error.status || 400, { ok: false, error: error.message || 'Arc admin operation failed.' });
  }
}
