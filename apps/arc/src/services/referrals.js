import { normalizeTag } from './nairatagResolver.js';
import { submitArcRewardAction } from './arcRewards.js';
export const REFERRAL_SIGNUP_POINTS = 100;
export const REFERRAL_FIRST_PAYMENT_POINTS = 250;
let pendingAttribution = null;
function cleanTag(tag) { const normalized = normalizeTag(String(tag || '')); return normalized.valid ? normalized.cleanTag.toLowerCase() : ''; }
export function rememberReferralFromUrl(search = window.location.search) {
  const tag = cleanTag(new URLSearchParams(search).get('ref'));
  if (!tag) return null;
  pendingAttribution = { tag, capturedAt: Date.now() };
  return pendingAttribution;
}
export function getPendingReferral() {
  const tag = cleanTag(new URLSearchParams(window.location.search).get('ref')) || cleanTag(pendingAttribution?.tag);
  return tag ? { ...(pendingAttribution || {}), tag } : null;
}
export function clearPendingReferral() {
  pendingAttribution = null;
  const url = new URL(window.location.href);
  url.searchParams.delete('ref');
  window.history.replaceState({}, '', url);
}
export function createReferralLink(tag) {
  const clean = cleanTag(tag);
  if (!clean || typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  url.pathname = `/tag/${encodeURIComponent(clean.toUpperCase())}`;
  url.search = '';
  url.searchParams.set('ref', `₦${clean}`);
  url.hash = 'claim';
  return url.toString();
}
export function recordReferralSignup({ referredTag, referredWallet }) {
  const attribution = getPendingReferral();
  const friendTag = cleanTag(referredTag);
  if (!attribution || !friendTag || !referredWallet || attribution.tag === friendTag) return Promise.resolve(null);
  return submitArcRewardAction({ action: 'referral_signup', walletAddress: referredWallet, tag: friendTag, referrerTag: attribution.tag })
    .then(({ result, state }) => {
      clearPendingReferral();
      window.dispatchEvent(new CustomEvent('nairatag:referrals-updated', { detail: { referrerTag: attribution.tag, referredTag: friendTag, milestone: 'signup', points: REFERRAL_SIGNUP_POINTS } }));
      return { ...result, viewerPoints: REFERRAL_SIGNUP_POINTS, state };
    });
}

