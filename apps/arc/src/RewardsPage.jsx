// @ts-nocheck
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Sparkles,
  Gift,
  Trophy,
  ArrowLeft,
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
  MoreHorizontal,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  playMicroSound,
  triggerHaptic,
  sendNotificationAlert,
} from './services/pushNotification.js';
import './rewards.css';

/**
 * 8 Prize Segments for the AMAZING AWARDS Lucky Wheel
 * (Matching user reference Screenshot 3)
 */
export const WHEEL_PRIZES = [
  { id: 'p0', label: '₦100 Cashback', type: 'cashback', value: 100, color: '#ffffff', textColor: '#0f172a', icon: 'coin' },
  { id: 'p1', label: '₦30 Cashback', type: 'cashback', value: 30, color: '#38b2ac', textColor: '#ffffff', icon: 'coin' },
  { id: 'p2', label: '₦50 Off Airtime', type: 'airtime', value: 50, color: '#ffffff', textColor: '#0f172a', icon: 'voucher' },
  { id: 'p3', label: '₦20 Off Airtime', type: 'airtime', value: 20, color: '#38b2ac', textColor: '#ffffff', icon: 'voucher' },
  { id: 'p4', label: '₦10 Off Airtime', type: 'airtime', value: 10, color: '#ffffff', textColor: '#0f172a', icon: 'voucher' },
  { id: 'p5', label: '₦10 Cashback', type: 'cashback', value: 10, color: '#38b2ac', textColor: '#ffffff', icon: 'coin' },
  { id: 'p6', label: '32" Smart TV', type: 'jackpot', value: 50000, color: '#ffffff', textColor: '#b45309', icon: 'tv' },
  { id: 'p7', label: '₦5,000 Cashback', type: 'cashback', value: 5000, color: '#38b2ac', textColor: '#ffffff', icon: 'coin' },
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

    sendNotificationAlert({
      title: '🎁 Voucher Pack Claimed!',
      body: '5% & 3% Arc fee discount vouchers added to your wallet.',
      type: 'reward',
      actionLabel: 'View Vouchers',
      url: '/#rewards',
    });

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
export function LuckyWheelModal({ isOpen, onClose, onWinPrize, availableSpins = 1, setAvailableSpins }) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wonPrize, setWonPrize] = useState(null);
  const [isCongratsOpen, setIsCongratsOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  // Live countdown to midnight (matching screenshot countdown)
  const [timeLeft, setTimeLeft] = useState('07h:00m:05s');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
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
    return () => clearInterval(timer);
  }, []);

  if (!isOpen) return null;

  const spinTheWheel = () => {
    if (isSpinning) return;
    if (availableSpins <= 0) {
      playMicroSound('pop');
      alert("You have 0 spins left today! Complete an Arc Osaka payment to earn 1 free spin.");
      return;
    }

    playMicroSound('pop');
    triggerHaptic([30]);
    setIsSpinning(true);

    // Periodic mechanical click sounds during rotation
    const spinSoundInterval = setInterval(() => {
      playMicroSound('spin');
    }, 240);

    // Pick prize (weighted: mostly ₦100, ₦30, ₦50, ₦20, ₦10)
    const prizeIndex = Math.floor(Math.random() * WHEEL_PRIZES.length);
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

      sendNotificationAlert({
        title: `🎡 Won ${selectedPrize.label}!`,
        body: `Congratulations! ${selectedPrize.label} has been credited to your Arc rewards wallet.`,
        type: 'cash',
        actionLabel: 'View Wallet',
        url: '/#rewards',
      });

      if (setAvailableSpins) {
        setAvailableSpins((prev) => Math.max(0, prev - 1));
      }
      if (onWinPrize) {
        onWinPrize(selectedPrize);
      }
      try {
        confetti({
          particleCount: 110,
          spread: 85,
          origin: { y: 0.6 },
        });
      } catch {}
    }, 4600);
  };

  return (
    <div className="wheel-modal-overlay" onClick={onClose}>
      <div className="wheel-modal-view" onClick={(e) => e.stopPropagation()}>
        {/* Navigation Bar */}
        <div className="wheel-view-nav">
          <button type="button" className="wheel-back-btn" onClick={onClose} aria-label="Go Back">
            <ArrowLeft size={22} />
          </button>
          <button type="button" className="wheel-rules-btn" onClick={() => setIsRulesOpen(true)}>
            Rules
          </button>
        </div>

        {/* Title */}
        <h1 className="wheel-main-title">AMAZING AWARDS</h1>

        {/* Hero Banner: Pay or get paid with NairaTag / Arc */}
        <div className="wheel-hero-banner">
          <div className="wheel-hero-badge">
            <span>Pay</span>
            <span className="wheel-hero-badge-tag">or</span>
            <span>get paid with Arc</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: '#fde047', fontWeight: 800 }}>₦5,000 Pool</span>
          </div>
        </div>

        {/* Spin Condition Pill */}
        <div className="wheel-spin-condition-pill">
          ⚡ 1 Payment = 1 FREE Spin!
        </div>

        {/* Wheel Stage */}
        <div className="wheel-stage-container">
          {/* Outer Stand */}
          <div className="wheel-stand" />

          {/* Golden Outer Ring */}
          <div className="wheel-outer-ring">
            {/* Glowing bulbs placed around 360 degrees */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, idx) => {
              const rad = (deg * Math.PI) / 180;
              const radius = 138;
              const x = 145 + radius * Math.cos(rad);
              const y = 145 + radius * Math.sin(rad);
              return (
                <div
                  key={idx}
                  className="wheel-bulb"
                  style={{
                    left: `${x}px`,
                    top: `${y}px`,
                    animationDelay: `${(idx % 4) * 0.3}s`,
                  }}
                />
              );
            })}
          </div>

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
                        {prize.icon === 'coin' && (
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

          {/* Center Golden SPIN Button & Pointer */}
          <div className="wheel-center-hub" onClick={spinTheWheel}>
            <div className="wheel-pointer-needle" />
            <span className="wheel-hub-text">SPIN</span>
          </div>
        </div>

        {/* Spin CTA Button */}
        <button
          type="button"
          className="wheel-spin-btn"
          onClick={spinTheWheel}
          disabled={isSpinning || availableSpins <= 0}
        >
          {isSpinning ? 'Spinning...' : `Spin Now (x${availableSpins})`}
        </button>

        {/* Stats Card Below */}
        <div className="wheel-stats-card">
          <div className="wheel-countdown-row">
            <Clock size={13} />
            <span>Ends in: {timeLeft}</span>
          </div>

          <div className="wheel-metrics-grid">
            <div>
              <div className="wheel-metric-label">Spins Earned Today</div>
              <div className="wheel-metric-val">
                <span>🎡</span>
                <span>{availableSpins > 0 ? 1 : 0}</span>
                <ChevronRight size={14} color="#9ca3af" />
              </div>
            </div>
            <div>
              <div className="wheel-metric-label">Available Spins</div>
              <div className="wheel-metric-val">
                <span>🎡</span>
                <span>{availableSpins}</span>
              </div>
            </div>
          </div>

          <div className="wheel-info-note">
            <Info size={12} />
            <span>Earn up to 2 spins per day. Resets at midnight.</span>
          </div>
        </div>

        {/* Rules Dialog */}
        {isRulesOpen && (
          <div className="congrats-modal-overlay" onClick={() => setIsRulesOpen(false)}>
            <div className="congrats-modal-dialog" onClick={(e) => e.stopPropagation()}>
              <h3 className="congrats-title">Spin & Win Rules</h3>
              <p className="congrats-subtitle" style={{ textAlign: 'left', lineHeight: '1.5', marginTop: '12px' }}>
                1. Every confirmed USDC or cNGN payment on Arc Osaka awards 1 FREE spin.<br /><br />
                2. Maximum of 2 earned spins per wallet address every 24 hours.<br /><br />
                3. Cashback rewards are instantly credited to your Nairatag balance.<br /><br />
                4. Vouchers remain valid for 7 days in your Rewards Center.
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
                {prize?.type === 'cashback' ? <Coins size={18} /> : <Ticket size={18} />}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div className="congrats-item-title">{prize?.label || 'Arc Rewards Bonus'}</div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>Credited to Nairatag Balance</div>
              </div>
            </div>
            <div className="congrats-item-reward">
              <span style={{ fontSize: '12px' }}>🪙</span>
              <span>+{prize?.value || 30}</span>
            </div>
          </div>

          <div className="congrats-item-card">
            <div className="congrats-item-left">
              <div className="congrats-item-icon" style={{ background: '#3b82f6' }}>
                <Sparkles size={18} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div className="congrats-item-title">Arc Osaka Gas Subsidy</div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>Free transaction voucher</div>
              </div>
            </div>
            <div className="congrats-item-reward">
              <span style={{ fontSize: '12px' }}>🪙</span>
              <span>+1</span>
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
export function ReferralModal({ isOpen, onClose, userTag = 'nairatag' }) {
  const [copied, setCopied] = useState(false);
  const inviteCode = useMemo(() => {
    return 'ARC-' + (userTag ? userTag.slice(0, 6).toUpperCase() : '88PV');
  }, [userTag]);

  if (!isOpen) return null;

  const handleCopy = () => {
    playMicroSound('pop');
    triggerHaptic([20]);
    try {
      navigator.clipboard.writeText(`https://arc.nairatag.xyz/?ref=${inviteCode}`);
      setCopied(true);
      sendNotificationAlert({
        title: '📋 Referral Link Copied!',
        body: 'Share with friends to earn up to ₦7,200 cash on Arc Osaka.',
        type: 'info',
        actionLabel: 'Got It',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="wheel-modal-overlay" onClick={onClose}>
      <div className="referral-modal-view" onClick={(e) => e.stopPropagation()}>
        {/* Navigation Bar */}
        <div className="wheel-view-nav">
          <button type="button" className="wheel-back-btn" onClick={onClose} aria-label="Go Back">
            <ArrowLeft size={22} />
          </button>
          <span style={{ fontSize: '13px', fontWeight: 800 }}>Rules</span>
        </div>

        {/* Title */}
        <h2 className="referral-title">
          Get your friends in and win<br />
          up to <span className="referral-highlight-amount">₦7,200</span> cash!
        </h2>

        {/* Group illustration / badge */}
        <div className="referral-friends-banner">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span style={{ fontSize: '38px' }}>👥</span>
            <span style={{ fontSize: '32px' }}>🪙</span>
          </div>
        </div>

        {/* Main White Card */}
        <div className="referral-white-card">
          <div className="referral-expiry-badge">
            <Clock size={12} />
            <span>6 days 23:59:50 expired</span>
          </div>

          <div className="referral-cash-row">
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: 2 }}>My Cash:</div>
              <div className="referral-cash-amount">₦750 &gt;</div>
            </div>
            <button
              type="button"
              className="referral-withdraw-btn"
              onClick={() => alert("Withdraw threshold is ₦800. Invite 1 more friend to withdraw to your Arc wallet or bank account!")}
            >
              Withdraw
            </button>
          </div>

          {/* Progress Bar towards ₦800 */}
          <div className="referral-progress-wrap">
            <div className="referral-progress-pill" style={{ left: '92%' }}>
              ₦50 Left
            </div>
            <div className="referral-progress-track">
              <div className="referral-progress-fill" style={{ width: '92%' }} />
            </div>
          </div>

          <div className="referral-terms-note">
            <ShieldCheck size={13} color="#00c988" />
            <span>Withdrawable at every ₦800, Maximum is ₦7,200</span>
          </div>

          {/* Share CTA */}
          <button
            type="button"
            className="referral-share-cta-btn"
            onClick={handleCopy}
          >
            {copied ? 'Link Copied to Clipboard!' : 'Share Link to friends'}
          </button>

          {/* Invitation Code Box */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: 6 }}>Share Invitation Code</div>
            <div className="referral-invite-code-box">
              <span className="referral-code-pill">{inviteCode}</span>
              <button type="button" className="referral-copy-btn" onClick={handleCopy}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
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
                <div className="referral-task-title">Friend registers their ₦Tag</div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>(Max 10 friends)</div>
              </div>
            </div>
            <div className="referral-task-reward">
              <span>🪙</span>
              <span>+₦2</span>
            </div>
          </div>

          <div className="referral-task-row">
            <div className="referral-task-left">
              <div className="referral-task-icon">
                <Coins size={18} />
              </div>
              <div>
                <div className="referral-task-title">Friend makes first transfer</div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>Tag2Tag or Bank Account</div>
              </div>
            </div>
            <div className="referral-task-reward">
              <span>🪙</span>
              <span>+₦10</span>
            </div>
          </div>

          <div className="referral-task-row">
            <div className="referral-task-left">
              <div className="referral-task-icon">
                <Trophy size={18} />
              </div>
              <div>
                <div className="referral-task-title">Friend transacts ₦1,000+</div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>On Arc Osaka EVM</div>
              </div>
            </div>
            <div className="referral-task-reward">
              <span>🪙</span>
              <span>+₦800</span>
            </div>
          </div>
        </div>
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
  userTag = 'nairatag',
  cashbackBalance = 3.50,
  voucherCount = 12,
  onNavigateHome,
}) {
  // Modals
  const [isGoldenModalOpen, setIsGoldenModalOpen] = useState(false);
  const [isWheelModalOpen, setIsWheelModalOpen] = useState(false);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Airtime');
  const [spinsAvailable, setSpinsAvailable] = useState(2);
  const [localCashback, setLocalCashback] = useState(() => {
    try {
      const saved = localStorage.getItem('nairatag_cashback');
      return saved ? parseFloat(saved) : cashbackBalance;
    } catch {
      return cashbackBalance;
    }
  });
  const [localVouchers, setLocalVouchers] = useState(() => {
    try {
      const saved = localStorage.getItem('nairatag_vouchers');
      return saved ? parseInt(saved, 10) : voucherCount;
    } catch {
      return voucherCount;
    }
  });

  const handleClaimSuccess = () => {
    setLocalVouchers((prev) => {
      const updated = prev + 2;
      try { localStorage.setItem('nairatag_vouchers', String(updated)); } catch {}
      return updated;
    });
  };

  const handleWheelWin = (prize) => {
    if (prize.type === 'cashback') {
      setLocalCashback((prev) => {
        const updated = parseFloat((prev + prize.value).toFixed(2));
        try { localStorage.setItem('nairatag_cashback', String(updated)); } catch {}
        return updated;
      });
    } else {
      setLocalVouchers((prev) => {
        const updated = prev + 1;
        try { localStorage.setItem('nairatag_vouchers', String(updated)); } catch {}
        return updated;
      });
    }
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

  return (
    <div className="rewards-page-wrap">
      {/* Top Header */}
      <div className="rewards-top-header">
        <h1 className="rewards-page-title">Rewards</h1>
        <button
          type="button"
          className="rewards-more-btn"
          onClick={() => setIsGoldenModalOpen(true)}
          title="Rewards Options"
          aria-label="Rewards Options"
        >
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Mint Hero Card: Cashback & Voucher Stats (Matching Screenshot 4) */}
      <div className="rewards-mint-hero">
        <div className="rewards-counters-row">
          {/* Cashback Counter */}
          <div className="rewards-counter-col" onClick={() => setIsWheelModalOpen(true)}>
            <div className="rewards-counter-label-wrap">
              <span>Cashback</span>
              <Info size={13} color="#6b7280" />
            </div>
            <div className="rewards-counter-value-row">
              <div className="rewards-coin-icon">₦</div>
              <span className="rewards-amount-bold">
                ₦{localCashback.toFixed(2)}
                <ChevronRight size={18} className="rewards-chevron" />
              </span>
            </div>
          </div>

          {/* Voucher Counter with Red Notification Dot */}
          <div className="rewards-counter-col" onClick={() => setIsGoldenModalOpen(true)}>
            <div className="rewards-counter-label-wrap">
              <span>Voucher</span>
              <span className="rewards-counter-badge">₦880</span>
            </div>
            <div className="rewards-counter-value-row">
              <div className="rewards-voucher-icon-wrap">
                <Ticket size={24} />
                <div className="rewards-icon-dot" />
              </div>
              <span className="rewards-amount-bold">
                {localVouchers}
                <ChevronRight size={18} className="rewards-chevron" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Feature Quick Cards: Friday Bonus, Refer Friends, Lucky Spin */}
      <div className="rewards-features-row">
        <div className="rewards-feature-card" onClick={() => setIsGoldenModalOpen(true)}>
          <span className="rewards-feature-badge-top">HOT</span>
          <div className="rewards-feature-icon-box feature-box-bonus">
            <Gift size={24} />
          </div>
          <span className="rewards-feature-title">Friday Bonus</span>
        </div>

        <div className="rewards-feature-card" onClick={() => setIsReferralModalOpen(true)}>
          <div className="rewards-feature-icon-box feature-box-refer">
            <Share2 size={24} />
          </div>
          <span className="rewards-feature-title">Refer Friends</span>
        </div>

        <div className="rewards-feature-card" onClick={() => setIsWheelModalOpen(true)}>
          <span className="rewards-feature-badge-top">SPIN</span>
          <div className="rewards-feature-icon-box feature-box-spin">
            <Trophy size={24} />
          </div>
          <span className="rewards-feature-title">Play &amp; Win</span>
        </div>
      </div>

      {/* Hot Vouchers Section */}
      <div className="rewards-section">
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
      <div className="rewards-section">
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
          onClick={() => setIsWheelModalOpen(true)}
        >
          <span>View All Arc Incentives</span>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Floating Gift Box Button to trigger the Golden Voucher Pack at any time */}
      <button
        type="button"
        className="floating-rewards-gift-btn"
        onClick={() => setIsGoldenModalOpen(true)}
        title="Claim Golden Voucher Pack"
        aria-label="Claim Golden Voucher Pack"
      >
        <Gift size={24} />
        <span className="floating-rewards-badge">HOT</span>
      </button>

      {/* Golden Voucher Pack Modal */}
      <GoldenVoucherModal
        isOpen={isGoldenModalOpen}
        onClose={() => setIsGoldenModalOpen(false)}
        onClaimSuccess={handleClaimSuccess}
      />

      {/* AMAZING AWARDS Lucky Wheel Modal */}
      <LuckyWheelModal
        isOpen={isWheelModalOpen}
        onClose={() => setIsWheelModalOpen(false)}
        onWinPrize={handleWheelWin}
        availableSpins={spinsAvailable}
        setAvailableSpins={setSpinsAvailable}
      />

      {/* Referral Friends Modal */}
      <ReferralModal
        isOpen={isReferralModalOpen}
        onClose={() => setIsReferralModalOpen(false)}
        userTag={userTag}
      />
    </div>
  );
}
