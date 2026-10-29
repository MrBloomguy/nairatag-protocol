import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { isAddress, verifyMessage } from 'viem';

const ISSUER = 'nairatag-arc';
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const CHALLENGE_TTL_SECONDS = 5 * 60;

function secret() {
  const value = process.env.ARC_SESSION_SECRET;
  if (!value || value.length < 32) throw Object.assign(new Error('Arc account sessions are not configured.'), { status: 503 });
  return value;
}

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function signatureFor(input) {
  return createHmac('sha256', secret()).update(input).digest('base64url');
}

function sign(payload) {
  const input = encode({ alg: 'HS256', typ: 'JWT' }) + '.' + encode(payload);
  return input + '.' + signatureFor(input);
}

function verify(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw Object.assign(new Error('Account session is invalid. Sign in again.'), { status: 401 });
  const input = parts[0] + '.' + parts[1];
  const expected = Buffer.from(signatureFor(input));
  const supplied = Buffer.from(parts[2]);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    throw Object.assign(new Error('Account session is invalid. Sign in again.'), { status: 401 });
  }
  let payload;
  try { payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')); }
  catch { throw Object.assign(new Error('Account session is invalid. Sign in again.'), { status: 401 }); }
  if (payload.iss !== ISSUER || !Number.isFinite(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)) {
    throw Object.assign(new Error('Account session has expired. Sign in again.'), { status: 401 });
  }
  return payload;
}

function normalizeWallet(value) {
  const wallet = String(value || '').trim();
  if (!isAddress(wallet)) throw Object.assign(new Error('Enter a valid Arc wallet address.'), { status: 400 });
  return wallet.toLowerCase();
}

export function issueArcSession(walletAddress, authProvider) {
  const wallet = normalizeWallet(walletAddress);
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + SESSION_TTL_SECONDS;
  return { token: sign({ iss: ISSUER, sub: wallet, provider: authProvider, iat: now, exp: expiresAt }), expiresAt: expiresAt * 1000 };
}

export function readArcSession(req) {
  const header = String(req.headers?.authorization || '');
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const payload = verify(match[1]);
  const walletAddress = normalizeWallet(payload.sub);
  return { walletAddress, provider: payload.provider, expiresAt: payload.exp * 1000 };
}

export function createWalletLoginChallenge(walletAddress) {
  const wallet = normalizeWallet(walletAddress);
  const now = Math.floor(Date.now() / 1000);
  const nonce = randomBytes(18).toString('base64url');
  const message = [
    'NairaTag Arc Account Sign-In',
    'Wallet: ' + wallet,
    'Chain: 5042',
    'Nonce: ' + nonce,
    'Issued At: ' + new Date(now * 1000).toISOString(),
    'Expiration Time: ' + new Date((now + CHALLENGE_TTL_SECONDS) * 1000).toISOString(),
  ].join('\n');
  const challengeToken = sign({ iss: ISSUER, typ: 'wallet_challenge', sub: wallet, nonce, message, iat: now, exp: now + CHALLENGE_TTL_SECONDS });
  return { challengeToken, message };
}

export async function completeWalletLogin({ walletAddress, challengeToken, signature }) {
  const wallet = normalizeWallet(walletAddress);
  const challenge = verify(challengeToken);
  if (challenge.typ !== 'wallet_challenge' || challenge.sub !== wallet || typeof challenge.message !== 'string' || !signature) {
    throw Object.assign(new Error('Wallet sign-in challenge is invalid.'), { status: 401 });
  }
  if (!await verifyMessage({ address: wallet, message: challenge.message, signature })) {
    throw Object.assign(new Error('Wallet sign-in signature could not be verified.'), { status: 401 });
  }
  return issueArcSession(wallet, 'wallet');
}

export async function completeCircleLogin({ userToken, walletAddress }) {
  const wallet = normalizeWallet(walletAddress);
  const apiKey = process.env.CIRCLE_API_KEY;
  if (!apiKey) throw Object.assign(new Error('Circle sign-in verification is not configured.'), { status: 503 });
  if (typeof userToken !== 'string' || userToken.length < 20 || userToken.length > 8192) {
    throw Object.assign(new Error('Complete Circle sign-in again.'), { status: 401 });
  }
  let response;
  try {
    response = await fetch('https://api.circle.com/v1/w3s/wallets', {
      headers: { Authorization: 'Bearer ' + apiKey, 'X-User-Token': userToken, Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw Object.assign(new Error('Circle could not verify this sign-in. Try again.'), { status: 503 });
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error('Circle sign-in could not be verified. Please sign in again.'), { status: 401 });
  const wallets = result?.data?.wallets || result?.wallets || [];
  const ownsArcWallet = wallets.some((entry) => String(entry.address || '').toLowerCase() === wallet
    && ['ARC', 'ARC-TESTNET'].includes(String(entry.blockchain || '').toUpperCase()));
  if (!ownsArcWallet) throw Object.assign(new Error('This Circle account does not own the requested Arc Testnet wallet.'), { status: 403 });
  return issueArcSession(wallet, 'circle');
}
