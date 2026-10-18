/**
 * @file a2a.js
 * @description Official Tag2Tag Protocol Engine for NairaTag Identities on Celo.
 * Implements the 6 Core Tag2Tag Primitives:
 * 1. Pay: Direct cNGN transfers & multi-agent bill splits
 * 2. Request: Structured peer-to-peer invoices & payment requests
 * 3. Talk: Agent-to-Agent conversational messaging & autonomous negotiation
 * 4. Delegate: Task delegation, hiring specialist agents, and deliverable tracking
 * 5. Escrow: Conditional payment locking, proof-of-delivery verification, and escrow release
 * 6. Discover: Agent registry search by capability, category, location, and reputation
 *
 * Includes Trust Tier & Reputation Scoring:
 * - UNKNOWN, KNOWN, TRUSTED, VERIFIED_MERCHANT
 */

const TrustLevel = Object.freeze({
  UNKNOWN: 'UNKNOWN',
  KNOWN: 'KNOWN',
  TRUSTED: 'TRUSTED',
  VERIFIED_MERCHANT: 'VERIFIED_MERCHANT'
});

const EscrowStatus = Object.freeze({
  LOCKED: 'LOCKED',
  DELIVERED: 'DELIVERED',
  RELEASED: 'RELEASED',
  REFUNDED: 'REFUNDED',
  DISPUTED: 'DISPUTED'
});

// Seed directory of active ecosystem service agents backed by Self Agent ID & ERC-8004
const DEFAULT_AGENT_DIRECTORY = [
  {
    tag: '₦DESIGNER',
    name: 'PixelForge Brand Agent',
    category: 'design',
    capabilities: ['logo_design', 'brand_identity', 'ui_ux'],
    rateRange: { min: 35000, max: 80000, asset: 'cNGN' },
    location: 'Lagos',
    reputation: 96,
    completedJobs: 142,
    successfulPayments: 140,
    disputes: 0,
    responseTime: '< 5 min',
    trustLevel: TrustLevel.VERIFIED_MERCHANT,
    selfAgentId: 'SAID-11142220-1042',
    humanVerified: true,
    proofProvider: 'Self Protocol ZK-Passport',
    erc8004Id: 1042,
    visaTier: 2,
    visaName: 'Work Visa'
  },
  {
    tag: '₦DEV',
    name: 'SmartContract Dev Agent',
    category: 'development',
    capabilities: ['landing_page', 'smart_contracts', 'web_apps'],
    rateRange: { min: 80000, max: 250000, asset: 'cNGN' },
    location: 'Remote',
    reputation: 94,
    completedJobs: 98,
    successfulPayments: 98,
    disputes: 1,
    responseTime: '< 15 min',
    trustLevel: TrustLevel.TRUSTED,
    selfAgentId: 'SAID-11142220-1088',
    humanVerified: true,
    proofProvider: 'Self Protocol ZK-Passport',
    erc8004Id: 1088,
    visaTier: 2,
    visaName: 'Work Visa'
  },
  {
    tag: '₦CHOWDECK',
    name: 'Chowdeck Logistics & Food Agent',
    category: 'food_delivery',
    capabilities: ['order_food', 'track_delivery', 'relay_courier'],
    rateRange: { min: 2500, max: 25000, asset: 'cNGN' },
    location: 'Lagos/Abuja',
    reputation: 98,
    completedJobs: 3450,
    successfulPayments: 3442,
    disputes: 2,
    responseTime: '< 1 min',
    trustLevel: TrustLevel.VERIFIED_MERCHANT,
    selfAgentId: 'SAID-11142220-3021',
    humanVerified: true,
    proofProvider: 'Self Protocol ZK-Passport',
    erc8004Id: 3021,
    visaTier: 3,
    visaName: 'Citizenship'
  },
  {
    tag: '₦TRAVEL',
    name: 'AfriFly Booking Operator',
    category: 'travel',
    capabilities: ['flight_search', 'hotel_booking', 'itinerary'],
    rateRange: { min: 50000, max: 600000, asset: 'cNGN' },
    location: 'Abuja',
    reputation: 92,
    completedJobs: 64,
    successfulPayments: 64,
    disputes: 0,
    responseTime: '< 10 min',
    trustLevel: TrustLevel.TRUSTED,
    selfAgentId: 'SAID-11142220-1145',
    humanVerified: true,
    proofProvider: 'Self Protocol ZK-Passport',
    erc8004Id: 1145,
    visaTier: 1,
    visaName: 'Tourist Visa'
  }
];

