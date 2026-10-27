import { isAddress, recoverMessageAddress } from 'viem';
import { createHmac, timingSafeEqual } from 'node:crypto';

const ARC_CHAIN_ID = 5042002;
const MAX_AGE_MS = 5 * 60_000;
const SESSION_TTL_MS = 12 * 60 * 60_000;

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 12_000) throw Object.assign(new Error('Request is too large.'), { status: 413 });
  }
  try { return raw ? JSON.parse(raw) : {}; }
  catch { throw Object.assign(new Error('Invalid JSON.'), { status: 400 }); }
}

function cleanTag(value) {
  const tag = String(value || '').normalize('NFKC').trim().replace(/^[₦$@#]/, '').toLowerCase();
  if (!/^[a-z0-9_]{2,32}$/.test(tag)) throw Object.assign(new Error('Enter a valid NairaTag.'), { status: 400 });
  return tag;
}

function signedFields(body) {
  return {
    action: String(body.action || ''),
    tag: cleanTag(body.tag),
    ...(body.targetTag ? { targetTag: cleanTag(body.targetTag) } : {}),
    ...(body.requestTag ? { requestTag: cleanTag(body.requestTag) } : {}),
    ...(body.visibility ? { visibility: body.visibility } : {}),
    ...(body.decision ? { decision: body.decision } : {}),
    ...(body.displayName ? { displayName: String(body.displayName).trim().slice(0, 48) } : {}),
    ...(body.avatarUrl ? { avatarUrl: String(body.avatarUrl).slice(0, 500) } : {}),
    ...(body.bio ? { bio: String(body.bio).trim().slice(0, 160) } : {}),
    walletAddress: String(body.walletAddress || '').toLowerCase(),
    chainId: Number(body.chainId),
    timestamp: Number(body.timestamp),
  };
}

function authMessage(fields) {
  const entries = Object.entries(fields).sort(([left], [right]) => left.localeCompare(right));
  return ['NairaTag Social Graph', ...entries.map(([key, value]) => `${key}: ${value}`)].join('\n');
}

async function authorize(body) {
  const fields = signedFields(body);
  if (!isAddress(fields.walletAddress)) throw Object.assign(new Error('A valid connected wallet is required.'), { status: 401 });
  if (!Number.isSafeInteger(fields.timestamp) || Math.abs(Date.now() - fields.timestamp) > MAX_AGE_MS) {
    throw Object.assign(new Error('The request expired. Please try again.'), { status: 401 });
  }
  if (fields.chainId !== ARC_CHAIN_ID) throw Object.assign(new Error('Switch to Arc Testnet and try again.'), { status: 400 });
  if (!/^0x[a-f\d]{130}$/i.test(String(body.signature || ''))) throw Object.assign(new Error('A wallet signature is required.'), { status: 401 });
  const recovered = await recoverMessageAddress({ message: authMessage(fields), signature: body.signature });
  if (recovered.toLowerCase() !== fields.walletAddress) throw Object.assign(new Error('The signature does not match this wallet.'), { status: 401 });
  return fields;
}

function dbConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw Object.assign(new Error('Social profiles are not configured on this server.'), { status: 503 });
  return { url: url.replace(/\/$/, ''), key };
}

function sessionSecret() {
  const secret = process.env.ARC_SOCIAL_SESSION_SECRET;
  if (!secret || secret.length < 32) throw Object.assign(new Error('Social sessions are not configured on this server.'), { status: 503 });
  return secret;
}

function signSession(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', sessionSecret()).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

function readSession(req, body) {
  const token = String(req.headers?.authorization || '').replace(/^Bearer\s+/i, '');
  const [encoded, suppliedSignature] = token.split('.');
  if (!encoded || !suppliedSignature) throw Object.assign(new Error('Sign in to NairaTag social to continue.'), { status: 401 });
  const expected = createHmac('sha256', sessionSecret()).update(encoded).digest();
  let actual;
  try { actual = Buffer.from(suppliedSignature, 'base64url'); } catch { actual = Buffer.alloc(0); }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw Object.assign(new Error('Social session is invalid. Sign in again.'), { status: 401 });
  let session;
  try { session = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')); }
  catch { throw Object.assign(new Error('Social session is invalid. Sign in again.'), { status: 401 }); }
  if (session.expiresAt <= Date.now() || session.tag !== cleanTag(body.tag)
    || session.walletAddress !== String(body.walletAddress || '').toLowerCase()) {
    throw Object.assign(new Error('Social session expired or does not match this NairaTag. Sign in again.'), { status: 401 });
  }
  return { action: String(body.action || ''), tag: session.tag, walletAddress: session.walletAddress };
}

async function db(table, query = '', options = {}) {
  const { url, key } = dbConfig();
  const response = await fetch(`${url}/rest/v1/${table}${query ? `?${query}` : ''}`, {
    method: options.method || 'GET',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.prefer ? { Prefer: options.prefer } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw Object.assign(new Error(data?.message || data?.hint || 'Social database request failed.'), { status: 503 });
  return data;
}

async function resolveTagOwner(tag) {
  const resolver = process.env.NAIRATAG_RESOLVER_API || 'https://nairatag.ng/api/claims';
  const url = new URL(resolver);
  url.searchParams.set('action', 'resolve');
  url.searchParams.set('tag', tag);
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok || !isAddress(payload.address)) {
    throw Object.assign(new Error(`NairaTag ₦${tag.toUpperCase()} could not be verified.`), { status: 404 });
  }
  return String(payload.address).toLowerCase();
}

async function verifyOwnedTag(tag, wallet) {
  const owner = await resolveTagOwner(tag);
  if (owner !== wallet.toLowerCase()) throw Object.assign(new Error(`Wallet does not own ₦${tag.toUpperCase()}.`), { status: 403 });
  return owner;
}

async function ensureProfile(tag) {
  const existing = await db('arc_social_profiles', `tag=eq.${encodeURIComponent(tag)}&select=tag,wallet_address,display_name,avatar_url,bio,visibility,created_at`);
  if (existing?.[0]) return existing[0];
  const owner = await resolveTagOwner(tag);
  const created = await db('arc_social_profiles', 'on_conflict=tag', {
    method: 'POST', prefer: 'resolution=ignore-duplicates,return=representation',
    body: { tag, wallet_address: owner, display_name: tag, avatar_url: null, bio: '', visibility: 'public' },
  });
  if (created?.[0]) return created[0];
  const reread = await db('arc_social_profiles', `tag=eq.${encodeURIComponent(tag)}&select=tag,wallet_address,display_name,avatar_url,bio,visibility,created_at`);
  return reread?.[0] || null;
}

async function upsertProfile(fields, body) {
  await verifyOwnedTag(fields.tag, fields.walletAddress);
  const existing = await db('arc_social_profiles', `tag=eq.${encodeURIComponent(fields.tag)}&select=display_name,avatar_url,bio,visibility`);
  const current = existing?.[0] || {};
  const visibility = body.visibility === 'private' ? 'private' : body.visibility === 'public' ? 'public' : current.visibility || 'public';
  const rows = await db('arc_social_profiles', 'on_conflict=tag', {
    method: 'POST', prefer: 'resolution=merge-duplicates,return=representation',
    body: {
      tag: fields.tag,
      wallet_address: fields.walletAddress,
      display_name: String(body.displayName === undefined ? current.display_name || fields.tag : body.displayName).trim().slice(0, 48),
      avatar_url: body.avatarUrl === undefined ? current.avatar_url || null : typeof body.avatarUrl === 'string' ? body.avatarUrl.slice(0, 500) : null,
      bio: body.bio === undefined ? current.bio || '' : typeof body.bio === 'string' ? body.bio.trim().slice(0, 160) : '',
      visibility,
      updated_at: new Date().toISOString(),
    },
  });
  return rows?.[0];
}

async function follow(fields, targetTag) {
  if (fields.tag === targetTag) throw Object.assign(new Error('You cannot follow your own profile.'), { status: 400 });
  await verifyOwnedTag(fields.tag, fields.walletAddress);
  await ensureProfile(fields.tag);
  const target = await ensureProfile(targetTag);
  if (!target) throw Object.assign(new Error('That profile is unavailable.'), { status: 404 });
  const status = target.visibility === 'private' ? 'pending' : 'accepted';
  await db('arc_social_follows', 'on_conflict=follower_tag,followee_tag', {
    method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
    body: { follower_tag: fields.tag, followee_tag: targetTag, status, updated_at: new Date().toISOString() },
  });
  return { status, targetTag };
}

async function setFollowRequest(fields, body) {
  await verifyOwnedTag(fields.tag, fields.walletAddress);
  await ensureProfile(fields.tag);
  const requestTag = cleanTag(body.requestTag);
  const decision = body.decision === 'accept' ? 'accepted' : 'rejected';
  const relation = await db('arc_social_follows', `follower_tag=eq.${encodeURIComponent(requestTag)}&followee_tag=eq.${encodeURIComponent(fields.tag)}&status=eq.pending&select=follower_tag`);
  if (!relation?.length) throw Object.assign(new Error('That follow request is no longer pending.'), { status: 404 });
  if (decision === 'accepted') {
    await db('arc_social_follows', `follower_tag=eq.${encodeURIComponent(requestTag)}&followee_tag=eq.${encodeURIComponent(fields.tag)}`, {
      method: 'PATCH', prefer: 'return=minimal', body: { status: 'accepted', updated_at: new Date().toISOString() },
    });
  } else {
    await db('arc_social_follows', `follower_tag=eq.${encodeURIComponent(requestTag)}&followee_tag=eq.${encodeURIComponent(fields.tag)}`, { method: 'DELETE' });
  }
  return { requestTag, status: decision };
}

async function unfollow(fields, targetTag) {
  await verifyOwnedTag(fields.tag, fields.walletAddress);
  await db('arc_social_follows', `follower_tag=eq.${encodeURIComponent(fields.tag)}&followee_tag=eq.${encodeURIComponent(targetTag)}`, { method: 'DELETE' });
  return { targetTag, status: 'none' };
}

async function dashboard(fields) {
  await verifyOwnedTag(fields.tag, fields.walletAddress);
  const profile = await ensureProfile(fields.tag);
  const [outgoing, incoming, allProfiles, allAcceptedEdges] = await Promise.all([
    db('arc_social_follows', `follower_tag=eq.${encodeURIComponent(fields.tag)}&select=follower_tag,followee_tag,status,created_at`),
    db('arc_social_follows', `followee_tag=eq.${encodeURIComponent(fields.tag)}&select=follower_tag,followee_tag,status,created_at`),
    db('arc_social_profiles', 'select=tag,wallet_address,display_name,avatar_url,bio,visibility,created_at&order=created_at.desc&limit=500'),
    db('arc_social_follows', 'status=eq.accepted&select=follower_tag,followee_tag&limit=10000'),
  ]);
  const profiles = new Map((allProfiles || []).map((item) => [item.tag, item]));
  const acceptedFollowing = new Set((outgoing || []).filter((row) => row.status === 'accepted').map((row) => row.followee_tag));
  const acceptedFollowers = new Set((incoming || []).filter((row) => row.status === 'accepted').map((row) => row.follower_tag));
  const mutualTags = [...acceptedFollowing].filter((tag) => acceptedFollowers.has(tag));
  const following = (outgoing || []).filter((row) => row.status === 'accepted').map((row) => profiles.get(row.followee_tag)).filter(Boolean);
  const sentRequests = (outgoing || []).filter((row) => row.status === 'pending').map((row) => ({
    ...profiles.get(row.followee_tag), requestedAt: row.created_at,
  })).filter((item) => item.tag);
  const requests = (incoming || []).filter((row) => row.status === 'pending').map((row) => ({
    ...profiles.get(row.follower_tag), requestedAt: row.created_at,
  })).filter((item) => item.tag);
  const followers = (incoming || []).filter((row) => row.status === 'accepted').map((row) => profiles.get(row.follower_tag)).filter(Boolean);
  const mutuals = mutualTags.map((tag) => profiles.get(tag)).filter(Boolean);
  const excluded = new Set([fields.tag, ...acceptedFollowing, ...(outgoing || []).map((row) => row.followee_tag)]);
  const followsByTag = new Map();
  const followersByTag = new Map();
  for (const edge of allAcceptedEdges || []) {
    if (!followsByTag.has(edge.follower_tag)) followsByTag.set(edge.follower_tag, new Set());
    followsByTag.get(edge.follower_tag).add(edge.followee_tag);
    followersByTag.set(edge.followee_tag, (followersByTag.get(edge.followee_tag) || 0) + 1);
  }
  const suggested = (allProfiles || []).filter((item) => item.visibility === 'public' && !excluded.has(item.tag)).map((item) => {
    const itemFollowing = followsByTag.get(item.tag) || new Set();
    const mutualCount = [...acceptedFollowing].filter((followee) => itemFollowing.has(followee)).length;
    return { ...item, mutualCount, suggestionScore: mutualCount * 10 + (followersByTag.get(item.tag) || 0) };
  }).sort((a, b) => b.suggestionScore - a.suggestionScore || new Date(b.created_at) - new Date(a.created_at)).slice(0, 12);
  const followerCount = acceptedFollowers.size;
  return { profile, followers, following, requests, sentRequests, mutuals, suggested, followerCount, followingCount: following.length };
}

async function profileState(fields, targetTag) {
  await verifyOwnedTag(fields.tag, fields.walletAddress);
  await ensureProfile(fields.tag);
  const profile = await ensureProfile(targetTag);
  if (!profile) throw Object.assign(new Error('Profile not found.'), { status: 404 });
  const [relation, viewerFollowing, targetFollowing, followers] = await Promise.all([
    db('arc_social_follows', `follower_tag=eq.${encodeURIComponent(fields.tag)}&followee_tag=eq.${encodeURIComponent(targetTag)}&select=status`),
    db('arc_social_follows', `follower_tag=eq.${encodeURIComponent(fields.tag)}&status=eq.accepted&select=followee_tag`),
    db('arc_social_follows', `follower_tag=eq.${encodeURIComponent(targetTag)}&status=eq.accepted&select=followee_tag`),
    db('arc_social_follows', `followee_tag=eq.${encodeURIComponent(targetTag)}&status=eq.accepted&select=follower_tag`),
  ]);
  const relationStatus = relation?.[0]?.status || 'none';
  const targetFollowees = new Set((targetFollowing || []).map((row) => row.followee_tag));
  const mutualCount = (viewerFollowing || []).filter((row) => targetFollowees.has(row.followee_tag)).length;
  const followingCount = targetFollowing?.length || 0;
  return { profile, followerCount: followers?.length || 0, followingCount, mutualCount, relationStatus };
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Use POST for social graph actions.' });
    if (req.headers?.origin) {
      const originHost = new URL(req.headers.origin).host.toLowerCase();
      const requestHost = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase();
      if (originHost !== requestHost) return json(res, 403, { ok: false, error: 'Cross-origin requests are not allowed.' });
    }
    const body = await readBody(req);
    const fields = body.action === 'session' ? await authorize(body) : readSession(req, body);
    let result;
    switch (fields.action) {
      case 'session': {
        await verifyOwnedTag(fields.tag, fields.walletAddress);
        const expiresAt = Date.now() + SESSION_TTL_MS;
        result = { sessionToken: signSession({ tag: fields.tag, walletAddress: fields.walletAddress, expiresAt }), expiresAt };
        break;
      }
      case 'profile': result = { profile: await upsertProfile(fields, body) }; break;
      case 'follow': result = await follow(fields, cleanTag(body.targetTag)); break;
      case 'unfollow': result = await unfollow(fields, cleanTag(body.targetTag)); break;
      case 'request_decision': result = await setFollowRequest(fields, body); break;
      case 'dashboard': result = await dashboard(fields); break;
      case 'profile_state': result = await profileState(fields, cleanTag(body.targetTag)); break;
      default: return json(res, 400, { ok: false, error: 'Unknown social graph action.' });
    }
    return json(res, 200, { ok: true, ...result });
  } catch (error) {
    return json(res, error.status || 500, { ok: false, error: error.message || 'Social graph request failed.' });
  }
}
