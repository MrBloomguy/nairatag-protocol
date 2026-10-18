/**
 * @file PermissionManager.js
 * @description Centralized Security and Authorization Manager for CeloTags.
 *
 * Implements CeloTags Master Prompt Section 4.1 & 9.1:
 * - Least-privilege permission grants.
 * - Enforces boundary checks, per-transaction limits, and daily caps.
 * - Provides immediate revocation and auditable history.
 */

import { PermissionGrant } from './PermissionGrant.js';

export class PermissionManager {
  constructor() {
    // grantId -> PermissionGrant
    this._grants = new Map();
    // principal:subject:action -> grantId
    this._lookup = new Map();
  }

  /**
   * Issues an explicit permission grant from a principal to an Agent or tool.
   *
   * @param {Object} grantData - See PermissionGrant constructor
   * @returns {PermissionGrant}
   */
  createGrant(grantData) {
    const grant = new PermissionGrant(grantData);
    this._grants.set(grant.grantId, grant);

    const key = `${grant.principal}:${grant.subject}:${grant.action}`;
    this._lookup.set(key, grant.grantId);

    return grant;
  }

  /**
   * Retrieves active grant between principal and subject for a specific action.
   *
   * @param {string} principal
   * @param {string} subject
   * @param {string} action
   * @returns {PermissionGrant|null}
   */
  getGrant(principal, subject, action) {
    const key = `${principal.toLowerCase()}:${subject.toLowerCase()}:${action}`;
    const grantId = this._lookup.get(key);
    if (!grantId) return null;

    const grant = this._grants.get(grantId);
    if (!grant || !grant.isValid()) return null;
    return grant;
  }

  /**
   * Evaluates if a proposed Agent action is authorized.
   *
   * @param {Object} proposal
   * @param {string} proposal.principal - User wallet
   * @param {string} proposal.subject - Agent tag or address
   * @param {string} proposal.action - Action type (e.g. "EXECUTE_BOUNDED_TRANSFER")
   * @param {string} [proposal.resource] - Contract or endpoint
   * @param {number} [proposal.amount] - Financial spend amount
   * @returns {{ authorized: boolean, reason?: string, grant?: Object, requiresSignature?: boolean }}
   */
  evaluate(proposal) {
    const grant = this.getGrant(proposal.principal, proposal.subject, proposal.action);
    if (!grant) {
      return {
        authorized: false,
        reason: `No active permission grant found for ${proposal.action} from ${proposal.principal} to ${proposal.subject}.`
      };
    }

    const evaluation = grant.evaluate(proposal);
    return {
      ...evaluation,
      grantId: grant.grantId
    };
  }

  /**
   * Records execution of an authorized task and updates spending totals.
   */
  recordExecution(proposal, details = {}) {
    const grant = this.getGrant(proposal.principal, proposal.subject, proposal.action);
    if (grant) {
      grant.recordExecution({ amount: proposal.amount, ...details });
    }
  }

  /**
   * Revokes a grant by ID.
   */
  revokeGrant(grantId, caller) {
    const grant = this._grants.get(grantId);
    if (!grant) throw new Error('Grant not found');
    if (grant.principal !== caller.toLowerCase()) {
      throw new Error('Unauthorized: only granting principal can revoke permission');
    }
    grant.revoke();
    return grant;
  }

  /**
   * Lists all grants created by a user wallet.
   */
  listGrantsForPrincipal(principal) {
    const norm = principal.toLowerCase();
    const list = [];
    for (const grant of this._grants.values()) {
      if (grant.principal === norm) {
        list.push(grant.toJSON());
      }
    }
    return list;
  }
}
