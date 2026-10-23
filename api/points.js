import { isAddress } from 'viem';
import { supabase } from '../lib/supabase.js';

function respond(res, status, payload) {
  return res.status(status).json(payload);
}

function wallet(value) {
  return String(value || '').trim().toLowerCase();
}

export async function getUserPointsFromSupabase(walletAddress) {
  const address = wallet(walletAddress);
  if (!isAddress(address)) return null;
  const { data, error } = await supabase.rpc('arc_reward_state', { p_wallet: address });
  if (error) throw new Error(error.message || 'Arc rewards database is unavailable.');
  const state = data || {};
  return {
    walletAddress: address,
    totalPoints: Number(state.points) || 0,
    inviteCount: Number(state.referrals?.joinedCount) || 0,
    referrals: state.referrals || {},
  };
}

export async function getOrCreateUser() {
  throw new Error('Unsigned legacy point-account creation is disabled. Use the wallet-signed Arc rewards service.');
}

export async function recordReferralBonus() {
  throw new Error('Unsigned legacy referrals are disabled. Use the wallet-signed Arc rewards service.');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (!process.env.SUPABASE_SECRET_KEY) {
    return respond(res, 503, { ok: false, error: 'Arc rewards storage is not configured.' });
  }

  if (req.method === 'GET') {
    const address = wallet(req.query?.wallet);
    if (!isAddress(address)) return respond(res, 400, { ok: false, error: 'A valid wallet address is required.' });
    try {
      const state = await getUserPointsFromSupabase(address);
      const [claimResult, eventResult] = await Promise.all([
        supabase.from('user_claims').select('tag, clean_tag').ilike('wallet_address', address).maybeSingle(),
        supabase.from('arc_reward_events').select('event_type, points, created_at, metadata').eq('wallet_address', address).order('created_at', { ascending: false }).limit(50),
      ]);
      if (claimResult.error || eventResult.error) throw new Error('Rewards history is unavailable.');
      const tag = claimResult.data?.tag || null;
      const cleanTag = claimResult.data?.clean_tag || null;
      const referralUrl = cleanTag ? 'https://nairatag.ng/claim?ref=' + encodeURIComponent(cleanTag) : null;
      return respond(res, 200, {
        ok: true,
        walletAddress: address,
        tag,
        totalPoints: state.totalPoints,
        inviteCount: state.inviteCount,
        referralCode: cleanTag,
        referralUrl,
        referrals: state.referrals,
        ledger: (eventResult.data || []).map((event) => ({
          action: event.event_type,
          points: Number(event.points) || 0,
          metadata: event.metadata || {},
          timestamp: new Date(event.created_at).getTime(),
        })),
      });
    } catch {
      return respond(res, 503, { ok: false, error: 'Arc rewards are unavailable. Check the database configuration and try again.' });
    }
  }

  if (req.method === 'POST') {
    return respond(res, 410, {
      ok: false,
      error: 'This unsigned legacy reward action is disabled. Use the wallet-signed Arc rewards service.',
      service: '/api/arc?route=rewards',
    });
  }

  return respond(res, 405, { ok: false, error: 'Method not allowed.' });
}