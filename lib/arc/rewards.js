import { createPublicClient, http, isAddress, verifyMessage, parseAbi } from 'viem';
import { randomInt } from 'node:crypto';
import { supabase } from '../supabase.js';
import { readArcSession } from './session-auth.js';

const CHAIN_ID = 5042;
const RPC_URL = process.env.ARC_RPC_URL || 'https://rpc.mainnet.arc.io';
const USDC = '0x3600000000000000000000000000000000000000';
const REGISTRY = '0xb3a2d06ead0a889485a844a63be309c4df4b17b3';
const registryAbi = parseAbi(['function ownerOf(string tag) view returns (address)']);
const publicClient = createPublicClient({ transport: http(RPC_URL) });

async function lookupReferrerWallet(rawReferrerTag) {
  const tag = normalizeTag(rawReferrerTag);
  if (!tag) return null;
  if (tag === 'ola') return '0x033d1fa7b2a3a25c9cc24254eacd47f0bdb83dfa';
  if (tag === 'nairatag') return '0x653f773c9062e71a6554b42a9525fcd47fcc1693';
  if (tag === 'bloom') return '0x7c26a1f03339e2ea74d261d97f5ab9c38181af26';
  // 1. Supabase claims
  try {
    const { data } = await supabase.from('user_claims').select('wallet_address').ilike('clean_tag', tag).maybeSingle();
    if (data?.wallet_address && isAddress(data.wallet_address)) return wallet(data.wallet_address);
  } catch {}
  // 2. Supabase points
  try {
    const { data } = await supabase.from('user_points').select('wallet_address').ilike('tag', `₦${tag}`).maybeSingle();
    if (data?.wallet_address && isAddress(data.wallet_address)) return wallet(data.wallet_address);
  } catch {}
  // 3. Onchain registry
  try {
    const onchainOwner = await publicClient.readContract({
      address: REGISTRY,
      abi: registryAbi,
      functionName: 'ownerOf',
      args: [tag],
    });
    if (onchainOwner && onchainOwner !== '0x0000000000000000000000000000000000000000') {
      return wallet(onchainOwner);
    }
  } catch {}
  return null;
}
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const prizes = [
  { id: 'p0', points: 50 }, { id: 'p1', points: 25 }, { id: 'p2', points: 100 }, { id: 'p3', points: 20 },
  { id: 'p4', points: 10 }, { id: 'p5', points: 75 }, { id: 'p6', points: 250 }, { id: 'p7', points: 150 },
];

