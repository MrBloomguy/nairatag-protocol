import { getArcRewardState, submitArcRewardAction } from './arcRewards.js';

export async function getDailySpinStats(accountKey) {
  const state = await getArcRewardState(accountKey);
  return state.spins;
}

export async function recordConfirmedPaymentSpin({ accountKey, txHash }) {
  if (!accountKey || !txHash) throw new Error('A wallet and confirmed Arc transaction are required.');
  return submitArcRewardAction({ action: 'payment_confirmed', walletAddress: accountKey, txHash });
}

/** The server checks availability, selects the prize and credits it atomically. */
export async function consumeDailySpin(accountKey) {
  const requestId = crypto.randomUUID();
  const response = await submitArcRewardAction({ action: 'spin', walletAddress: accountKey, requestId });
  const prize = response.result?.prize;
  return { ok: Boolean(prize), prize, stats: response.state.spins, state: response.state };
}
