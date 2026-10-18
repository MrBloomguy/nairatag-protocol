import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bbpdupijsgdghemfpijr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'dummy-anon-key';

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

    if (error) {
      console.warn('[Supabase getSupabaseClaims error]', error.message);
      return null;
    }
    return (data || []).map(row => ({
      tag: row.tag,
      cleanTag: row.clean_tag,
      isSub: row.is_sub,
      address: row.wallet_address,
      network: row.network,
      block: Number(row.block || 0),
      tx: row.tx_hash,
      reputation: row.reputation || 100,
      timestamp: new Date(row.claimed_at).getTime()
    }));
  } catch (err) {
    console.warn('[Supabase getSupabaseClaims exception]', err.message);
    return null;
  }
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

    if (error || !data) return null;
    return {
      tag: data.tag,
      cleanTag: data.clean_tag,
      isSub: data.is_sub,
      address: data.wallet_address,
      network: data.network,
      block: Number(data.block || 0),
      tx: data.tx_hash,
      reputation: data.reputation || 100,
      timestamp: new Date(data.claimed_at).getTime()
    };
  } catch (err) {
    console.warn('[Supabase findClaimByWallet exception]', err.message);
    return null;
  }
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

    if (error || !data) return null;
    return {
      tag: data.tag,
      cleanTag: data.clean_tag,
      isSub: data.is_sub,
      address: data.wallet_address,
      network: data.network,
      block: Number(data.block || 0),
      tx: data.tx_hash,
      reputation: data.reputation || 100,
      timestamp: new Date(data.claimed_at).getTime()
    };
  } catch (err) {
    console.warn('[Supabase findClaimByTag exception]', err.message);
    return null;
  }
}

/**
 * Upsert a claim into Supabase
 */
export async function insertSupabaseClaim({ tag, cleanTag, walletAddress, network, isSub, block, txHash, reputation = 100 }) {
  const payload = {
    tag: `₦${cleanTag}`,
    clean_tag: cleanTag.toLowerCase(),
    wallet_address: walletAddress.toLowerCase(),
    network: network || 'Celo Sepolia',
    is_sub: Boolean(isSub),
    block: block || 2185000,
    tx_hash: txHash,
    reputation: reputation || 100,
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
      total_points: 100,
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
