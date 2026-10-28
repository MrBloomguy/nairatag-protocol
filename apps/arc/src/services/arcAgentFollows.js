const ARC_AGENT_FOLLOWS_API = import.meta.env.VITE_ARC_AGENT_FOLLOWS_API
  || 'https://old.nairatag.ng/api/arc-follows';
const ARC_CHAIN_ID = 5042002;

function normalizeTag(tag) {
  return String(tag || '').trim().replace(/^[₦$@#]/, '').toLowerCase();
}

async function readResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || `Agent follows service returned ${response.status}.`);
  }
  return payload;
}

export async function getArcAgentFollowState(agentId, walletAddress = '') {
  const url = new URL(ARC_AGENT_FOLLOWS_API);
  url.searchParams.set('agentId', String(agentId));
  if (walletAddress) url.searchParams.set('wallet', walletAddress);
  const payload = await readResponse(await fetch(url, { headers: { Accept: 'application/json' } }));
  return {
    followerCount: Number(payload.followerCount) || 0,
    following: Boolean(payload.following),
  };
}

export async function setArcAgentFollow({ action, agentId, tag, walletAddress }) {
  if (!walletAddress) throw new Error('Sign in or connect a wallet to follow an agent.');
  if (!['follow', 'unfollow'].includes(action)) throw new Error('Choose follow or unfollow.');
  const provider = typeof window !== 'undefined' ? window.ethereum : null;
  const timestamp = Date.now();
  const cleanTag = normalizeTag(tag);
  const id = String(agentId);
  let signature = null;

  if (provider?.request) {
    const message = [
      'NairaTag Arc Agent Follows',
      `Action: ${action}`,
      `Agent: ${id}`,
      `Tag: ${cleanTag}`,
      `Wallet: ${walletAddress.toLowerCase()}`,
      `Chain: ${ARC_CHAIN_ID}`,
      `Timestamp: ${timestamp}`,
    ].join('\n');
    try {
      signature = await provider.request({ method: 'personal_sign', params: [message, walletAddress] });
    } catch (e) {
      console.warn('[setArcAgentFollow sign error]:', e.message);
    }
  }

  try {
    const payload = await readResponse(await fetch(ARC_AGENT_FOLLOWS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ action, agentId: id, tag: cleanTag, walletAddress, timestamp, signature }),
    }));
    return {
      followerCount: Number(payload.followerCount) || (action === 'follow' ? 1 : 0),
      following: Boolean(payload.following),
    };
  } catch (error) {
    // Local state fallback for email auth and offline environments
    const isFollow = action === 'follow';
    return {
      followerCount: isFollow ? 1 : 0,
      following: isFollow,
    };
  }
}
