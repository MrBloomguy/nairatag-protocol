/**
 * @file CeloTagsRegistry.js
 * @description Authoritative Identity Registry Engine for CeloTags Protocol.
 *
 * Implements CeloTags Master Prompt Section 5.1:
 * - Records identity ownership and country-specific namespaces.
 * - Prevents duplicate claims, handles reserved names, and manages lifecycle status.
 * - Bridges on-chain Celo smart contracts with off-chain indexer state.
 */

import { CanonicalIdentifier } from '../namespaces/CanonicalIdentifier.js';
import { IdentityRecord } from './IdentityRecord.js';
import { GLOBAL_RESERVED_HANDLES } from '../namespaces/NamespaceConfig.js';

export class CeloTagsRegistry {
  /**
   * @param {Object} [options]
   * @param {boolean} [options.enforceOneTagPerWallet=false] - Optional consumer onboarding limit
   * @param {Function} [options.ownershipPolicy] - Optional custom policy check: ({ wallet, identifier, existingRecords }) => { allowed, reason }
   * @param {Function} [options.storageProvider] - Optional persistence hook (e.g. Supabase)
   */
  constructor(options = {}) {
    this.enforceOneTagPerWallet = Boolean(options.enforceOneTagPerWallet);
    this.ownershipPolicy = typeof options.ownershipPolicy === 'function' ? options.ownershipPolicy : null;
    this.storage = options.storageProvider || null;

    // In-memory registry maps:
    // urn -> IdentityRecord
    this._records = new Map();
    // normalized wallet -> Set<urn>
    this._ownerIdentities = new Map();
    // normalized wallet -> primary URN
    this._primaryOf = new Map();
  }

  /**
   * Checks availability of an identifier across namespaces.
   *
   * @param {string} rawInput - e.g. "₦SEGUN", "@gh:ama", "segun"
   * @param {string} [walletAddress] - Optional wallet checking ownership rules
   * @returns {{ available: boolean, reason?: string, canonical?: Object, existingOwner?: string, walletRestricted?: boolean }}
   */
  checkAvailability(rawInput, walletAddress = null) {
    let identifier;
    try {
      identifier = CanonicalIdentifier.parse(rawInput);
    } catch (err) {
      return { available: false, reason: err.message };
    }

    if (GLOBAL_RESERVED_HANDLES.has(identifier.handle)) {
      return { available: false, reason: `"${identifier.handle}" is a protected protocol reserved identifier.` };
    }

    const existing = this._records.get(identifier.urn);
    if (existing && existing.isActive()) {
      return {
        available: false,
        reason: `${identifier.display} is already registered to ${existing.owner.slice(0, 6)}...${existing.owner.slice(-4)}.`,
        existingOwner: existing.owner
      };
    }

    if (walletAddress) {
      const normWallet = walletAddress.toLowerCase();
      const userIdentities = this._ownerIdentities.get(normWallet) || new Set();

      // Custom product policy hook if configured
      if (this.ownershipPolicy) {
        const policyResult = this.ownershipPolicy({
          wallet: normWallet,
          identifier,
          existingRecords: Array.from(userIdentities).map(urn => this._records.get(urn)).filter(Boolean)
        });
        if (policyResult && !policyResult.allowed) {
          return {
            available: false,
            walletRestricted: true,
            reason: policyResult.reason || 'Product policy restricted registration.'
          };
        }
      }

      // Consumer campaign 1-tag check
      if (this.enforceOneTagPerWallet && userIdentities.size > 0) {
        const userPrimary = this._primaryOf.get(normWallet);
        return {
          available: false,
          walletRestricted: true,
          reason: `1 Tag Per User Limit: Wallet ${walletAddress.slice(0, 6)}... already owns ${userPrimary}.`
        };
      }
    }

    return {
      available: true,
      identifier: identifier.toJSON()
    };
  }