class Tag2TagProtocol {
  constructor(options = {}) {
    this.inboxes = new Map(); // tag -> Array<Message>
    this.sentLog = [];
    this.escrows = new Map(); // escrowId -> EscrowRecord
    this.relationships = new Map(); // "from_to" -> TrustLevel
    this.directory = [...(options.directory || DEFAULT_AGENT_DIRECTORY)];
    this.tagResolver = options.tagResolver || null;
  }

  _normalize(tag) {
    const raw = String(tag || '').trim();
    return raw.startsWith('₦') ? raw : `₦${raw}`;
  }

  _getInbox(tag) {
    const normalized = this._normalize(tag);
    if (!this.inboxes.has(normalized)) {
      this.inboxes.set(normalized, []);
    }
    return this.inboxes.get(normalized);
  }

  // -------------------------------------------------------------
  // 1. TAG2TAG PAY & SPLIT
  // -------------------------------------------------------------

  /**
   * Notify recipient agent of confirmed payment
   */
  async notifyPayment({ fromTag, toTag, amount, asset = 'cNGN', txHash, note = '' }) {
    return this.sendMessage({
      fromTag,
      toTag,
      type: 'PAYMENT_NOTICE',
      payload: { amount, asset, txHash, network: 'celo', note }
    });
  }

  /**
   * Split a bill across multiple recipient/payer agents
   */
  createSplitBill({ fromTag, splits = [], totalAmount, description = '' }) {
    const splitId = `split_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const perPerson = splits.length > 0 ? Number(totalAmount) / splits.length : 0;

    const items = splits.map(recipient => ({
      tag: this._normalize(recipient.tag || recipient),
      amount: recipient.amount || Math.round(perPerson),
      status: 'PENDING_PAYMENT'
    }));

    const splitRecord = {
      splitId,
      creator: this._normalize(fromTag),
      totalAmount: Number(totalAmount),
      asset: 'cNGN',
      description,
      items,
      createdAt: Date.now()
    };

    // Dispatch request to each participant's inbox
    items.forEach(item => {
      this.sendMessage({
        fromTag,
        toTag: item.tag,
        type: 'SPLIT_REQUEST',
        payload: {
          splitId,
          shareAmount: item.amount,
          totalAmount,
          description,
          creator: fromTag
        }
      });
    });

    return splitRecord;
  }

  // -------------------------------------------------------------
  // 2. TAG2TAG REQUEST & INVOICE
  // -------------------------------------------------------------

  /**
   * Request money or create structured invoice
   */
  async requestPayment({ fromTag, toTag, amount, asset = 'cNGN', reason = 'Services', dueDate = 'Today', invoiceId = null }) {
    const invId = invoiceId || `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    return this.sendMessage({
      fromTag,
      toTag,
      type: 'INVOICE_REQUEST',
      payload: {
        invoiceId: invId,
        amount: Number(amount),
        asset,
        reason,
        dueDate,
        status: 'PENDING_APPROVAL'
      }
    });
  }

  // -------------------------------------------------------------
  // 3. TAG2TAG TALK & NEGOTIATION
  // -------------------------------------------------------------

  /**
   * Natural conversational messaging between agents
   */
  async talk({ fromTag, toTag, messageText, context = {} }) {
    return this.sendMessage({
      fromTag,
      toTag,
      type: 'AGENT_TALK',
      payload: { text: messageText, context }
    });
  }

  /**
   * Autonomous price and delivery negotiation between agents
   */
  async negotiate({ clientTag, providerTag, task, offerAmount, terms = {} }) {
    const client = this._normalize(clientTag);
    const provider = this._normalize(providerTag);

    // Look up provider agent profile
    const agentProfile = this.directory.find(a => a.tag.toLowerCase() === provider.toLowerCase());
    const baseRate = agentProfile ? agentProfile.rateRange.min : offerAmount * 1.2;

    let finalAmount = offerAmount;
    let agreementReached = false;
    let replyMessage = '';

    if (offerAmount >= baseRate) {
      agreementReached = true;
      finalAmount = offerAmount;
      replyMessage = `${provider} Agent: Offer of ₦${Number(offerAmount).toLocaleString()} cNGN accepted for "${task}". Ready to initiate escrow contract.`;
    } else {
      // Counter-offer
      const counterOffer = Math.round((offerAmount + baseRate) / 2);
      agreementReached = true;
      finalAmount = counterOffer;
      replyMessage = `${provider} Agent: I can execute "${task}" for ₦${counterOffer.toLocaleString()} cNGN delivered by Friday. Deal?`;
    }

    const negotiationRecord = {
      negotiationId: `neg_${Date.now()}`,
      client,
      provider,
      task,
      initialOffer: offerAmount,
      agreedAmount: finalAmount,
      agreementReached,
      status: 'AGREED',
      response: replyMessage
    };

    await this.sendMessage({
      fromTag: client,
      toTag: provider,
      type: 'NEGOTIATION_PROPOSAL',
      payload: negotiationRecord
    });

    return negotiationRecord;
  }

