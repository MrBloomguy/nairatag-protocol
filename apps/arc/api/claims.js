/**
 * @file api/claims.js
 * @description Native NairaTag Identity and Resolution Handler for Arc Network.
 * Handles instant tag resolution, availability checks, and claims lookup directly.
 */

import { isAddress, getAddress } from 'viem';

try { process.loadEnvFile(); } catch {}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bbpdupijsgdghemfpijr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_3mRhhwX9BhnJyobyCX7uWw_h2-idCPf';

export const RESERVED_PROTOCOL_AGENTS = {
  nairatag: { address: '0x653f773C9062e71A6554b42a9525fcD47fCC1693', name: 'NairaTag Core Protocol', tag: '₦NAIRATAG' },
  bloom: { address: '0x7c26a1F03339E2Ea74D261D97f5ab9C38181AF26', name: 'NairaTag Sovereign Agent', tag: '₦BLOOM' },
  defillama: { address: '0xbfA1f73F632a54bFd04e9925dB6006135FcA6Ce6', name: 'DefiLlama Oracle', tag: '₦DEFILLAMA' },
  meteo: { address: '0x235d0Aa81F1c375c3325214f2dd7F205487eae36', name: 'Open-Meteo Weather', tag: '₦METEO' },
  coingecko: { address: '0x1abfC727335489f2914Effd7e19C19C309850Ef8', name: 'CoinGecko FX', tag: '₦COINGECKO' },
  ola: { address: '0x033d1fa7b2a3a25c9cc24254eacd47f0bdb83dfa', name: 'Ola', tag: '₦OLA' },
  arc: { address: '0x653f773C9062e71A6554b42a9525fcD47fCC1693', name: 'Arc Protocol', tag: '₦ARC' },
};

