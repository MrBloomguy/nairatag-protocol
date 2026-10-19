import { normalizeTag } from './nairatagResolver.js';
import { submitArcRewardAction } from './arcRewards.js';

const PENDING_REFERRAL_KEY = 'nairatag_pending_referral_v1';
export const REFERRAL_SIGNUP_POINTS = 100;
export const REFERRAL_FIRST_PAYMENT_POINTS = 250;

function cleanTag(tag) {
  const normalized = normalizeTag(String(tag || ''));
  return normalized.valid ? normalized.cleanTag.toLowerCase() : '';
}

export function rememberReferralFromUrl(search = window.location.search) {
  try {
    const tag = cleanTag(new URLSearchParams(search).get('ref'));
    if (!tag) return null;
    const attribution = { tag, capturedAt: Date.now() };
    localStorage.setItem(PENDING_REFERRAL_KEY, JSON.stringify(attribution));
    return attribution;
  } catch { return null; }
}

export function getPendingReferral() {
  try {
    const value = JSON.parse(localStorage.getItem(PENDING_REFERRAL_KEY) || 'null');
    return value && cleanTag(value.tag) ? { ...value, tag: cleanTag(value.tag) } : null;
  } catch { return null; }
}

export function clearPendingReferral() {
  try { localStorage.removeItem(PENDING_REFERRAL_KEY); } catch {}
}

export function createReferralLink(tag) {
  const clean = cleanTag(tag);
  if (!clean || typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  url.pathname = '/';
  url.search = '';
  url.searchParams.set('ref', `₦${clean}`);
  url.hash = 'claim';
  return url.toString();
}

export function recordReferralSignup({ referredTag, referredWallet }) {
  const attribution = getPendingReferral();
  const friendTag = cleanTag(referredTag);
  if (!attribution || !friendTag || !referredWallet || attribution.tag === friendTag) return Promise.resolve(null);
  return submitArcRewardAction({
    action: 'referral_signup',
    walletAddress: referredWallet,
    tag: friendTag,
    referrerTag: attribution.tag,
  }).then(({ result, state }) => {
    clearPendingReferral();
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('nairatag:referrals-updated', { detail: { referrerTag: attribution.tag, referredTag: friendTag, milestone: 'signup', points: REFERRAL_SIGNUP_POINTS } }));
    return { ...result, viewerPoints: REFERRAL_SIGNUP_POINTS, state };
  });
}
