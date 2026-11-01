import { listArcTasks } from './arcTasks.js';
const claimsByWallet = new Map();
const CLAIM_API = import.meta.env.VITE_ARC_ADMIN_API || '/api/arc-admin';
export const IN_HOUSE_TASKS = [];
function storageKey(wallet) { return String(wallet || '').toLowerCase(); }
export function getInHouseVouchers(wallet) { return claimsByWallet.get(storageKey(wallet)) || []; }
export async function syncInHouseVouchers(walletAddress) {
  const provider = window.ethereum;
  if (!walletAddress || !provider?.request) throw new Error('Connect your wallet to load voucher claims.');
  const accounts = await provider.request({ method: 'eth_accounts' });
  if (!Array.isArray(accounts) || !accounts.some((account) => account.toLowerCase() === walletAddress.toLowerCase())) throw new Error('Reconnect the wallet that owns these voucher claims.');
  const timestamp = Date.now();
  const message = ['NairaTag Arc Vouchers', 'Action: list_claims', `Wallet: ${walletAddress.toLowerCase()}`, 'Chain: 5042', `Timestamp: ${timestamp}`].join('\n');
  const signature = await provider.request({ method: 'personal_sign', params: [message, walletAddress] });
  const url = new URL(CLAIM_API, window.location.origin);
  Object.entries({ action: 'claims', walletAddress, timestamp, signature }).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  const response = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) throw new Error(payload.error || 'Voucher claims could not be loaded.');
  const claims = (payload.claims || []).map((claim) => ({ taskId: claim.voucher_id, name: claim.arc_vouchers?.title || claim.voucher_id, value: `${Number(claim.arc_vouchers?.points) || 0} Protocol Points after approval`, earnedAt: claim.created_at, status: claim.status, claimId: claim.id, proof: claim.proof }));
  claimsByWallet.set(storageKey(walletAddress), claims);
  window.dispatchEvent(new CustomEvent('nairatag-inhouse-vouchers-updated', { detail: { walletAddress: walletAddress.toLowerCase(), vouchers: claims } }));
  return claims;
}
export async function claimInHouseVoucher() { throw new Error('Bundled voucher tasks have been retired.'); }


export async function listSocialTasks() { return (await listArcTasks()).tasks; }