  // -------------------------------------------------------------
  // 4. TAG2TAG DELEGATE
  // -------------------------------------------------------------

  /**
   * Hire or delegate a task to another specialist agent
   */
  async delegateTask({ clientTag, serviceTag, taskDescription, budget, deadline = '3 days' }) {
    const delegationId = `del_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const delegation = {
      delegationId,
      clientTag: this._normalize(clientTag),
      serviceTag: this._normalize(serviceTag),
      taskDescription,
      budget: Number(budget),
      asset: 'cNGN',
      deadline,
      status: 'DELEGATED'
    };

    await this.sendMessage({
      fromTag: clientTag,
      toTag: serviceTag,
      type: 'TASK_DELEGATION',
      payload: delegation
    });

    return delegation;
  }

  // -------------------------------------------------------------
  // 5. TAG2TAG ESCROW & PROOF-OF-DELIVERY
  // -------------------------------------------------------------

  /**
   * Lock funds in conditional escrow until job proof is verified
   */
  createEscrow({ clientTag, serviceTag, amount, asset = 'cNGN', conditions = 'Work delivery' }) {
    const escrowId = `escrow_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const record = {
      escrowId,
      clientTag: this._normalize(clientTag),
      serviceTag: this._normalize(serviceTag),
      amount: Number(amount),
      asset,
      conditions,
      status: EscrowStatus.LOCKED,
      lockedAt: Date.now(),
      deliveryProof: null,
      releasedAt: null
    };

    this.escrows.set(escrowId, record);

    this.sendMessage({
      fromTag: clientTag,
      toTag: serviceTag,
      type: 'ESCROW_LOCKED',
      payload: { escrowId, amount, asset, conditions }
    });

    return record;
  }

  /**
   * Service agent submits deliverable proof
   */
  submitDeliveryProof(escrowId, proof = 'Deliverable files uploaded') {
    const escrow = this.escrows.get(escrowId);
    if (!escrow) throw new Error(`Escrow ${escrowId} not found`);
    if (escrow.status !== EscrowStatus.LOCKED) {
      throw new Error(`Cannot deliver escrow in status: ${escrow.status}`);
    }

    escrow.status = EscrowStatus.DELIVERED;
    escrow.deliveryProof = proof;
    escrow.deliveredAt = Date.now();

    this.sendMessage({
      fromTag: escrow.serviceTag,
      toTag: escrow.clientTag,
      type: 'DELIVERY_SUBMITTED',
      payload: { escrowId, proof }
    });

    return escrow;
  }

  /**
   * Client agent releases funds to service agent upon satisfactory delivery
   */
  releaseEscrow(escrowId, approvedBy) {
    const escrow = this.escrows.get(escrowId);
    if (!escrow) throw new Error(`Escrow ${escrowId} not found`);
    if (escrow.status !== EscrowStatus.DELIVERED && escrow.status !== EscrowStatus.LOCKED) {
      throw new Error(`Cannot release escrow in status: ${escrow.status}`);
    }

    escrow.status = EscrowStatus.RELEASED;
    escrow.releasedAt = Date.now();
    escrow.releasedBy = approvedBy;

    // Simulate on-chain release transaction hash
    escrow.releaseTxHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

    this.sendMessage({
      fromTag: escrow.clientTag,
      toTag: escrow.serviceTag,
      type: 'ESCROW_RELEASED',
      payload: { escrowId, amount: escrow.amount, txHash: escrow.releaseTxHash }
    });

    return escrow;
  }

  // -------------------------------------------------------------
  // 6. TAG2TAG DISCOVER & DIRECTORY
  // -------------------------------------------------------------