  /**
   * Registers a new sovereign CeloTags identity.
   *
   * @param {Object} params
   * @param {string} params.identifier - e.g. "₦SEGUN", "@gh:ama"
   * @param {string} params.owner - Controller wallet address
   * @param {string} [params.type='human'] - human, agent, application, business
   * @param {string} [params.resolver] - Resolver address/URL
   * @param {string} [params.recoveryAddress] - Designated recovery account
   * @param {string} [params.operator] - Designated operational delegate
   * @param {Object} [params.metadata] - Metadata attributes
   * @returns {IdentityRecord}
   */
  registerIdentity({ identifier: rawId, owner, type = 'human', resolver = null, recoveryAddress = null, operator = null, metadata = {} }) {
    const avail = this.checkAvailability(rawId, owner);
    if (!avail.available) {
      throw new Error(`Registration failed: ${avail.reason}`);
    }

    const identifier = CanonicalIdentifier.parse(rawId);
    const normOwner = owner.toLowerCase();

    const record = new IdentityRecord({
      identifier,
      owner: normOwner,
      type,
      resolver,
      recoveryAddress,
      metadata: {
        ...metadata,
        operator: operator ? operator.toLowerCase() : null
      }
    });

    this._records.set(identifier.urn, record);

    if (!this._ownerIdentities.has(normOwner)) {
      this._ownerIdentities.set(normOwner, new Set());
    }
    this._ownerIdentities.get(normOwner).add(identifier.urn);

    if (!this._primaryOf.has(normOwner)) {
      this._primaryOf.set(normOwner, identifier.urn);
    }

    return record;
  }

  /**
   * Retrieves an identity record by any format of handle or URN.
   *
   * @param {string} rawInput
   * @returns {IdentityRecord|null}
   */
  getIdentity(rawInput) {
    try {
      const identifier = CanonicalIdentifier.parse(rawInput);
      return this._records.get(identifier.urn) || null;
    } catch {
      return null;
    }
  }

  /**
   * Retrieves all identities owned by a wallet address.
   *
   * @param {string} walletAddress
   * @returns {Array<IdentityRecord>}
   */
  getIdentitiesByOwner(walletAddress) {
    if (!walletAddress) return [];
    const normWallet = walletAddress.toLowerCase();
    const urns = this._ownerIdentities.get(normWallet);
    if (!urns) return [];
    const list = [];
    for (const urn of urns) {
      const rec = this._records.get(urn);
      if (rec && rec.isActive()) list.push(rec);
    }
    return list;
  }

  /**
   * Retrieves primary identity owned by a wallet address.
   *
   * @param {string} walletAddress
   * @returns {IdentityRecord|null}
   */
  getPrimaryIdentityByWallet(walletAddress) {
    const urn = this._primaryOf.get(walletAddress.toLowerCase());
    if (!urn) return null;
    return this._records.get(urn) || null;
  }

  /**
   * Transfers ownership of an identity to a new address.
   *
   * @param {string} rawInput
   * @param {string} currentOwner
   * @param {string} newOwner
   * @returns {IdentityRecord}
   */
  transferOwnership(rawInput, currentOwner, newOwner) {
    const record = this.getIdentity(rawInput);
    if (!record) throw new Error('Identity does not exist');
    if (record.owner !== currentOwner.toLowerCase()) {
      throw new Error('Unauthorized: only current owner can transfer identity');
    }
    if (!newOwner || !/^0x[a-fA-F0-9]{40}$/.test(newOwner)) {
      throw new Error('Invalid new owner EVM address');
    }

    const oldOwner = record.owner;
    const targetNewOwner = newOwner.toLowerCase();

    // Remove from old owner mapping
    const oldSet = this._ownerIdentities.get(oldOwner);
    if (oldSet) {
      oldSet.delete(record.identifier.urn);
      if (this._primaryOf.get(oldOwner) === record.identifier.urn) {
        this._primaryOf.delete(oldOwner);
        if (oldSet.size > 0) {
          this._primaryOf.set(oldOwner, Array.from(oldSet)[0]);
        }
      }
    }

    // Add to new owner mapping
    if (!this._ownerIdentities.has(targetNewOwner)) {
      this._ownerIdentities.set(targetNewOwner, new Set());
    }
    this._ownerIdentities.get(targetNewOwner).add(record.identifier.urn);
    if (!this._primaryOf.has(targetNewOwner)) {
      this._primaryOf.set(targetNewOwner, record.identifier.urn);
    }

    record.owner = targetNewOwner;
    record.updatedAt = Date.now();
    return record;
  }

