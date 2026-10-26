const AUTH_API = import.meta.env.VITE_ARC_AUTH_API || 'https://old.nairatag.ng/api/arc-auth';
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
  const result = await postAuth({ action: 'circle', userToken, walletAddress });
  if (!result.token) throw new Error('The account session service returned no session token.');
  return saveSession(result, walletAddress);
}

export async function establishWalletArcSession(walletAddress) {
  if (!walletAddress) throw new Error('Connect a wallet before signing in.');
  const provider = typeof window !== 'undefined' ? window.ethereum : null;
  if (!provider?.request) throw new Error('Your wallet provider is unavailable.');
  const challenge = await postAuth({ action: 'wallet_challenge', walletAddress });
  const signature = await provider.request({ method: 'personal_sign', params: [challenge.message, walletAddress] });
  const result = await postAuth({
    action: 'wallet',
    walletAddress,
    challengeToken: challenge.challengeToken,
    signature,
  });
  if (!result.token) throw new Error('The account session service returned no session token.');
  return saveSession(result, walletAddress);
}

export function getArcSessionToken(walletAddress) {
  try {
    const session = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
    if (!session?.token || !session.expiresAt || session.expiresAt <= Date.now()
      || String(session.walletAddress).toLowerCase() !== String(walletAddress || '').toLowerCase()) {
      if (session?.expiresAt <= Date.now()) window.localStorage.removeItem(STORAGE_KEY);
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