async function supabaseFetch(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Supabase query failed (${response.status}): ${errorText}`);
  }
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const { tag, wallet, action } = req.query || {};

  try {
    if (req.method === 'GET') {
      // 1. Resolve Tag -> Address
      if (action === 'resolve' && tag) {
        const clean = String(tag).trim().replace(/^[₦$@#]/, '').toLowerCase();

        // Check protocol agents first
        if (RESERVED_PROTOCOL_AGENTS[clean]) {
          const agent = RESERVED_PROTOCOL_AGENTS[clean];
          return res.status(200).json({
            ok: true,
            tag: agent.tag,
            cleanTag: clean,
            address: getAddress(agent.address),
            network: 'Arc Mainnet',
            isVerified: true,
            reputation: 100,
          });
        }

        // Check arc_claims table
        const claims = await supabaseFetch(
          `arc_claims?select=tag,wallet_address,network&tag=ilike.${clean}&limit=1`
        ).catch(() => []);

        if (claims?.[0]?.wallet_address) {
          const c = claims[0];
          return res.status(200).json({
            ok: true,
            tag: `₦${c.tag.toUpperCase()}`,
            cleanTag: c.tag.toLowerCase(),
            address: getAddress(c.wallet_address),
            network: c.network || 'Arc Mainnet',
            isVerified: true,
            reputation: 100,
          });
        }

        // Check arc_agents directory
        const agents = await supabaseFetch(
          `arc_agents?select=tag,owner_wallet,display_name&tag=ilike.${clean}&limit=1`
        ).catch(() => []);

        if (agents?.[0]?.owner_wallet) {
          const a = agents[0];
          return res.status(200).json({
            ok: true,
            tag: a.display_name || `₦${a.tag.toUpperCase()}`,
            cleanTag: a.tag.toLowerCase(),
            address: getAddress(a.owner_wallet),
            network: 'Arc Mainnet',
            isVerified: true,
            reputation: 100,
          });
        }

        return res.status(404).json({
          ok: false,
          error: `NairaTag ₦${clean.toUpperCase()} not found in canonical Arc registry.`,
        });
      }

      // 2. Query claim by wallet
      if (wallet) {
        const normWallet = String(wallet).trim().toLowerCase();

        // Check protocol agents
        const agentMatch = Object.entries(RESERVED_PROTOCOL_AGENTS).find(
          ([, a]) => a.address.toLowerCase() === normWallet
        );
        if (agentMatch) {
          return res.status(200).json({
            ok: true,
            hasClaim: true,
            claim: {
              tag: agentMatch[1].tag,
              cleanTag: agentMatch[0],
              address: getAddress(agentMatch[1].address),
              network: 'Arc Mainnet',
              reputation: 100,
            },
          });
        }

        // Check arc_claims
        const claims = await supabaseFetch(
          `arc_claims?select=tag,wallet_address,network,claimed_at&wallet_address=ilike.${normWallet}&limit=1`
        ).catch(() => []);

        if (claims?.[0]) {
          const c = claims[0];
          return res.status(200).json({
            ok: true,
            hasClaim: true,
            claim: {
              tag: `₦${c.tag.toUpperCase()}`,
              cleanTag: c.tag.toLowerCase(),
              address: getAddress(c.wallet_address),
              network: c.network || 'Arc Mainnet',
              timestamp: c.claimed_at ? new Date(c.claimed_at).getTime() : Date.now(),
              reputation: 100,
            },
          });
        }

        return res.status(200).json({ ok: true, hasClaim: false, claim: null });
      }

      // 3. Availability check
      if (action === 'check' && tag) {
        const clean = String(tag).trim().replace(/^[₦$@#]/, '').toLowerCase();
        if (RESERVED_PROTOCOL_AGENTS[clean]) {
          return res.status(200).json({
            ok: false,
            isTaken: true,
            reason: `₦${clean.toUpperCase()} is an official sovereign protocol agent on Arc.`,
          });
        }

        const existing = await supabaseFetch(
          `arc_claims?select=tag,wallet_address&tag=ilike.${clean}&limit=1`
        ).catch(() => []);

        if (existing?.[0]) {
          return res.status(200).json({
            ok: false,
            isTaken: true,
            reason: `₦${clean.toUpperCase()} is already claimed on Arc.`,
          });
        }

        return res.status(200).json({ ok: true, available: true, cleanTag: clean, canonicalTag: `₦${clean.toUpperCase()}` });
      }

      // Default stream
      const allClaims = await supabaseFetch('arc_claims?select=tag,wallet_address,claimed_at&order=claimed_at.desc&limit=100').catch(() => []);
      return res.status(200).json({ ok: true, claims: allClaims || [] });
    }

    // 4. POST: Persist / Record new claimed tag and sync into arc_agents
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const tag = String(body.tag || '').trim().replace(/^[₦$@#]/, '').toLowerCase();
      const wallet = String(body.wallet || body.walletAddress || '').trim().toLowerCase();
      const email = body.email ? String(body.email).trim().toLowerCase() : null;
      const txHash = body.txHash || null;
      const authProvider = body.authProvider || 'wallet';
      const avatarUrl = body.avatarUrl || null;

      if (!tag || !wallet) {
        return res.status(400).json({ ok: false, error: 'Both tag and wallet address are required.' });
      }

      if (RESERVED_PROTOCOL_AGENTS[tag]) {
        const reserved = RESERVED_PROTOCOL_AGENTS[tag];
        if (reserved.address.toLowerCase() !== wallet) {
          return res.status(400).json({ ok: false, error: `₦${tag.toUpperCase()} is an official sovereign protocol agent on Arc.` });
        }
      }

      // Call arc_enforce_claim RPC in Supabase (persists claim and immediately creates/activates row in arc_agents)
      const url = `${SUPABASE_URL}/rest/v1/rpc/arc_enforce_claim`;
      const rpcRes = await fetch(url, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          p_tag: tag,
          p_wallet: wallet,
          p_email: email,
          p_tx_hash: txHash,
          p_auth_provider: authProvider,
          p_avatar_url: avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(tag)}`,
        }),
      });

      const rpcData = await rpcRes.json().catch(() => ({}));
      if (!rpcRes.ok || rpcData?.ok === false) {
        return res.status(400).json({ ok: false, error: rpcData?.error || 'Claim could not be recorded.' });
      }

      return res.status(200).json({
        ok: true,
        message: `₦${tag.toUpperCase()} successfully claimed and listed as an active agent on Arc.`,
        claim: rpcData,
      });
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  } catch (err) {
    console.error('[claims API error]:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Internal resolver error' });
  }
}

