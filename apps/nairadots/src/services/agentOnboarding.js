const STEPS = ['identity', 'avatar', 'personality', 'permissions', 'firstInteraction'];

function storageKey(wallet, tag) {
  const owner = String(wallet || '').toLowerCase();
  const cleanTag = String(tag || '').replace(/^[₦$@#]/, '').trim().toLowerCase();
  return owner && cleanTag ? `nairatag_agent_onboarding_v1:${owner}:${cleanTag}` : null;
}

export function getAgentOnboarding(wallet, tag) {
  const key = storageKey(wallet, tag);
  if (!key) return null;
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (!saved || saved.version !== 1) return null;
    const steps = Object.fromEntries(STEPS.map((step) => [step, Boolean(saved.steps?.[step])]));
    return { ...saved, steps, points: Number(saved.points) || 0, completed: Boolean(saved.completed) };
  } catch { return null; }
}

export function updateAgentOnboarding(wallet, tag, patch = {}) {
  const key = storageKey(wallet, tag);
  if (!key) return null;
  const previous = getAgentOnboarding(wallet, tag) || {
    version: 1, wallet: String(wallet).toLowerCase(), tag: String(tag).replace(/^[₦$@#]/, '').trim().toLowerCase(),
    steps: Object.fromEntries(STEPS.map((step) => [step, false])),
    permissions: { memory: true },
  };
  // This device stores preferences and resume metadata only. Reward steps and
  // point totals are reconciled from the server's Protocol Points ledger.
  const progress = { ...previous, ...patch, steps: previous.steps, points: previous.points, completed: previous.completed, updatedAt: Date.now() };
  try {
    localStorage.setItem(key, JSON.stringify(progress));
    window.dispatchEvent(new CustomEvent('nairatag-agent-onboarding-updated', { detail: progress }));
  } catch {
    throw new Error('Your onboarding progress could not be saved on this device. Check available storage and try again.');
  }
  return progress;
}

export function syncAgentOnboardingRewards(wallet, tag, rewardState) {
  const key = storageKey(wallet, tag);
  if (!key || !rewardState) return null;
  const previous = getAgentOnboarding(wallet, tag) || {
    version: 1,
    wallet: String(wallet).toLowerCase(),
    tag: String(tag).replace(/^[₦$@#]/, '').trim().toLowerCase(),
    permissions: { memory: true },
  };
  const steps = Object.fromEntries(STEPS.map((step) => [step, Boolean(rewardState.steps?.[step])]));
  const progress = {
    ...previous,
    ...rewardState,
    steps,
    points: Number(rewardState.points) || 0,
    completed: Boolean(rewardState.completed),
    rewardedSteps: Object.fromEntries(STEPS.map((step) => [step, steps[step]])),
    updatedAt: Date.now(),
  };
  try {
    localStorage.setItem(key, JSON.stringify(progress));
    window.dispatchEvent(new CustomEvent('nairatag-agent-onboarding-updated', { detail: progress }));
  } catch {
    // The server ledger remains authoritative if local caching is unavailable.
  }
  return progress;
}

export function agentOnboardingAvatar(wallet, tag) {
  return getAgentOnboarding(wallet, tag)?.avatarData || null;
}

