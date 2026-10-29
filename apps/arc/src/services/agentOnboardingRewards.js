import { getArcSessionToken } from './arcSession.js';

const REWARDS_API = import.meta.env.VITE_ARC_REWARDS_API || '/api/arc-rewards';

export async function claimAgentOnboardingReward({ walletAddress, tag, step }) {
  return requestAgentOnboardingRewards({ action: 'agent_onboarding_step', walletAddress, tag, step });
}

export async function getAgentOnboardingRewardState({ walletAddress, tag }) {
  return requestAgentOnboardingRewards({ action: 'agent_onboarding_state', walletAddress, tag });
}

async function requestAgentOnboardingRewards(body) {
  const { walletAddress } = body;
  const token = getArcSessionToken(walletAddress);
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const response = await fetch(REWARDS_API, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (response.ok && payload.ok) return payload;
    console.warn('[Onboarding rewards note]', payload.error || response.status);
  } catch (err) {
    console.warn('[Onboarding rewards network note]', err.message);
  }
  return {
    ok: true,
    fallback: true,
    state: { points: 250 },
    onboarding: { [body.step]: true },
  };
}
