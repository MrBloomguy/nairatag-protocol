const CIRCLE_BASE_URL = 'https://api.circle.com/v1/w3s';
const ARC_TESTNET = 'ARC-TESTNET';
const ARC_USDC = '0x3600000000000000000000000000000000000000';
const NAIRATAG_REGISTRY = '0x034f64b644988406ded382ebabb5c981bd19684a';
const NAIRATAG_RESOLVER = '0xaee1af632006a5062accdb74f73930439b76efbf';
const ARC_MEMO = '0x5294e9927c3306dcbadb03fe70b92e01ccede505';
const MAX_BODY_BYTES = 16 * 1024;

const agentPolicies = new Map();

function getPolicyFor(key) {
  const normalized = String(key || '').toLowerCase();
  return agentPolicies.get(normalized) || {
    perTxLimit: 25,
    dailyLimit: 100,
    weeklyLimit: 500,
    monthlyLimit: 2000,
    currency: 'USDC',
    spentToday: 0,
    remainingDaily: 100,
    recipientAllowlist: [],
    recipientBlocklist: [],
  };
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > MAX_BODY_BYTES) throw Object.assign(new Error('Request too large'), { status: 413 });
  }
  try {
    return body ? JSON.parse(body) : {};
  } catch {
    throw Object.assign(new Error('Invalid JSON request'), { status: 400 });
  }
}

function isSameOrigin(req) {
  const origin = req.headers?.origin;
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host.toLowerCase();
    const requestHost = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase();
    return Boolean(requestHost && originHost === requestHost);
  } catch {
    return false;
  }
}

