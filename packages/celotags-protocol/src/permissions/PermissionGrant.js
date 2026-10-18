/**
 * @file PermissionGrant.js
 * @description Principle-Scoped Authorization & Spending Policy Engine.
 *
 * Implements CeloTags Master Prompt Section 4.1, 9.1, and 17.4:
 * - "Identity is not authority": resolving a tag gives ZERO default transaction authority.
 * - Explicit, bounded, revocable permission grants for Agents and tools.
 * - Enforces per-transaction limits, daily caps, and approval boundaries.
 */

export const PERMITTED_ACTIONS = [
  'READ_PROFILE',
  'SUBMIT_TASK_OFFER',
  'EXECUTE_DELEGATED_TASK',
  'PREPARE_TRANSACTION_PREVIEW',
  'EXECUTE_BOUNDED_TRANSFER',
  'SUBMIT_BOUNTY_DELIVERABLE',
  'DISPATCH_TAG2TAG_MESSAGE'
];

export class PermissionGrant {
  /**
   * @param {Object} data
   * @param {string} data.grantId - Unique UUID / identifier
   * @param {string} data.principal - Granting user/wallet address
   * @param {string} data.subject - Authorized Agent identifier or address
   * @param {string} data.action - One of PERMITTED_ACTIONS
   * @param {string} [data.resource='*'] - Target contract, API, or resource scope
   * @param {Object} [data.spendingLimits] - { maxPerTx: 5000, dailyCap: 20000, currency: 'cNGN' }
   * @param {boolean} [data.requiresExplicitApproval=false] - If true, requires explicit human signature
   * @param {number} [data.expiresAt] - Epoch timestamp ms
   */
  constructor(data) {
    if (!data.principal || !data.subject || !data.action) {
      throw new Error('PermissionGrant requires principal, subject, and action');
    }
    if (!PERMITTED_ACTIONS.includes(data.action)) {
      throw new Error(`Invalid action. Must be one of: ${PERMITTED_ACTIONS.join(', ')}`);
    }

    this.grantId = data.grantId || `grant_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.principal = String(data.principal).toLowerCase();
    this.subject = String(data.subject).toLowerCase();
    this.action = data.action;
    this.resource = data.resource || '*';
    
    this.spendingLimits = {
      maxPerTx: Number(data.spendingLimits?.maxPerTx ?? 0),
      dailyCap: Number(data.spendingLimits?.dailyCap ?? 0),
      currency: data.spendingLimits?.currency || 'cNGN',
      spentToday: Number(data.spendingLimits?.spentToday ?? 0),
      lastSpentReset: data.spendingLimits?.lastSpentReset || Date.now()
    };

    this.requiresExplicitApproval = Boolean(data.requiresExplicitApproval);
    this.expiresAt = data.expiresAt ? Number(data.expiresAt) : Date.now() + 30 * 86400000; // default 30 days
    this.revoked = false;
    this.revokedAt = null;
    this.createdAt = data.createdAt || Date.now();
    this.auditTrail = Array.isArray(data.auditTrail) ? data.auditTrail : [];
  }

  /**
   * Checks if grant is currently active (not expired and not revoked).
   */
  isValid() {
    if (this.revoked) return false;
    if (Date.now() > this.expiresAt) return false;
    return true;
  }

  /**
   * Revokes this grant permanently.
   */
  revoke(reason = 'User revocation') {
    this.revoked = true;
    this.revokedAt = Date.now();
    this.auditTrail.unshift({
      event: 'REVOKED',
      timestamp: this.revokedAt,
      reason
    });
  }

  /**
   * Validates whether a proposed action and amount conforms to this grant.
   *
   * @param {Object} proposal - { action, resource, amount }
   * @returns {{ authorized: boolean, reason?: string, requiresSignature?: boolean }}
   */
  evaluate(proposal) {
    if (!this.isValid()) {
      return { authorized: false, reason: 'Permission grant is expired or revoked' };
    }
    if (proposal.action !== this.action) {
      return { authorized: false, reason: `Action mismatch: requires ${this.action}, received ${proposal.action}` };
    }
    if (this.resource !== '*' && proposal.resource && proposal.resource.toLowerCase() !== this.resource.toLowerCase()) {
      return { authorized: false, reason: `Resource out of scope: ${proposal.resource}` };
    }

    // Check spending limits if financial action
    if (proposal.amount && Number(proposal.amount) > 0) {
      const amt = Number(proposal.amount);
      if (this.spendingLimits.maxPerTx > 0 && amt > this.spendingLimits.maxPerTx) {
        return {
          authorized: false,
          requiresSignature: true,
          reason: `Amount (${amt}) exceeds per-transaction grant limit (${this.spendingLimits.maxPerTx}). Explicit user signature required.`
        };
      }

      // Reset daily counter if > 24 hours
      if (Date.now() - this.spendingLimits.lastSpentReset > 86400000) {
        this.spendingLimits.spentToday = 0;
        this.spendingLimits.lastSpentReset = Date.now();
      }

      if (this.spendingLimits.dailyCap > 0 && (this.spendingLimits.spentToday + amt) > this.spendingLimits.dailyCap) {
        return {
          authorized: false,
          requiresSignature: true,
          reason: `Transaction would exceed daily cap of ${this.spendingLimits.dailyCap} ${this.spendingLimits.currency}.`
        };
      }
    }

    if (this.requiresExplicitApproval) {
      return { authorized: false, requiresSignature: true, reason: 'Explicit user confirmation required by policy.' };
    }

    return { authorized: true };
  }

  /**
   * Records successful execution into audit log.
   */
  recordExecution(details = {}) {
    if (details.amount) {
      this.spendingLimits.spentToday += Number(details.amount);
    }
    this.auditTrail.unshift({
      event: 'EXECUTED',
      timestamp: Date.now(),
      details
    });
    if (this.auditTrail.length > 50) {
      this.auditTrail = this.auditTrail.slice(0, 50);
    }
  }

  /**
   * Records expenditure amount against the daily cap.
   *
   * @param {number} amount
   */
  recordSpend(amount) {
    this.recordExecution({ amount });
  }

  toJSON() {
    return {
      grantId: this.grantId,
      principal: this.principal,
      subject: this.subject,
      action: this.action,
      resource: this.resource,
      spendingLimits: this.spendingLimits,
      requiresExplicitApproval: this.requiresExplicitApproval,
      expiresAt: this.expiresAt,
      revoked: this.revoked,
      revokedAt: this.revokedAt,
      createdAt: this.createdAt,
      auditTrailCount: this.auditTrail.length
    };
  }
}
