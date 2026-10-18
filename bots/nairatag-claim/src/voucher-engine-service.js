const crypto = require('node:crypto');

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * NAIRATAG VOUCHER REWARD ENGINE
 * Independent growth & entitlement layer. Decoupled from payment rails.
 * ═════════════════════════════════════════════════════════════════════════════
 */

// Default campaign configuration
const DEFAULT_CAMPAIGN = {
  id: 'nairatag-welcome-5k',
  name: 'NairaTag Welcome Voucher',
  description: '₦1,000 Welcome Voucher for first 5,000 claimed NairaTags',
  reward_type: 'FIXED',
  reward_amount_kobo: 100000, // ₦1,000 = 100,000 kobo
  currency: 'NGN',
  max_issuances: 5000,
  funding_source: 'nairatag_treasury',
  partner_id: 'internal',
  eligibility_rules: { first_claim_only: true },
  status: 'ACTIVE',
  duration_days: 30
};

/**
 * Generates unpredictable, cryptographically random voucher codes.
 * Format: NT-XXXX-XXXX (e.g. NT-7K4X-92PQ)
 */
function generateVoucherCode(prefix = 'NT') {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // base32 without easily confused 0, O, 1, I
  const bytes = crypto.randomBytes(8);
  let part1 = '';
  let part2 = '';
  for (let i = 0; i < 4; i++) {
    part1 += chars[bytes[i] % chars.length];
    part2 += chars[bytes[i + 4] % chars.length];
  }
  return `${prefix}-${part1}-${part2}`;
}

/**
 * Base partner adapter interface
 */
class VoucherPartnerAdapter {
  constructor(partnerId) {
    this.partnerId = partnerId;
  }

  async issueVoucher(params) {
    throw new Error('issueVoucher must be implemented by partner adapter.');
  }

  async redeemVoucher(params) {
    throw new Error('redeemVoucher must be implemented by partner adapter.');
  }

  async getVoucher(voucherCode) {
    throw new Error('getVoucher must be implemented by partner adapter.');
  }
}

/**
 * Internal native NairaTag voucher adapter
 */
class InternalVoucherAdapter extends VoucherPartnerAdapter {
  constructor() {
    super('internal');
  }

  async issueVoucher({ code, faceValueKobo, currency = 'NGN' }) {
    return {
      partnerId: this.partnerId,
      code,
      faceValueKobo,
      currency,
      type: 'internal_credit'
    };
  }

  async redeemVoucher({ voucher, amountKobo, externalReference }) {
    return {
      ok: true,
      partnerId: this.partnerId,
      redeemedKobo: amountKobo,
      externalReference
    };
  }

  async getVoucher(voucher) {
    return voucher;
  }
}

/**
 * Chowdeck Partner Adapter
 * Can allocate from pre-provisioned batch inventory or format codes for Chowdeck checkout.
 */
class ChowdeckAdapter extends VoucherPartnerAdapter {
  constructor({ notificationStore }) {
    super('chowdeck');
    this.notificationStore = notificationStore;
  }

  async issueVoucher({ campaignId, voucherId, faceValueKobo }) {
    // Attempt to pull a pre-allocated code from inventory
    const claimedCode = this.notificationStore.claimAvailablePartnerVoucherCode({
      partnerId: 'chowdeck',
      campaignId,
      voucherId
    });

    if (claimedCode) {
      return {
        partnerId: this.partnerId,
        code: claimedCode.external_code,
        faceValueKobo: claimedCode.face_value_kobo,
        inventoryId: claimedCode.id,
        isPartnerIssued: true
      };
    }

    // Fallback: standard Chowdeck partner-tagged voucher
    return {
      partnerId: this.partnerId,
      code: generateVoucherCode('CHOW'),
      faceValueKobo,
      isPartnerIssued: false
    };
  }

  async redeemVoucher({ voucher, amountKobo, externalReference }) {
    return {
      ok: true,
      partnerId: this.partnerId,
      redeemedKobo: amountKobo,
      externalReference: externalReference || `CHOW_ORD_${Date.now()}`
    };
  }

  async getVoucher(voucher) {
    return {
      ...voucher,
      partner: 'Chowdeck Food Delivery',
      instruction: 'Enter code at checkout on Chowdeck for discount.'
    };
  }
}

