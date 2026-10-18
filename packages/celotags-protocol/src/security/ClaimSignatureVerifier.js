/**
 * @file ClaimSignatureVerifier.js
 * @description Nonce-bound, Expiring, EIP-712 Domain-Separated Claim Signature Verifier.
 *
 * Implements Security Milestone Checklist 2:
 * - Mandatory wallet signatures in production mode.
 * - Replay attack prevention via tracked nonces.
 * - Expired signature protection with explicit deadline timestamps.
 * - Strict binding to canonical tag, wallet, chain, and contract domain.
 * - Protection against wrong-wallet, wrong-tag, and cross-application signature re-use.
 */

import { CanonicalIdentifier } from '../namespaces/CanonicalIdentifier.js';

export const ALLOWED_CELO_CHAIN_IDS = new Set([11142220, 42220]);

export const DEFAULT_CELOTAGS_EIP712_DOMAIN = {
  name: 'CeloTags Protocol',
  version: '1',
  chainId: process.env.CELO_CHAIN_ID ? Number(process.env.CELO_CHAIN_ID) : 11142220,
  verifyingContract: process.env.CELOTAGS_REGISTRY_ADDRESS || '0xb34518cC33314ee63841120bDd3Baa3BD1baf9e0'
};

export const CLAIM_AUTHORIZATION_TYPES = {
  ClaimAuthorization: [
    { name: 'tag', type: 'string' },
    { name: 'urn', type: 'string' },
    { name: 'owner', type: 'address' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
    { name: 'action', type: 'string' }
  ]
};

export class ClaimSignatureVerifier {
  /**
   * @param {Object} [options]
   * @param {boolean} [options.mandatorySignatures=false] - If true, unauthenticated claims are rejected
   * @param {Object} [options.domain] - EIP-712 domain overrides
   */
  constructor(options = {}) {
    this.mandatorySignatures = Boolean(options.mandatorySignatures);
    this.domain = {
      ...DEFAULT_CELOTAGS_EIP712_DOMAIN,
      ...(options.domain || {})
    };

    // Tracks consumed nonces per wallet: normalizedWallet -> Set<string(nonce)>
    this._consumedNonces = new Map();
    // Tracks in-flight/pending nonces per wallet: normalizedWallet -> Set<string(nonce)>
    this._pendingNonces = new Map();
  }

  /**
   * Builds the standard EIP-712 payload for a wallet to sign.
   *
   * @param {Object} params
   * @param {string|CanonicalIdentifier} params.identifier - Canonical identifier or tag
   * @param {string} params.owner - Controller wallet address
   * @param {number|string} params.nonce - Unique nonce
   * @param {number} [params.validForSeconds=600] - Expiry window (default 10 minutes)
   * @param {string} [params.action='CLAIM_SOVEREIGN_IDENTITY']
   * @param {number} [params.chainId] - Optional chainId override
   * @returns {Object} EIP-712 message payload
   */
  buildClaimMessage({ identifier, owner, nonce, validForSeconds = 600, action = 'CLAIM_SOVEREIGN_IDENTITY', chainId = null }) {
    const canonical = identifier instanceof CanonicalIdentifier
      ? identifier
      : CanonicalIdentifier.parse(String(identifier));

    const deadline = Math.floor(Date.now() / 1000) + validForSeconds;
    const targetDomain = {
      ...this.domain,
      ...(chainId ? { chainId: Number(chainId) } : {})
    };

    return {
      domain: targetDomain,
      types: CLAIM_AUTHORIZATION_TYPES,
      primaryType: 'ClaimAuthorization',
      message: {
        tag: canonical.display,
        urn: canonical.urn,
        owner: String(owner).toLowerCase(),
        nonce: String(nonce),
        deadline: Number(deadline),
        action
      }
    };
  }

  /**
   * Verifies an incoming claim authorization signature against security invariants.
   *
   * @param {Object} params
   * @param {string} params.rawTag - The tag being claimed
   * @param {string} params.walletAddress - The claimant wallet address
   * @param {Object} [params.authorization] - { signature, nonce, deadline, action, chainId, verifyingContract, tag, urn }
   * @param {boolean} [params.isProduction=false]
   * @param {number} [params.expectedChainId]
   * @param {string} [params.expectedContract]
   * @returns {Promise<{ verified: boolean, authorizationLevel: string, canonical: CanonicalIdentifier, recoveredSigner: string }>}
   */
  async verifyClaim({ rawTag, walletAddress, authorization, isProduction = false, expectedChainId = null, expectedContract = null }) {
    const canonical = CanonicalIdentifier.parse(rawTag);
    const normalizedWallet = String(walletAddress || '').toLowerCase();

    if (!/^0x[a-fA-F0-9]{40}$/.test(normalizedWallet)) {
      throw new Error('A valid 42-character EVM wallet address is required.');
    }

    const requiresSignature = this.mandatorySignatures || isProduction;

    // 1. Mandatory Signature Check in Production Mode
    if (!authorization || !authorization.signature) {
      if (requiresSignature) {
        throw new Error('MISSING_SIGNATURE: A valid EIP-712 wallet signature is mandatory for sovereign claims in production mode.');
      }
      return {
        verified: false,
        authorizationLevel: 'session_asserted',
        canonical,
        recoveredSigner: null
      };
    }

    const { signature, nonce, deadline, action = 'CLAIM_SOVEREIGN_IDENTITY' } = authorization;

    if (!nonce || String(nonce).trim() === '') {
      throw new Error('INVALID_NONCE: Claim authorization requires a unique nonce to prevent replay attacks.');
    }

    if (!deadline || typeof deadline !== 'number') {
      throw new Error('INVALID_DEADLINE: Claim authorization requires a numeric unix expiry timestamp.');
    }

    // 2. Action Binding
    if (action !== 'CLAIM_SOVEREIGN_IDENTITY') {
      throw new Error(`INVALID_ACTION: Claim authorization action must be CLAIM_SOVEREIGN_IDENTITY, received ${action}.`);
    }

    // 3. Expiry Protection
    const currentSeconds = Math.floor(Date.now() / 1000);
    if (currentSeconds > deadline) {
      throw new Error(`SIGNATURE_EXPIRED: Claim authorization expired at ${new Date(deadline * 1000).toISOString()} (current: ${new Date(currentSeconds * 1000).toISOString()}).`);
    }

    // 4. Atomic Nonce Reservation (Replay & Concurrent Race Protection)
    const strNonce = String(nonce);
    const consumedSet = this._consumedNonces.get(normalizedWallet) || new Set();
    const pendingSet = this._pendingNonces.get(normalizedWallet) || new Set();

    if (consumedSet.has(strNonce) || pendingSet.has(strNonce)) {
      throw new Error(`REPLAY_ATTACK_DETECTED: Nonce ${nonce} has already been consumed or is actively processing for wallet ${walletAddress}.`);
    }

    // Lock nonce in pending set before async operations
    if (!this._pendingNonces.has(normalizedWallet)) {
      this._pendingNonces.set(normalizedWallet, new Set());
    }
    this._pendingNonces.get(normalizedWallet).add(strNonce);

    try {
      // 5. Strict Domain Separation & Network Verification
      const targetChainId = Number(expectedChainId || this.domain.chainId);
      const targetContract = String(expectedContract || this.domain.verifyingContract).toLowerCase();

      if (authorization.chainId !== undefined && authorization.chainId !== null) {
        const authChainId = Number(authorization.chainId);
        if (!ALLOWED_CELO_CHAIN_IDS.has(authChainId)) {
          throw new Error(`INVALID_DOMAIN: Chain ID ${authChainId} is not a recognized Celo network.`);
        }
        if (authChainId !== targetChainId) {
          throw new Error(`INVALID_DOMAIN: Chain ID mismatch. Expected ${targetChainId}, received ${authChainId}.`);
        }
      }

      if (authorization.verifyingContract) {
        if (String(authorization.verifyingContract).toLowerCase() !== targetContract) {
          throw new Error(`INVALID_DOMAIN: Verifying contract mismatch. Expected ${targetContract}, received ${authorization.verifyingContract}.`);
        }
      }

      // 6. Identity & Tag Binding Verification
      if (authorization.tag && authorization.tag !== canonical.display) {
        throw new Error(`WRONG_TAG_CLAIM: Authorization tag ${authorization.tag} does not match requested identifier ${canonical.display}.`);
      }
      if (authorization.urn && authorization.urn !== canonical.urn) {
        throw new Error(`WRONG_URN_CLAIM: Authorization URN ${authorization.urn} does not match requested URN ${canonical.urn}.`);
      }

      const claimDomain = {
        name: this.domain.name,
        version: this.domain.version,
        chainId: targetChainId,
        verifyingContract: targetContract
      };

      const message = {
        tag: canonical.display,
        urn: canonical.urn,
        owner: normalizedWallet,
        nonce: strNonce,
        deadline: Number(deadline),
        action
      };

      // 7. Cryptographic EIP-712 Signature Recovery
      const { createRequire } = await import('node:module');
      const require = createRequire(import.meta.url);
      const { recoverTypedDataAddress } = require('viem');

      let recoveredSigner;
      try {
        recoveredSigner = await recoverTypedDataAddress({
          domain: claimDomain,
          types: CLAIM_AUTHORIZATION_TYPES,
          primaryType: 'ClaimAuthorization',
          message,
          signature
        });
      } catch (err) {
        throw new Error(`CRYPTOGRAPHIC_VERIFICATION_FAILED: ${err.message}`);
      }

      if (recoveredSigner.toLowerCase() !== normalizedWallet) {
        throw new Error(`WRONG_WALLET_SIGNATURE: Recovered signer ${recoveredSigner} does not match claimant wallet ${normalizedWallet}.`);
      }

      // 8. Permanently Consume Nonce
      if (!this._consumedNonces.has(normalizedWallet)) {
        this._consumedNonces.set(normalizedWallet, new Set());
      }
      this._consumedNonces.get(normalizedWallet).add(strNonce);

      return {
        verified: true,
        authorizationLevel: 'cryptographically_verified',
        canonical,
        recoveredSigner
      };
    } finally {
      // Remove from pending nonces regardless of outcome
      const currentPending = this._pendingNonces.get(normalizedWallet);
      if (currentPending) {
        currentPending.delete(strNonce);
      }
    }
  }

  /**
   * Resets consumed and pending nonces (for testing only).
   */
  clearNonces() {
    this._consumedNonces.clear();
    this._pendingNonces.clear();
  }
}
