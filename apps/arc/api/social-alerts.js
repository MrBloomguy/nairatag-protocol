import { recoverMessageAddress, isAddress, createPublicClient, http, parseAbiItem, decodeEventLog } from 'viem';
import { IN_HOUSE_TASKS as CLIENT_IN_HOUSE_TASKS } from '../src/services/inHouseTasks.js';

const REGISTRY = '0x034f64b644988406ded382ebabb5c981bd19684a';
const ARC_CHAIN_ID = 5042002;
const TAG_CLAIMED_EVENT = parseAbiItem('event TagClaimed(bytes32 indexed node, string canonical, string rawTag, address indexed owner, address resolver)');
const IN_HOUSE_TASKS = Object.fromEntries(CLIENT_IN_HOUSE_TASKS.map((task) => [task.id, { title: task.title, reward: task.voucherValue }]));
const seenSignatures = new Map();

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let text = '';
  for await (const chunk of req) {
    text += chunk;
    if (text.length > 12_000) throw new Error('Request too large.');
  }
  try { return text ? JSON.parse(text) : {}; } catch { throw new Error('Invalid JSON body.'); }
}

function cleanText(value, max = 140) {
  return String(value || '').replace(/[<>\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function shortAddress(address) { return `${address.slice(0, 6)}…${address.slice(-4)}`; }

function getSignedFields(body) {
  return {
    ...(body.tag ? { tag: String(body.tag).trim().replace(/^[$₦@#]/, '').toLowerCase() } : {}),
    ...(body.referrerTag ? { referrerTag: String(body.referrerTag).trim().replace(/^[$₦@#]/, '').toLowerCase() } : {}),
    ...(body.txHash ? { txHash: String(body.txHash).toLowerCase() } : {}),
    ...(body.requestId ? { requestId: body.requestId } : {}),
    ...(body.ids ? { ids: body.ids.join(',') } : {}),
  };
}

function taskMessage(body) {
  return [
    'NairaTag Arc Tasks',
    `Action: ${body.action}`,
    `Task: ${body.taskId}`,
    `Wallet: ${body.walletAddress.toLowerCase()}`,
    `Chain: ${ARC_CHAIN_ID}`,
    `Timestamp: ${body.timestamp}`,
  ].join('\n');
}

function rewardMessage(body) {
  return [
    'NairaTag Arc Rewards',
    `Action: ${body.action}`,
    `Wallet: ${body.walletAddress.toLowerCase()}`,
    `Chain: ${ARC_CHAIN_ID}`,
    `Timestamp: ${body.timestamp}`,
    ...Object.entries(getSignedFields(body)).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}: ${value}`),
  ].join('\n');
}

async function verifyTaskAccepted(body) {
  const url = new URL('https://nairatag.ng/api/arc-tasks');
  url.searchParams.set('wallet', body.walletAddress);
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  const payload = await response.json().catch(() => ({}));
  const status = payload.progress?.[body.taskId]?.status;
  const acceptedStatuses = body.action === 'start'
    ? ['in_progress', 'submitted', 'paid']
    : body.action === 'paid' ? ['paid'] : ['submitted', 'paid'];
  if (!response.ok || !payload.ok || !acceptedStatuses.includes(status)) {
    throw new Error('The Arc task service has not recorded this task update yet.');
  }
  const task = (payload.tasks || []).find((item) => String(item.id) === String(body.taskId));
  return task ? { title: cleanText(task.title), rewardUSDC: Number(task.reward_usdc) || 0, points: Number(task.points) || 0, status } : null;
}

function voucherMessage(body) {
  return [
    'NairaTag Social Alerts',
    'Action: voucher_claimed',
    `Task: ${body.taskId}`,
    `Wallet: ${body.walletAddress.toLowerCase()}`,
    `Chain: ${ARC_CHAIN_ID}`,
    `Timestamp: ${body.timestamp}`,
  ].join('\n');
}

async function verifyWalletSignature(body, message) {
  const timestamp = Number(body.timestamp);
  if (!Number.isSafeInteger(timestamp) || Math.abs(Date.now() - timestamp) > 5 * 60_000) {
    throw new Error('This social alert request expired.');
  }
  if (!isAddress(body.walletAddress) || !/^0x[a-f\d]{130}$/i.test(String(body.signature || ''))) {
    throw new Error('A valid wallet signature is required.');
  }
  const recovered = await recoverMessageAddress({ message, signature: body.signature });
  if (recovered.toLowerCase() !== body.walletAddress.toLowerCase()) throw new Error('The alert signature does not match this wallet.');
  const now = Date.now();
  for (const [signature, expires] of seenSignatures) if (expires < now) seenSignatures.delete(signature);
  if (seenSignatures.has(body.signature)) throw new Error('This alert was already sent.');
  return body.signature;
}

async function verifyTagClaim(body) {
  if (!isAddress(body.owner) || !/^0x[a-f\d]{64}$/i.test(String(body.txHash || ''))) throw new Error('A valid tag-claim transaction is required.');
  const client = createPublicClient({ transport: http(process.env.ARC_TESTNET_RPC_URL || 'https://rpc.testnet.arc.io') });
  if (await client.getChainId() !== ARC_CHAIN_ID) throw new Error('The configured RPC is not Arc Testnet.');
  const receipt = await client.getTransactionReceipt({ hash: body.txHash });
  if (receipt.status !== 'success') throw new Error('The tag-claim transaction did not succeed.');
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== REGISTRY.toLowerCase()) continue;
    try {
      const event = decodeEventLog({ abi: [TAG_CLAIMED_EVENT], data: log.data, topics: log.topics });
      const eventTag = event.args.canonical || event.args.rawTag;
      if (event.eventName === 'TagClaimed' && event.args.owner.toLowerCase() === body.owner.toLowerCase() && eventTag.toLowerCase() === String(body.tag || '').toLowerCase()) {
        return { tag: eventTag, txHash: body.txHash, owner: body.owner, explorerUrl: `https://explorer.testnet.arc.io/tx/${body.txHash}`, erc8004Id: cleanText(body.erc8004Id, 32) };
      }
    } catch { /* Ignore unrelated registry logs. */ }
  }
  throw new Error('No matching NairaTag claim was found in that transaction.');
}

function alertText(body) {
  const wallet = shortAddress(body.walletAddress);
  if (body.kind === 'task') {
    const title = cleanText(body.title || body.taskTitle || body.taskId);
    const status = body.action === 'start' ? 'started working on' : 'submitted';
    const reward = Number(body.rewardUSDC) > 0 ? ` Potential bounty: $${Number(body.rewardUSDC)} USDC and ${Number(body.points) || 0} Protocol Points.` : '';
    const review = body.action === 'submit' ? ' Submission is pending task-owner review; no payout is confirmed yet.' : '';
    return `NairaTag task update\n${wallet} ${status}: ${title}.${reward}${review}\nTask ID: ${cleanText(body.taskId, 90)}\nArc Testnet - https://arc.nairatag.ng/#tasks`;
  }
  if (body.kind === 'task_paid') {
    const title = cleanText(body.title || body.taskId);
    return `NairaTag task reward\n${wallet} completed: ${title}.${Number(body.rewardUSDC) > 0 ? ` Reward paid: $${Number(body.rewardUSDC)} USDC and ${Number(body.points) || 0} Protocol Points.` : ' Reward status: paid.'}\nTask ID: ${cleanText(body.taskId, 90)}\nArc Testnet - https://arc.nairatag.ng/#tasks`;
  }
  if (body.kind === 'voucher') {
    const task = IN_HOUSE_TASKS[body.taskId];
    if (!task) throw new Error('Unknown NairaTag in-house task.');
    return `NairaTag voucher claim\n${wallet} reported completing: ${task.title}.\nVoucher: ${task.reward}\nSelf-reported task claim - https://arc.nairatag.ng/#rewards`;
  }
  if (body.kind === 'reward') {
    const messages = {
      daily_claim: 'claimed a daily Protocol Points reward.',
      spin: 'won a Protocol Points spin reward.',
      payment_confirmed: 'earned a reward spin after a confirmed Arc payment.',
      referral_signup: `reached a referral milestone for ${cleanText(body.referrerTag, 32)}.`,
    };
    if (!messages[body.action]) throw new Error('This reward action cannot be announced.');
    return `NairaTag reward update\n${wallet} ${messages[body.action]}\nNairaTag Rewards - https://arc.nairatag.ng/#rewards`;
  }
  throw new Error('Unsupported alert type.');
}

async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const channel = process.env.TELEGRAM_CHANNEL_ID || '-1003984230029';
  if (!token) throw Object.assign(new Error('Telegram alerts are not configured. Set the server-side TELEGRAM_BOT_TOKEN.'), { statusCode: 503 });
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: channel, text, disable_web_page_preview: false }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) throw new Error(result.description || 'Telegram rejected the alert.');
  return result.result?.message_id;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed.' });
  const origin = req.headers?.origin;
  if (origin) {
    try {
      const originHost = new URL(origin).host.toLowerCase();
      const requestHost = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase();
      if (!requestHost || originHost !== requestHost) return sendJson(res, 403, { error: 'Cross-origin alert requests are not allowed.' });
    } catch { return sendJson(res, 403, { error: 'Invalid request origin.' }); }
  }
  try {
    const body = await readBody(req);
    if (body.kind === 'claim') {
      const claim = await verifyTagClaim(body);
      const sent = await sendTelegram([
        '🎉 NEW NAIRATAG CLAIMED ON ARC TESTNET',
        '',
        `Tag: ₦${claim.tag.toUpperCase()}`,
        `Owner: ${claim.owner} (${shortAddress(claim.owner)})`,
        ...(claim.erc8004Id ? [`Agent: ERC-8004 #${claim.erc8004Id}`] : []),
        `Transaction: ${claim.txHash}`,
        `Explorer: ${claim.explorerUrl}`,
        '',
        'Claim your NairaTag: https://arc.nairatag.ng',
      ].join('\n'));
      return sendJson(res, 200, { ok: true, messageId: sent });
    }
    if (body.kind === 'task_paid' && isAddress(body.walletAddress) && /^[a-zA-Z0-9_-]{1,96}$/.test(String(body.taskId || ''))) {
      const taskDetails = await verifyTaskAccepted({ ...body, action: 'paid' });
      const messageId = await sendTelegram(alertText({ ...body, ...taskDetails, kind: 'task_paid' }));
      return sendJson(res, 200, { ok: true, messageId });
    }
    let message;
    if (body.kind === 'task' && ['start', 'submit'].includes(body.action) && /^[a-zA-Z0-9_-]{1,96}$/.test(String(body.taskId || ''))) {
      await verifyWalletSignature(body, taskMessage(body));
      const taskDetails = await verifyTaskAccepted(body);
      message = alertText({ ...body, ...taskDetails });
    } else if (body.kind === 'voucher' && /^[a-z0-9_-]{1,48}$/.test(String(body.taskId || '')) && IN_HOUSE_TASKS[body.taskId]) {
      await verifyWalletSignature(body, voucherMessage(body));
      message = alertText(body);
    } else if (body.kind === 'reward' && ['daily_claim', 'spin', 'payment_confirmed', 'referral_signup'].includes(body.action)) {
      await verifyWalletSignature(body, rewardMessage(body));
      message = alertText(body);
    } else {
      return sendJson(res, 400, { error: 'Unsupported or invalid alert action.' });
    }
    const messageId = await sendTelegram(message);
    if (body.signature) seenSignatures.set(body.signature, Date.now() + 5 * 60_000);
    return sendJson(res, 200, { ok: true, messageId });
  } catch (error) {
    return sendJson(res, error.statusCode || 400, { error: error.message || 'Could not send Telegram alert.' });
  }
}