function createVoucherEngineService({ notificationStore }) {
  // 1. Seed initial campaign if not present
  try {
    const existing = notificationStore.getVoucherCampaign(DEFAULT_CAMPAIGN.id);
    if (!existing) {
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      notificationStore.createVoucherCampaign({
        id: DEFAULT_CAMPAIGN.id,
        name: DEFAULT_CAMPAIGN.name,
        description: DEFAULT_CAMPAIGN.description,
        rewardType: DEFAULT_CAMPAIGN.reward_type,
        rewardAmountKobo: DEFAULT_CAMPAIGN.reward_amount_kobo,
        currency: DEFAULT_CAMPAIGN.currency,
        maxIssuances: DEFAULT_CAMPAIGN.max_issuances,
        fundingSource: DEFAULT_CAMPAIGN.funding_source,
        partnerId: DEFAULT_CAMPAIGN.partner_id,
        eligibilityRules: DEFAULT_CAMPAIGN.eligibility_rules,
        status: DEFAULT_CAMPAIGN.status,
        startAt: now,
        expiresAt
      });
    }
  } catch (err) {
    console.warn('[VoucherEngineService] Campaign seed warning:', err.message);
  }

  // Partner adapters registry
  const adapters = new Map();
  adapters.set('internal', new InternalVoucherAdapter());
  adapters.set('chowdeck', new ChowdeckAdapter({ notificationStore }));

  return {
    registerPartnerAdapter(partnerId, adapter) {
      adapters.set(partnerId.toLowerCase(), adapter);
    },

    getPartnerAdapter(partnerId = 'internal') {
      return adapters.get(String(partnerId).toLowerCase()) || adapters.get('internal');
    },

    /**
     * Issues a welcome or claim voucher to a user upon successful NairaTag claim.
     * IDEMPOTENT: If the user already has a voucher for this campaign, returns it without creating a second.
     */
    async issueClaimReward(nairatagUserId, campaignId = DEFAULT_CAMPAIGN.id) {
      if (!nairatagUserId) {
        throw new Error('nairatagUserId is required to issue claim reward.');
      }
      const cleanUserId = String(nairatagUserId).trim().toLowerCase();

      // 1. Check campaign existence and status
      const campaign = notificationStore.getVoucherCampaign(campaignId);
      if (!campaign) {
        return { ok: false, error: `Voucher campaign ${campaignId} not found.` };
      }
      if (campaign.status !== 'ACTIVE') {
        return { ok: false, error: `Voucher campaign ${campaignId} is not active (${campaign.status}).` };
      }

      // 2. Check campaign capacity
      if (campaign.issued_count >= campaign.max_issuances) {
        return { ok: false, error: `Voucher campaign ${campaignId} has reached maximum capacity (${campaign.max_issuances}).` };
      }

      // 3. Idempotency Check: Did this user already get a voucher for this campaign?
      const existingVoucher = notificationStore.getUserVoucherForCampaign(cleanUserId, campaignId);
      if (existingVoucher) {
        return {
          ok: true,
          existing: true,
          voucher: this.formatVoucher(existingVoucher),
          message: 'User already received voucher for this campaign.'
        };
      }

      // 4. Generate unique secure voucher code
      let voucherCode = generateVoucherCode('NT');
      for (let attempt = 0; attempt < 5; attempt++) {
        if (!notificationStore.getVoucherByCode(voucherCode)) break;
        voucherCode = generateVoucherCode('NT');
      }

      const voucherId = `vouch_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (DEFAULT_CAMPAIGN.duration_days * 24 * 60 * 60 * 1000)).toISOString();

      // 5. Check partner adapter if partner-funded
      const partnerId = campaign.partner_id || 'internal';
      const adapter = this.getPartnerAdapter(partnerId);
      let partnerDetails = {};
      if (adapter && partnerId !== 'internal') {
        try {
          partnerDetails = await adapter.issueVoucher({
            campaignId,
            voucherId,
            faceValueKobo: campaign.reward_amount_kobo
          });
          if (partnerDetails.code) {
            voucherCode = partnerDetails.code;
          }
        } catch (err) {
          console.warn('[VoucherEngineService] Partner adapter issue error:', err.message);
        }
      }

      // 6. Persist voucher in database atomically
      const newVoucher = notificationStore.createVoucher({
        id: voucherId,
        voucherCode,
        nairatagUserId: cleanUserId,
        campaignId,
        partnerId,
        currency: campaign.currency || 'NGN',
        faceValueKobo: campaign.reward_amount_kobo,
        remainingValueKobo: campaign.reward_amount_kobo,
        status: 'ACTIVE',
        issuedAt: now.toISOString(),
        expiresAt,
        metadata: {
          campaignName: campaign.name,
          fundingSource: campaign.funding_source,
          partnerDetails
        }
      });

      // 7. Increment campaign issued count
      notificationStore.incrementCampaignIssuedCount(campaignId);

      // 8. Record in-app notification
      try {
        const rewardNgn = (campaign.reward_amount_kobo / 100).toLocaleString();
        notificationStore.createInAppNotification({
          walletAddress: cleanUserId.startsWith('0x') ? cleanUserId : null,
          title: '🎁 Welcome Voucher Unlocked!',
          body: `You unlocked a ₦${rewardNgn} NairaTag voucher! Code: ${voucherCode}`,
          category: 'reward',
          actionUrl: `/hub/wallet.html#vouchers`
        });
      } catch (err) {
        console.warn('[VoucherEngineService] In-app notification error:', err.message);
      }

      return {
        ok: true,
        issued: true,
        voucher: this.formatVoucher(newVoucher)
      };
    },

    /**
     * Redeem a voucher (full or partial).
     * Prevents negative balances and duplicate redemptions.
     */
    async redeemVoucher({
      voucherId = null,
      voucherCode = null,
      nairatagUserId,
      partnerId = 'internal',
      amountKobo = null,
      externalReference = null
    }) {
      let voucher = null;
      if (voucherId) {
        voucher = notificationStore.getVoucherById(voucherId);
      } else if (voucherCode) {
        voucher = notificationStore.getVoucherByCode(voucherCode);
      }

      if (!voucher) {
        return { ok: false, error: 'Voucher not found.' };
      }

      // User verification if provided
      if (nairatagUserId && voucher.nairatag_user_id.toLowerCase() !== String(nairatagUserId).trim().toLowerCase()) {
        return { ok: false, error: 'This voucher does not belong to the specified user.' };
      }

      // Status check
      if (voucher.status !== 'ACTIVE' && voucher.status !== 'PARTIALLY_REDEEMED') {
        return { ok: false, error: `Voucher is not redeemable (status: ${voucher.status}).` };
      }

      // Expiry check
      if (new Date(voucher.expires_at) < new Date()) {
        notificationStore.updateVoucher(voucher.id, { status: 'EXPIRED' });
        return { ok: false, error: 'Voucher has expired.' };
      }

      // Calculate redemption amount
      const targetAmountKobo = amountKobo ? Math.round(Number(amountKobo)) : voucher.remaining_value_kobo;
      if (targetAmountKobo <= 0) {
        return { ok: false, error: 'Redemption amount must be greater than zero.' };
      }

      // Negative balance guard
      if (targetAmountKobo > voucher.remaining_value_kobo) {
        return {
          ok: false,
          error: `Insufficient voucher balance. Remaining: ₦${(voucher.remaining_value_kobo / 100).toFixed(2)}, requested: ₦${(targetAmountKobo / 100).toFixed(2)}.`
        };
      }

      const newRemaining = voucher.remaining_value_kobo - targetAmountKobo;
      const newStatus = newRemaining === 0 ? 'REDEEMED' : 'PARTIALLY_REDEEMED';
      const redemptionId = `red_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      // Notify partner adapter if applicable
      const adapter = this.getPartnerAdapter(partnerId);
      if (adapter) {
        try {
          await adapter.redeemVoucher({
            voucher,
            amountKobo: targetAmountKobo,
            externalReference
          });
        } catch (err) {
          console.warn('[VoucherEngineService] Partner redemption notice error:', err.message);
        }
      }

      // Save redemption record
      const redemption = notificationStore.recordVoucherRedemption({
        id: redemptionId,
        voucherId: voucher.id,
        nairatagUserId: voucher.nairatag_user_id,
        partnerId,
        amountKobo: targetAmountKobo,
        currency: voucher.currency,
        externalReference,
        status: 'CONFIRMED'
      });

      // Update voucher state
      const updatedVoucher = notificationStore.updateVoucher(voucher.id, {
        remainingValueKobo: newRemaining,
        status: newStatus,
        redeemedAt: new Date().toISOString()
      });

      return {
        ok: true,
        redemptionId,
        voucher: this.formatVoucher(updatedVoucher),
        redeemedKobo: targetAmountKobo,
        redeemedNgn: (targetAmountKobo / 100).toFixed(2),
        remainingKobo: newRemaining,
        remainingNgn: (newRemaining / 100).toFixed(2),
        status: newStatus
      };
    },

    /**
     * List all vouchers owned by a user
     */
    getUserVouchers(nairatagUserId) {
      if (!nairatagUserId) return [];
      const vouchers = notificationStore.getUserVouchers(nairatagUserId);
      return vouchers.map(v => this.formatVoucher(v));
    },

    /**
     * Get a specific voucher by ID or Code
     */
    getVoucher(idOrCode) {
      if (!idOrCode) return null;
      let voucher = notificationStore.getVoucherById(idOrCode);
      if (!voucher) {
        voucher = notificationStore.getVoucherByCode(idOrCode);
      }
      return voucher ? this.formatVoucher(voucher) : null;
    },

    /**
     * Formats voucher entity for UI, WhatsApp, and API responses
     */
    formatVoucher(v) {
      const isExpired = new Date(v.expires_at) < new Date();
      const faceNgn = (v.face_value_kobo / 100).toFixed(2);
      const remainingNgn = (v.remaining_value_kobo / 100).toFixed(2);

      return {
        id: v.id,
        code: v.voucher_code,
        userId: v.nairatag_user_id,
        campaignId: v.campaign_id,
        partnerId: v.partner_id,
        currency: v.currency,
        faceValueKobo: v.face_value_kobo,
        faceValueNgn: faceNgn,
        remainingValueKobo: v.remaining_value_kobo,
        remainingValueNgn: remainingNgn,
        formattedFaceValue: `₦${Number(faceNgn).toLocaleString()}`,
        formattedRemainingValue: `₦${Number(remainingNgn).toLocaleString()}`,
        status: isExpired && v.status === 'ACTIVE' ? 'EXPIRED' : v.status,
        isAvailable: !isExpired && (v.status === 'ACTIVE' || v.status === 'PARTIALLY_REDEEMED'),
        issuedAt: v.issued_at,
        expiresAt: v.expires_at,
        daysLeft: Math.max(0, Math.ceil((new Date(v.expires_at) - new Date()) / (1000 * 60 * 60 * 24))),
        redeemedAt: v.redeemed_at,
        metadata: v.metadataObj || {}
      };
    },

    /**
     * Campaign administration
     */
    listCampaigns() {
      return notificationStore.listVoucherCampaigns();
    },

    getCampaign(campaignId) {
      return notificationStore.getVoucherCampaign(campaignId);
    },

    createCampaign(params) {
      return notificationStore.createVoucherCampaign(params);
    },

    updateCampaign(campaignId, updates) {
      return notificationStore.updateVoucherCampaign(campaignId, updates);
    },

    pauseCampaign(campaignId) {
      return notificationStore.updateVoucherCampaign(campaignId, { status: 'PAUSED' });
    },

    activateCampaign(campaignId) {
      return notificationStore.updateVoucherCampaign(campaignId, { status: 'ACTIVE' });
    },

    getCampaignMetrics(campaignId) {
      const campaign = notificationStore.getVoucherCampaign(campaignId);
      if (!campaign) return null;

      const allRedemptions = notificationStore.listVoucherRedemptions(1000);
      let redeemedKobo = 0;
      for (const r of allRedemptions) {
        redeemedKobo += r.amount_kobo;
      }

      return {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        capacity: campaign.max_issuances,
        issued: campaign.issued_count,
        remainingCapacity: Math.max(0, campaign.max_issuances - campaign.issued_count),
        rewardAmountKobo: campaign.reward_amount_kobo,
        rewardAmountNgn: (campaign.reward_amount_kobo / 100).toFixed(2),
        totalCommittedNgn: ((campaign.issued_count * campaign.reward_amount_kobo) / 100).toFixed(2),
        redeemedNgn: (redeemedKobo / 100).toFixed(2),
        fundingSource: campaign.funding_source,
        partnerId: campaign.partner_id
      };
    }
  };
}

module.exports = {
  createVoucherEngineService,
  generateVoucherCode,
  VoucherPartnerAdapter,
  InternalVoucherAdapter,
  ChowdeckAdapter,
  DEFAULT_CAMPAIGN
};
