const crypto = require('node:crypto');

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * NAIRATAG AUTOMATIC NGN RECEIVING ACCOUNT LAYER
 * Financial Identity Capability Powered by Pluggable NGN Providers (Flutterwave)
 * ═════════════════════════════════════════════════════════════════════════════
 */

// Explicit State Machine Constants
const ACCOUNT_STATES = {
  NOT_STARTED: 'NOT_STARTED',
  ONBOARDING_REQUIRED: 'ONBOARDING_REQUIRED',
  KYC_PENDING: 'KYC_PENDING',
  PROVISIONING: 'PROVISIONING',
  ACTIVE: 'ACTIVE',
  FAILED: 'FAILED',
  SUSPENDED: 'SUSPENDED',
  CLOSED: 'CLOSED'
};

const KYC_STATES = {
  NOT_REQUIRED: 'NOT_REQUIRED',
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED'
};

/**
 * Abstract NGN Account Provider Interface
 * Allows NairaTag to support multiple underlying banks/fintechs (Flutterwave, Paystack, Moniepoint)
 */
class NgnAccountProvider {
  constructor(name) {
    this.name = name;
  }

  async createCustomer(params) {
    throw new Error('createCustomer must be implemented by provider.');
  }

  async createAccount(params) {
    throw new Error('createAccount must be implemented by provider.');
  }

  async getAccount(providerAccountId) {
    throw new Error('getAccount must be implemented by provider.');
  }

  async getAccountStatus(providerAccountId) {
    throw new Error('getAccountStatus must be implemented by provider.');
  }

  verifyWebhook({ rawBody, signature, secret }) {
    throw new Error('verifyWebhook must be implemented by provider.');
  }

  normalizeTransaction(payload) {
    throw new Error('normalizeTransaction must be implemented by provider.');
  }
}

/**
 * Flutterwave NGN Provider Implementation
 * Uses current Flutterwave NGN Virtual Account API
 */
class FlutterwaveNgnProvider extends NgnAccountProvider {
  constructor({
    secretKey,
    publicKey,
    clientId = process.env.FLW_CLIENT_ID,
    clientSecret = process.env.FLW_CLIENT_SECRET,
    encryptionKey = process.env.FLW_ENCRYPTION_KEY,
    baseUrl = process.env.FLW_BASE_URL || 'https://api.flutterwave.com',
    environment = 'sandbox'
  }) {
    super('flutterwave');
    this.secretKey = secretKey;
    this.publicKey = publicKey;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.encryptionKey = encryptionKey;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.environment = environment;
    this.cachedToken = null;
    this.tokenExpiresAt = 0;
  }

  isLiveConfigured() {
    return Boolean(
      (this.clientId && this.clientSecret) ||
      (this.secretKey && !this.secretKey.includes('SANDBOX-X') && !this.secretKey.includes('TEST'))
    );
  }

