import { createHmac } from 'node:crypto';
import { expect, it } from 'vitest';
import { walletFromSession } from '../src/server/tenant-auth.js';

const secret = 'nairatag test session secret long enough for verification';
const wallet = '0x1234567890abcdef1234567890abcdef12345678';

function session(provider: string, overrides: Record<string, unknown> = {}) {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({
    iss: 'nairatag-arc', provider, sub: wallet, exp: Math.floor(Date.now() / 1000) + 60,
    ...overrides,
  });
  const input = `${header}.${payload}`;
  return `${input}.${createHmac('sha256', secret).update(input).digest('base64url')}`;
}

it('accepts wallet and Circle email sessions for the same isolated wallet workspace', () => {
  process.env.ARC_SESSION_SECRET = secret;
  for (const provider of ['wallet', 'circle']) {
    const request = new Request('https://agents.nairatag.ng/api/state', {
      headers: { Authorization: `Bearer ${session(provider)}` },
    });
    expect(walletFromSession(request)).toBe(wallet);
  }
});

it('rejects unsupported providers, expired sessions, and tampered tokens', () => {
  process.env.ARC_SESSION_SECRET = secret;
  const request = (token: string) => new Request('https://agents.nairatag.ng/api/state', {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(walletFromSession(request(session('other')))).toBeNull();
  expect(walletFromSession(request(session('circle', { exp: 1 })))).toBeNull();
  const valid = session('wallet');
  const signatureStart = valid.lastIndexOf('.') + 1;
  const tampered = `${valid.slice(0, signatureStart)}${valid[signatureStart] === 'A' ? 'B' : 'A'}${valid.slice(signatureStart + 1)}`;
  expect(walletFromSession(request(tampered))).toBeNull();
});