  /**
   * Discover agents by capability, category, budget, and location
   */
  discover({ query = '', category = null, maxRate = null, minReputation = 0, location = null }) {
    let results = [...this.directory];

    if (category) {
      results = results.filter(a => a.category.toLowerCase() === category.toLowerCase());
    }

    if (query) {
      const q = query.toLowerCase();
      results = results.filter(a =>
        a.tag.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.capabilities.some(c => c.toLowerCase().includes(q))
      );
    }

    if (maxRate !== null) {
      results = results.filter(a => a.rateRange.min <= maxRate);
    }

    if (minReputation > 0) {
      results = results.filter(a => a.reputation >= minReputation);
    }

    if (location) {
      const loc = location.toLowerCase();
      results = results.filter(a => a.location.toLowerCase().includes(loc) || a.location.toLowerCase() === 'remote');
    }

    return results;
  }

  /**
   * Register a new agent into the network directory
   */
  registerAgent(agentProfile) {
    const tag = this._normalize(agentProfile.tag);
    const existingIdx = this.directory.findIndex(a => a.tag.toLowerCase() === tag.toLowerCase());
    const entry = {
      ...agentProfile,
      tag,
      reputation: agentProfile.reputation || 90,
      completedJobs: agentProfile.completedJobs || 0,
      trustLevel: agentProfile.trustLevel || TrustLevel.KNOWN
    };

    if (existingIdx >= 0) {
      this.directory[existingIdx] = entry;
    } else {
      this.directory.push(entry);
    }
    return entry;
  }

  // -------------------------------------------------------------
  // TRUST & REPUTATION ENGINE
  // -------------------------------------------------------------

  getTrustLevel(fromTag, toTag) {
    const key = `${this._normalize(fromTag)}_${this._normalize(toTag)}`;
    return this.relationships.get(key) || TrustLevel.UNKNOWN;
  }

  setTrustLevel(fromTag, toTag, level) {
    const key = `${this._normalize(fromTag)}_${this._normalize(toTag)}`;
    this.relationships.set(key, level);
    return level;
  }

  getMaxUnapprovedLimit(level) {
    switch (level) {
      case TrustLevel.VERIFIED_MERCHANT:
        return 50000;
      case TrustLevel.TRUSTED:
        return 25000;
      case TrustLevel.KNOWN:
        return 10000;
      case TrustLevel.UNKNOWN:
      default:
        return 1000;
    }
  }

  // -------------------------------------------------------------
  // CORE MESSAGING PRIMITIVE
  // -------------------------------------------------------------

  async sendMessage({ fromTag, toTag, type, payload = {} }) {
    const from = this._normalize(fromTag);
    const to = this._normalize(toTag);

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const message = {
      id: messageId,
      timestamp: Date.now(),
      from,
      to,
      type,
      payload,
      status: 'DELIVERED',
      response: null
    };

    this.sentLog.push(message);
    const recipientInbox = this._getInbox(to);
    recipientInbox.push(message);

    // Auto-reply emulation for well-known agents
    if (type === 'PAYMENT_NOTICE') {
      message.response = {
        acknowledged: true,
        status: 'RECEIVED',
        message: `${to} Agent: Payment received and acknowledged on Celo. Thank you!`,
        timestamp: Date.now()
      };
    } else if (type === 'STATUS_QUERY') {
      message.response = {
        acknowledged: true,
        status: 'CONFIRMED',
        message: `Yes, ${to} confirmed receipt of the transaction.`,
        timestamp: Date.now()
      };
    } else if (type === 'AGENT_TALK') {
      // Natural dialogue responses
      const q = String(payload.text || '').toLowerCase();
      if (q.includes('market') || q.includes('need anything')) {
        message.response = {
          acknowledged: true,
          status: 'REPLIED',
          message: `${to} Agent: Mama says she needs rice and cooking oil. Estimated ₦18,500 cNGN.`,
          timestamp: Date.now()
        };
      } else {
        message.response = {
          acknowledged: true,
          status: 'REPLIED',
          message: `${to} Agent: Received your message and notified the account owner.`,
          timestamp: Date.now()
        };
      }
    }

    return message;
  }

  async queryPaymentReceipt({ fromTag, toTag, txHash }) {
    return this.sendMessage({
      fromTag,
      toTag,
      type: 'STATUS_QUERY',
      payload: { txHash }
    });
  }

  getMessages(tag) {
    return this._getInbox(tag);
  }
}

// Backwards-compatible alias
const AgentToAgentProtocol = Tag2TagProtocol;
const defaultTag2Tag = new Tag2TagProtocol();
const defaultA2AProtocol = defaultTag2Tag;

module.exports = {
  Tag2TagProtocol,
  AgentToAgentProtocol,
  defaultTag2Tag,
  defaultA2AProtocol,
  TrustLevel,
  EscrowStatus,
  DEFAULT_AGENT_DIRECTORY
};
