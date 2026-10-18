/**
 * @file AgentProfile.js
 * @description Versioned Structured Agent Profile conforming to CeloTags & ERC-8004.
 *
 * Implements CeloTags Master Prompt Section 5.4, 7.3, and 17.2:
 * - Distinguishes between Owner (principal) and Operator (runtime/agent framework).
 * - Distinguishes verified facts from self-declared claims (Verification Levels).
 * - Provides ERC-8004 Agent Card serialization for interoperability.
 */

import { CanonicalIdentifier } from '../namespaces/CanonicalIdentifier.js';
import { CapabilityManifest } from './CapabilityManifest.js';

export const VERIFICATION_LEVELS = [
  'self_reported',
  'integration_reported',
  'cryptographically_evidenced',
  'independently_verified'
];

export const ENDPOINT_TRUST_TIERS = {
  UNVERIFIED: 'unverified',
  SELF_ASSERTED: 'self_asserted',
  DOMAIN_VERIFIED: 'domain_verified',
  CRYPTOGRAPHICALLY_ATTESTED: 'cryptographically_attested'
};

export const AGENT_CATEGORIES = [
  'personal',
  'service',
  'reference'
];

export class AgentProfile {
  /**
   * @param {Object} data
   * @param {string|CanonicalIdentifier} data.identifier - e.g. "@ng:segun" or CanonicalIdentifier
   * @param {string} data.name - Public display title
   * @param {string} data.owner - Primary controller EVM address
   * @param {string} [data.operator] - Operating runtime / framework address or domain
   * @param {string} [data.category='service'] - One of AGENT_CATEGORIES
   * @param {string} [data.description] - Summary of the Agent
   * @param {Array<string>} [data.languages=['en']] - Supported language codes
   * @param {Array<string>} [data.regions=['NG']] - Supported ISO country codes
   * @param {Array<Object|CapabilityManifest>} [data.capabilities=[]] - Capability manifests
   * @param {Object} [data.endpoints] - { a2a, mcp, http, ws }
   * @param {Object} [data.wallet] - { address, chainId: 42220, feeCurrency }
   * @param {Object} [data.reputation] - { score: 90, tasksCompleted: 0, disputeRatePct: 0 }
   * @param {string} [data.verificationLevel='self_reported'] - One of VERIFICATION_LEVELS
   * @param {string} [data.version='1.0.0'] - Profile version
   */
  constructor(data) {
    if (!data.identifier) {
      throw new Error('AgentProfile requires an identifier');
    }
    this.identifier = data.identifier instanceof CanonicalIdentifier
      ? data.identifier
      : CanonicalIdentifier.parse(data.identifier);

    this.name = data.name || this.identifier.display;
    this.owner = data.owner ? String(data.owner).toLowerCase() : null;
    this.operator = data.operator ? String(data.operator).toLowerCase() : this.owner;
    
    if (data.category && !AGENT_CATEGORIES.includes(data.category)) {
      throw new Error(`Invalid Agent category. Must be one of: ${AGENT_CATEGORIES.join(', ')}`);
    }
    this.category = data.category || 'service';
    this.description = data.description || '';
    this.languages = Array.isArray(data.languages) ? data.languages : ['en'];
    this.regions = Array.isArray(data.regions) ? data.regions : [this.identifier.countryCode];

    // Capabilities parsing
    this.capabilities = (data.capabilities || []).map(c => 
      c instanceof CapabilityManifest ? c : new CapabilityManifest(c)
    );

    // Endpoints
    this.endpoints = {
      a2a: data.endpoints?.a2a || null,
      mcp: data.endpoints?.mcp || null,
      http: data.endpoints?.http || null,
      ws: data.endpoints?.ws || null
    };

    // Endpoint Cryptographic & Domain Attestation (Caveat 2 mitigation)
    this.endpointAttestation = {
      tier: data.endpointAttestation?.tier || (data.verificationLevel === 'cryptographically_evidenced' ? ENDPOINT_TRUST_TIERS.CRYPTOGRAPHICALLY_ATTESTED : ENDPOINT_TRUST_TIERS.UNVERIFIED),
      verifiedDomain: data.endpointAttestation?.verifiedDomain || null,
      attestationUid: data.endpointAttestation?.attestationUid || null,
      isRevoked: Boolean(data.endpointAttestation?.isRevoked)
    };

    // Supported Off-chain Fiat Ramps (Mobile Money, NIBSS, PIX)
    this.supportedRamps = Array.isArray(data.supportedRamps) ? data.supportedRamps : [];

    // Wallet binding
    this.wallet = {
      address: data.wallet?.address ? String(data.wallet.address).toLowerCase() : this.owner,
      chainId: data.wallet?.chainId || this.identifier.config.defaultChainId,
      feeCurrency: data.wallet?.feeCurrency || this.identifier.config.defaultPaymentToken
    };

    // Reputation
    this.reputation = {
      score: Math.min(100, Math.max(0, Number(data.reputation?.score ?? 80))),
      tasksCompleted: Number(data.reputation?.tasksCompleted ?? 0),
      disputeRatePct: Number(data.reputation?.disputeRatePct ?? 0),
      evidenceLinks: Array.isArray(data.reputation?.evidenceLinks) ? data.reputation.evidenceLinks : []
    };

    const vLevel = data.verificationLevel || 'self_reported';
    this.verificationLevel = VERIFICATION_LEVELS.includes(vLevel) ? vLevel : 'self_reported';
    this.version = data.version || '1.0.0';
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  /**
   * Serializes profile into ERC-8004 Agent Card format.
   *
   * @returns {Object}
   */
  toAgentCard() {
    return {
      protocol: 'ERC-8004',
      version: '1.0.0',
      celotag: this.identifier.urn,
      displayTag: this.identifier.display,
      name: this.name,
      category: this.category,
      description: this.description,
      owner: this.owner,
      operator: this.operator,
      supportedRegions: this.regions,
      supportedLanguages: this.languages,
      capabilities: this.capabilities.map(c => c.toJSON()),
      endpoints: this.endpoints,
      wallet: this.wallet,
      reputation: this.reputation,
      verificationLevel: this.verificationLevel,
      updatedAt: this.updatedAt
    };
  }

  toJSON() {
    return {
      identifier: this.identifier.toJSON(),
      name: this.name,
      owner: this.owner,
      operator: this.operator,
      category: this.category,
      description: this.description,
      languages: this.languages,
      regions: this.regions,
      capabilities: this.capabilities.map(c => c.toJSON()),
      endpoints: this.endpoints,
      wallet: this.wallet,
      reputation: this.reputation,
      verificationLevel: this.verificationLevel,
      version: this.version,
      updatedAt: this.updatedAt
    };
  }
}
