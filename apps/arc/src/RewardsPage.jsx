// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Sparkles,
  Trophy,
  ChevronRight,
  Clock,
  Copy,
  Check,
  Share2,
  Info,
  X,
  Coins,
  Ticket,
  Smartphone,
  Flame,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  playMicroSound,
  triggerHaptic,
  sendNotificationAlert,
} from './services/pushNotification.js';
import {
  createReferralLink,
  REFERRAL_FIRST_PAYMENT_POINTS,
  REFERRAL_SIGNUP_POINTS,
} from './services/referrals.js';
import { consumeDailySpin, getDailySpinStats } from './services/wheelRewards.js';
import { getAbstractedRewardAccount, getArcRewardState, submitArcRewardAction } from './services/arcRewards.js';
import { getTagShareUrl, getTelegramShareIntentUrl, getTwitterRewardShareUrl } from './services/arcSocialBroadcast.js';
import './rewards.css';

/**
 * 8 Prize Segments for the AMAZING AWARDS Lucky Wheel
 * (Matching user reference Screenshot 3)
 */
export const WHEEL_PRIZES = [
  { id: 'p0', label: '50 Points', type: 'points', value: 50, color: 'var(--wheel-segment-a)', textColor: 'var(--wheel-label-a)', icon: 'points' },
  { id: 'p1', label: '25 Points', type: 'points', value: 25, color: 'var(--wheel-segment-b)', textColor: 'var(--wheel-label-b)', icon: 'points' },
  { id: 'p2', label: '100 Points', type: 'points', value: 100, color: 'var(--wheel-segment-c)', textColor: 'var(--wheel-label-c)', icon: 'points' },
  { id: 'p3', label: '20 Points', type: 'points', value: 20, color: 'var(--wheel-segment-d)', textColor: 'var(--wheel-label-d)', icon: 'points' },
  { id: 'p4', label: '10 Points', type: 'points', value: 10, color: 'var(--wheel-segment-a)', textColor: 'var(--wheel-label-a)', icon: 'points' },
  { id: 'p5', label: '75 Points', type: 'points', value: 75, color: 'var(--wheel-segment-b)', textColor: 'var(--wheel-label-b)', icon: 'points' },
  { id: 'p6', label: '250 Points', type: 'points', value: 250, color: 'var(--wheel-segment-c)', textColor: 'var(--wheel-label-c)', icon: 'points' },
  { id: 'p7', label: '150 Points', type: 'points', value: 150, color: 'var(--wheel-segment-d)', textColor: 'var(--wheel-label-d)', icon: 'points' },
];

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. GOLDEN VOUCHER PACK MODAL (Matching User Screenshot 1)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function GoldenVoucherModal({ isOpen, onClose, onClaimSuccess }) {
  const [claimed, setClaimed] = useState(false);

  if (!isOpen) return null;

  const handleClaim = () => {
    playMicroSound('chime');
    triggerHaptic([30, 40, 30]);

    try {
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#fbbf24', '#f59e0b', '#34d399', '#3b82f6', '#ec4899'],
      });
    } catch {}

    setClaimed(true);

    setTimeout(() => {
      if (onClaimSuccess) onClaimSuccess();
      onClose();
    }, 1200);
  };

  return (
    <div className="golden-modal-overlay" onClick={onClose}>
      <div className="golden-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Sunburst background rays */}
        <div className="golden-sunburst-backdrop" />

        {/* Floating Confetti Elements */}
        <div className="golden-confetti-particle" style={{ top: -35, left: 30, color: '#34d399' }}>✦</div>
        <div className="golden-confetti-particle" style={{ top: -50, right: 40, color: '#ec4899', fontSize: 18 }}>★</div>
        <div className="golden-confetti-particle" style={{ top: -20, right: 15, color: '#f59e0b', fontSize: 14 }}>✦</div>
        <div className="golden-confetti-particle" style={{ top: -45, left: 70, color: '#3b82f6', fontSize: 12 }}>■</div>

        {/* Top Dome with bursting Gift Box */}
        <div className="golden-top-dome">
          <div className="golden-gift-icon-wrap">
            <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
              <rect x="6" y="16" width="36" height="26" rx="6" fill="#f59e0b" />
              <rect x="6" y="24" width="36" height="4" fill="#d97706" />
              <path d="M4 14C4 11.7909 5.79086 10 8 10H40C42.2091 10 44 11.7909 44 14V17H4V14Z" fill="#fbbf24" />
              <path d="M22 10V42H26V10H22Z" fill="#ffffff" opacity="0.6" />
              {/* Voucher cards bursting out */}
              <rect x="14" y="2" width="12" height="10" rx="2" fill="#38b2ac" transform="rotate(-15 14 2)" />
              <rect x="22" y="1" width="14" height="11" rx="2" fill="#f43f5e" transform="rotate(18 22 1)" />
            </svg>
          </div>
        </div>

        {/* Main Golden Card */}
        <div className="golden-modal-card">
          <h2 className="golden-modal-title">
            Send on Arc and save<br />up to 50%
          </h2>
          <p className="golden-modal-subtitle">
            Get instant protocol discounts & voucher packs now!
          </p>

          {/* Perforated Notched Golden Coupon Tickets */}
          <div className="golden-coupons-list">
            <div className="golden-coupon-item">
              <div className="golden-coupon-left">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="3" width="16" height="16" rx="2" />
                  <path d="M4 11h16" />
                  <path d="M12 3v8" />
                  <path d="m8 19-2 3" />
                  <path d="m16 19 2 3" />
                </svg>
              </div>
              <div className="golden-coupon-right">
                <div className="golden-coupon-value">5% off</div>
                <div className="golden-coupon-expiry">Valid for 7 days.</div>
              </div>
            </div>

            <div className="golden-coupon-item">
              <div className="golden-coupon-left">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="3" width="16" height="16" rx="2" />
                  <path d="M4 11h16" />
                  <path d="M12 3v8" />
                  <path d="m8 19-2 3" />
                  <path d="m16 19 2 3" />
                </svg>
              </div>
              <div className="golden-coupon-right">
                <div className="golden-coupon-value">3% off</div>
                <div className="golden-coupon-expiry">Valid for 7 days.</div>
              </div>
            </div>
          </div>

          {/* Action CTA Button */}
          <button
            type="button"
            className="golden-claim-btn"
            onClick={handleClaim}
            disabled={claimed}
          >
            {claimed ? 'Claimed! Added to Vouchers' : 'Claim Now'}
          </button>
        </div>

        {/* Floating circular Close (X) button below card */}
        <button
          type="button"
          className="golden-modal-close-circle"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={22} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 2. AMAZING AWARDS LUCKY WHEEL MODAL (Matching User Screenshot 3)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function LuckyWheelModal({ isOpen, onClose, onWinPrize, accountKey = '', onRequestConnect, presentation = 'modal' }) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [isSpinPending, setIsSpinPending] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wonPrize, setWonPrize] = useState(null);
  const [isCongratsOpen, setIsCongratsOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [spinStats, setSpinStats] = useState({ earned: 1, spent: 0, available: 1, paymentSpins: 0 });
  const [spinMessage, setSpinMessage] = useState('');

  // Live countdown to midnight (matching screenshot countdown)
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    let active = true;
    getDailySpinStats(accountKey).then((stats) => { if (active) setSpinStats(stats); }).catch((error) => { if (active) setSpinMessage(error.message); });
    let activeDay = getLocalDateKey();
    const updateCountdown = () => {
      const now = new Date();
      const currentDay = getLocalDateKey(now);
      if (currentDay !== activeDay) {
        activeDay = currentDay;
        getDailySpinStats(accountKey).then((stats) => { if (active) setSpinStats(stats); }).catch(() => {});
      }
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diff = Math.max(0, midnight - now);
      const h = String(Math.floor((diff / (1000 * 60 * 60)) % 24)).padStart(2, '0');
      const m = String(Math.floor((diff / (1000 * 60)) % 60)).padStart(2, '0');
      const s = String(Math.floor((diff / 1000) % 60)).padStart(2, '0');
      setTimeLeft(`${h}h:${m}m:${s}s`);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => { active = false; clearInterval(timer); };
  }, [accountKey]);

  useEffect(() => {
    const activeKey = getAbstractedRewardAccount(accountKey);
    const refreshStats = (event) => {
      const eventAccount = event?.detail?.accountKey;
      if (eventAccount && eventAccount !== activeKey && eventAccount !== String(accountKey || '').trim().toLowerCase()) return;
      getDailySpinStats(activeKey).then(setSpinStats).catch((error) => setSpinMessage(error.message));
    };
    refreshStats();
    window.addEventListener('storage', refreshStats);
    window.addEventListener('nairatag:wheel-state-updated', refreshStats);
    window.addEventListener('focus', refreshStats);
    return () => {
      window.removeEventListener('storage', refreshStats);
      window.removeEventListener('nairatag:wheel-state-updated', refreshStats);
      window.removeEventListener('focus', refreshStats);
    };
  }, [accountKey]);

  if (!isOpen) return null;

  const spinTheWheel = async () => {
    if (isSpinning || isSpinPending || isCongratsOpen) return;
    const activeKey = getAbstractedRewardAccount(accountKey);
    if (typeof onWinPrize !== 'function') {
      setSpinMessage('Points rewards are unavailable right now. Please reload and try again.');
      return;
    }
    setSpinMessage('Connecting securely to Arc rewards…');
    setIsSpinPending(true);
    let consumed;
    try {
      consumed = await consumeDailySpin(activeKey);
      setSpinStats(consumed.stats);
      const selectedIndex = WHEEL_PRIZES.findIndex((prize) => prize.id === consumed.prize?.id);
      if (!consumed.ok || selectedIndex < 0) throw new Error('The Arc rewards service did not return a valid spin result.');
      onWinPrize({ ...WHEEL_PRIZES[selectedIndex], value: consumed.prize.points }, consumed.state);
    } catch (error) {
      setSpinMessage(error.message || 'Could not save this spin. Please try again.');
      setIsSpinPending(false);
      return;
    }
    setIsSpinPending(false);
    setSpinMessage('');
    playMicroSound('pop');
    triggerHaptic([30]);
    setIsSpinning(true);

    // Periodic mechanical click sounds during rotation
    const spinSoundInterval = setInterval(() => {
      playMicroSound('spin');
    }, 240);

    // The server selected and credited the prize before the wheel animates.
    const prizeIndex = WHEEL_PRIZES.findIndex((prize) => prize.id === consumed.prize.id);
    const selectedPrize = WHEEL_PRIZES[prizeIndex];

    // Compute target angle: each segment is 45deg (360/8)
    const segmentAngle = 360 / WHEEL_PRIZES.length;
    // Target segment must align with the top pointer (0 deg / 360 deg)
    const targetSegmentCenter = prizeIndex * segmentAngle + segmentAngle / 2;
    // Extra full spins (5 to 8 rotations) for realism
    const extraSpins = 360 * 6;
    // Because pointer is at top (270 or 0 deg), adjust rotation
    const finalAngle = rotation + extraSpins + (360 - (targetSegmentCenter % 360));

    setRotation(finalAngle);

    setTimeout(() => {
      clearInterval(spinSoundInterval);
      setIsSpinning(false);
      setWonPrize(selectedPrize);
      setIsCongratsOpen(true);
      playMicroSound('coin');
      triggerHaptic([50, 40, 60]);

      try {
        confetti({
          particleCount: 110,
          spread: 85,
          origin: { y: 0.6 },
        });
      } catch {}
    }, 4600);
  };

  const isPage = presentation === 'page';

  return (
    <div className={isPage ? 'rewards-subpage-content' : 'wheel-modal-overlay'} onClick={isPage || isSpinning || isSpinPending ? undefined : onClose}>
      <div className={`wheel-modal-view${isPage ? ' rewards-subpage-card' : ''}`} onClick={isPage ? undefined : (e) => e.stopPropagation()}>
        {/* Navigation Bar */}
        <div className="wheel-view-nav">
          <button type="button" className="wheel-back-btn" onClick={onClose} disabled={isSpinning || isSpinPending} aria-label={isPage ? 'Back to Rewards' : 'Close'}>
            {isPage ? <ArrowLeft size={18} /> : <X size={18} />}
          </button>
          <button type="button" className="wheel-rules-btn" onClick={() => setIsRulesOpen(true)} disabled={isSpinning || isSpinPending}>
            Rules
          </button>
        </div>

        <div className="wheel-heading">
          <h1 className="wheel-main-title">Spin &amp; Win</h1>
        </div>

        <div className="wheel-spin-condition-pill">
          <Sparkles size={11} />
          <span>One free spin daily · A confirmed Arc USDC payment earns one more</span>
        </div>

        {/* Wheel Stage */}
        <div className="wheel-stage-container">
          <div className="wheel-outer-ring" aria-hidden="true" />

          {/* Rotating Disc with SVG Segments */}
          <div
            className="wheel-disc"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning ? 'transform 4.5s cubic-bezier(0.12, 0.8, 0.15, 1)' : 'none',
            }}
          >
            <svg viewBox="0 0 300 300" width="100%" height="100%">
              <defs>
                <clipPath id="circleClip">
                  <circle cx="150" cy="150" r="150" />
                </clipPath>
              </defs>
              <g clipPath="url(#circleClip)">
                {WHEEL_PRIZES.map((prize, idx) => {
                  const angle = 360 / WHEEL_PRIZES.length;
                  const startAngle = idx * angle - 90; // offset so segment 0 starts at top
                  const endAngle = startAngle + angle;
                  const startRad = (startAngle * Math.PI) / 180;
                  const endRad = (endAngle * Math.PI) / 180;
                  const x1 = 150 + 150 * Math.cos(startRad);
                  const y1 = 150 + 150 * Math.sin(startRad);
                  const x2 = 150 + 150 * Math.cos(endRad);
                  const y2 = 150 + 150 * Math.sin(endRad);
                  const textRad = ((startAngle + angle / 2) * Math.PI) / 180;
                  const tx = 150 + 95 * Math.cos(textRad);
                  const ty = 150 + 95 * Math.sin(textRad);
                  const textRot = startAngle + angle / 2 + 90;

                  return (
                    <g key={prize.id}>
                      <path
                        d={`M 150 150 L ${x1} ${y1} A 150 150 0 0 1 ${x2} ${y2} Z`}
                        fill={prize.color}
                        stroke="#e2e8f0"
                        strokeWidth="1"
                      />
                      <g transform={`translate(${tx}, ${ty}) rotate(${textRot})`}>
                        <text
                          textAnchor="middle"
                          fill={prize.textColor}
                          fontSize="11"
                          fontWeight="800"
                          fontFamily="sans-serif"
                        >
                          {prize.label}
                        </text>
                {(prize.icon === 'coin' || prize.icon === 'points') && (
                          <circle cx="0" cy="14" r="6" fill="#f59e0b" />
                        )}
                        {prize.icon === 'voucher' && (
                          <rect x="-7" y="10" width="14" height="8" rx="2" fill="#d97706" />
                        )}
                        {prize.icon === 'tv' && (
                          <rect x="-8" y="9" width="16" height="10" rx="1" fill="#0f172a" />
                        )}
                      </g>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>

          {/* Center hub and fixed pointer */}
          <div className="wheel-center-hub" aria-hidden="true">
            <div className="wheel-pointer-needle" />
            <span className="wheel-hub-text">Spin</span>
          </div>
        </div>

        {/* Spin CTA Button */}
        <button
          type="button"
          className="wheel-spin-btn"
          onClick={spinTheWheel}
          disabled={isSpinning || isSpinPending || isCongratsOpen || spinStats.available <= 0}
        >
          {isSpinPending ? 'Securing spin…' : isSpinning ? 'Spinning…' : spinStats.available > 0 ? `Spin now · ${spinStats.available} available` : 'No spins left today'}
        </button>
        <p className="wheel-spin-feedback" aria-live="polite">{spinMessage}</p>

        {/* Stats Card Below */}
        <div className="wheel-stats-card">
          <div className="wheel-countdown-row">
            <Clock size={13} />
          <span>Daily reset in: {timeLeft || '…'}</span>
          </div>

          <div className="wheel-metrics-grid">
            <div>
              <div className="wheel-metric-label">Spins Earned Today</div>
              <div className="wheel-metric-val">
                <Ticket size={15} aria-hidden="true" />
                <span>{spinStats.earned}</span>
              </div>
            </div>
            <div>
              <div className="wheel-metric-label">Available Spins</div>
              <div className="wheel-metric-val">
                <Ticket size={15} aria-hidden="true" />
                <span>{spinStats.available}</span>
              </div>
            </div>
          </div>


        </div>

        {/* Rules Dialog */}
        {isRulesOpen && (
          <div className="congrats-modal-overlay" onClick={() => setIsRulesOpen(false)}>
            <div className="congrats-modal-dialog" onClick={(e) => e.stopPropagation()}>
              <h3 className="congrats-title">Spin & Win Rules</h3>
              <p className="congrats-subtitle" style={{ textAlign: 'left', lineHeight: '1.6', marginTop: '12px' }}>
                • You receive one free spin each day.<br /><br />
                • One successful Arc USDC payment confirmed on-chain unlocks one extra spin, up to two spins total each day.<br /><br />
                • Each of the eight Protocol Points prizes has an equal chance. The selected reward is credited immediately, and a started spin cannot be replayed.
              </p>
              <button
                type="button"
                className="congrats-got-it-btn"
                onClick={() => setIsRulesOpen(false)}
              >
                Understood
              </button>
            </div>
          </div>
        )}

        {/* Congratulations Modal Overlay */}
        <CongratulationsModal
          isOpen={isCongratsOpen}
          onClose={() => setIsCongratsOpen(false)}
          prize={wonPrize}
        />
      </div>
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 3. CONGRATULATIONS YOU HAVE EARNED MODAL (Matching User Screenshot 2)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function CongratulationsModal({ isOpen, onClose, prize }) {
  if (!isOpen) return null;

  return (
    <div className="congrats-modal-overlay" onClick={onClose}>
      <div className="congrats-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="congrats-close-x" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <h3 className="congrats-title">Congratulations</h3>
        <p className="congrats-subtitle">You have earned</p>

        <div className="congrats-earned-list">
          <div className="congrats-item-card">
            <div className="congrats-item-left">
              <div className="congrats-item-icon">
                <Sparkles size={18} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div className="congrats-item-title">{prize?.label || 'Arc Rewards Bonus'}</div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>Added to your Protocol Points balance</div>
              </div>
            </div>
            <div className="congrats-item-reward">
              <span style={{ fontSize: '12px' }}>🪙</span>
              <span>+{prize?.value || 30} Pts</span>
            </div>
          </div>
        </div>

        <button type="button" className="congrats-got-it-btn" onClick={onClose}>
          Got It
        </button>
      </div>
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 4. REFERRAL FRIENDS VIEW MODAL (Matching User Screenshot 4)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function ReferralModal({ isOpen, onClose, userTag = '', accountKey = '', presentation = 'modal' }) {
  const [copied, setCopied] = useState(false);
  const [referralError, setReferralError] = useState('');
  const cleanTag = String(userTag || '').replace(/^[$₦@#]/, '').trim().toLowerCase();
  const inviteCode = cleanTag ? `₦${cleanTag}` : '';
  const [referralStats, setReferralStats] = useState({ points: 0, joinedCount: 0, completedCount: 0, referrals: [] });

  useEffect(() => {
    let active = true;
    const refresh = () => getArcRewardState(accountKey).then((state) => {
      if (active && state?.referrals) {
        setReferralStats(state.referrals);
        setReferralError('');
      }
    }).catch((error) => {
      if (active) setReferralError(error.message || 'Referral rewards are unavailable.');
    });
    refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('nairatag:referrals-updated', refresh);
    window.addEventListener('nairatag:reward-state-updated', refresh);
    return () => {
      active = false;
      window.removeEventListener('focus', refresh);
      window.removeEventListener('nairatag:referrals-updated', refresh);
      window.removeEventListener('nairatag:reward-state-updated', refresh);
    };
  }, [cleanTag, accountKey]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!inviteCode) {
      sendNotificationAlert({
        title: 'Claim your NairaTag first',
        body: 'Sign in and claim a NairaTag to create your personal referral link.',
        type: 'info',
        actionLabel: 'Got it',
      });
      return;
    }
    playMicroSound('pop');
    triggerHaptic([20]);
    try {
      await navigator.clipboard.writeText(createReferralLink(cleanTag));
      setCopied(true);
      sendNotificationAlert({
        title: 'Invite link ready to share',
        body: `Your friend can earn ${REFERRAL_SIGNUP_POINTS} Protocol Points after claiming a NairaTag, then ${REFERRAL_FIRST_PAYMENT_POINTS} more after their first confirmed Arc payment.`,
        type: 'reward',
        actionLabel: 'View referral rewards',
        url: '/#rewards',
        showToast: false,
        showSystemNotification: false,
        silent: true,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      sendNotificationAlert({
        title: 'Could not copy referral link',
        body: 'Check browser clipboard permissions and try again.',
        type: 'info',
        actionLabel: 'Got it',
      });
    }
  };

  const isPage = presentation === 'page';

  return (
    <div className={isPage ? 'rewards-subpage-content' : 'wheel-modal-overlay'} onClick={isPage ? undefined : onClose}>
      <div className={`referral-modal-view${isPage ? ' rewards-subpage-card' : ''}`} onClick={isPage ? undefined : (e) => e.stopPropagation()}>
        {/* Navigation Bar */}
        <div className="wheel-view-nav">
          <button type="button" className="wheel-back-btn" onClick={onClose} aria-label={isPage ? 'Back to Rewards' : 'Close'}>
            {isPage ? <ArrowLeft size={18} /> : <X size={18} />}
          </button>
          <span className="referral-nav-title">Refer Friends</span>
        </div>



        {/* Main White Card */}
        <div className="referral-white-card">
          <div className="referral-cash-row">
            <div>
              <div style={{ fontSize: '12px', color: 'var(--privy-color-foreground-2)', marginBottom: 2 }}>Referral Points earned</div>
              <div className="referral-cash-amount">{referralStats.points.toLocaleString()} Pts</div>
            </div>
            <div className="referral-count-summary">
              <strong>{referralStats.joinedCount}</strong>
              <span>friends joined</span>
            </div>
          </div>

          <div className="referral-progress-wrap">
            <div className="referral-progress-caption">
              <span>{referralStats.completedCount} completed first payment</span>
              <span>{referralStats.joinedCount} total</span>
            </div>
            <div className="referral-progress-track">
              <div className="referral-progress-fill" style={{ width: `${referralStats.joinedCount ? Math.round((referralStats.completedCount / referralStats.joinedCount) * 100) : 0}%` }} />
            </div>
          </div>

          <div className="referral-terms-note">
            <ShieldCheck size={13} color="#00c988" />
            <span>Points are credited to both accounts after each eligible milestone.</span>
          </div>
          {referralError ? <p className="referral-ledger-note">{referralError}</p> : null}

          {/* Unified Referral Code & Share CTA */}
          <div className="referral-unified-box">
            <div className="referral-unified-info">
              <span className="referral-unified-label">Your referral code</span>
              <span className="referral-unified-code">{inviteCode || 'Claim a NairaTag to activate'}</span>
            </div>
            <button
              type="button"
              className="referral-unified-btn"
              onClick={handleCopy}
              disabled={!inviteCode}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Reward Tasks Breakdown */}
        <div className="referral-tasks-card">
          <div className="referral-task-row">
            <div className="referral-task-left">
              <div className="referral-task-icon">
                <Smartphone size={18} />
              </div>
              <div>
                <div className="referral-task-title">Friend claims a NairaTag</div>
              </div>
            </div>
            <div className="referral-task-reward">
              <span>✨</span>
              <span>+{REFERRAL_SIGNUP_POINTS} Pts each</span>
            </div>
          </div>

          <div className="referral-task-row">
            <div className="referral-task-left">
              <div className="referral-task-icon">
                <Coins size={18} />
              </div>
              <div>
                <div className="referral-task-title">Friend completes first USDC payment</div>
              </div>
            </div>
            <div className="referral-task-reward">
              <span>✨</span>
              <span>+{REFERRAL_FIRST_PAYMENT_POINTS} Pts each</span>
            </div>
          </div>

          <div className="referral-task-row">
            <div className="referral-task-left">
              <div className="referral-task-icon">
                <Trophy size={18} />
              </div>
              <div>
                <div className="referral-task-title">USDC &amp; cNGN reward options</div>
              </div>
            </div>
            <div className="referral-task-reward">
              <span>◈</span>
              <span>Points ledger</span>
            </div>
          </div>
        </div>

        <div className="referral-activity-list" aria-live="polite">
          <div className="referral-activity-heading">Recent invites</div>
          {referralStats.referrals.length ? referralStats.referrals.slice(0, 5).map((referral) => (
            <div className="referral-activity-row" key={referral.referredWallet}>
              <span>₦{referral.referredTag}</span>
              <span>{referral.firstPaymentHash ? 'First payment complete' : 'Tag claimed'}</span>
              <strong>+{referral.signupPoints + referral.paymentPoints} Pts</strong>
            </div>
          )) : (
            <p className="referral-empty-state">
              {inviteCode ? 'No friends have joined from your link yet. Share your NairaTag invite to get started.' : 'Claim a NairaTag to activate your referral link.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const DAILY_STREAK_REWARDS = [10, 15, 20, 25, 30, 40, 50];

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDailyStreakStatus(streak, todayKey) {
  const yesterday = new Date(`${todayKey}T00:00:00`);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getLocalDateKey(yesterday);
  const claimedToday = streak.lastClaimDate === todayKey;
  const activeStreak = claimedToday || streak.lastClaimDate === yesterdayKey
    ? streak.streakCount
    : 0;
  const displayDay = claimedToday
    ? ((activeStreak - 1) % DAILY_STREAK_REWARDS.length) + 1
    : (activeStreak % DAILY_STREAK_REWARDS.length) + 1;

  return {
    claimedToday,
    activeStreak,
    displayDay,
    reward: DAILY_STREAK_REWARDS[displayDay - 1],
  };
}

function DailyStreakModal({ isOpen, onClose, status, onClaim, presentation = 'modal' }) {
  const [claimedAmount, setClaimedAmount] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState('');
  useEffect(() => {
    if (!isOpen) setClaimedAmount(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClaim = async () => {
    setClaiming(true);
    setClaimError('');
    try {
      const reward = await onClaim();
      if (reward) setClaimedAmount(reward);
    } catch (error) {
      setClaimError(error.message || 'Daily streak claim failed.');
    } finally { setClaiming(false); }
  };

  const daysClaimed = status.claimedToday ? status.displayDay : status.displayDay - 1;

  const isPage = presentation === 'page';

  return (
    <div className={isPage ? 'rewards-subpage-content' : 'streak-modal-overlay'} onClick={isPage ? undefined : onClose}>
      <div className={`streak-modal${isPage ? ' rewards-subpage-card' : ''}`} onClick={isPage ? undefined : (event) => event.stopPropagation()}>
        <button type="button" className="streak-close-btn" onClick={onClose} aria-label={isPage ? 'Back to Rewards' : 'Close daily streaks'}>
          {isPage ? <ArrowLeft size={18} /> : <X size={18} />}
        </button>

        <div className="streak-icon-wrap"><Flame size={30} /></div>
        <span className="streak-eyebrow">DAILY REWARDS</span>
        <h2 className="streak-title">
          {status.activeStreak > 0 ? `${status.activeStreak} Day Streak` : 'Start Your Daily Streak'}
        </h2>
        <p className="streak-subtitle">
          {status.claimedToday
            ? 'Your reward is claimed. Come back tomorrow to keep your streak going.'
            : 'Claim once a day to keep your streak alive and earn a bigger reward.'}
        </p>

        <div className="streak-days" aria-label="Seven day streak rewards">
          {DAILY_STREAK_REWARDS.map((reward, index) => {
            const day = index + 1;
            const isClaimed = day <= daysClaimed;
            const isCurrent = day === status.displayDay;
            return (
              <div
                key={day}
                className={`streak-day ${isClaimed ? 'claimed' : ''} ${isCurrent ? 'current' : ''}`}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <span className="streak-day-label">Day {day}</span>
                <span className="streak-day-icon">
                  {isClaimed ? <CheckCircle2 size={17} /> : <Flame size={16} />}
                </span>
                <span className="streak-day-reward">{reward} Pts</span>
              </div>
            );
          })}
        </div>

        <div className="streak-reward-note">
          <span>Today's reward</span>
          <strong>{status.reward} Protocol Points</strong>
        </div>

        <button
          type="button"
          className="streak-claim-btn"
          onClick={handleClaim}
          disabled={status.claimedToday || claiming}
        >
          {status.claimedToday ? 'Claimed Today' : claiming ? 'Claiming…' : `Claim ${status.reward} Points`}
        </button>
        {(claimedAmount || claimError) && (
          <p className="streak-claim-feedback" aria-live="polite">
            {claimedAmount
              ? `${claimedAmount} Protocol Points were added to your rewards balance.`
              : claimError}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 5. REWARDS CENTER MAIN COMPONENT (Matching User Screenshot 4)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function RewardsPage({
  userTag = '',
  accountKey = userTag,
  pointsBalance = 0,
  earnedVouchers = [],
  onRefreshVouchers,
  initialPage = null,
  onInitialPageHandled,
  usdcBalance = null,
  onRewardState,
  serviceError = '',
  onNavigateHome,
  onRequestConnect,
}) {
  // Modals
  const [activeRewardPage, setActiveRewardPage] = useState(null);
  useEffect(() => {
    if (!initialPage) return;
    setActiveRewardPage(initialPage);
    onInitialPageHandled?.();
  }, [initialPage]);
  const referralTag = String(userTag || '').replace(/^[$₦@#]/, '').trim().toLowerCase();
  const [myReferralStats, setMyReferralStats] = useState({ points: 0, joinedCount: 0, completedCount: 0, referrals: [] });
  const [dailyStreak, setDailyStreak] = useState({ streakCount: 0, lastClaimDate: null });
  const [todayKey, setTodayKey] = useState(() => getLocalDateKey());
  const [activeCategory, setActiveCategory] = useState('Airtime');
  useEffect(() => {
    let active = true;
    const refresh = () => getArcRewardState(accountKey).then((state) => {
      if (!active) return;
      setMyReferralStats(state.referrals);
      setDailyStreak({ streakCount: state.streak.streakCount, lastClaimDate: state.streak.lastClaimDay });
    }).catch(() => {});
    refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('nairatag:reward-state-updated', refresh);
    return () => {
      active = false;
      window.removeEventListener('focus', refresh);
      window.removeEventListener('nairatag:reward-state-updated', refresh);
    };
  }, [accountKey, referralTag]);

  const totalPoints = Number(pointsBalance) || 0;
  const serviceNotice = serviceError ? <div className="referral-ledger-note" role="status">Arc rewards are not syncing: {serviceError}</div> : null;

  useEffect(() => {
    const dateRefresh = setInterval(() => setTodayKey(getLocalDateKey()), 60_000);
    return () => clearInterval(dateRefresh);
  }, []);

  const dailyStreakStatus = getDailyStreakStatus(dailyStreak, todayKey);

  const handleDailyStreakClaim = async () => {
    const activeAccount = getAbstractedRewardAccount(accountKey);
    const { result, state } = await submitArcRewardAction({ action: 'daily_claim', walletAddress: activeAccount });
    const reward = Number(result.points);
    setMyReferralStats(state.referrals);
    setDailyStreak({ streakCount: state.streak.streakCount, lastClaimDate: state.streak.lastClaimDay });
    onRewardState?.(state);

    playMicroSound('coin');
    triggerHaptic([35, 30, 45]);
    try {
      confetti({ particleCount: 55, spread: 65, origin: { y: 0.65 }, colors: ['#5b4fff', '#06b6d4', '#10b981'] });
    } catch {}
    return reward;
  };

  const handleWheelWin = (prize, state) => {
    if (state) onRewardState?.(state);
  };

  const handleUseVoucher = (voucherName) => {
    playMicroSound('pop');
    triggerHaptic([20]);
    sendNotificationAlert({
      title: `🎫 Applied ${voucherName}`,
      body: 'Your discount voucher will be automatically applied to your next transfer.',
      type: 'reward',
      actionLabel: 'Send USDC',
      url: '/#pay',
    });
  };

  if (activeRewardPage === 'streak') {
    return (
      <div className="rewards-page-wrap rewards-subpage">
        {serviceNotice}
          <DailyStreakModal
          isOpen
          onClose={() => setActiveRewardPage(null)}
          status={dailyStreakStatus}
          onClaim={handleDailyStreakClaim}
          presentation="page"
        />
      </div>
    );
  }

  if (activeRewardPage === 'referral') {
    return (
      <div className="rewards-page-wrap rewards-subpage">
        {serviceNotice}
        <ReferralModal isOpen onClose={() => setActiveRewardPage(null)} userTag={userTag} accountKey={accountKey} presentation="page" />
      </div>
    );
  }

  if (activeRewardPage === 'spin') {
    return (
      <div className="rewards-page-wrap rewards-subpage">
        {serviceNotice}
        <LuckyWheelModal
          isOpen
          onClose={() => setActiveRewardPage(null)}
          onWinPrize={handleWheelWin}
          accountKey={accountKey}
          onRequestConnect={onRequestConnect}
          presentation="page"
        />
      </div>
    );
  }

  return (
    <div className="rewards-page-wrap">
      {serviceNotice}
      {/* Points and onchain balance summary */}
      <div className="rewards-mint-hero">
        <div className="rewards-counters-row">
          <div className="rewards-counter-col">
            <div className="rewards-counter-label-wrap">
              <span>Protocol Points</span>
              <Sparkles size={13} color="var(--privy-color-interactive)" />
            </div>
            <div className="rewards-counter-value-row">
              <div className="rewards-coin-icon">✦</div>
              <span className="rewards-amount-bold">
                {totalPoints.toLocaleString()} Pts
              </span>
            </div>
          </div>

          <div className="rewards-counter-col">
            <div className="rewards-counter-label-wrap">
              <span>USDC on Arc</span>
              <Info size={13} color="#6b7280" />
            </div>
            <div className="rewards-counter-value-row">
              <div className="rewards-coin-icon">$</div>
              <span className="rewards-amount-bold">
                {usdcBalance?.formatted || '0.00'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Feature Quick Cards: Daily Streaks, Refer Friends, Lucky Spin */}
      <div className="rewards-features-row">
        <button type="button" className="rewards-feature-card" onClick={() => setActiveRewardPage('streak')}>
          <span className="rewards-feature-badge-top">DAILY</span>
          <div className="rewards-feature-icon-box feature-box-bonus">
            <Flame size={24} />
          </div>
          <span className="rewards-feature-title">Daily Streaks</span>
          <span className="streak-feature-status">
            {dailyStreakStatus.claimedToday ? 'Claimed today' : `Claim ${dailyStreakStatus.reward} Pts`}
          </span>
        </button>

        <button type="button" className="rewards-feature-card" onClick={() => setActiveRewardPage('referral')}>
          <div className="rewards-feature-icon-box feature-box-refer">
            <Share2 size={24} />
          </div>
          <span className="rewards-feature-title">Refer Friends</span>
        </button>

        <button type="button" className="rewards-feature-card" onClick={() => setActiveRewardPage('spin')}>
          <span className="rewards-feature-badge-top">SPIN</span>
          <div className="rewards-feature-icon-box feature-box-spin">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 4V2" />
              <path d="M12 22v-2" />
              <path d="m4.93 4.93 1.42 1.42" />
              <path d="m17.65 17.65 1.42 1.42" />
              <path d="M2 12h2" />
              <path d="M20 12h2" />
              <path d="m4.93 19.07 1.42-1.42" />
              <path d="m17.65 6.35 1.42-1.42" />
              <circle cx="12" cy="12" r="7" />
              <circle cx="12" cy="12" r="1.5" />
              <path d="m12 12 3-3" />
            </svg>
          </div>
          <span className="rewards-feature-title">Play &amp; Win</span>
        </button>
      </div>

      <div className="rewards-section rewards-asset-section">
        <div className="rewards-section-header">
          <span className="rewards-section-title">Reward assets</span>
          <span className="rewards-pill-tag">Arc</span>
        </div>
        <div className="rewards-assets-grid">
          <article className="rewards-asset-card rewards-asset-points">
            <span className="rewards-asset-symbol">✦</span>
            <div><strong>Protocol Points</strong><span>{totalPoints.toLocaleString()} Pts available</span></div>
          </article>
          <article className="rewards-asset-card rewards-asset-usdc">
            <span className="rewards-asset-symbol">$</span>
            <div><strong>USDC</strong><span>{usdcBalance?.formatted || '0.00'} on Arc Testnet</span></div>
          </article>
          <article className="rewards-asset-card rewards-asset-cngn">
            <span className="rewards-asset-symbol">₦</span>
            <div><strong>cNGN rewards</strong><span>Reward payout integration not enabled yet</span></div>
          </article>
        </div>
        <p className="rewards-assets-note">Referral and daily streak rewards are paid in Points. USDC and cNGN payouts require a funded rewards distributor.</p>
        <div className="rewards-social-share-row" aria-label="Share your rewards">
          <span>Share your NairaTag rewards</span>
          <a href={getTwitterRewardShareUrl({ points: totalPoints, userTag })} target="_blank" rel="noopener noreferrer">Share on X</a>
          <a href={getTelegramShareIntentUrl({ text: `I am earning Protocol Points and exploring tasks on NairaTag.`, url: userTag ? getTagShareUrl(userTag) : 'https://arc.nairatag.ng/#rewards' })} target="_blank" rel="noopener noreferrer">Share on Telegram</a>
        </div>
      </div>

      {earnedVouchers.length > 0 && (
        <div className="rewards-section rewards-legacy-vouchers earned-task-vouchers">
          <div className="rewards-section-header">
            <span className="rewards-section-title">Vouchers earned from Tasks</span>
            <span className="rewards-pill-tag">{earnedVouchers.length} SUBMITTED</span>
          </div>
          {onRefreshVouchers && <button type="button" className="btn-agent-secondary" onClick={onRefreshVouchers}>Refresh wallet claims</button>}
          <p className="earned-task-vouchers-note">Claims sync from the server for this wallet. Approved tasks credit Protocol Points; provider-issued airtime and data vouchers are not configured.</p>
          <div className="earned-task-vouchers-grid">
            {earnedVouchers.map((voucher) => (
              <article className="earned-task-voucher-card" key={voucher.taskId}>
                <span className="earned-task-voucher-icon"><Ticket size={19} /></span>
                <div className="earned-task-voucher-copy">
                  <strong>{voucher.name}</strong>
                  <span>{voucher.value}</span>
                  <small>{voucher.status === 'approved' ? 'Approved' : voucher.status === 'rejected' ? 'Rejected' : 'Pending review'} · Submitted {new Date(voucher.earnedAt).toLocaleDateString()}</small>
                </div>
                <button type="button" className="voucher-ticket-use-btn" disabled title="Provider voucher delivery is not configured.">{voucher.status === 'approved' ? 'Points credited' : voucher.status === 'rejected' ? 'Not approved' : 'In review'}</button>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* Legacy voucher catalog is retained in code while the rewards program focuses on points and tokens. */}
      <div className="rewards-section rewards-legacy-vouchers">
        <div className="rewards-section-header">
          <span className="rewards-section-title">Hot Vouchers</span>
          <span className="rewards-pill-tag">₦</span>
        </div>

        {/* Category Filter Tabs */}
        <div className="rewards-category-tabs">
          {['Airtime', 'Data', 'Betting', 'TV', 'Gas Fee'].map((cat) => (
            <button
              key={cat}
              type="button"
              className={`rewards-category-tab ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Perforated Notched Vouchers */}
        <div className="voucher-ticket-card">
          <div className="voucher-ticket-left">
            ₦10
          </div>
          <div className="voucher-ticket-body">
            <div>
              <div className="voucher-ticket-title">Airtime Voucher</div>
              <div className="voucher-ticket-sub">₦500 available</div>
            </div>
            <button
              type="button"
              className="voucher-ticket-use-btn"
              onClick={() => handleUseVoucher('₦10 Airtime Voucher')}
            >
              Use
            </button>
          </div>
        </div>

        <div className="voucher-ticket-card">
          <div className="voucher-ticket-left" style={{ color: '#d97706', borderColor: 'rgba(217, 119, 6, 0.25)' }}>
            ₦50
          </div>
          <div className="voucher-ticket-body">
            <div>
              <div className="voucher-ticket-title">Arc Osaka Gas Subsidy</div>
              <div className="voucher-ticket-sub">Subsidized USDC transfers</div>
            </div>
            <button
              type="button"
              className="voucher-ticket-use-btn"
              onClick={() => handleUseVoucher('₦50 Arc Gas Subsidy')}
            >
              Use
            </button>
          </div>
        </div>

        <div className="voucher-ticket-card">
          <div className="voucher-ticket-left" style={{ color: '#2563eb', borderColor: 'rgba(37, 99, 235, 0.25)' }}>
            ₦100
          </div>
          <div className="voucher-ticket-body">
            <div>
              <div className="voucher-ticket-title">Data Bundle Voucher</div>
              <div className="voucher-ticket-sub">Applicable on MTN, Airtel, Glo</div>
            </div>
            <button
              type="button"
              className="voucher-ticket-use-btn"
              onClick={() => handleUseVoucher('₦100 Data Bundle Voucher')}
            >
              Use
            </button>
          </div>
        </div>
      </div>

      {/* Daily Bonus Section */}
      <div className="rewards-section rewards-legacy-vouchers">
        <div className="rewards-section-header">
          <span className="rewards-section-title">Daily Bonus</span>
        </div>

        <div className="daily-bonus-card">
          <div className="daily-bonus-icon-col">
            <div className="daily-bonus-img-box">
              <Smartphone size={22} color="#059669" />
            </div>
            <div>
              <div className="daily-bonus-name-row">
                <span className="daily-bonus-name">Glo Airtime</span>
                <span className="daily-bonus-rate-tag">
                  <span>🪙</span>
                  <span>+Up to 6%</span>
                </span>
              </div>
              <div className="daily-bonus-desc">Buy Airtime and get up to 6% Cashback</div>
            </div>
          </div>
          <button
            type="button"
            className="daily-bonus-go-btn"
            onClick={() => onNavigateHome ? onNavigateHome() : alert('Buy Glo airtime to earn up to 6% cashback!')}
          >
            Go
          </button>
        </div>

        <div className="daily-bonus-card">
          <div className="daily-bonus-icon-col">
            <div className="daily-bonus-img-box">
              <Smartphone size={22} color="#0284c7" />
            </div>
            <div>
              <div className="daily-bonus-name-row">
                <span className="daily-bonus-name">9 Mobile Airtime</span>
                <span className="daily-bonus-rate-tag">
                  <span>🪙</span>
                  <span>+Up to 5%</span>
                </span>
              </div>
              <div className="daily-bonus-desc">Buy Airtime and get up to 5% Cashback</div>
            </div>
          </div>
          <button
            type="button"
            className="daily-bonus-go-btn"
            onClick={() => onNavigateHome ? onNavigateHome() : alert('Buy 9 Mobile airtime to earn up to 5% cashback!')}
          >
            Go
          </button>
        </div>

        <div className="daily-bonus-card">
          <div className="daily-bonus-icon-col">
            <div className="daily-bonus-img-box">
              <Smartphone size={22} color="#eab308" />
            </div>
            <div>
              <div className="daily-bonus-name-row">
                <span className="daily-bonus-name">MTN/Airtel Airtime</span>
                <span className="daily-bonus-rate-tag">
                  <span>🪙</span>
                  <span>+Up to 3.5%</span>
                </span>
              </div>
              <div className="daily-bonus-desc">Buy Airtime and get up to 3.5% Cashback</div>
            </div>
          </div>
          <button
            type="button"
            className="daily-bonus-go-btn"
            onClick={() => onNavigateHome ? onNavigateHome() : alert('Buy MTN or Airtel airtime to earn up to 3.5% cashback!')}
          >
            Go
          </button>
        </div>

        <button
          type="button"
          className="rewards-view-all-btn"
          onClick={() => setActiveRewardPage('spin')}
        >
          <span>View All Arc Incentives</span>
          <ChevronRight size={14} />
        </button>
      </div>

    </div>
  );
}
