import { createHmac, timingSafeEqual } from 'node:crypto';

function normalizedWallet(value: unknown) {
  const wallet = String(value || '');
  return /^0x[0-9a-f]{40}$/i.test(wallet) ? wallet.toLowerCase() : null;
}

/** Validate the shared NairaTag session issued after wallet or Circle email sign-in. */
export function walletFromSession(request: Request) {
  const authorization = request.headers.get('authorization') || '';
  const token = authorization.match(/^Bearer\s+([^\s]+)$/i)?.[1];
  const secret = process.env.ARC_SESSION_SECRET || '';
  if (!token || secret.length < 32) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    if (header.alg !== 'HS256' || header.typ !== 'JWT') return null;
    const input = `${parts[0]}.${parts[1]}`;
    const expected = createHmac('sha256', secret).update(input).digest('base64url');
    const a = Buffer.from(expected); const b = Buffer.from(parts[2]);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (
      payload.iss !== 'nairatag-arc' ||
      !['wallet', 'circle'].includes(payload.provider) ||
      !Number.isFinite(payload.exp) ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) return null;
    return normalizedWallet(payload.sub);
  } catch { return null; }
}
