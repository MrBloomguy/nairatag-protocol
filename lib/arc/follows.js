import { createPublicClient, http, isAddress, parseAbi, verifyMessage } from 'viem';
import { supabase } from '../supabase.js';

const ARC_CHAIN_ID = 5042002;
const RPC_URL = process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.io';
const IDENTITY_REGISTRY = '0x8004A818BFB912233c491871b3d84c89A494BD9e';
const NAIRATAG_REGISTRY = '0x034f64b644988406ded382ebabb5c981bd19684a';
const identityAbi = parseAbi(['function ownerOf(uint256 tokenId) view returns (address)']);
const tagAbi = parseAbi(['function resolve(string name) view returns (address)']);
const publicClient = createPublicClient({ transport: http(RPC_URL) });
const MAX_SIGNATURE_AGE_MS = 5 * 60 * 1000;

function respond(res, status, payload) {
  return res.status(status).json(payload);
}

function normalizeWallet(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeTag(value) {
  return String(value || '').trim().replace(/^[₦$@#]/, '').toLowerCase();
}

function signedMessage({ action, agentId, tag, walletAddress, timestamp }) {
  return [
    'NairaTag Arc Agent Follows',
    `Action: ${action}`,
    `Agent: ${agentId}`,
    `Tag: ${normalizeTag(tag)}`,
    `Wallet: ${normalizeWallet(walletAddress)}`,
    `Chain: ${ARC_CHAIN_ID}`,
    `Timestamp: ${timestamp}`,
  ].join('\n');
}

async function verifyWalletAction(body) {
  const address = String(body.walletAddress || '').trim();
  const timestamp = Number(body.timestamp);
  if (!isAddress(address) || !body.signature || !Number.isFinite(timestamp)) {
    throw new Error('A valid wallet, timestamp, and signature are required.');
  }
  if (Math.abs(Date.now() - timestamp) > MAX_SIGNATURE_AGE_MS) {
    throw new Error('Wallet signature expired. Please try again.');
  }
  const valid = await verifyMessage({
    address,
    message: signedMessage({ ...body, walletAddress: address, timestamp }),
    signature: body.signature,
  });
  if (!valid) throw new Error('Wallet signature could not be verified.');
  return normalizeWallet(address);
}

async function assertArcAgent(agentId, tag) {
  if (!/^\d{1,78}$/.test(String(agentId || ''))) throw new Error('A valid Arc agent ID is required.');
  const cleanTag = normalizeTag(tag);
  if (!/^[a-z0-9_]{2,32}$/.test(cleanTag)) throw new Error('A valid NairaTag is required.');
  if (await publicClient.getChainId() !== ARC_CHAIN_ID) throw new Error('Arc agent follows are temporarily unavailable on the configured network.');

  let owner;
  try {
    owner = await publicClient.readContract({
      address: IDENTITY_REGISTRY,
      abi: identityAbi,
      functionName: 'ownerOf',
      args: [BigInt(agentId)],
    });
  } catch {
    throw new Error('This Arc ERC-8004 agent could not be found.');
  }
  if (!isAddress(owner) || /^0x0{40}$/i.test(owner)) throw new Error('This Arc ERC-8004 agent could not be found.');

  const resolvedOwner = await publicClient.readContract({
    address: NAIRATAG_REGISTRY,
    abi: tagAbi,
    functionName: 'resolve',
    args: [cleanTag],
  });
  if (!isAddress(resolvedOwner) || normalizeWallet(resolvedOwner) !== normalizeWallet(owner)) {
    throw new Error('This NairaTag is not owned by the selected Arc agent.');
  }
  return normalizeWallet(owner);
}

async function getFollowState(agentId, walletAddress = '') {
  const [{ count, error: countError }, relationship] = await Promise.all([
    supabase.from('arc_agent_follows').select('follower_wallet', { count: 'exact', head: true }).eq('agent_id', agentId),
    walletAddress
      ? supabase.from('arc_agent_follows').select('follower_wallet').eq('agent_id', agentId).eq('follower_wallet', walletAddress).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (countError || relationship.error) throw new Error('Arc follow data is unavailable.');
  return { followerCount: count || 0, following: Boolean(relationship.data) };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (!process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return respond(res, 503, { ok: false, error: 'Arc follow storage is not configured.' });
  }
  if (!process.env.SUPABASE_SECRET_KEY) {
    return respond(res, 503, { ok: false, error: 'Arc follow storage credentials are not configured.' });
  }

  if (req.method === 'GET') {
    const agentId = String(req.query?.agentId || '').trim();
    const walletAddress = normalizeWallet(req.query?.wallet);
    if (!/^\d{1,78}$/.test(agentId) || (walletAddress && !isAddress(walletAddress))) {
      return respond(res, 400, { ok: false, error: 'A valid Arc agent ID and wallet are required.' });
    }
    try {
      return respond(res, 200, { ok: true, ...(await getFollowState(agentId, walletAddress)) });
    } catch (error) {
      return respond(res, 503, { ok: false, error: error.message || 'Could not load Arc follow data.' });
    }
  }

  if (req.method !== 'POST') return respond(res, 405, { ok: false, error: 'Method not allowed.' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const action = String(body.action || '').toLowerCase();
    const agentId = String(body.agentId || '').trim();
    const tag = normalizeTag(body.tag);
    if (!['follow', 'unfollow'].includes(action)) return respond(res, 400, { ok: false, error: 'Choose follow or unfollow.' });

    const followerWallet = await verifyWalletAction({ ...body, action, agentId, tag });
    const agentOwner = await assertArcAgent(agentId, tag);
    if (followerWallet === agentOwner) return respond(res, 409, { ok: false, error: 'You cannot follow your own agent.' });

    if (action === 'follow') {
      const { data, error } = await supabase.from('arc_agent_follows').insert({
        follower_wallet: followerWallet,
        agent_id: agentId,
        agent_tag: tag,
      }).select('follower_wallet').maybeSingle();

      if (error && error.code !== '23505') throw new Error('Could not save this follow.');
      if (data) {
        await supabase.from('arc_reward_notifications').insert({
          wallet_address: agentOwner,
          title: 'A new agent follows you',
          body: `A wallet started following ₦${tag.toUpperCase()}. Open your agent profile to see your community grow.`,
          type: 'social',
          action_label: 'View profile',
          url: '/#agents',
        });
      }
    } else {
      const { error } = await supabase.from('arc_agent_follows')
        .delete()
        .eq('follower_wallet', followerWallet)
        .eq('agent_id', agentId);
      if (error) throw new Error('Could not remove this follow.');
    }

    return respond(res, 200, { ok: true, ...(await getFollowState(agentId, followerWallet)) });
  } catch (error) {
    const message = error?.message || 'Agent follow action failed.';
    const status = /cannot follow your own/i.test(message) ? 409 : /expired|signature|valid wallet/i.test(message) ? 400 : 400;
    return respond(res, status, { ok: false, error: message });
  }
}