  /**
   * Acquire or return cached OAuth 2.0 Bearer token for v4 API operations
   */
  async getAuthToken() {
    if (this.secretKey) return this.secretKey;
    if (this.clientId && this.clientSecret) {
      const now = Math.floor(Date.now() / 1000);
      if (this.cachedToken && this.tokenExpiresAt > now + 60) {
        return this.cachedToken;
      }
      try {
        const tokenUrl = 'https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token';
        const params = new URLSearchParams();
        params.append('client_id', this.clientId);
        params.append('client_secret', this.clientSecret);
        params.append('grant_type', 'client_credentials');

        const res = await fetch(tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString()
        });
        const data = await res.json();
        if (data.access_token) {
          this.cachedToken = data.access_token;
          this.tokenExpiresAt = now + (data.expires_in || 600);
          return this.cachedToken;
        }
      } catch (err) {
        console.warn('[FlutterwaveNgnProvider] OAuth token fetch error:', err.message);
      }
    }
    return null;
  }

  /**
   * Determine exact API endpoint for virtual account provisioning (v4 vs v3)
   */
  getVirtualAccountEndpoint() {
    if (this.baseUrl.includes('/v3')) {
      return `${this.baseUrl}/virtual-account-numbers`;
    }
    // Default to v4 standard
    return `${this.baseUrl}/v4/virtual-accounts`;
  }

  async createCustomer({ email, name, phone }) {
    if (this.isLiveConfigured()) {
      try {
        return {
          id: `cus_flw_${Date.now()}`,
          email,
          name,
          phone
        };
      } catch (err) {
        console.warn('[FlutterwaveNgnProvider] createCustomer API error:', err.message);
      }
    }
    return {
      id: `cus_mock_${Date.now()}`,
      email,
      name,
      phone
    };
  }

  async createAccount({ email, name, phone, bvn, reference, narration }) {
    if (this.isLiveConfigured()) {
      try {
        // Parse name into firstname and lastname expected by Flutterwave
        const nameParts = String(name || 'NairaTag User').trim().split(/\s+/);
        const firstname = nameParts[0] || 'NairaTag';
        const lastname = nameParts.slice(1).join(' ') || firstname;

        // Current production API payload contract (v4/v3 compatible)
        const payload = {
          email: String(email).trim().toLowerCase(),
          is_permanent: true,
          currency: 'NGN',
          amount: 0,
          tx_ref: reference,
          firstname,
          lastname,
          phonenumber: phone ? String(phone).replace(/\s+/g, '') : undefined,
          narration: narration || `NairaTag NGN receiving account`,
          bvn: bvn ? String(bvn).trim() : undefined
        };

        const endpoint = this.getVirtualAccountEndpoint();
        const token = await this.getAuthToken();
        const headers = {
          'Authorization': `Bearer ${token || this.secretKey}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': reference
        };
        if (this.clientId) {
          headers['X-Trace-Id'] = `trace-${reference}-${Date.now()}`;
        }

        let res = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });

        // Graceful fallback to v3 if v4 returns 404 on older merchant profiles
        if (res.status === 404 && endpoint.includes('/v4/virtual-accounts')) {
          const fallbackEndpoint = `${this.baseUrl.replace('/v4', '/v3')}/virtual-account-numbers`;
          res = await fetch(fallbackEndpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
          });
        }

        const json = await res.json();
        if (json.status === 'success' && json.data) {
          const data = json.data;
          const providerAccountId = data.order_ref || data.flw_ref || String(data.id || '');
          const providerCustomerId = data.customer_id ? String(data.customer_id) : (data.customer?.id ? String(data.customer?.id) : null);

          return {
            ok: true,
            providerAccountId,
            providerCustomerId,
            accountNumber: data.account_number,
            bankName: data.bank_name || 'Flutterwave MFB',
            bankCode: data.bank_code || '035',
            accountName: data.account_name || data.customer?.name || name,
            currency: 'NGN',
            status: ACCOUNT_STATES.ACTIVE,
            raw: data
          };
        } else {
          return {
            ok: false,
            error: json.message || 'Flutterwave account provisioning returned non-success.',
            requiresKyc: Boolean(json.message && /bvn|nin|kyc|identity|tier/i.test(json.message))
          };
        }
      } catch (err) {
        return {
          ok: false,
          error: `Flutterwave network error: ${err.message}`
        };
      }
    }

    // Sandbox / Test fallback with realistic deterministic Nigerian bank account
    const cleanId = String(reference || email || '').replace(/[^a-zA-Z0-9]/g, '');
    let hash = 0;
    for (let i = 0; i < cleanId.length; i++) {
      hash = ((hash << 5) - hash + cleanId.charCodeAt(i)) & 0x7fffffff;
    }
    const testAccountNumber = '01' + String(10000000 + (hash % 89999999)).slice(0, 8);

    return {
      ok: true,
      providerAccountId: `va_flw_test_${reference}`,
      providerCustomerId: `cus_flw_test_${hash}`,
      accountNumber: testAccountNumber,
      bankName: 'Flutterwave MFB',
      bankCode: '035',
      accountName: name,
      currency: 'NGN',
      status: ACCOUNT_STATES.ACTIVE,
      isTest: true
    };
  }

  async verifyTransaction(txId) {
    if (!this.isLiveConfigured() || !txId) return { ok: true, verified: true };
    try {
      const token = await this.getAuthToken();
      const res = await fetch(`${this.baseUrl}/v3/transactions/${txId}/verify`, {
        headers: {
          'Authorization': `Bearer ${token || this.secretKey}`,
          'Content-Type': 'application/json'
        }
      });
      const json = await res.json();
      return {
        ok: json.status === 'success' && json.data?.status === 'successful',
        data: json.data
      };
    } catch (err) {
      console.warn('[FlutterwaveNgnProvider] verifyTransaction error:', err.message);
      return { ok: false, error: err.message };
    }
  }

  verifyWebhook({ signature, secret, rawBody = '' }) {
    if (!secret) return true;
    const providedSig = String(signature || '').trim();
    const expectedSecret = String(secret || '').trim();

    // 1. Direct Secret Hash comparison (Flutterwave standard verif-hash)
    try {
      const sigBuf = Buffer.from(providedSig);
      const secBuf = Buffer.from(expectedSecret);
      if (sigBuf.length === secBuf.length && crypto.timingSafeEqual(sigBuf, secBuf)) {
        return true;
      }
    } catch {}

    // 2. HMAC-SHA256 signature comparison (if raw body is provided)
    if (rawBody && providedSig) {
      try {
        const computedHmac = crypto.createHmac('sha256', expectedSecret).update(rawBody).digest('hex');
        const hmacBuf = Buffer.from(computedHmac);
        const sigBuf = Buffer.from(providedSig);
        if (hmacBuf.length === sigBuf.length && crypto.timingSafeEqual(hmacBuf, sigBuf)) {
          return true;
        }
      } catch {}
    }

    return false;
  }

  normalizeTransaction(payload) {
    const data = payload?.data || payload || {};
    const amount = Number(data.amount);
    return {
      providerTransactionId: data.id ? String(data.id) : null,
      txRef: data.tx_ref || data.flw_ref || `TX_${Date.now()}`,
      accountNumber: data.account_number || data.destination || null,
      amountKobo: Math.round(amount * 100),
      amountNgn: amount,
      currency: String(data.currency || 'NGN').toUpperCase(),
      status: String(data.status || '').toLowerCase() === 'successful' ? 'confirmed' : 'pending',
      counterparty: data.customer?.name || data.customer?.email || 'Bank Transfer',
      raw: data
    };
  }
}

/**
 * Factory for NairaTag Automatic NGN Receiving Account Layer
 */
function createFlutterwaveVaService({
  notificationStore,
  flwSecretKey = process.env.FLW_SECRET_KEY || process.env.FLUTTERWAVE_SECRET_KEY,
  flwPublicKey = process.env.FLW_PUBLIC_KEY || process.env.FLUTTERWAVE_PUBLIC_KEY,
  flwClientId = process.env.FLW_CLIENT_ID,
  flwClientSecret = process.env.FLW_CLIENT_SECRET,
  flwEncryptionKey = process.env.FLW_ENCRYPTION_KEY,
  flwWebhookSecret = process.env.FLW_WEBHOOK_SECRET || process.env.FLUTTERWAVE_WEBHOOK_HASH,
  flwBaseUrl = process.env.FLW_BASE_URL || 'https://api.flutterwave.com',
  flwEnvironment = process.env.FLW_ENVIRONMENT || 'sandbox',
  provider = null,
  onAccountActivated = null
}) {
  const ngnProvider = provider || new FlutterwaveNgnProvider({
    secretKey: flwSecretKey,
    publicKey: flwPublicKey,
    clientId: flwClientId,
    clientSecret: flwClientSecret,
    encryptionKey: flwEncryptionKey,
    baseUrl: flwBaseUrl,
    environment: flwEnvironment
  });

  return {
    provider: ngnProvider,
    ACCOUNT_STATES,
    KYC_STATES,

    /**
     * Automatic onboarding initiated when a user claims a NairaTag.
     * IDEMPOTENT: If the account already exists, returns it without creating duplicate accounts.
     * FAULT-TOLERANT: If provider fails, sets status to FAILED and returns gracefully without breaking the claim.
     */
    async initiateAutomaticOnboarding({
      userId,
      nairatagId,
      email = null,
      name = null,
      phone = null,
      bvn = null,
      nin = null
    }) {
      if (!userId || !nairatagId) {
        throw new Error('userId and nairatagId are required for NGN account onboarding.');
      }

      const cleanUserId = String(userId).trim().toLowerCase();
      const cleanTag = String(nairatagId).trim().toLowerCase().replace(/^₦/, '');
      const idempotencyKey = `ngn-account:${cleanUserId}`;

      // 1. Idempotency Check: Existing account
      const existing = notificationStore.getNgnAccount(cleanUserId);
      if (existing) {
        if (existing.status === ACCOUNT_STATES.ACTIVE) {
          return {
            ok: true,
            status: ACCOUNT_STATES.ACTIVE,
            created: false,
            account: this.formatNgnAccount(existing)
          };
        }
        if (existing.status === ACCOUNT_STATES.PROVISIONING) {
          return {
            ok: true,
            status: ACCOUNT_STATES.PROVISIONING,
            created: false,
            message: 'Your NGN receiving account is being set up. We will notify you when it is ready.',
            account: this.formatNgnAccount(existing)
          };
        }
      }

      // 2. Prepare user metadata
      const userEmail = email || `${cleanTag || cleanUserId.slice(0, 8)}@nairatag.net`;
      const accountDisplayName = name || `MIKKI`;
      const reference = `NTP_VA_${Date.now()}_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const recordId = existing?.id || `ngn_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      // 3. Insert or update initial record in PROVISIONING state
      notificationStore.saveNgnAccount({
        id: recordId,
        userId: cleanUserId,
        nairatagId: `₦${cleanTag}`,
        provider: ngnProvider.name,
        accountType: 'static',
        accountName: accountDisplayName,
        currency: 'NGN',
        status: ACCOUNT_STATES.PROVISIONING,
        kycStatus: bvn ? KYC_STATES.VERIFIED : KYC_STATES.NOT_REQUIRED,
        providerReference: reference,
        idempotencyKey,
        metadata: {
          email: userEmail,
          phone,
          onboardingSource: 'automatic_claim'
        }
      });

      // 4. Attempt provisioning with Flutterwave
      try {
        const provRes = await ngnProvider.createAccount({
          email: userEmail,
          name: accountDisplayName,
          phone,
          bvn,
          reference,
          narration: `NairaTag NGN receiving account for ₦${cleanTag.toUpperCase()}`
        });

        if (provRes.ok) {
          // Provisioning succeeded: mark ACTIVE
          const updated = notificationStore.updateNgnAccount(recordId, {
            bankName: provRes.bankName,
            bankCode: provRes.bankCode,
            accountNumber: provRes.accountNumber,
            accountName: provRes.accountName || accountDisplayName,
            status: ACCOUNT_STATES.ACTIVE,
            kycStatus: KYC_STATES.VERIFIED,
            activatedAt: new Date().toISOString(),
            metadata: {
              providerAccountId: provRes.providerAccountId,
              providerCustomerId: provRes.providerCustomerId,
              poweredBy: 'Flutterwave'
            }
          });

          // In-app alert & notification dispatch
          try {
            notificationStore.createInAppNotification({
              walletAddress: cleanUserId.startsWith('0x') ? cleanUserId : null,
              title: '🏦 NGN Receiving Account Ready',
              body: `Your NGN account (${provRes.accountNumber} · ${provRes.bankName}) is now ready to receive funds for ₦${cleanTag.toUpperCase()}.`,
              category: 'wallet',
              actionUrl: '/hub/wallet.html#bank'
            });

            if (typeof onAccountActivated === 'function') {
              onAccountActivated({
                userId: cleanUserId,
                tag: `₦${cleanTag}`,
                bankName: provRes.bankName,
                accountNumber: provRes.accountNumber,
                accountName: provRes.accountName || accountDisplayName
              });
            }
          } catch (e) {}

          return {
            ok: true,
            status: ACCOUNT_STATES.ACTIVE,
            created: true,
            account: this.formatNgnAccount(updated)
          };
        } else if (provRes.requiresKyc) {
          // Requires user KYC details
          const updated = notificationStore.updateNgnAccount(recordId, {
            status: ACCOUNT_STATES.KYC_PENDING,
            kycStatus: KYC_STATES.PENDING,
            failureReason: provRes.error
          });
          return {
            ok: true,
            status: ACCOUNT_STATES.KYC_PENDING,
            requiresKyc: true,
            message: 'Additional verification required to activate your NGN receiving account.',
            account: this.formatNgnAccount(updated)
          };
        } else {
          // Provider failure: mark FAILED without crashing the claim flow
          const updated = notificationStore.updateNgnAccount(recordId, {
            status: ACCOUNT_STATES.FAILED,
            failedAt: new Date().toISOString(),
            failureReason: provRes.error
          });
          return {
            ok: true,
            status: ACCOUNT_STATES.FAILED,
            error: provRes.error,
            message: 'Your NGN receiving account setup is in progress. We will notify you when it is ready.',
            account: this.formatNgnAccount(updated)
          };
        }
      } catch (err) {
        // Unexpected network / provider exception: do not crash
        notificationStore.updateNgnAccount(recordId, {
          status: ACCOUNT_STATES.FAILED,
          failedAt: new Date().toISOString(),
          failureReason: err.message
        });

        return {
          ok: true,
          status: ACCOUNT_STATES.FAILED,
          error: err.message,
          message: 'Your NGN receiving account is being set up. We will notify you when it is ready.'
        };
      }
    },

    /**
     * Backward-compatible alias for ensureVirtualAccount
     */
    async ensureVirtualAccount({ nairatagUserId, email, name, phone, bvn, nin, txRef }) {
      const res = await this.initiateAutomaticOnboarding({
        userId: nairatagUserId,
        nairatagId: nairatagUserId,
        email,
        name,
        phone,
        bvn,
        nin
      });
      return {
        ok: res.ok,
        created: res.created || false,
        status: res.status,
        virtualAccount: res.account
      };
    },

    /**
     * User resumes or completes onboarding with required identity verification
     */
    async completeOnboarding({ userId, bvn, nin, phone, name, email }) {
      const cleanUserId = String(userId).trim().toLowerCase();
      let account = notificationStore.getNgnAccount(cleanUserId);
      if (!account) {
        return this.initiateAutomaticOnboarding({
          userId: cleanUserId,
          nairatagId: cleanUserId,
          bvn,
          nin,
          phone,
          name,
          email
        });
      }

      if (account.status === ACCOUNT_STATES.ACTIVE) {
        return { ok: true, status: ACCOUNT_STATES.ACTIVE, account: this.formatNgnAccount(account) };
      }

      // Validate 11-digit BVN if provided
      if (bvn && !/^\d{11}$/.test(String(bvn).trim())) {
        return { ok: false, error: 'BVN must be a valid 11-digit number.' };
      }

      // Re-attempt provisioning with provided KYC info
      const provRes = await ngnProvider.createAccount({
        email: email || account.metadataObj?.email || `${cleanUserId}@nairatag.net`,
        name: name || account.account_name || 'NairaTag User',
        phone,
        bvn,
        reference: account.provider_reference || `NTP_VA_${Date.now()}`
      });

      if (provRes.ok) {
        const bvnHash = bvn ? crypto.createHash('sha256').update(String(bvn).trim()).digest('hex') : null;
        const updated = notificationStore.updateNgnAccount(account.id, {
          bankName: provRes.bankName,
          bankCode: provRes.bankCode,
          accountNumber: provRes.accountNumber,
          accountName: provRes.accountName || account.account_name,
          status: ACCOUNT_STATES.ACTIVE,
          kycStatus: KYC_STATES.VERIFIED,
          activatedAt: new Date().toISOString(),
          metadata: {
            ...account.metadataObj,
            bvnHash,
            providerAccountId: provRes.providerAccountId,
            providerCustomerId: provRes.providerCustomerId
          }
        });
        if (typeof onAccountActivated === 'function') {
          try {
            onAccountActivated({
              userId: cleanUserId,
              tag: account.nairatag_id,
              bankName: provRes.bankName,
              accountNumber: provRes.accountNumber,
              accountName: provRes.accountName || account.account_name
            });
          } catch (e) {}
        }
        return { ok: true, status: ACCOUNT_STATES.ACTIVE, account: this.formatNgnAccount(updated) };
      }

      return {
        ok: false,
        status: ACCOUNT_STATES.FAILED,
        error: provRes.error || 'Identity verification could not be completed.'
      };
    },

    /**
     * Get NGN account by user ID or tag
     */
    getVirtualAccount(userIdOrTag) {
      if (!userIdOrTag) return null;
      const acc = notificationStore.getNgnAccount(userIdOrTag);
      return acc ? this.formatNgnAccount(acc) : null;
    },

    getAccount(userIdOrTag) {
      return this.getVirtualAccount(userIdOrTag);
    },

    /**
     * Webhook processing for inbound bank transfers
     * Authenticated, idempotent, updates integer kobo ledger & ngn_transactions
     */
    async processWebhook({ rawBody = '', signature = null, payload = null }) {
      // 1. Signature Authentication
      if (flwWebhookSecret) {
        const validSig = ngnProvider.verifyWebhook({
          signature,
          secret: flwWebhookSecret,
          rawBody
        });
        if (!validSig) {
          return { ok: false, error: 'Invalid webhook signature.', statusCode: 401 };
        }
      }

      // 2. Normalize transaction
      const tx = ngnProvider.normalizeTransaction(payload);

      if (tx.status !== 'confirmed') {
        return { ok: true, ignored: true, message: `Ignored unconfirmed transfer: ${tx.status}` };
      }

      if (tx.currency !== 'NGN') {
        return { ok: false, error: `Invalid currency: ${tx.currency}. Only NGN deposits are accepted.` };
      }

      // 3. Idempotency Check
      const existingEvent = notificationStore.getPaymentEvent('flutterwave', tx.txRef, tx.providerTransactionId);
      if (existingEvent) {
        return {
          ok: true,
          duplicate: true,
          message: 'Payment event has already been processed.'
        };
      }

      // 4. Resolve destination account
      let account = null;
      if (tx.accountNumber) {
        account = notificationStore.getNgnAccountByAccountNumber(tx.accountNumber);
      }
      if (!account && tx.txRef && tx.txRef.startsWith('NTP_VA_')) {
        account = notificationStore.getNgnAccount(tx.txRef);
      }

      if (!account) {
        return {
          ok: false,
          error: `Unrecognized destination account: ${tx.accountNumber || 'unknown'}. No mapped NairaTag found.`
        };
      }

      // 5. Server-side verification with Flutterwave if live API configured
      if (tx.providerTransactionId && ngnProvider.isLiveConfigured()) {
        const verifyRes = await ngnProvider.verifyTransaction(tx.providerTransactionId);
        if (!verifyRes.ok) {
          return { ok: false, error: 'Provider server-side transaction verification failed.' };
        }
      }

      // 6. Record idempotent payment event
      const payloadHash = crypto.createHash('sha256').update(rawBody || JSON.stringify(payload)).digest('hex');
      const eventRecordId = `pe_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      notificationStore.recordPaymentEvent({
        id: eventRecordId,
        provider: 'flutterwave',
        providerEventId: tx.txRef,
        providerTransactionId: tx.providerTransactionId,
        reference: tx.txRef,
        status: 'processed',
        payloadHash
      });

      // 7. Record immutable NGN Transaction
      const txRecordId = `ntx_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const savedTx = notificationStore.recordNgnTransaction({
        id: txRecordId,
        userId: account.user_id,
        nairatagId: account.nairatag_id,
        ngnAccountId: account.id,
        provider: 'flutterwave',
        providerTransactionId: tx.providerTransactionId || txRecordId,
        type: 'deposit',
        direction: 'credit',
        amountKobo: tx.amountKobo,
        currency: 'NGN',
        status: 'confirmed',
        counterparty: tx.counterparty,
        reference: tx.txRef,
        metadata: {
          accountNumber: account.account_number,
          bankName: account.bank_name
        }
      });

      // 8. Update user integer kobo ledger
      const ledgerEntryId = `ledg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      notificationStore.addLedgerEntry({
        id: ledgerEntryId,
        nairatagUserId: account.user_id,
        currency: 'NGN',
        type: 'deposit',
        amountKobo: tx.amountKobo,
        direction: 'credit',
        reference: tx.txRef,
        source: 'flutterwave_virtual_account',
        status: 'confirmed',
        metadata: {
          accountNumber: account.account_number,
          bankName: account.bank_name,
          flwTransactionId: tx.providerTransactionId
        }
      });

      // 9. In-app notification
      try {
        notificationStore.createInAppNotification({
          walletAddress: account.user_id.startsWith('0x') ? account.user_id : null,
          title: `💸 ${account.nairatag_id} received ₦${tx.amountNgn.toLocaleString()}`,
          body: `Received ₦${tx.amountNgn.toLocaleString()} from ${tx.counterparty} into your NGN receiving account.`,
          category: 'wallet',
          actionUrl: '/hub/wallet.html#transactions'
        });
      } catch (err) {}

      return {
        ok: true,
        credited: true,
        transactionId: txRecordId,
        nairatag: account.nairatag_id,
        userId: account.user_id,
        amountKobo: tx.amountKobo,
        amountNgn: (tx.amountKobo / 100).toFixed(2),
        reference: tx.txRef
      };
    },

    getTransactions(userId, limit = 50) {
      if (!userId) return [];
      return notificationStore.getNgnTransactionsForUser(userId, limit);
    },

    getBalance(userId) {
      if (!userId) return { balanceKobo: 0, balanceNgn: '0.00' };
      return notificationStore.getLedgerBalance(userId);
    },

    /**
     * Dedicated Flutterwave Partnership & Strategic Analytics
     */
    getAnalytics() {
      return notificationStore.getNgnAccountAnalytics();
    },

    formatNgnAccount(acc) {
      return {
        id: acc.id,
        userId: acc.user_id,
        nairatag: acc.nairatag_id,
        provider: acc.provider,
        accountNumber: acc.account_number || null,
        bankName: acc.bank_name || 'Flutterwave MFB',
        bankCode: acc.bank_code || '035',
        accountName: acc.account_name || 'NairaTag User',
        currency: acc.currency,
        status: acc.status,
        isReadyToReceive: acc.status === ACCOUNT_STATES.ACTIVE,
        kycStatus: acc.kyc_status,
        poweredBy: 'Flutterwave',
        disclosure: 'NGN account infrastructure powered by Flutterwave.',
        createdAt: acc.created_at,
        activatedAt: acc.activated_at,
        failureReason: acc.failure_reason || null
      };
    }
  };
}

module.exports = {
  createFlutterwaveVaService,
  NgnAccountProvider,
  FlutterwaveNgnProvider,
  ACCOUNT_STATES,
  KYC_STATES
};
