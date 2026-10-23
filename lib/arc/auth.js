import { completeCircleLogin, completeWalletLogin, createWalletLoginChallenge } from './session-auth.js';

function respond(res, status, payload) {
  return res.status(status).json(payload);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return respond(res, 405, { ok: false, error: 'Method not allowed.' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    if (body.action === 'wallet_challenge') {
      return respond(res, 200, { ok: true, ...createWalletLoginChallenge(body.walletAddress) });
    }
    const session = body.action === 'circle'
      ? await completeCircleLogin({ userToken: body.userToken, walletAddress: body.walletAddress })
      : body.action === 'wallet'
        ? await completeWalletLogin(body)
        : null;
    if (!session) return respond(res, 400, { ok: false, error: 'Choose a valid sign-in method.' });
    return respond(res, 200, { ok: true, ...session });
  } catch (error) {
    const status = Number(error.status) || 500;
    if (status >= 500) console.error('[Arc auth]', error.message);
    return respond(res, status, { ok: false, error: status >= 500 ? 'Account sign-in is temporarily unavailable.' : error.message });
  }
}
