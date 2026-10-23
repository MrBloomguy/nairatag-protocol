// Circle's Web SDK uses jsonwebtoken.decode() only for social-login nonce checks.
// Keep the same non-verifying payload decode behavior without bundling Node crypto/streams.
export function decode(token) {
  if (typeof token !== 'string') return null;
  const payload = token.split('.')[1];
  if (!payload) return null;

  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const bytes = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
    const decoded = JSON.parse(new TextDecoder().decode(bytes));
    return decoded && typeof decoded === 'object' ? decoded : null;
  } catch {
    return null;
  }
}
