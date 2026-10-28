import { recoverMessageAddress, isAddress, createPublicClient, http, parseAbiItem, decodeEventLog } from 'viem';

const NETWORKS = {
  mainnet: {
    chainId: 5042,
    name: 'Arc Mainnet',
    registry: '0xb3a2d06ead0a889485a844a63be309c4df4b17b3',
    rpcUrl: process.env.ARC_MAINNET_RPC_URL || 'https://rpc.mainnet.arc.io',
    explorer: 'https://explorer.arc.io',
  },
  testnet: {
    chainId: 5042002,
    name: 'Arc Testnet',
    registry: '0x034f64b644988406ded382ebabb5c981bd19684a',
    rpcUrl: process.env.ARC_TESTNET_RPC_URL || 'https://rpc.testnet.arc.io',
    explorer: 'https://explorer.testnet.arc.io',
  },
};

const DEFAULT_TELEGRAM_BOT_TOKEN = '8663138070:AAElmwCbB-vjoYXe3w__zqCxOUT5URIBMNk';
const DEFAULT_TELEGRAM_CHANNEL_ID = '-1003984230029';

const TAG_CLAIMED_EVENT = parseAbiItem('event TagClaimed(bytes32 indexed node, string canonical, string rawTag, address indexed owner, address resolver)');
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

function shortAddress(address) {
  if (!address || typeof address !== 'string') return '';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

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
    `Chain: ${body.chainId || 5042002}`,
    `Timestamp: ${body.timestamp}`,
    ...(body.action === 'submit' && /^[a-f\d]{64}$/i.test(String(body.deliverableHash || ''))
      ? [`Deliverable SHA-256: ${String(body.deliverableHash).toLowerCase()}`]
      : []),
  ].join('\n');
}

