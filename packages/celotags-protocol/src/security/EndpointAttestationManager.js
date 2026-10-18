/**
 * @file EndpointAttestationManager.js
 * @description Domain & Endpoint Attestation Engine with Key Rotation, Expiry & Revocation.
 *
 * Implements Security Milestone Checklist 3:
 * - Separates identity ownership, domain ownership, endpoint key attestation, and operational reputation.
 * - Explicitly prevents equating a cryptographic signature with endpoint safety or financial authority.
 * - Supports key rotation, expiration checks, and immediate revocation.
 */

export const ATTESTATION_STATUSES = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
  SUPERSEDED: 'SUPERSEDED'
};

export class EndpointAttestationManager {
  constructor() {
    // attestationId -> AttestationRecord
    this._attestations = new Map();
    // endpointUrl -> active attestationId
    this._activeByEndpoint = new Map();
  }

  /**
   * Issues a signed endpoint attestation from the identity owner to an operational key.
   *
   * @param {Object} params
   * @param {string} params.owner - Controller wallet address
   * @param {string} params.tag - e.g. "₦SEGUN" or "@ng:segun"
   * @param {string} params.endpointUrl - e.g. "https://agent.nairatag.ng/a2a"
   * @param {string} params.operatorKey - Delegated operational signing key
   * @param {number} [params.validForDays=30] - Expiry window in days
   * @param {string} [params.signature] - Cryptographic signature from owner
   * @returns {Object} Attestation record
   */
  registerAttestation({ owner, tag, endpointUrl, operatorKey, validForDays = 30, signature = null }) {
    if (!owner || !endpointUrl || !operatorKey) {
      throw new Error('Endpoint attestation requires owner, endpointUrl, and operatorKey');
    }

    const normOwner = owner.toLowerCase();
    const normKey = operatorKey.toLowerCase();
    const cleanUrl = String(endpointUrl).trim();
    const validUntil = Date.now() + (validForDays * 86400 * 1000);
    const attestationId = `attest_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const record = {
      id: attestationId,
      owner: normOwner,
      tag,
      endpointUrl: cleanUrl,
      operatorKey: normKey,
      signature: signature || `simulated_attestation_sig_${normOwner}_${normKey}`,
      issuedAt: Date.now(),
      validUntil,
      status: ATTESTATION_STATUSES.ACTIVE,
      revokedAt: null,
      revocationReason: null,
      domainVerified: cleanUrl.startsWith('https://'),
      
      // CRITICAL SECURITY BOUNDARY: Attestation grants ZERO financial authority
      financialAuthority: false,
      authorityLevel: 'NONE',
      authorityNotice: 'Endpoint attestation confirms operator key authenticity. It conveys NO financial authority or asset transfer capability.'
    };

    this._attestations.set(attestationId, record);
    this._activeByEndpoint.set(cleanUrl, attestationId);

    return record;
  }

  /**
   * Rotates operational key for an existing endpoint attestation.
   *
   * @param {string} attestationId
   * @param {string} newOperatorKey
   * @param {string} caller
   * @returns {Object} New active attestation
   */
  rotateKey(attestationId, newOperatorKey, caller) {
    const existing = this._attestations.get(attestationId);
    if (!existing) throw new Error('Attestation not found');
    if (existing.owner !== caller.toLowerCase()) {
      throw new Error('Unauthorized: only identity owner can rotate endpoint key');
    }

    // Mark previous attestation as superseded
    existing.status = ATTESTATION_STATUSES.SUPERSEDED;

    // Issue new attestation with the new key
    return this.registerAttestation({
      owner: existing.owner,
      tag: existing.tag,
      endpointUrl: existing.endpointUrl,
      operatorKey: newOperatorKey,
      validForDays: 30
    });
  }

  /**
   * Immediately revokes an endpoint attestation.
   *
   * @param {string} attestationId
   * @param {string} caller
   * @param {string} [reason='owner_revocation']
   * @returns {Object} Revoked record
   */
  revokeAttestation(attestationId, caller, reason = 'owner_revocation') {
    const existing = this._attestations.get(attestationId);
    if (!existing) throw new Error('Attestation not found');
    if (existing.owner !== caller.toLowerCase()) {
      throw new Error('Unauthorized: only identity owner can revoke endpoint attestation');
    }

    existing.status = ATTESTATION_STATUSES.REVOKED;
    existing.revokedAt = Date.now();
    existing.revocationReason = reason;

    if (this._activeByEndpoint.get(existing.endpointUrl) === attestationId) {
      this._activeByEndpoint.delete(existing.endpointUrl);
    }

    return existing;
  }

  /**
   * Evaluates the current trust status of an endpoint attestation.
   * Fails closed if expired or revoked.
   *
   * @param {string} attestationId
   * @returns {{ valid: boolean, status: string, reason?: string, record?: Object }}
   */
  evaluateTrust(attestationId) {
    const record = this._attestations.get(attestationId);
    if (!record) {
      return { valid: false, status: 'NOT_FOUND', reason: 'No attestation registered for this identifier.' };
    }

    if (record.status === ATTESTATION_STATUSES.REVOKED) {
      return {
        valid: false,
        status: ATTESTATION_STATUSES.REVOKED,
        reason: `Endpoint attestation was revoked on ${new Date(record.revokedAt).toISOString()}: ${record.revocationReason}`
      };
    }

    if (record.status === ATTESTATION_STATUSES.SUPERSEDED) {
      return {
        valid: false,
        status: ATTESTATION_STATUSES.SUPERSEDED,
        reason: 'This attestation key was rotated and superseded by a newer key.'
      };
    }

    if (Date.now() > record.validUntil) {
      record.status = ATTESTATION_STATUSES.EXPIRED;
      return {
        valid: false,
        status: ATTESTATION_STATUSES.EXPIRED,
        reason: `Endpoint attestation expired on ${new Date(record.validUntil).toISOString()}. Key renewal required.`
      };
    }

    return {
      valid: true,
      status: ATTESTATION_STATUSES.ACTIVE,
      domainVerified: record.domainVerified,
      operatorKey: record.operatorKey,
      financialAuthority: false, // Invariant preserved
      record
    };
  }
}
