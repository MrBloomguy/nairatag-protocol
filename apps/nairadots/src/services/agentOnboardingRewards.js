import { getArcSessionToken } from './arcSession.js';

const REWARDS_API = import.meta.env.VITE_ARC_REWARDS_API || (import.meta.env.DEV ? '/api/arc-rewards' : 'https://nairatag.ng/api/arc-rewards');

export async function claimAgentOnboardingReward({ walletAddress, tag, step }) {
  return requestAgentOnboardingRewards({ action: 'agent_onboarding_step', walletAddress, tag, step });
}

export async function getAgentOnboardingRewardState({ walletAddress, tag }) {
  return requestAgentOnboardingRewards({ action: 'agent_onboarding_state', walletAddress, tag });
}

async function requestAgentOnboardingRewards(body) {
  const { walletAddress } = body;
  const token = getArcSessionToken(walletAddress);
  if (!token) throw new Error('Your account session expired. Sign in again to sync your onboarding rewards.');
  const response = await fetch(REWARDS_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) throw new Error(payload.error || `Onboarding rewards returned ${response.status}.`);
  return payload;
}
