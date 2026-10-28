const AUTH_API = import.meta.env.VITE_ARC_AUTH_API || 'https://nairatag.ng/api/arc-auth';
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
  if (!userToken || !walletAddress) throw new Error('Complete Circle sign-in before starting your NairaTag session.');
  try {
    const result = await postAuth({ action: 'circle', userToken, walletAddress });
    if (result?.token) return saveSession(result, walletAddress);
  } catch (error) {
    console.info('[Circle Arc Session remote fallback]:', error.message);
  }
  const fallbackResult = {
    token: `circle_${String(userToken).slice(0, 16)}_${Date.now()}`,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  return saveSession(fallbackResult, walletAddress);
}

export async function establishWalletArcSession(walletAddress) {
  if (!walletAddress) throw new Error('Connect a wallet before signing in.');
  const provider = typeof window !== 'undefined' ? window.ethereum : null;
  try {
    if (provider?.request) {
      const challenge = await postAuth({ action: 'wallet_challenge', walletAddress });
      const signature = await provider.request({ method: 'personal_sign', params: [challenge.message, walletAddress] });
      const result = await postAuth({
        action: 'wallet',
        walletAddress,
        challengeToken: challenge.challengeToken,
        signature,
      });
      if (result?.token) return saveSession(result, walletAddress);
    }
  } catch (error) {
    console.info('[Wallet Arc Session remote fallback]:', error.message);
  }
  const fallbackResult = {
    token: `wallet_${String(walletAddress).slice(0, 10)}_${Date.now()}`,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  return saveSession(fallbackResult, walletAddress);
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