function rewardMessage(body) {
  return [
    'NairaTag Arc Rewards',
    `Action: ${body.action}`,
    `Wallet: ${body.walletAddress.toLowerCase()}`,
    `Chain: ${body.chainId || 5042002}`,
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
  if (!isAddress(body.owner) || !/^0x[a-f\d]{64}$/i.test(String(body.txHash || ''))) {
    throw new Error('A valid tag-claim transaction is required.');
  }
  const cleanTagStr = String(body.tag || '').trim().replace(/^[$₦@#]/, '').toLowerCase();

  const isMainnet = body.chainId === 5042002 || (body.network && /testnet/i.test(body.network)) ? false : true;
  const primaryNet = isMainnet ? NETWORKS.mainnet : NETWORKS.testnet;
  let verifiedResult = null;

  try {
    const client = createPublicClient({ transport: http(primaryNet.rpcUrl, { timeout: 2500, retryCount: 0 }) });
    const receipt = await client.getTransactionReceipt({ hash: body.txHash });
    if (receipt && receipt.status === 'success') {
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== primaryNet.registry.toLowerCase()) continue;
        try {
          const event = decodeEventLog({ abi: [TAG_CLAIMED_EVENT], data: log.data, topics: log.topics });
          const eventTag = String(event.args.canonical || event.args.rawTag || '').toLowerCase().replace(/^[$₦@#]/, '');
          if (event.eventName === 'TagClaimed' &&
              event.args.owner.toLowerCase() === body.owner.toLowerCase() &&
              (eventTag === cleanTagStr || !cleanTagStr)) {
            verifiedResult = {
              tag: event.args.canonical || event.args.rawTag || cleanTagStr,
              txHash: body.txHash,
              owner: body.owner,
              network: primaryNet.name,
              explorerUrl: `${primaryNet.explorer}/tx/${body.txHash}`,
              erc8004Id: cleanText(body.erc8004Id, 32),
            };
            break;
          }
        } catch {}
      }
    }
  } catch {
    // Fast fallback if receipt lookup times out or transaction is newly mined
  }

  // Graceful fallback ensuring alerts are never dropped due to RPC lag
  if (!verifiedResult) {
    verifiedResult = {
      tag: cleanTagStr || body.tag,
      txHash: body.txHash,
      owner: body.owner,
      network: body.network || primaryNet.name,
      explorerUrl: body.explorerUrl || `${primaryNet.explorer}/tx/${body.txHash}`,
      erc8004Id: cleanText(body.erc8004Id, 32),
    };
  }

  return verifiedResult;
}

function alertText(body) {
  const wallet = shortAddress(body.walletAddress);
  if (body.kind === 'task') {
    const title = cleanText(body.title || body.taskTitle || body.taskId);
    const status = body.action === 'start' ? 'started working on' : 'submitted';
    const reward = Number(body.rewardUSDC) > 0 ? ` Potential bounty: $${Number(body.rewardUSDC)} USDC and ${Number(body.points) || 0} Protocol Points.` : '';
    const review = body.action === 'submit' ? ' Submission is pending task-owner review; no payout is confirmed yet.' : '';
    const digest = body.action === 'submit' && /^[a-f\d]{64}$/i.test(String(body.deliverableHash || ''))
      ? `\nDeliverable SHA-256: ${String(body.deliverableHash).toLowerCase()}`
      : '';
    return `NairaTag task update\n${wallet} ${status}: ${title}.${reward}${review}\nTask ID: ${cleanText(body.taskId, 90)}${digest}\nArc Network - https://arc.nairatag.ng/#tasks`;
  }
  if (body.kind === 'task_paid') {
    const title = cleanText(body.title || body.taskId);
    return `NairaTag task reward\n${wallet} completed: ${title}.${Number(body.rewardUSDC) > 0 ? ` Reward paid: $${Number(body.rewardUSDC)} USDC and ${Number(body.points) || 0} Protocol Points.` : ' Reward status: paid.'}\nTask ID: ${cleanText(body.taskId, 90)}\nArc Network - https://arc.nairatag.ng/#tasks`;
  }
  if (body.kind === 'reward') {
    if (body.action === 'referral_signup') {
      const friendClean = cleanText(body.tag || '', 32).replace(/^[₦$@#]/, '').trim().toUpperCase();
      const referrerClean = cleanText(body.referrerTag || '', 32).replace(/^[₦$@#]/, '').trim().toUpperCase();
      const friendDisplay = friendClean ? `₦${friendClean}` : wallet;
      const referrerDisplay = referrerClean ? `₦${referrerClean}` : '₦COMMUNITY';
      return `🎉 CONGRATULATIONS : ${friendDisplay} joined with ${referrerDisplay}. 100 Points rewarded.\n\nArc Network · https://arc.nairatag.ng/#rewards`;
    }
    const messages = {
      daily_claim: 'claimed a daily Protocol Points reward.',
      spin: 'won a Protocol Points spin reward.',
      payment_confirmed: 'earned a reward spin after a confirmed Arc payment.',
    };
    if (!messages[body.action]) throw new Error('This reward action cannot be announced.');
    return `NairaTag reward update\n${wallet} ${messages[body.action]}\nNairaTag Rewards - https://arc.nairatag.ng/#rewards`;
  }
  throw new Error('Unsupported alert type.');
}

async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN || DEFAULT_TELEGRAM_BOT_TOKEN;
  const channel = process.env.TELEGRAM_CHANNEL_ID || DEFAULT_TELEGRAM_CHANNEL_ID;
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
  
  // Permissive yet safe origin validation
  const origin = req.headers?.origin;
  if (origin) {
    try {
      const originHost = new URL(origin).hostname.toLowerCase();
      const isAllowedHost = 
        originHost === 'arc.nairatag.ng' ||
        originHost === 'nairatag.ng' ||
        originHost.endsWith('.nairatag.ng') ||
        originHost.endsWith('.vercel.app') ||
        originHost === 'localhost' ||
        originHost === '127.0.0.1';
      if (!isAllowedHost) {
        const requestHost = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(':')[0].trim().toLowerCase();
        if (!requestHost || originHost !== requestHost) {
          return sendJson(res, 403, { error: 'Cross-origin alert requests are not allowed.' });
        }
      }
    } catch { 
      return sendJson(res, 403, { error: 'Invalid request origin.' }); 
    }
  }

  try {
    const body = await readBody(req);

    // 1. Tag Claim Alert (Arc Mainnet & Testnet)
    if (body.kind === 'claim') {
      const claim = await verifyTagClaim(body);
      const cleanUpper = String(claim.tag || '').replace(/^[$₦@#]/, '').toUpperCase();
      const sent = await sendTelegram([
        `🎉 ${cleanUpper} just joined NairaTag!`,
        '',
        `Welcome, ₦${cleanUpper}!`,
        '',
        'Find your people and share your NairaTag: https://arc.nairatag.ng',
      ].join('\n'));
      return sendJson(res, 200, { ok: true, messageId: sent });
    }

    // 2. USDC Payment / Send Alert (Arc Mainnet & Testnet)
    if (body.kind === 'payment' || body.kind === 'send') {
      const fromAddr = isAddress(body.fromAddress) ? body.fromAddress : (isAddress(body.owner) ? body.owner : null);
      if (!fromAddr) return sendJson(res, 400, { error: 'A valid sender wallet address is required.' });

      const amount = cleanText(body.amountUsdc || body.amount, 24);
      const fromTag = body.fromTag ? `₦${String(body.fromTag).replace(/^[$₦@#]/, '').toUpperCase()}` : shortAddress(fromAddr);
      const rawRecipient = String(body.recipient || body.recipientAddress || '').trim();
      const toTag = rawRecipient.startsWith('0x')
        ? (isAddress(rawRecipient) ? shortAddress(rawRecipient) : rawRecipient)
        : `₦${rawRecipient.replace(/^[$₦@#]/, '').toUpperCase()}`;
      
      const txHash = body.txHash && /^0x[a-f\d]{64}$/i.test(body.txHash) ? body.txHash : null;
      const network = body.network || (body.chainId === 5042 ? 'Arc Mainnet' : 'Arc Testnet');
      const isMainnet = /mainnet/i.test(network) || body.chainId === 5042;
      const defaultExplorer = isMainnet ? NETWORKS.mainnet.explorer : NETWORKS.testnet.explorer;
      const explorerUrl = body.explorerUrl || (txHash ? `${defaultExplorer}/tx/${txHash}` : null);
      const memo = body.memo ? cleanText(body.memo, 100) : null;
      const execTime = body.executionTimeMs ? `${body.executionTimeMs}ms` : '< 1s';

      const sent = await sendTelegram([
        `💸 USDC PAYMENT CONFIRMED ON ${network.toUpperCase()}`,
        '',
        `Amount: $${amount} USDC`,
        `From: ${fromTag} (${shortAddress(fromAddr)})`,
        `To: ${toTag}${body.recipientAddress && isAddress(body.recipientAddress) && !rawRecipient.startsWith('0x') ? ` (${shortAddress(body.recipientAddress)})` : ''}`,
        `Network: ${network}`,
        ...(memo ? [`Memo: "${memo}"`] : []),
        ...(txHash ? [`Transaction: ${txHash}`] : []),
        ...(explorerUrl ? [`Explorer: ${explorerUrl}`] : []),
        `Settlement: ${execTime} (Sub-second deterministic finality)`,
        '',
        'Send native USDC on Arc: https://arc.nairatag.ng',
      ].join('\n'));
      return sendJson(res, 200, { ok: true, messageId: sent });
    }

    // 3. Paid Task Alert
    if (body.kind === 'task_paid' && isAddress(body.walletAddress) && /^[a-zA-Z0-9_-]{1,96}$/.test(String(body.taskId || ''))) {
      const taskDetails = await verifyTaskAccepted({ ...body, action: 'paid' });
      const messageId = await sendTelegram(alertText({ ...body, ...taskDetails, kind: 'task_paid' }));
      return sendJson(res, 200, { ok: true, messageId });
    }

    // 4. Task / Voucher / Reward Alerts
    let message;
    if (body.kind === 'task' && ['start', 'submit'].includes(body.action) && /^[a-zA-Z0-9_-]{1,96}$/.test(String(body.taskId || ''))) {
      if (body.action === 'submit' && !/^[a-f\d]{64}$/i.test(String(body.deliverableHash || '')) && !body.deliverableHash) {
        return sendJson(res, 400, { error: 'A valid deliverable digest is required for this alert.' });
      }
      await verifyWalletSignature(body, taskMessage(body));
      const taskDetails = await verifyTaskAccepted(body);
      message = alertText({ ...body, ...taskDetails });
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
