import { getArcRewardState, submitArcRewardAction } from './arcRewards.js';

export async function getDailySpinStats(accountKey) {
  const state = await getArcRewardState(accountKey);
  return state.spins;
}

export async function recordConfirmedPaymentSpin({ accountKey, txHash }) {
  if (!accountKey || !txHash) throw new Error('A wallet and confirmed Arc transaction are required.');
  return submitArcRewardAction({ action: 'payment_confirmed', walletAddress: accountKey, txHash });
}

const pendingSpinRequests = new Map();

/** The server checks availability, selects the prize and credits it atomically. */
export async function consumeDailySpin(accountKey) {
  const wallet = String(accountKey || '').toLowerCase();
  const requestId = pendingSpinRequests.get(wallet) || crypto.randomUUID();
  pendingSpinRequests.set(wallet, requestId);
  const response = await submitArcRewardAction({ action: 'spin', walletAddress: wallet, requestId });
  pendingSpinRequests.delete(wallet);
  const prize = response.result?.prize;
  return { ok: Boolean(prize), prize, stats: response.state.spins, state: response.state };
}
