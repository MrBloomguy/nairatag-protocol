/**
 * @file IdentityRecord.js
 * @description Standard Identity Record Model for CeloTags Protocol.
 *
 * Implements CeloTags Master Prompt Section 5.1 & 17.1:
 * - Authoritative record schema for identity ownership and lifecycle.
 * - Supports Human, Agent, and Application/Business identities.
 * - Tracks status (ACTIVE, SUSPENDED, REVOKED, EXPIRED).
 */

import { CanonicalIdentifier } from '../namespaces/CanonicalIdentifier.js';

export const IDENTITY_TYPES = [
  'human',
  'agent',
  'application',
  'business'
];

export const IDENTITY_STATUSES = [
  'ACTIVE',
  'SUSPENDED',
  'REVOKED',
  'EXPIRED'
];

export class IdentityRecord {
  /**
   * @param {Object} data
   * @param {string|CanonicalIdentifier} data.identifier - e.g. "@ng:segun" or CanonicalIdentifier
   * @param {string} data.owner - Controller wallet address (0x...)
   * @param {string} [data.type='human'] - One of IDENTITY_TYPES
   * @param {string} [data.status='ACTIVE'] - One of IDENTITY_STATUSES
   * @param {string} [data.resolver] - Address or URL of binding resolver
   * @param {string} [data.recoveryAddress] - Account designated for emergency recovery
   * @param {number} [data.createdAt] - Creation timestamp ms
   * @param {number} [data.expiresAt] - Expiration timestamp ms (null if permanent)
   * @param {Object} [data.metadata] - Arbitrary public metadata
   */
  constructor(data) {
    if (!data.identifier) {
      throw new Error('IdentityRecord requires an identifier');
    }
    if (!data.owner) {
      throw new Error('IdentityRecord requires an owner address');
    }

    this.identifier = data.identifier instanceof CanonicalIdentifier
      ? data.identifier
      : CanonicalIdentifier.parse(data.identifier);

    this.owner = String(data.owner).toLowerCase();
    
    const idType = (data.type || 'human').toLowerCase();
    this.type = IDENTITY_TYPES.includes(idType) ? idType : 'human';

    const idStatus = (data.status || 'ACTIVE').toUpperCase();
    this.status = IDENTITY_STATUSES.includes(idStatus) ? idStatus : 'ACTIVE';

    this.resolver = data.resolver || null;
    this.recoveryAddress = data.recoveryAddress ? String(data.recoveryAddress).toLowerCase() : null;
    this.createdAt = data.createdAt ? Number(data.createdAt) : Date.now();
    this.expiresAt = data.expiresAt ? Number(data.expiresAt) : null;
    this.updatedAt = data.updatedAt ? Number(data.updatedAt) : Date.now();
    this.metadata = typeof data.metadata === 'object' && data.metadata !== null ? data.metadata : {};
  }

  /**
   * Determines if identity is active and valid.
   */
  isActive() {
    if (this.status !== 'ACTIVE') return false;
    if (this.expiresAt && Date.now() > this.expiresAt) return false;
    return true;
  }

  toJSON() {
    return {
      urn: this.identifier.urn,
      scoped: this.identifier.scoped,
      display: this.identifier.display,
      namespace: this.identifier.namespace,
      handle: this.identifier.handle,
      owner: this.owner,
      type: this.type,
      status: this.status,
      resolver: this.resolver,
      recoveryAddress: this.recoveryAddress,
      createdAt: this.createdAt,
      expiresAt: this.expiresAt,
      updatedAt: this.updatedAt,
      metadata: this.metadata
    };
  }
}