function respond(res, status, payload) { return res.status(status).json(payload); }
function wallet(value) { return String(value || '').trim().toLowerCase(); }
function normalizeTag(value) { return String(value || '').trim().replace(/^[₦$@#]/, '').toLowerCase(); }
function messageFor(action, walletAddress, timestamp, payload = {}) {
  return [
    'NairaTag Arc Rewards', `Action: ${action}`, `Wallet: ${wallet(walletAddress)}`,
    `Chain: ${CHAIN_ID}`, `Timestamp: ${timestamp}`,
    ...Object.entries(payload).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}: ${String(value)}`),
  ].join('\n');
}
async function verifyAction(body, action) {
  const address = String(body.walletAddress || '').trim();
  const timestamp = Number(body.timestamp);
  if (!isAddress(address) || !body.signature || !Number.isFinite(timestamp)) throw new Error('Connect a wallet and sign this reward action.');
  if (Math.abs(Date.now() - timestamp) > 5 * 60 * 1000) throw new Error('Wallet signature expired. Please try again.');
  const payload = { ...(body.tag ? { tag: normalizeTag(body.tag) } : {}), ...(body.referrerTag ? { referrerTag: normalizeTag(body.referrerTag) } : {}), ...(body.txHash ? { txHash: String(body.txHash).toLowerCase() } : {}), ...(body.requestId ? { requestId: String(body.requestId) } : {}), ...(body.ids ? { ids: body.ids.join(',') } : {}) };
  const valid = await verifyMessage({ address, message: messageFor(action, address, timestamp, payload), signature: body.signature });
  if (!valid) throw new Error('Wallet signature could not be verified.');
  return wallet(address);
}
async function ensureArcIdentity(tag, expectedWallet) {
  const cleanTag = normalizeTag(tag);
  if (!cleanTag || cleanTag.length > 32) throw new Error('A valid Arc NairaTag is required.');
  return cleanTag;
}
async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message || 'Arc rewards database request failed.');
  return data;
}
async function assertArcChain() {
  if (await publicClient.getChainId() !== CHAIN_ID) throw new Error('Rewards are configured for the wrong network; expected Arc Testnet.');
}
async function verifyPayment(txHash, expectedWallet) {
  await assertArcChain();
  if (!/^0x[a-f\d]{64}$/i.test(String(txHash || ''))) throw new Error('A valid Arc transaction hash is required.');
  const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
  const tx = await publicClient.getTransaction({ hash: txHash });
  if (receipt.status !== 'success' || wallet(tx.from) !== wallet(expectedWallet)) throw new Error('This is not a successful Arc payment sent by the connected wallet.');
  const walletTopic = `0x${wallet(expectedWallet).slice(2).padStart(64, '0')}`;
  const paymentLog = receipt.logs.find((log) => wallet(log.address) === wallet(USDC)
    && log.topics?.[0]?.toLowerCase() === TRANSFER_TOPIC
    && log.topics?.[1]?.toLowerCase() === walletTopic
    && log.topics?.[2]?.toLowerCase() !== walletTopic
    && BigInt(log.data || '0x0') > 0n);
  if (!paymentLog || !tx) throw new Error('No outgoing USDC transfer from this wallet was found in the Arc receipt.');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL) return respond(res, 503, { ok: false, error: 'Arc rewards database is not configured.' });
  if (!process.env.SUPABASE_SECRET_KEY) return respond(res, 503, { ok: false, error: 'Arc rewards database credentials are not configured.' });

  if (req.method === 'GET') {
    const address = String(req.query?.wallet || '').trim();
    if (!isAddress(address)) return respond(res, 400, { ok: false, error: 'A valid wallet address is required.' });
    try { return respond(res, 200, { ok: true, state: await rpc('arc_reward_state', { p_wallet: wallet(address) }) }); }
    catch { return respond(res, 503, { ok: false, error: 'Arc rewards database is unavailable.' }); }
  }
  if (req.method !== 'POST') return respond(res, 405, { ok: false, error: 'Method not allowed.' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const action = String(body.action || '');
    if (action === 'notifications_read') {
      const address = String(body.walletAddress || '').trim();
      if (!isAddress(address)) return respond(res, 400, { ok: false, error: 'A valid wallet address is required.' });
      const ids = Array.isArray(body.ids) ? body.ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id)) : null;
      await rpc('arc_mark_reward_notifications_read', { p_wallet: wallet(address), p_ids: ids?.length ? ids : null });
      return respond(res, 200, { ok: true, state: await rpc('arc_reward_state', { p_wallet: wallet(address) }) });
    }
    let address;
    let result;
    if (action === 'agent_onboarding_state') {
      const session = readArcSession(req);
      if (!session) throw Object.assign(new Error('Sign in again to sync your onboarding rewards.'), { status: 401 });
      address = session.walletAddress;
      if (body.walletAddress && wallet(body.walletAddress) !== address) throw Object.assign(new Error('The account session does not match this wallet.'), { status: 403 });
      const tag = await ensureArcIdentity(body.tag, address);
      const onboarding = await rpc('arc_agent_onboarding_state', { p_wallet: address, p_tag: tag });
      return respond(res, 200, { ok: true, onboarding, state: await rpc('arc_reward_state', { p_wallet: address }) });
    }
    if (action === 'agent_onboarding_step') {
      const session = readArcSession(req);
      if (!session) throw Object.assign(new Error('Sign in again to claim your onboarding reward.'), { status: 401 });
      address = session.walletAddress;
      if (body.walletAddress && wallet(body.walletAddress) !== address) throw Object.assign(new Error('The account session does not match this wallet.'), { status: 403 });
      const tag = await ensureArcIdentity(body.tag, address);
      if (!['identity', 'avatar', 'personality', 'permissions', 'firstInteraction'].includes(String(body.step || ''))) throw new Error('Choose a valid onboarding step.');
      result = await rpc('arc_claim_agent_onboarding_reward', { p_wallet: address, p_tag: tag, p_step: body.step });
      const [onboarding, state] = await Promise.all([
        rpc('arc_agent_onboarding_state', { p_wallet: address, p_tag: tag }),
        rpc('arc_reward_state', { p_wallet: address }),
      ]);
      return respond(res, 200, { ok: true, result, onboarding, state });
    }
    const session = readArcSession(req);
    if (session && (!body.walletAddress || wallet(body.walletAddress) === session.walletAddress)) {
      address = session.walletAddress;
    } else if ((action === 'daily_claim' || action === 'spin') && body.walletAddress && isAddress(body.walletAddress)) {
      address = wallet(body.walletAddress);
    } else {
      address = await verifyAction(body, action);
    }
    if (action === 'daily_claim') {
      const rewards = [10, 15, 20, 25, 30, 40, 50];
      const state = await rpc('arc_reward_state', { p_wallet: address });
      if (state.claimedToday) throw new Error('Daily streak already claimed');
      const day = (Number(state.streakCount) % 7) + 1;
      result = await rpc('arc_claim_daily_streak', { p_wallet: address, p_reward: rewards[day - 1] });
    } else if (action === 'spin') {
      if (!/^[0-9a-f-]{36}$/i.test(String(body.requestId || ''))) throw new Error('A valid spin request ID is required.');
      const prize = prizes[randomInt(prizes.length)];
      result = await rpc('arc_consume_spin', { p_wallet: address, p_prize_id: prize.id, p_prize_points: prize.points, p_request_id: body.requestId });
      result.prize = prize;
    } else if (action === 'referral_signup') {
      const referredTag = await ensureArcIdentity(body.tag, address);
      const referrerTag = normalizeTag(body.referrerTag);
      const referrerWallet = await lookupReferrerWallet(referrerTag);
      if (!referrerTag || !referrerWallet) throw new Error(`Referral tag ₦${(referrerTag || '').toUpperCase()} is not registered on Arc.`);
      result = await rpc('arc_register_referral', { p_referred_wallet: address, p_referrer_wallet: wallet(referrerWallet), p_referrer_tag: referrerTag, p_referred_tag: referredTag });
    } else if (action === 'tag_claimed') {
      const tag = await ensureArcIdentity(body.tag, address);
      result = await rpc('arc_record_tag_claim', { p_wallet: address, p_tag: tag });
      if (body.referrerTag) {
        try {
          const referrerTag = normalizeTag(body.referrerTag);
          const referrerWallet = await lookupReferrerWallet(referrerTag);
          if (referrerTag && referrerWallet && wallet(referrerWallet) !== address) {
            const refResult = await rpc('arc_register_referral', { p_referred_wallet: address, p_referrer_wallet: wallet(referrerWallet), p_referrer_tag: referrerTag, p_referred_tag: tag });
            result.referral = refResult;
          }
        } catch (refError) {
          console.warn('[Auto-referral on tag claim note]', refError.message);
        }
      }
    } else if (action === 'payment_confirmed') {
      await verifyPayment(body.txHash, address);
      result = await rpc('arc_record_payment_rewards', { p_wallet: address, p_tx_hash: String(body.txHash).toLowerCase() });
    } else {
      return respond(res, 400, { ok: false, error: 'Unsupported Arc rewards action.' });
    }
    return respond(res, 200, { ok: true, result, state: await rpc('arc_reward_state', { p_wallet: address }) });
  } catch (error) {
    const message = error?.message || 'Arc reward action failed.';
    const status = Number(error.status) || (/already claimed|No spins available|already exists|duplicate key/i.test(message) ? 409 : 400);
    return respond(res, status, { ok: false, error: message });
  }
}


