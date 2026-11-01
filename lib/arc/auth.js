import { supabase } from '../supabase.js';
import { completeCircleLogin, completeWalletLink, completeWalletLogin, createWalletLinkChallenge, createWalletLoginChallenge, readArcSession } from './session-auth.js';

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
    if (body.action === 'wallet_link_challenge' || body.action === 'wallet_link') {
      const session = readArcSession(req);
      if (!session) throw Object.assign(new Error('Sign in again before linking a wallet.'), { status: 401 });
      if (body.walletAddress && String(body.walletAddress).toLowerCase() !== session.walletAddress) {
        throw Object.assign(new Error('The account session does not match the primary wallet.'), { status: 403 });
      }
      if (body.action === 'wallet_link_challenge') {
        return respond(res, 200, { ok: true, ...createWalletLinkChallenge(session.walletAddress, body.linkedWalletAddress) });
      }
      const { primaryWallet, linkedWallet } = await completeWalletLink({
        primaryWalletAddress: session.walletAddress,
        linkedWalletAddress: body.linkedWalletAddress,
        challengeToken: body.challengeToken,
        signature: body.signature,
      });
      const { data, error } = await supabase.rpc('arc_link_wallet_identity', {
        p_primary_wallet: primaryWallet,
        p_linked_wallet: linkedWallet,
      });
      if (error) throw Object.assign(new Error(error.message || 'This wallet could not be linked.'), { status: 409 });
      return respond(res, 200, { ok: true, identity: data });
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
