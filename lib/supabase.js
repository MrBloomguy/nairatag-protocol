import { createClient } from '@supabase/supabase-js';

try { process.loadEnvFile(); } catch {}
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bbpdupijsgdghemfpijr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_3mRhhwX9BhnJyobyCX7uWw_h2-idCPf';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('[supabase] Warning: Supabase credentials missing.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

/**
 * Fetch all verified claims from Supabase
 */
export async function getSupabaseClaims() {
  try {
    const { data, error } = await supabase
      .from('user_claims')
      .select('*')
      .order('claimed_at', { ascending: false });

    if (error) throw new Error(error.message || 'Supabase claims are unavailable.');
    return (data || []).map(row => ({
      tag: row.tag,
      cleanTag: row.clean_tag,
      isSub: row.is_sub,
      address: row.wallet_address,
      network: row.network,
      block: Number(row.block || 0),
      tx: row.tx_hash,
      reputation: row.reputation == null ? null : Number(row.reputation),
      timestamp: new Date(row.claimed_at).getTime()
    }));
  } catch (err) { throw err; }
}

/**
 * Find claim by wallet address
 */
export async function findClaimByWallet(walletAddress) {
  if (!walletAddress) return null;
  const norm = walletAddress.trim().toLowerCase();
  try {
    const { data, error } = await supabase
      .from('user_claims')
      .select('*')
      .ilike('wallet_address', norm)
      .maybeSingle();

    if (error) throw new Error(error.message || 'Supabase claim lookup is unavailable.');
    if (!data) return null;
    return {
      tag: data.tag,
      cleanTag: data.clean_tag,
      isSub: data.is_sub,
      address: data.wallet_address,
      network: data.network,
      block: Number(data.block || 0),
      tx: data.tx_hash,
      reputation: data.reputation == null ? null : Number(data.reputation),
      timestamp: new Date(data.claimed_at).getTime()
    };
  } catch (err) { throw err; }
}

/**
 * Find claim by tag
 */
export async function findClaimByTag(tag) {
  if (!tag) return null;
  const clean = String(tag).trim().replace(/^[₦@#]/, '').toLowerCase();
  try {
    const { data, error } = await supabase
      .from('user_claims')
      .select('*')
      .ilike('clean_tag', clean)
      .maybeSingle();

    if (error) throw new Error(error.message || 'Supabase claim lookup is unavailable.');
    if (!data) {
      const { data: agentData } = await supabase
        .from('arc_agents')
        .select('tag, display_name, owner_wallet, status')
        .ilike('tag', clean)
        .maybeSingle();

      if (agentData && agentData.owner_wallet) {
        return {
          tag: `₦${agentData.tag.toUpperCase()}`,
          cleanTag: agentData.tag.toLowerCase(),
          isSub: false,
          address: agentData.owner_wallet,
          network: 'Arc Compatible',
          block: 0,
          tx: null,
          reputation: 100,
          timestamp: Date.now()
        };
      }
      return null;
    }
    return {
      tag: data.tag,
      cleanTag: data.clean_tag,
      isSub: data.is_sub,
      address: data.wallet_address,
      network: data.network,
      block: Number(data.block || 0),
      tx: data.tx_hash,
      reputation: data.reputation == null ? null : Number(data.reputation),
      timestamp: new Date(data.claimed_at).getTime()
    };
  } catch (err) { throw err; }
}

/**
 * Upsert a claim into Supabase
 */
export async function insertSupabaseClaim({ tag, cleanTag, walletAddress, network, isSub, block, txHash, reputation = null }) {
  const payload = {
    tag: `₦${cleanTag}`,
    clean_tag: cleanTag.toLowerCase(),
    wallet_address: walletAddress.toLowerCase(),
    network: network || null,
    is_sub: Boolean(isSub),
    block: block ?? null,
    tx_hash: txHash,
    reputation,
    claimed_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('user_claims')
    .insert([payload])
    .select()
    .single();

  if (error) {
    throw new Error(`Supabase claim error: ${error.message}`);
  }

  // Also ensure user_points has record
  await supabase
    .from('user_points')
    .upsert({
      wallet_address: walletAddress.toLowerCase(),
      tag: `₦${cleanTag}`,
      total_points: 0,
      updated_at: new Date().toISOString()
    });

  return {
    tag: data.tag,
    cleanTag: data.clean_tag,
    isSub: data.is_sub,
    address: data.wallet_address,
    network: data.network,
    block: Number(data.block || 0),
    tx: data.tx_hash,
    reputation: data.reputation,
    timestamp: new Date(data.claimed_at).getTime()
  };
}
