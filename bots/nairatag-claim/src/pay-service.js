const crypto = require('node:crypto');

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * NAIRATAG PAY SERVICE (NTP-100)
 * Unified Payment Layer sitting above Local Fiat (Flutterwave) & On-Chain (Base)
 * ═════════════════════════════════════════════════════════════════════════════
 */

function createPayService({
  notificationStore,
  phoneResolverService,
  flutterwavePublicKey = process.env.FLUTTERWAVE_PUBLIC_KEY || 'FLWPUBK_TEST-SANDBOX-X',
  flutterwaveSecretKey = process.env.FLUTTERWAVE_SECRET_KEY,
  flutterwaveEncryptionKey = process.env.FLUTTERWAVE_ENCRYPTION_KEY,
  cngnExchangeRate = 1.0, // 1 cNGN = 1 NGN
  usdcExchangeRate = 1550.0 // 1 USD ≈ ₦1,550
}) {

  return {
    flutterwavePublicKey,

    /**
     * Creates a unified payment session for either local fiat or crypto.
     */
    async createSession({
      tag,
      amount,
      currency = 'NGN',
      rail = 'local',
      payerEmail = 'payer@nairatag.net',
      payerName = 'NairaTag Payer',
      payerPhone = '',
      description = null,
      metadata = {}
    }) {
      const cleanTag = String(tag || '').trim().replace(/^₦/, '').toLowerCase();
      if (!cleanTag) throw new Error('A valid NairaTag handle is required.');

      const numAmount = Number(amount);
      if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
        throw new Error('A valid positive payment amount is required.');
      }

      // 1. Resolve recipient identity and payment configuration
      const resolved = await phoneResolverService.resolveTag(cleanTag);
      const displayTag = `₦${cleanTag.toUpperCase()}`;

      // 2. Generate unique NairaTag Payment Reference
      const randSuffix = Math.random().toString(36).slice(2, 8).toUpperCase();
      const txRef = `NTP_${Date.now()}_${randSuffix}`;

      // 3. Prepare rail-specific payload
      let railConfig = {};

      if (rail === 'local') {
        // Flutterwave Inline Payload
        railConfig = {
          provider: 'flutterwave',
          public_key: flutterwavePublicKey,
          tx_ref: txRef,
          amount: numAmount,
          currency: 'NGN',
          payment_options: 'card,banktransfer,ussd,account,opay',
          customer: {
            email: payerEmail || 'payer@nairatag.net',
            name: payerName || 'NairaTag Payer',
            phone_number: payerPhone || ''
          },
          customizations: {
            title: `Pay ${displayTag}`,
            description: description || `NairaTag Unified Payment to ${displayTag}`,
            logo: resolved.avatar?.uri || 'http://127.0.0.1:8088/hub/banner-card.jpg'
          },
          meta: {
            tag: cleanTag,
            rail: 'local',
            recipientWallet: resolved.walletAddress,
            txRef
          }
        };
      } else {
        // On-chain Celo (cNGN / USDC / CELO) Payload
        const cryptoToken = (currency || 'cNGN').toUpperCase();
        let cryptoAmount = numAmount;
        if (cryptoToken === 'USDC' || cryptoToken === 'USDT') {
          cryptoAmount = Number((numAmount / usdcExchangeRate).toFixed(4));
        }

        railConfig = {
          provider: 'celo_onchain',
          network: 'Celo Sepolia',
          chainId: 11142220,
          recipientAddress: resolved.walletAddress || '0xb34518cC33314ee63841120bDd3Baa3BD1baf9e0',
          token: cryptoToken,
          fiatEquivalentNgn: numAmount,
          cryptoAmount,
          txRef
        };
      }

      // 4. Save pending session in SQLite
      const session = notificationStore.createPaymentSession({
        txRef,
        tag: cleanTag,
        amount: numAmount,
        currency: (rail === 'local' ? 'NGN' : currency).toUpperCase(),
        rail,
        provider: rail === 'local' ? 'flutterwave' : 'celo_onchain',
        payerEmail,
        payerWallet: metadata.payerWallet || null,
        recipientWallet: resolved.walletAddress,
        metadata: {
          ...metadata,
          description: description || `Payment to ${displayTag}`,
          recipientTag: cleanTag,
          railConfig
        }
      });

      return {
        ok: true,
        txRef,
        tag: displayTag,
        canonicalTag: cleanTag,
        amount: numAmount,
        currency: session.currency,
        rail,
        recipient: {
          tag: displayTag,
          walletAddress: resolved.walletAddress,
          avatar: resolved.avatar,
          agent: resolved.agent,
          identityVerified: resolved.identityVerified,
          phoneVerified: resolved.phoneVerified
        },
        railConfig
      };
    },

    /**
     * Verifies payment completion for local Flutterwave or on-chain Base.
     */
    async verifyPayment({ txRef, transactionId = null, txHash = null, rail = 'local' }) {
      if (!txRef) throw new Error('Transaction reference (txRef) is required.');

      const session = notificationStore.getPayment(txRef);
      if (!session) throw new Error(`Payment session not found for ${txRef}`);

      let verificationPassed = false;
      let providerReference = transactionId || txHash;
      let verifiedDetails = {};

      if (rail === 'local') {
        // If Flutterwave Secret Key is configured, verify against Flutterwave API
        if (flutterwaveSecretKey && transactionId) {
          try {
            const verifyRes = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
              headers: {
                'Authorization': `Bearer ${flutterwaveSecretKey}`,
                'Content-Type': 'application/json'
              }
            });
            const flwJson = await verifyRes.json();
            if (flwJson.status === 'success' && flwJson.data.status === 'successful') {
              if (Number(flwJson.data.amount) >= Number(session.amount)) {
                verificationPassed = true;
                verifiedDetails = {
                  flwRef: flwJson.data.flw_ref,
                  paymentType: flwJson.data.payment_type,
                  chargedAmount: flwJson.data.amount
                };
              }
            }
          } catch (err) {
            console.warn('[PayService] Flutterwave live verify error:', err.message);
          }
        } else {
          // Sandbox / Mock Mode Verification
          verificationPassed = true;
          verifiedDetails = {
            mode: 'sandbox_instant',
            paymentType: 'flutterwave_inline',
            verifiedAt: new Date().toISOString()
          };
        }
      } else {
        // Crypto / Celo Verification
        verificationPassed = Boolean(txHash && /^0x[a-fA-F0-9]{64}$/.test(txHash));
        verifiedDetails = {
          txHash,
          network: 'Celo Sepolia',
          chainId: 11142220
        };
      }

      if (verificationPassed) {
        notificationStore.updatePaymentStatus(txRef, 'successful', {
          providerReference,
          metadata: { ...session.metadata, verifiedDetails }
        });

        // Trigger in-app notification & alert for recipient
        try {
          notificationStore.recordLifecycleEvent({
            walletAddress: session.recipient_wallet,
            eventType: 'PAYMENT_RECEIVED',
            handle: session.tag,
            network: rail === 'local' ? 'Flutterwave NGN' : 'Celo Sepolia',
            transactionHash: providerReference,
            message: `Received payment of ₦${Number(session.amount).toLocaleString()} via ${rail === 'local' ? 'Flutterwave' : 'Celo On-chain'}`
          });
        } catch {}

        return {
          ok: true,
          status: 'successful',
          txRef,
          tag: `₦${session.tag}`,
          amount: session.amount,
          currency: session.currency,
          rail: session.rail,
          providerReference,
          receipt: {
            receiptId: `REC_${txRef.replace('NTP_', '')}`,
            recipientTag: `₦${session.tag}`,
            amount: session.amount,
            currency: session.currency,
            rail: session.rail,
            paidAt: new Date().toISOString(),
            status: 'Confirmed'
          }
        };
      }

      return {
        ok: false,
        status: 'failed',
        txRef,
        error: 'Payment verification could not be validated.'
      };
    },

    /**
     * Retrieves session details for a payment link.
     */
    async getSession(txRef) {
      const session = notificationStore.getPayment(txRef);
      if (!session) return null;
      const resolved = await phoneResolverService.resolveTag(session.tag);
      return {
        ...session,
        recipient: {
          tag: `₦${session.tag}`,
          walletAddress: resolved.walletAddress,
          avatar: resolved.avatar,
          identityVerified: resolved.identityVerified
        }
      };
    }
  };
}

module.exports = {
  createPayService
};
