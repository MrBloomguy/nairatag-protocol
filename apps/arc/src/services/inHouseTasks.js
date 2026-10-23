const STORAGE_PREFIX = 'nairatag_inhouse_vouchers_v1';

const CLAIM_API = import.meta.env.VITE_ARC_ADMIN_API || 'https://nairatag.ng/api/arc-admin';

export const IN_HOUSE_TASKS = [
  { id: 'follow-x', title: 'Follow NairaTag on X', description: 'Stay current with product launches, Arc updates, and community announcements.', actionLabel: 'Follow on X', url: 'https://x.com/NairaTaghq', voucherName: 'X follow reward', voucherValue: '25 Protocol Points after approval', category: 'Community' },
  { id: 'join-telegram', title: 'Join the NairaTag community', description: 'Join the official Telegram channel for product news and community support.', actionLabel: 'Join Telegram', url: 'https://t.me/nairatagupdates', voucherName: 'Community join reward', voucherValue: '25 Protocol Points after approval', category: 'Community' },
  { id: 'share-nairatag', title: 'Share NairaTag with your network', description: 'Tell a friend how to receive USDC through a readable NairaTag.', actionLabel: 'Share NairaTag', url: 'https://twitter.com/intent/tweet?text=Send%20USDC%20to%20a%20readable%20NairaTag%20on%20Arc%20%E2%9A%A1%20Try%20NairaTag%3A%20https%3A%2F%2Farc.nairatag.ng', voucherName: 'NairaTag sharing reward', voucherValue: '50 Protocol Points after approval', category: 'Community' },
  { id: 'claim-tag', title: 'Claim your NairaTag', description: 'Create your personal payment identity and make it easy for others to pay you.', actionLabel: 'Claim a NairaTag', url: 'https://arc.nairatag.ng/#claim', voucherName: 'NairaTag starter reward', voucherValue: '100 Protocol Points after approval', category: 'Getting started' },
  { id: 'refer-friend', title: 'Invite a friend to NairaTag', description: 'Share your referral link. Referral milestones and their Protocol Points are tracked in Rewards.', actionLabel: 'Open referral rewards', url: 'rewards-referral', voucherName: 'Community referral reward', voucherValue: '100 Protocol Points after approval', category: 'Referrals' },
];

function storageKey(walletAddress) {
  const wallet = String(walletAddress || '').toLowerCase();
  return wallet ? `${STORAGE_PREFIX}:${wallet}` : '';
}

export function getInHouseVouchers(walletAddress) {
  const key = storageKey(walletAddress);
  if (!key || typeof window === 'undefined') return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export async function syncInHouseVouchers(walletAddress) {
  const provider = typeof window !== 'undefined' ? window.ethereum : null;
  if (!walletAddress || !provider?.request) return getInHouseVouchers(walletAddress);
  const accounts = await provider.request({ method: 'eth_accounts' });
  if (!Array.isArray(accounts) || !accounts.some((account) => account.toLowerCase() === walletAddress.toLowerCase())) return getInHouseVouchers(walletAddress);
  const timestamp = Date.now();
  const message = ['NairaTag Arc Vouchers', 'Action: list_claims', `Wallet: ${walletAddress.toLowerCase()}`, 'Chain: 5042002', `Timestamp: ${timestamp}`].join('\n');
  const signature = await provider.request({ method: 'personal_sign', params: [message, walletAddress] });
  const url = new URL(CLAIM_API);
  Object.entries({ action: 'claims', walletAddress, timestamp, signature }).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  const response = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) throw new Error(payload.error || 'Voucher claims could not be loaded.');
  const tasks = new Map(IN_HOUSE_TASKS.map((task) => [task.id, task]));
  const claims = (payload.claims || []).map((claim) => {
    const task = tasks.get(claim.voucher_id);
    return { taskId: claim.voucher_id, name: task?.voucherName || claim.arc_vouchers?.title || claim.voucher_id,
      value: `${Number(claim.arc_vouchers?.points) || 0} Protocol Points after approval`, earnedAt: claim.created_at,
      status: claim.status, claimId: claim.id, proof: claim.proof };
  });
  const key = storageKey(walletAddress);
  if (key && typeof window !== 'undefined') {
    window.localStorage.setItem(key, JSON.stringify(claims));
    window.dispatchEvent(new CustomEvent('nairatag-inhouse-vouchers-updated', { detail: { walletAddress: walletAddress.toLowerCase(), vouchers: claims } }));
  }
  return claims;
}

export async function claimInHouseVoucher(walletAddress, taskId) {
  const task = IN_HOUSE_TASKS.find((item) => item.id === taskId);
  const key = storageKey(walletAddress);
  if (!task || !key || typeof window === 'undefined') throw new Error('Connect your wallet to claim this voucher.');
  const existing = getInHouseVouchers(walletAddress);
  const alreadyClaimed = existing.some((voucher) => voucher.taskId === taskId);
  if (alreadyClaimed) return existing;
  const provider = typeof window !== 'undefined' ? window.ethereum : null;
  if (!provider?.request) throw new Error('Connect a compatible wallet to submit this task.');
  const proof = window.prompt(`Briefly describe how you completed “${task.title}”. For a social share, paste the post URL.`);
  if (!proof?.trim()) throw new Error('Add completion details before submitting.');
  const timestamp = Date.now();
  const message = ['NairaTag Arc Vouchers', 'Action: claim_voucher', `Voucher: ${taskId}`,
    `Wallet: ${String(walletAddress).toLowerCase()}`, 'Chain: 5042002', `Timestamp: ${timestamp}`, `Proof: ${proof.trim().slice(0, 1000)}`].join('\n');
  const signature = await provider.request({ method: 'personal_sign', params: [message, walletAddress] });
  const response = await fetch(CLAIM_API, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ action: 'claim_voucher', voucherId: taskId, walletAddress, proof: proof.trim().slice(0, 1000), timestamp, signature }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) throw new Error(payload.error || `Voucher task submission failed (${response.status}).`);
  const next = [{
    taskId: task.id,
    name: task.voucherName,
    value: task.voucherValue,
    earnedAt: new Date().toISOString(),
    status: 'pending_review',
    claimId: payload.result?.id,
  }, ...existing];
  window.localStorage.setItem(key, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('nairatag-inhouse-vouchers-updated', { detail: { walletAddress: String(walletAddress).toLowerCase(), vouchers: next } }));
  return next;
}
