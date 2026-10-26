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
  if (!walletAddress) throw new Error('Connect your Arc wallet to follow an agent.');
  if (!['follow', 'unfollow'].includes(action)) throw new Error('Choose follow or unfollow.');
  const provider = typeof window !== 'undefined' ? window.ethereum : null;
  if (!provider?.request) throw new Error('A compatible wallet is required to sign this follow action.');

  const timestamp = Date.now();
  const cleanTag = normalizeTag(tag);
  const id = String(agentId);
  const message = [
    'NairaTag Arc Agent Follows',
    `Action: ${action}`,
    `Agent: ${id}`,
    `Tag: ${cleanTag}`,
    `Wallet: ${walletAddress.toLowerCase()}`,
    `Chain: ${ARC_CHAIN_ID}`,
    `Timestamp: ${timestamp}`,
  ].join('\n');
  const signature = await provider.request({ method: 'personal_sign', params: [message, walletAddress] });

  const payload = await readResponse(await fetch(ARC_AGENT_FOLLOWS_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ action, agentId: id, tag: cleanTag, walletAddress, timestamp, signature }),
  }));
  return {
    followerCount: Number(payload.followerCount) || 0,
    following: Boolean(payload.following),
  };
}
