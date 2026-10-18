/**
 * @file permissions.js
 * @description Deterministic Permission Engine for Autonomous NairaTag Agent Actions.
 * Enforces strict per-transaction and daily spending boundaries outside LLM evaluation.
 */

const { DEFAULT_LIMITS } = require('./config');

class PermissionEngine {
  constructor(initialStore = {}) {
    // Map of agentId -> permission settings & tracking
    this.policies = new Map();
    this.dailySpent = new Map(); // key: `${agentId}:${dateKey}` -> spentBigInt
  }

  getDefaultPolicy() {
    return {
      canTransfer: true,
      perTransactionLimit: DEFAULT_LIMITS.maxPerTx,
      dailyLimit: DEFAULT_LIMITS.dailyLimit,
      autoApproveThreshold: DEFAULT_LIMITS.autoApproveThreshold,
      allowedTokens: ['cNGN', 'USDC', 'USDT', 'CELO'],
      recurringPaymentsEnabled: true,
      requireConfirmationByDefault: true
    };
  }

  getPolicy(agentId = 'default') {
    if (!this.policies.has(agentId)) {
      this.policies.set(agentId, this.getDefaultPolicy());
    }
    return this.policies.get(agentId);
  }

  setPolicy(agentId, updates = {}) {
    const current = this.getPolicy(agentId);
    const updated = {
      ...current,
      ...updates,
      perTransactionLimit: updates.perTransactionLimit !== undefined ? BigInt(updates.perTransactionLimit) : current.perTransactionLimit,
      dailyLimit: updates.dailyLimit !== undefined ? BigInt(updates.dailyLimit) : current.dailyLimit,
      autoApproveThreshold: updates.autoApproveThreshold !== undefined ? BigInt(updates.autoApproveThreshold) : current.autoApproveThreshold
    };
    this.policies.set(agentId, updated);
    return updated;
  }

  _getDateKey() {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  }

  getDailySpent(agentId = 'default') {
    const key = `${agentId}:${this._getDateKey()}`;
    return this.dailySpent.get(key) || 0n;
  }

  recordSpend(agentId = 'default', amountNominal) {
    const key = `${agentId}:${this._getDateKey()}`;
    const current = this.dailySpent.get(key) || 0n;
    this.dailySpent.set(key, current + BigInt(amountNominal));
  }

  /**
   * Evaluate whether an action is permitted, blocked, or requires explicit confirmation.
   * @param {Object} params
   * @param {string} params.agentId
   * @param {string} params.action - 'TRANSFER' | 'SWAP' | 'TASK_CREATE' | 'READ'
   * @param {string} params.asset - 'cNGN' | 'USDC' | 'USDT' | 'CELO'
   * @param {number|bigint|string} params.amount - Nominal amount (e.g. 5000 for ₦5,000)
   * @param {string} params.recipient - NairaTag (₦MAMA) or 0xAddress
   */
  evaluatePermission({
    agentId = 'default',
    action = 'TRANSFER',
    asset = 'cNGN',
    amount = 0n,
    recipient = null
  }) {
    // Read operations never mutate state
    if (action === 'READ' || action === 'INFORMATION') {
      return {
        allowed: true,
        code: 'PERMITTED_READ',
        requiresApproval: false,
        reason: 'Read operation has no financial consequence.'
      };
    }

    const policy = this.getPolicy(agentId);

    if (!policy.canTransfer && action === 'TRANSFER') {
      return {
        allowed: false,
        code: 'TRANSFERS_DISABLED',
        requiresApproval: false,
        reason: 'Agent transfers are currently disabled in user security settings.'
      };
    }

    // Asset validation
    const normalizedAsset = String(asset || '').toUpperCase();
    const isAllowed = policy.allowedTokens.some(t => t.toUpperCase() === normalizedAsset);
    if (!isAllowed) {
      return {
        allowed: false,
        code: 'TOKEN_NOT_ALLOWED',
        requiresApproval: false,
        reason: `Token ${asset} is not on the allowed asset list for this agent.`
      };
    }

    const amtBig = BigInt(Math.floor(Number(amount) || 0));

    // Per-transaction limit check (Strict limit outside LLM)
    if (amtBig > policy.perTransactionLimit) {
      return {
        allowed: false,
        code: 'PERMISSION_REQUIRED',
        requiresApproval: false,
        reason: `Amount ₦${amtBig.toLocaleString()} exceeds single transaction limit of ₦${policy.perTransactionLimit.toLocaleString()}. Higher-level authorization required.`
      };
    }

    // Daily limit check
    const currentDaily = this.getDailySpent(agentId);
    if (currentDaily + amtBig > policy.dailyLimit) {
      return {
        allowed: false,
        code: 'DAILY_LIMIT_EXCEEDED',
        requiresApproval: false,
        reason: `Transaction of ₦${amtBig.toLocaleString()} exceeds remaining daily allowance. (Spent today: ₦${currentDaily.toLocaleString()} / Limit: ₦${policy.dailyLimit.toLocaleString()}).`
      };
    }

    // Auto-approve condition vs explicit approval
    const isAutoApprovable = amtBig <= policy.autoApproveThreshold && !policy.requireConfirmationByDefault;

    return {
      allowed: true,
      code: isAutoApprovable ? 'AUTO_APPROVED' : 'AWAITING_APPROVAL',
      requiresApproval: !isAutoApprovable,
      reason: isAutoApprovable
        ? `Within auto-approval threshold (₦${policy.autoApproveThreshold.toLocaleString()}).`
        : `Requires explicit user confirmation for amounts of ₦${policy.autoApproveThreshold.toLocaleString()} and above.`,
      policy: {
        perTransactionLimit: policy.perTransactionLimit.toString(),
        dailyLimit: policy.dailyLimit.toString(),
        dailySpent: currentDaily.toString()
      }
    };
  }
}

const defaultPermissionEngine = new PermissionEngine();

module.exports = {
  PermissionEngine,
  defaultPermissionEngine
};
