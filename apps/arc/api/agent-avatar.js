import { createHmac, timingSafeEqual } from 'node:crypto';

const recentRequests = new Map();
const MAX_IMAGE_CHARS = 4_000_000;

function reply(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function walletFromToken(token) {
  const secret = process.env.ARC_SESSION_SECRET || '';
  if (!token || secret.length < 32) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    if (header.alg !== 'HS256' || header.typ !== 'JWT') return null;
    const expected = createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`).digest('base64url');
    const a = Buffer.from(expected); const b = Buffer.from(parts[2]);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (payload.iss !== 'nairatag-arc' || !['wallet', 'circle'].includes(payload.provider)
      || !Number.isFinite(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    const wallet = String(payload.sub || '');
    return /^0x[0-9a-f]{40}$/i.test(wallet) ? wallet.toLowerCase() : null;
  } catch { return null; }
}

async function requestBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 6_000_000) throw Object.assign(new Error('Request too large.'), { status: 413 });
  }
  try { return raw ? JSON.parse(raw) : {}; }
  catch { throw Object.assign(new Error('Invalid JSON request.'), { status: 400 }); }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return reply(res, 405, { ok: false, error: 'Use POST.' });
  const origin = req.headers.origin;
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase();
  if (origin) {
    try { if (!host || new URL(origin).host.toLowerCase() !== host) return reply(res, 403, { ok: false, error: 'Request origin is not allowed.' }); }
    catch { return reply(res, 403, { ok: false, error: 'Request origin is not allowed.' }); }
  }
  let body;
  try { body = await requestBody(req); }
  catch (error) { return reply(res, error.status || 400, { ok: false, error: error.message }); }
  const token = String(req.headers.authorization || '').match(/^Bearer\s+([^\s]+)$/i)?.[1];
  const owner = walletFromToken(token);
  if (!owner || owner !== String(body.walletAddress || '').toLowerCase()) return reply(res, 401, { ok: false, error: 'Sign in again to create your portrait.' });
  const { image, mimeType } = body;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType) || typeof image !== 'string' || image.length > MAX_IMAGE_CHARS || !image) {
    return reply(res, 400, { ok: false, error: 'Choose a JPEG, PNG or WebP selfie smaller than 3 MB.' });
  }
  const now = Date.now();
  const recent = (recentRequests.get(owner) || []).filter((time) => now - time < 60 * 60 * 1000);
  if (recent.length >= 3) return reply(res, 429, { ok: false, error: 'You have reached the portrait generation limit. Please try again later.' });
  recentRequests.set(owner, [...recent, now]);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return reply(res, 503, { ok: false, error: 'Portrait generation is not configured yet. You can choose an illustrated starter portrait.' });
  if (process.env.GEMINI_API_PAID_TIER !== 'true') return reply(res, 503, { ok: false, error: 'Portrait generation is disabled until the server is configured for Gemini’s paid API tier.' });

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        model: process.env.GEMINI_IMAGE_MODEL || 'gemini-nano-banana-2.1',
        input: [
          { type: 'text', text: 'Transform the person in this reference selfie into a polished, friendly 2D caricature portrait for a personal AI agent avatar. Preserve their recognizable face, skin tone, hairstyle, and key facial features. Use clean vector-like illustration, warm coral accents, a simple uncluttered background, shoulders-up composition, centered face, crisp outlines, and strong readability at small chat-icon size. Show only one person. Do not add text, logos, robots, helmets, or extra people.' },
          { type: 'image', mime_type: mimeType, data: image },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = result.error?.message || 'Gemini could not create this portrait.';
      return reply(res, response.status === 429 ? 429 : 502, { ok: false, error: message.slice(0, 240) });
    }
    const output = result.output_image;
    if (!output?.data) return reply(res, 502, { ok: false, error: 'Gemini returned no portrait. Please try another photo.' });
    return reply(res, 200, { ok: true, image: output.data, mimeType: output.mime_type || 'image/png' });
  } catch (error) {
    return reply(res, 502, { ok: false, error: error.name === 'TimeoutError' ? 'Portrait generation took too long. Please try again.' : 'Portrait generation is temporarily unavailable.' });
  }
}
