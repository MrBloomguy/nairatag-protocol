import { getArcSessionToken } from './arcSession.js';

const CLAIM_API = import.meta.env.VITE_ARC_ADMIN_API || '/api/arc-tasks';

function getClaimUrl() {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://arc.nairatag.ng';
  return new URL(CLAIM_API, base);
}

async function read(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) throw new Error(payload.error || 'Social tasks are unavailable.');
  return payload;
}

function notifyClaimsUpdated(walletAddress, claims) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('nairatag-inhouse-vouchers-updated', {
    detail: { walletAddress: walletAddress.toLowerCase(), vouchers: claims },
  }));
}

export async function listSocialTasks() {
  try {
    const url = getClaimUrl();
    url.searchParams.set('action', 'active_vouchers');
    const payload = await read(await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' }));
    const actionLabels = {
      'social-follow-x': 'Follow on X',
      'social-follow-instagram': 'Follow on Instagram',
      'social-join-telegram-channel': 'Join Telegram channel',
      'social-join-telegram-group': 'Join Telegram group',
    };
    return (payload.vouchers || []).map((item) => ({
      id: item.id, title: item.title, description: item.description, category: item.category,
      points: Number(item.points) || 0, participantCount: Number(item.participant_count) || 0,
      url: item.action_url, actionLabel: actionLabels[item.id] || 'Open task',
    }));
  } catch {
    return [];
  }
}

export async function getInHouseVouchers(walletAddress) {
  return syncInHouseVouchers(walletAddress);
}

export async function syncInHouseVouchers(walletAddress) {
  if (!walletAddress) return [];
  const sessionToken = getArcSessionToken(walletAddress);
  if (!sessionToken) return [];
  try {
    const url = getClaimUrl();
    Object.entries({ action: 'claims', walletAddress }).forEach(([key, value]) => url.searchParams.set(key, String(value)));
    const payload = await read(await fetch(url, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${sessionToken}` }, cache: 'no-store',
    }));
    const claims = (payload.claims || []).map((claim) => ({
      taskId: claim.voucher_id, name: claim.arc_vouchers?.title || claim.voucher_id,
      points: Number(claim.arc_vouchers?.points) || 0, value: `${Number(claim.arc_vouchers?.points) || 0} Protocol Points`,
      earnedAt: claim.created_at, status: claim.status, claimId: claim.id, proof: claim.proof,
    }));
    notifyClaimsUpdated(walletAddress, claims);
    return claims;
  } catch {
    return [];
  }
}

export async function claimInHouseVoucher(walletAddress, voucherId, proof) {
  if (!walletAddress) throw new Error('Sign in to submit this task.');
  const sessionToken = getArcSessionToken(walletAddress);
  if (!sessionToken) throw new Error('Your sign-in session expired. Please sign in again to submit this task.');
  const cleanProof = String(proof || '').trim().slice(0, 1000);
  if (cleanProof.length < 3) throw new Error('Add a link or short description as completion evidence.');
  const url = getClaimUrl();
  await read(await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${sessionToken}` },
    body: JSON.stringify({ action: 'claim_voucher', voucherId, walletAddress, proof: cleanProof }),
  }));
  return syncInHouseVouchers(walletAddress);
}
