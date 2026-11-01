const STEPS = ['identity', 'avatar', 'personality', 'permissions', 'firstInteraction'];
const cache = new Map();
function storageKey(wallet, tag) {
  const owner = String(wallet || '').toLowerCase();
  const cleanTag = String(tag || '').replace(/^[₦$@#]/, '').trim().toLowerCase();
  return owner && cleanTag ? `${owner}:${cleanTag}` : null;
}
export function getAgentOnboarding(wallet, tag) { return cache.get(storageKey(wallet, tag)) || null; }
export function updateAgentOnboarding(wallet, tag, patch = {}) {
  const key = storageKey(wallet, tag);
  if (!key) return null;
  const previous = getAgentOnboarding(wallet, tag) || {
    version: 1, wallet: String(wallet).toLowerCase(), tag: String(tag).replace(/^[₦$@#]/, '').trim().toLowerCase(),
    steps: Object.fromEntries(STEPS.map((step) => [step, false])), permissions: { memory: true }, points: 0, completed: false,
  };
  const progress = { ...previous, ...patch, steps: previous.steps, points: previous.points, completed: previous.completed, updatedAt: Date.now() };
  cache.set(key, progress);
  window.dispatchEvent(new CustomEvent('nairatag-agent-onboarding-updated', { detail: progress }));
  return progress;
}
export function syncAgentOnboardingRewards(wallet, tag, rewardState) {
  const key = storageKey(wallet, tag);
  if (!key || !rewardState) return null;
  const previous = getAgentOnboarding(wallet, tag) || { version: 1, wallet: String(wallet).toLowerCase(), tag: String(tag).replace(/^[₦$@#]/, '').trim().toLowerCase(), permissions: { memory: true } };
  const steps = Object.fromEntries(STEPS.map((step) => [step, Boolean(rewardState.steps?.[step])]));
  const progress = { ...previous, ...rewardState, steps, points: Number(rewardState.points) || 0, completed: Boolean(rewardState.completed), rewardedSteps: steps, updatedAt: Date.now() };
  cache.set(key, progress);
  window.dispatchEvent(new CustomEvent('nairatag-agent-onboarding-updated', { detail: progress }));
  return progress;
}
export function agentOnboardingAvatar(wallet, tag) { return getAgentOnboarding(wallet, tag)?.avatarData || null; }