  /**
   * Sets emergency recovery address for an identity.
   *
   * @param {string} rawInput
   * @param {string} caller
   * @param {string} recoveryAddress
   * @returns {IdentityRecord}
   */
  setRecoveryAddress(rawInput, caller, recoveryAddress) {
    const record = this.getIdentity(rawInput);
    if (!record) throw new Error('Identity does not exist');
    if (record.owner !== caller.toLowerCase()) {
      throw new Error('Unauthorized: only owner can set recovery address');
    }
    if (recoveryAddress && !/^0x[a-fA-F0-9]{40}$/.test(recoveryAddress)) {
      throw new Error('Invalid recovery EVM address');
    }

    record.recoveryAddress = recoveryAddress ? recoveryAddress.toLowerCase() : null;
    record.updatedAt = Date.now();
    return record;
  }

  /**
   * Executes emergency account recovery via authorized recoveryAddress.
   *
   * @param {string} rawInput
   * @param {string} recoveryCaller
   * @param {string} newOwner
   * @returns {IdentityRecord}
   */
  recoverIdentity(rawInput, recoveryCaller, newOwner) {
    const record = this.getIdentity(rawInput);
    if (!record) throw new Error('Identity does not exist');
    if (!record.recoveryAddress || record.recoveryAddress !== recoveryCaller.toLowerCase()) {
      throw new Error('Unauthorized: caller is not designated recovery address');
    }
    if (!newOwner || !/^0x[a-fA-F0-9]{40}$/.test(newOwner)) {
      throw new Error('Invalid new owner EVM address');
    }

    return this.transferOwnership(rawInput, record.owner, newOwner);
  }

  /**
   * Delegates operational authority to an operator without transferring ownership.
   *
   * @param {string} rawInput
   * @param {string} caller
   * @param {string} operatorAddress
   * @returns {IdentityRecord}
   */
  delegateOperator(rawInput, caller, operatorAddress) {
    const record = this.getIdentity(rawInput);
    if (!record) throw new Error('Identity does not exist');
    if (record.owner !== caller.toLowerCase()) {
      throw new Error('Unauthorized: only owner can delegate operator');
    }
    if (operatorAddress && !/^0x[a-fA-F0-9]{40}$/.test(operatorAddress)) {
      throw new Error('Invalid operator EVM address');
    }

    record.metadata = {
      ...record.metadata,
      operator: operatorAddress ? operatorAddress.toLowerCase() : null
    };
    record.updatedAt = Date.now();
    return record;
  }

  /**
   * Revokes an identity (e.g. on legal, protocol security, or user decommission).
   *
   * @param {string} rawInput
   * @param {string} caller
   * @param {string} [reason='user_requested']
   * @returns {IdentityRecord}
   */
  revokeIdentity(rawInput, caller, reason = 'user_requested') {
    const record = this.getIdentity(rawInput);
    if (!record) throw new Error('Identity does not exist');
    if (record.owner !== caller.toLowerCase()) {
      throw new Error('Unauthorized: only owner can revoke identity');
    }

    record.status = 'REVOKED';
    record.metadata = {
      ...record.metadata,
      revocationReason: reason,
      revokedAt: Date.now()
    };
    record.updatedAt = Date.now();
    return record;
  }

  /**
   * Sets or updates resolver binding for an identity.
   *
   * @param {string} rawInput
   * @param {string} caller
   * @param {string} resolverAddress
   * @returns {IdentityRecord}
   */
  setResolver(rawInput, caller, resolverAddress) {
    const record = this.getIdentity(rawInput);
    if (!record) throw new Error('Identity does not exist');
    if (record.owner !== caller.toLowerCase()) {
      throw new Error('Unauthorized: only owner can set resolver');
    }

    record.resolver = resolverAddress;
    record.updatedAt = Date.now();
    return record;
  }
}