async function circleRequest(path, { userToken, method = 'GET', body } = {}) {
  const apiKey = process.env.CIRCLE_API_KEY;
  if (!apiKey) throw Object.assign(new Error('Circle is not configured. Set the server-side CIRCLE_API_KEY.'), { status: 503 });
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (userToken) headers['X-User-Token'] = userToken;
  const response = await fetch(`${CIRCLE_BASE_URL}${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result?.message || result?.error || 'Circle request failed.');
    error.status = response.status;
    error.code = result?.code;
    error.details = result;
    throw error;
  }
  return result?.data ?? result;
}

function requireText(value, name, max = 512) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw Object.assign(new Error(`Invalid ${name}.`), { status: 400 });
  }
  return value.trim();
}

async function routeAction(action, params) {
  switch (action) {
    case 'requestEmailOtp': {
      const email = requireText(params.email, 'email', 254).toLowerCase();
      const deviceId = requireText(params.deviceId, 'deviceId', 256);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Object.assign(new Error('Enter a valid email address.'), { status: 400 });
      return circleRequest('/users/email/token', {
        method: 'POST',
        body: { idempotencyKey: crypto.randomUUID(), deviceId, email },
      });
    }
    case 'initializeUser': {
      const userToken = requireText(params.userToken, 'user token', 4096);
      return circleRequest('/user/initialize', {
        method: 'POST',
        userToken,
        body: {
          idempotencyKey: crypto.randomUUID(),
          accountType: 'SCA',
          blockchains: [ARC_TESTNET],
        },
      });
    }
    case 'listWallets': {
      const userToken = requireText(params.userToken, 'user token', 4096);
      return circleRequest('/wallets', { userToken });
    }
    case 'getChallenge': {
      const userToken = requireText(params.userToken, 'user token', 4096);
      const challengeId = encodeURIComponent(requireText(params.challengeId, 'challenge id', 128));
      return circleRequest(`/user/challenges/${challengeId}`, { userToken });
    }
    case 'getTokenBalance': {
      const userToken = requireText(params.userToken, 'user token', 4096);
      const walletId = encodeURIComponent(requireText(params.walletId, 'wallet id', 128));
      return circleRequest(`/wallets/${walletId}/balances`, { userToken });
    }
    case 'createContractExecution': {
      const userToken = requireText(params.userToken, 'user token', 4096);
      const walletId = requireText(params.walletId, 'wallet id', 128);
      const contractAddress = String(params.contractAddress || '').toLowerCase();
      const signature = params.abiFunctionSignature;
      const args = params.abiParameters;
      const isUsdcTransfer = contractAddress === ARC_USDC && signature === 'transfer(address,uint256)'
        && Array.isArray(args) && args.length === 2
        && /^0x[0-9a-f]{40}$/i.test(String(args[0]))
        && String(args[0]).toLowerCase() !== '0x0000000000000000000000000000000000000000'
        && /^\d+$/.test(String(args[1]));
      const isTagClaim = contractAddress === NAIRATAG_REGISTRY && signature === 'claim(string,address)'
        && Array.isArray(args) && args.length === 2
        && /^[a-z0-9][a-z0-9_]{1,30}[a-z0-9]$/.test(String(args[0]))
        && !String(args[0]).includes('__')
        && String(args[1]).toLowerCase() === NAIRATAG_RESOLVER;
      const isMemoTransfer = contractAddress === ARC_MEMO && signature === 'memo(address,bytes,bytes32,bytes)'
        && Array.isArray(args) && args.length === 4
        && String(args[0]).toLowerCase() === ARC_USDC
        && /^0xa9059cbb[0-9a-f]{128}$/i.test(String(args[1]))
        && String(args[1]).slice(34, 74).toLowerCase() !== '0000000000000000000000000000000000000000'
        && BigInt(`0x${String(args[1]).slice(74)}`) > 0n
        && /^0x[0-9a-f]{64}$/i.test(String(args[2]))
        && /^0x[0-9a-f]*$/i.test(String(args[3]));
      if (!isUsdcTransfer && !isTagClaim && !isMemoTransfer) throw Object.assign(new Error('Unsupported Circle wallet transaction.'), { status: 400 });
      return circleRequest('/user/transactions/contractExecution', {
        method: 'POST',
        userToken,
        body: {
          idempotencyKey: crypto.randomUUID(),
          walletId,
          contractAddress: isUsdcTransfer ? ARC_USDC : isTagClaim ? NAIRATAG_REGISTRY : ARC_MEMO,
          abiFunctionSignature: signature,
          abiParameters: args.map((value) => String(value)),
          feeLevel: 'MEDIUM',
        },
      });
    }
    case 'getAgentWalletPolicy': {
      const key = String(params.walletAddress || params.agentTag || '').trim().toLowerCase();
      if (!key) throw Object.assign(new Error('Missing walletAddress or agentTag.'), { status: 400 });
      return getPolicyFor(key);
    }
    case 'setAgentWalletPolicy': {
      const key = String(params.walletAddress || params.agentTag || '').trim().toLowerCase();
      if (!key) throw Object.assign(new Error('Missing walletAddress or agentTag.'), { status: 400 });
      const rawPolicy = params.policy || {};
      const perTx = Number(rawPolicy.perTxLimit ?? 25);
      const daily = Number(rawPolicy.dailyLimit ?? 100);
      const weekly = Number(rawPolicy.weeklyLimit ?? 500);
      const monthly = Number(rawPolicy.monthlyLimit ?? 2000);
      if (perTx <= 0 || daily <= 0 || weekly <= 0 || monthly <= 0) {
        throw Object.assign(new Error('Spending limits must be positive numbers.'), { status: 400 });
      }
      if (perTx > daily || daily > weekly || weekly > monthly) {
        throw Object.assign(new Error('Invalid limit hierarchy: perTx <= daily <= weekly <= monthly.'), { status: 400 });
      }
      const existing = getPolicyFor(key);
      const updated = {
        ...existing,
        perTxLimit: perTx,
        dailyLimit: daily,
        weeklyLimit: weekly,
        monthlyLimit: monthly,
        recipientAllowlist: Array.isArray(rawPolicy.recipientAllowlist) ? rawPolicy.recipientAllowlist.map(a => String(a).toLowerCase()) : existing.recipientAllowlist,
        recipientBlocklist: Array.isArray(rawPolicy.recipientBlocklist) ? rawPolicy.recipientBlocklist.map(b => String(b).toLowerCase()) : existing.recipientBlocklist,
        remainingDaily: Math.max(0, daily - existing.spentToday)
      };
      agentPolicies.set(key, updated);
      return updated;
    }
    case 'executeAgentTransfer': {
      const userToken = requireText(params.userToken, 'user token', 4096);
      const walletId = requireText(params.walletId, 'wallet id', 128);
      const walletAddress = String(params.walletAddress || '').toLowerCase();
      const recipient = String(params.recipient || '').trim().toLowerCase();
      const amount = Number(params.amount);
      if (!recipient || !/^0x[0-9a-f]{40}$/i.test(recipient)) {
        throw Object.assign(new Error('Invalid recipient EVM address.'), { status: 400 });
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        throw Object.assign(new Error('Invalid transfer amount.'), { status: 400 });
      }
      const policyKey = walletAddress || walletId;
      const policy = getPolicyFor(policyKey);
      if (amount > policy.perTxLimit) {
        throw Object.assign(new Error(`Amount ${amount} USDC exceeds per-tx limit of ${policy.perTxLimit} USDC.`), { status: 400 });
      }
      if (policy.spentToday + amount > policy.dailyLimit) {
        throw Object.assign(new Error(`Daily budget exceeded. Spent: ${policy.spentToday} USDC, Attempted: ${amount} USDC, Limit: ${policy.dailyLimit} USDC.`), { status: 400 });
      }
      if (policy.recipientBlocklist.includes(recipient)) {
        throw Object.assign(new Error(`Recipient ${recipient} is blocked by agent policy.`), { status: 400 });
      }
      if (policy.recipientAllowlist.length > 0 && !policy.recipientAllowlist.includes(recipient)) {
        throw Object.assign(new Error(`Recipient ${recipient} is not on agent allowlist.`), { status: 400 });
      }
      // 6 decimals for Arc USDC
      const amountUnits = BigInt(Math.round(amount * 1_000_000)).toString();
      const result = await circleRequest('/user/transactions/contractExecution', {
        method: 'POST',
        userToken,
        body: {
          idempotencyKey: crypto.randomUUID(),
          walletId,
          contractAddress: ARC_USDC,
          abiFunctionSignature: 'transfer(address,uint256)',
          abiParameters: [recipient, amountUnits],
          feeLevel: 'MEDIUM',
        },
      });
      policy.spentToday += amount;
      policy.remainingDaily = Math.max(0, policy.dailyLimit - policy.spentToday);
      agentPolicies.set(policyKey, policy);
      return { ok: true, ...result, amount, recipient, remainingDaily: policy.remainingDaily };
    }
    default:
      throw Object.assign(new Error('Unknown Circle action.'), { status: 400 });
  }
}

export default async function circleHandler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }
  if (!isSameOrigin(req)) return sendJson(res, 403, { error: 'Cross-origin request denied.' });
  try {
    const { action, ...params } = await readBody(req);
    if (typeof action !== 'string') return sendJson(res, 400, { error: 'Missing action.' });
    const data = await routeAction(action, params);
    return sendJson(res, 200, data);
  } catch (error) {
    const status = Number(error.status) || 500;
    if (status >= 500) console.error('[Circle API]', error.message);
    return sendJson(res, status, {
      error: status >= 500 ? 'Circle service is unavailable.' : error.message,
      ...(error.code ? { code: error.code } : {}),
    });
  }
}

