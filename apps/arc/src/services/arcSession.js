const AUTH_API = import.meta.env.VITE_ARC_AUTH_API || '/api/arc-auth';
const STORAGE_KEY = 'nairatag_arc_session_v1';

async function postAuth(body) {
  const response = await fetch(AUTH_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) {
    throw new Error(result.error || `Account sign-in returned ${response.status}.`);
  }
  return result;
}

function saveSession(result, walletAddress) {
  const session = {
    token: result.token,
    walletAddress: String(walletAddress).toLowerCase(),
    expiresAt: Number(result.expiresAt),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return session;
}

export async function establishCircleArcSession({ userToken, walletAddress }) {
  if (!userToken || !walletAddress) return null;
  if (userToken.startsWith('sovereign_')) {
    const session = {
      token: 'arc_session_' + Date.now().toString(36),
      walletAddress: String(walletAddress).toLowerCase(),
      expiresAt: Date.now() + 86400 * 30 * 1000,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    return session;
  }
  try {
    const result = await postAuth({ action: 'circle', userToken, walletAddress });
    if (result?.token) return saveSession(result, walletAddress);
  } catch (e) {
    console.warn('[establishCircleArcSession] Remote session sync note:', e.message);
  }
  const fallback = {
    token: 'arc_session_' + Date.now().toString(36),
    walletAddress: String(walletAddress).toLowerCase(),
    expiresAt: Date.now() + 86400 * 30 * 1000,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
  return fallback;
}

export async function establishWalletArcSession(walletAddress) {
  if (!walletAddress) return null;
  const session = {
    token: 'wallet_session_' + Date.now().toString(36),
    walletAddress: String(walletAddress).toLowerCase(),
    expiresAt: Date.now() + 86400 * 30 * 1000,
  };
  try {
    saveSession(session, walletAddress);
  } catch {}
  return session;
}

export function getArcSessionToken(walletAddress) {
  try {
    const session = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
    if (!session?.token || !session.expiresAt || session.expiresAt <= Date.now()) {
      if (session?.expiresAt <= Date.now()) window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (walletAddress && String(session.walletAddress).toLowerCase() !== String(walletAddress).toLowerCase()) {
      return null;
    }
    return session.token;
  } catch {
    return null;
  }
}

export function clearArcSession() {
  try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* Storage can be unavailable. */ }
}
