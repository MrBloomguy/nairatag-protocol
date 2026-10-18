/**
 * NairaTag Points & Referral Growth Engine
 * Points Rules:
 *  - Claim a ₦Tag: +100 pts
 *  - Refer a person (share referral link): +50 pts
 *  - Successful referral (friend completes claim): +100 pts
 *  - Complete profile: +25 pts
 */

const POINTS_RULES = {
  CLAIM_TAG: 100,
  REFER_PERSON: 50,
  SUCCESSFUL_REFERRAL: 100,
  COMPLETE_PROFILE: 25
};

function createPointsService({ notificationStore }) {
  return {
    POINTS_RULES,

    /**
     * Get account points summary, referral code, and recent ledger
     */
    getAccountSummary(walletAddress) {
      if (!walletAddress) throw new Error('walletAddress is required.');
      const points = notificationStore.getUserPoints(walletAddress);
      const ledger = notificationStore.getPointsLedger(walletAddress, 20);
      return {
        ok: true,
        walletAddress: points.wallet_address,
        tag: points.tag || null,
        totalPoints: points.total_points,
        referralCode: points.referral_code,
        referralUrl: `http://127.0.0.1:8088/hub/claim.html?ref=${encodeURIComponent(points.referral_code || points.tag || points.wallet_address)}`,
        referredBy: points.referred_by || null,
        profileCompleted: Boolean(points.profile_completed),
        ledger: ledger.map(l => ({
          id: l.id,
          action: l.action,
          points: l.points,
          referenceId: l.reference_id,
          createdAt: l.created_at
        }))
      };
    },

    /**
     * Award points when a user claims a ₦Tag.
     * Also checks if this claim came from a referral code and rewards the referrer (+100)!
     */
    awardClaimPoints({ walletAddress, tag, referralCode }) {
      if (!walletAddress) throw new Error('walletAddress is required.');
      const cleanTag = String(tag || '').replace(/^₦/, '').toLowerCase();

      // 1. Award +100 to the claiming user
      const updated = notificationStore.awardPoints({
        walletAddress,
        action: 'CLAIM_TAG',
        points: POINTS_RULES.CLAIM_TAG,
        referenceId: `claim:${cleanTag}`,
        tag: `₦${cleanTag}`
      });

      let referralReward = null;

      // 2. Check referral code
      if (referralCode) {
        const refUpper = String(referralCode).trim().toUpperCase();
        // Look up by referral code or by tag
        let referrer = notificationStore.getUserPointsByRefCode(refUpper);
        if (!referrer) {
          referrer = notificationStore.getUserPointsByTag(referralCode);
        }

        if (referrer && referrer.wallet_address.toLowerCase() !== walletAddress.toLowerCase()) {
          // Award +100 to referrer for successful referral!
          const refUpdated = notificationStore.awardPoints({
            walletAddress: referrer.wallet_address,
            action: 'SUCCESSFUL_REFERRAL',
            points: POINTS_RULES.SUCCESSFUL_REFERRAL,
            referenceId: `referral_of:${cleanTag}`,
            tag: referrer.tag
          });

          // In-app notification for referrer
          notificationStore.createInAppNotification({
            walletAddress: referrer.wallet_address,
            title: '🎉 Referral Bonus Received!',
            body: `Your friend just claimed ₦${cleanTag}! You earned +100 NairaTag points.`,
            category: 'reward',
            actionUrl: '/hub/wallet.html#points'
          });

          referralReward = {
            referrerWallet: referrer.wallet_address,
            referrerTag: referrer.tag,
            pointsAwarded: POINTS_RULES.SUCCESSFUL_REFERRAL
          };
        }
      }

      // In-app notification for claimer
      notificationStore.createInAppNotification({
        walletAddress,
        title: '🌟 Welcome to NairaTag!',
        body: `You claimed ₦${cleanTag} and earned +100 points! Share your referral link to earn +150 more.`,
        category: 'reward',
        actionUrl: '/hub/wallet.html#points'
      });

      return {
        ok: true,
        walletAddress,
        tag: `₦${cleanTag}`,
        pointsEarned: POINTS_RULES.CLAIM_TAG,
        totalPoints: updated.total_points,
        referralReward
      };
    },

    /**
     * Award points when user shares/creates their referral link
     */
    awardReferralShare({ walletAddress }) {
      if (!walletAddress) throw new Error('walletAddress is required.');
      const ledger = notificationStore.getPointsLedger(walletAddress, 50);
      const alreadyAwarded = ledger.some(l => l.action === 'REFER_PERSON');
      if (alreadyAwarded) {
        return { ok: true, pointsEarned: 0, message: 'Referral sharing points already claimed.' };
      }

      const updated = notificationStore.awardPoints({
        walletAddress,
        action: 'REFER_PERSON',
        points: POINTS_RULES.REFER_PERSON,
        referenceId: 'share_referral'
      });

      return {
        ok: true,
        walletAddress,
        pointsEarned: POINTS_RULES.REFER_PERSON,
        totalPoints: updated.total_points
      };
    },

    /**
     * Award points when user completes profile
     */
    awardProfileCompletion({ walletAddress, tag }) {
      if (!walletAddress) throw new Error('walletAddress is required.');
      const ledger = notificationStore.getPointsLedger(walletAddress, 50);
      const alreadyAwarded = ledger.some(l => l.action === 'COMPLETE_PROFILE');
      if (alreadyAwarded) {
        return { ok: true, pointsEarned: 0, message: 'Profile completion points already claimed.' };
      }

      const updated = notificationStore.awardPoints({
        walletAddress,
        action: 'COMPLETE_PROFILE',
        points: POINTS_RULES.COMPLETE_PROFILE,
        referenceId: 'complete_profile',
        tag: tag ? (tag.startsWith('₦') ? tag : `₦${tag}`) : undefined
      });

      return {
        ok: true,
        walletAddress,
        pointsEarned: POINTS_RULES.COMPLETE_PROFILE,
        totalPoints: updated.total_points
      };
    },

    /**
     * Leaderboard
     */
    getLeaderboard(limit = 10) {
      const rows = notificationStore.getPointsLeaderboard(limit);
      return {
        ok: true,
        leaderboard: rows.map((r, idx) => ({
          rank: idx + 1,
          walletAddress: r.wallet_address,
          tag: r.tag || `${r.wallet_address.slice(0, 6)}...${r.wallet_address.slice(-4)}`,
          totalPoints: r.total_points,
          referralCode: r.referral_code
        }))
      };
    }
  };
}

module.exports = {
  createPointsService,
  POINTS_RULES
};
