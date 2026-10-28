// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  X,
  Sparkles,
  Gift,
  Coins,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import {
  isPushSupported,
  getNotificationPermission,
  subscribeToPushNotifications,
  sendNotificationAlert,
  playMicroSound,
  triggerHaptic,
} from '../services/pushNotification.js';
import { getArcRewardState } from '../services/arcRewards.js';
import '../notifications.css';

function localDayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Individual In-App Floating Notification Card
 */
function InAppNotificationCard({ item, onDismiss, onAction }) {
  const [closing, setClosing] = useState(false);

  const handleDismiss = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      onDismiss(item.id);
    }, 240);
  }, [item.id, onDismiss]);

  useEffect(() => {
    // Auto-dismiss after 4.5 seconds
    const timer = setTimeout(() => {
      handleDismiss();
    }, 4500);
    return () => clearTimeout(timer);
  }, [handleDismiss]);

  const handleCardClick = () => {
    if (item.onAction) {
      item.onAction();
    } else if (onAction) {
      onAction(item);
    }
    handleDismiss();
  };

  const getThemeClass = (type) => {
    if (type === 'reward' || type === 'voucher') return 'notif-theme-reward';
    if (type === 'cash' || type === 'success') return 'notif-theme-cash';
    if (type === 'alert') return 'notif-theme-alert';
    return 'notif-theme-info';
  };

  return (
    <div
      className={`inapp-notification-card ${closing ? 'closing' : ''}`}
      onClick={handleCardClick}
      role="alert"
    >
      <div className={`inapp-notif-icon-wrap ${getThemeClass(item.type)}`}>
        {item.type === 'reward' ? (
          <Gift size={20} />
        ) : item.type === 'cash' ? (
          <Coins size={20} />
        ) : item.type === 'claim' ? (
          <Sparkles size={20} />
        ) : (
          <Bell size={20} />
        )}
      </div>

      <div className="inapp-notif-body">
        <div className="inapp-notif-header-row">
          <span className="inapp-notif-title">{item.title}</span>
          <span className="inapp-notif-time">Just now</span>
        </div>
        <div className="inapp-notif-text">{item.body}</div>

        <div className="inapp-notif-action-row">
          {item.actionLabel && (
            <button
              type="button"
              className="inapp-notif-action-btn shimmer-sweep"
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick();
              }}
            >
              {item.actionLabel}
            </button>
          )}

          <button
            type="button"
            className="inapp-notif-dismiss-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleDismiss();
            }}
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Progress countdown indicator */}
      <div className="inapp-notif-progress-bar" />
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MAIN NOTIFICATION LAYER (IN-APP STACK + PUSH PERMISSION PROMPT)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function NotificationLayer({ onNavigateTab, onOpenRewards, accountKey = '', userTag = '', hasBlockingModal = false }) {
  const [notifications, setNotifications] = useState([]);
  const [showPushBanner, setShowPushBanner] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Check if push permission banner should be shown
  useEffect(() => {
    if (!isPushSupported()) return;

    const isDismissed = localStorage.getItem('nairatag_push_banner_dismissed');
    const isSubscribed = localStorage.getItem('nairatag_browser_alerts');
    const permission = getNotificationPermission();

    if (permission === 'default' && !isDismissed && !isSubscribed) {
      const timer = setTimeout(() => {
        setShowPushBanner(true);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Once per day, remind signed-in users about unclaimed rewards before the
  // local reset. The inbox keeps the reminder if the floating card is missed.
  useEffect(() => {
    const walletKey = String(accountKey || '').trim().toLowerCase();
    if (!walletKey || hasBlockingModal) return;
    let active = true;
    getArcRewardState(walletKey).then((state) => {
      if (!active) return;
      const today = localDayKey();
      const reminderKey = `nairatag_reward_nudge:${walletKey}:${today}`;
      try { if (localStorage.getItem(reminderKey)) return; } catch {}
      const streakAvailable = !state.streak.claimedToday;
      if (state.spins.available <= 0 && !streakAvailable) return;
      try { localStorage.setItem(reminderKey, '1'); } catch {}
      const reminders = [];
      if (streakAvailable) reminders.push('Claim today’s streak points');
      if (state.spins.available > 0) reminders.push('use your free spin');
      sendNotificationAlert({
        title: 'Your daily Arc rewards are waiting',
        body: `${reminders.join(' and ')} before midnight. One confirmed Arc USDC payment can unlock a second spin today.`,
        type: 'reward', actionLabel: 'Open Rewards', url: '/#rewards', showToast: true, showSystemNotification: true,
      });
    }).catch(() => {});
    return () => { active = false; };
  }, [accountKey, hasBlockingModal]);

  // Referral milestones are sent to the inviter's active browser profile.
  useEffect(() => {
    const tag = String(userTag || '').replace(/^[$₦@#]/, '').trim().toLowerCase();
    if (!tag) return undefined;
    const handleReferralCredit = (event) => {
      const detail = event.detail || {};
      if (detail.referrerTag !== tag || !detail.points) return;
      sendNotificationAlert({
        title: detail.milestone === 'first_payment' ? 'Your referral made their first payment' : 'A friend joined with your NairaTag',
        body: `You earned ${detail.points} Protocol Points. Invite another friend to keep your referral rewards growing.`,
        type: 'reward',
        actionLabel: 'View referral rewards',
        url: '/#rewards',
        showToast: !hasBlockingModal,
        showSystemNotification: !hasBlockingModal,
        silent: hasBlockingModal,
      });
    };
    window.addEventListener('nairatag:referrals-updated', handleReferralCredit);
    return () => window.removeEventListener('nairatag:referrals-updated', handleReferralCredit);
  }, [userTag, hasBlockingModal]);

  // Listen to in-app notification events
  useEffect(() => {
    const handleInAppNotif = (event) => {
      if (event.detail) {
        setNotifications((prev) => [event.detail, ...prev.slice(0, 3)]);
      }
    };

    window.addEventListener('nairatag:in-app-notification', handleInAppNotif);
    return () => window.removeEventListener('nairatag:in-app-notification', handleInAppNotif);
  }, []);

  const handleDismissNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const handleAction = useCallback(
    (item) => {
      playMicroSound('pop');
      if (item.url && item.url.includes('rewards')) {
        if (onOpenRewards) onOpenRewards();
        else if (onNavigateTab) onNavigateTab('rewards');
      } else if (onNavigateTab) {
        onNavigateTab('pay');
      }
    },
    [onNavigateTab, onOpenRewards]
  );

  const handleEnablePush = async () => {
    setIsSubscribing(true);
    playMicroSound('pop');
    triggerHaptic([30]);

    const res = await subscribeToPushNotifications();
    setIsSubscribing(false);

    if (res.success) {
      setShowPushBanner(false);
      sendNotificationAlert({
        title: '🔔 Browser alerts enabled',
        body: 'You’ll get browser alerts for reward updates while NairaTag is open, plus a saved in-app notification history.',
        type: 'success',
        actionLabel: 'Explore Rewards',
        url: '/#rewards',
      });
    } else if (res.reason === 'denied') {
      setShowPushBanner(false);
      localStorage.setItem('nairatag_push_banner_dismissed', 'true');
    }
  };

  const handleDismissBanner = () => {
    playMicroSound('pop');
    setShowPushBanner(false);
    localStorage.setItem('nairatag_push_banner_dismissed', 'true');
  };

  return (
    <>
      {/* Floating In-App Notifications Stack */}
      <div className="inapp-notifications-stack" aria-live="polite">
        {notifications.map((item) => (
          <InAppNotificationCard
            key={item.id}
            item={item}
            onDismiss={handleDismissNotification}
            onAction={handleAction}
          />
        ))}
      </div>

      {/* Push Permission Prompt Pill */}
      {showPushBanner && (
        <div className="push-permission-pill" role="region" aria-label="Enable notifications">
          <div className="push-pill-left">
            <div className="push-pill-icon">
              <Bell size={16} />
            </div>
            <div>
              <div className="push-pill-title">Stay in the loop</div>
              <div className="push-pill-sub">Rewards, streaks and referrals.</div>
            </div>
          </div>

          <div className="push-pill-actions">
            <button
              type="button"
              className="push-enable-btn shimmer-sweep"
              onClick={handleEnablePush}
              disabled={isSubscribing}
            >
              {isSubscribing ? 'Enabling...' : 'Enable alerts'}
            </button>
            <button
              type="button"
              className="push-close-btn"
              onClick={handleDismissBanner}
              aria-label="Dismiss"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
