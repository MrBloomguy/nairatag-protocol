/**
 * @file api/arc-rewards.js
 * @description Proxy / handler for Arc Protocol Points & Referral Rewards
 * Automatically falls back to direct Supabase RPC if upstream service is unavailable.
 */

const TARGET_API = process.env.ARC_REWARDS_UPSTREAM || 'https://nairatag.ng/api/arc-rewards';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bbpdupijsgdghemfpijr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_3mRhhwX9BhnJyobyCX7uWw_h2-idCPf';

async function callSupabaseRpc(rpcName, params = {}) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/${rpcName}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `Supabase RPC ${rpcName} failed (${res.status})`);
  }
  return res.json();
}

function resolveReferrerWallet(tag = '') {
  const clean = String(tag || '').toLowerCase().replace(/^[₦$@#]/, '').trim();
  if (clean === 'ola') return '0x033d1fa7b2a3a25c9cc24254eacd47f0bdb83dfa';
  if (clean === 'nairatag') return '0x653f773c9062e71a6554b42a9525fcd47fcc1693';
  if (clean === 'bloom') return '0x7c26a1f03339e2ea74d261d97f5ab9c38181af26';
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const queryAction = String(req.query?.action || '');
  const bodyAction = typeof req.body === 'object' ? String(req.body?.action || '') : '';
  const isDirectAction = ['check_claim', 'tag_claimed'].includes(queryAction) || ['check_claim', 'tag_claimed'].includes(bodyAction);

  // If not direct authoritative claim action, try proxying to TARGET_API
  if (!isDirectAction) {
    try {
      const url = new URL(TARGET_API);
      if (req.query) {
        for (const [key, val] of Object.entries(req.query)) {
          if (val) url.searchParams.set(key, val);
        }
      }

      const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      };
      if (req.headers.authorization) headers.Authorization = req.headers.authorization;

      const options = {
        method: req.method,
        headers,
      };

      if (req.method === 'POST') {
        options.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
      }

      const response = await fetch(url.toString(), options);
      const data = await response.json().catch(() => ({}));

      if (response.ok && data?.ok) {
        return res.status(response.status).json(data);
      }
      // If upstream returned error, fall through to direct Supabase RPC handler
    } catch (error) {
      console.warn('[arc-rewards proxy note, using direct Supabase fallback]:', error.message);
    }
  }

  // Direct Supabase Fallback Handler
  try {
    if (req.method === 'GET') {
      const action = String(req.query?.action || '');
      if (action === 'check_claim') {
        const tag = String(req.query?.tag || '').toLowerCase().replace(/^[₦$@#]/, '');
        const wallet = String(req.query?.wallet || '').trim().toLowerCase() || null;
        const email = String(req.query?.email || '').trim().toLowerCase() || null;
        const check = await callSupabaseRpc('arc_check_can_claim', {
          p_tag: tag,
          p_wallet: wallet,
          p_email: email,
        });
        return res.status(200).json({ ok: true, check });
      }
      const wallet = String(req.query?.wallet || '').trim().toLowerCase();
      if (!wallet || !wallet.startsWith('0x')) {
        return res.status(400).json({ ok: false, error: 'A valid wallet address is required.' });
      }
      const state = await callSupabaseRpc('arc_reward_state', { p_wallet: wallet });
      return res.status(200).json({ ok: true, state });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const action = String(body.action || '');
      const wallet = String(body.walletAddress || '').trim().toLowerCase();

      if (action === 'check_claim') {
        const tag = String(body.tag || '').toLowerCase().replace(/^[₦$@#]/, '');
        const email = String(body.email || '').trim().toLowerCase() || null;
        const check = await callSupabaseRpc('arc_check_can_claim', {
          p_tag: tag,
          p_wallet: wallet || null,
          p_email: email,
        });
        return res.status(200).json({ ok: true, check });
      }

      if (action === 'referral_signup') {
        const referredTag = String(body.tag || '').toLowerCase().replace(/^[₦$@#]/, '');
        const referrerTag = String(body.referrerTag || '').toLowerCase().replace(/^[₦$@#]/, '');
        const referrerWallet = resolveReferrerWallet(referrerTag);
        if (!referrerWallet) {
          return res.status(400).json({ ok: false, error: `Referral tag ₦${referrerTag.toUpperCase()} is not registered on Arc.` });
        }
        const result = await callSupabaseRpc('arc_register_referral', {
          p_referred_wallet: wallet,
          p_referrer_wallet: referrerWallet,
          p_referrer_tag: referrerTag,
          p_referred_tag: referredTag,
        });
        const state = await callSupabaseRpc('arc_reward_state', { p_wallet: wallet });
        return res.status(200).json({ ok: true, result, state });
      }

      if (action === 'tag_claimed') {
        const tag = String(body.tag || '').toLowerCase().replace(/^[₦$@#]/, '');
        const email = String(body.email || '').trim().toLowerCase() || null;
        let result = {};
        try {
          result = await callSupabaseRpc('arc_enforce_claim', {
            p_tag: tag,
            p_wallet: wallet,
            p_email: email,
            p_tx_hash: body.txHash || null,
            p_auth_provider: body.authProvider || 'wallet',
            p_avatar_url: body.avatarUrl || null,
          });
          if (result && result.ok === false) {
            return res.status(400).json({ ok: false, error: result.error || 'Claim rejected by protocol policy.' });
          }
        } catch (enforceErr) {
          console.warn('[arc_enforce_claim note]:', enforceErr.message);
          try {
            result = await callSupabaseRpc('arc_record_tag_claim', { p_wallet: wallet, p_tag: tag });
          } catch {}
        }
        if (body.referrerTag) {
          const referrerTag = String(body.referrerTag).toLowerCase().replace(/^[₦$@#]/, '');
          const referrerWallet = resolveReferrerWallet(referrerTag);
          if (referrerWallet && referrerWallet !== wallet) {
            try {
              const refResult = await callSupabaseRpc('arc_register_referral', {
                p_referred_wallet: wallet,
                p_referrer_wallet: referrerWallet,
                p_referrer_tag: referrerTag,
                p_referred_tag: tag,
              });
              result.referral = refResult;
            } catch (refErr) {
              console.warn('[Supabase auto-referral on tag claim]:', refErr.message);
            }
          }
        }
        const state = await callSupabaseRpc('arc_reward_state', { p_wallet: wallet });
        return res.status(200).json({ ok: true, result, state });
      }

      if (action === 'daily_claim') {
        const rewards = [10, 15, 20, 25, 30, 40, 50];
        const stateBefore = await callSupabaseRpc('arc_reward_state', { p_wallet: wallet });
        if (stateBefore?.claimedToday) {
          return res.status(200).json({ ok: true, result: { points: 0, alreadyClaimed: true }, state: stateBefore });
        }
        const day = (Number(stateBefore?.streakCount || 0) % 7) + 1;
        const result = await callSupabaseRpc('arc_claim_daily_streak', { p_wallet: wallet, p_reward: rewards[day - 1] });
        const state = await callSupabaseRpc('arc_reward_state', { p_wallet: wallet });
        return res.status(200).json({ ok: true, result, state });
      }

      // Default state return
      if (wallet && wallet.startsWith('0x')) {
        const state = await callSupabaseRpc('arc_reward_state', { p_wallet: wallet });
        return res.status(200).json({ ok: true, state });
      }
    }

    return res.status(400).json({ ok: false, error: 'Unsupported reward action' });
  } catch (err) {
    console.error('[arc-rewards fallback error]', err);
    return res.status(500).json({ ok: false, error: err.message || 'Rewards service error' });
  }
}

