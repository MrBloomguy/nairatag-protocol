/**
 * @file CeloTagsResolver.js
 * @description The CeloTags Agentic Resolver & Capability Directory.
 *
 * Implements CeloTags Master Prompt Section 5.2 & "How does the Agentic Resolver actually work?":
 * - Answers: "Who is this Agent, what can it do, how can I communicate with it, what permissions does it have, and how do I verify or pay for its work?"
 * - Provides typed records: Primary wallet address, supported chain addresses, Agent profile, capability manifests, A2A communication endpoints, and supported payment methods.
 * - Discovery engine: Searches Agents by task/capability, not just by name.
 */

import { CanonicalIdentifier } from '../namespaces/CanonicalIdentifier.js';
import { AgentProfile } from './AgentProfile.js';

export class CeloTagsResolver {
  /**
   * @param {Object} [options]
   * @param {Object} [options.registry] - CeloTagsRegistry instance
   * @param {number} [options.cacheTtlMs=60000] - In-memory cache duration
   */
  constructor(options = {}) {
    this.registry = options.registry || null;
    this.cacheTtlMs = options.cacheTtlMs ?? 60000;

    // urn -> AgentProfile
    this._profiles = new Map();
    // In-memory cache: urn -> { data, timestamp }
    this._cache = new Map();
  }

  /**
   * Registers or updates an AgentProfile in the resolver directory.
   *
   * @param {AgentProfile|Object} profileData
   * @returns {AgentProfile}
   */
  registerProfile(profileData) {
    const profile = profileData instanceof AgentProfile
      ? profileData
      : new AgentProfile(profileData);

    this._profiles.set(profile.identifier.urn, profile);
    this._cache.delete(profile.identifier.urn);
    return profile;
  }

  /**
   * Resolves any tag or identifier into its comprehensive Agentic Entity representation.
   *
   * @param {string} rawInput - e.g. "₦SEGUN", "@gh:ama", "urn:celotag:ng:segun"
   * @returns {Promise<Object>}
   */
  async resolve(rawInput) {
    const identifier = CanonicalIdentifier.parse(rawInput);
    const cached = this._getCached(identifier.urn);
    if (cached) return cached;

    // 1. Fetch registry identity if registry is connected
    let identityRecord = null;
    if (this.registry) {
      identityRecord = this.registry.getIdentity(identifier.urn);
    }

    // 2. Fetch Agent profile
    const profile = this._profiles.get(identifier.urn) || null;

    // 3. Construct unified Agentic Entity with strict security boundaries
    const primaryAddress = profile?.wallet?.address || identityRecord?.owner || null;
    const isVerified = Boolean(profile && profile.verificationLevel !== 'self_reported');
    const paymentAssets = identifier.config.paymentAssets || {};

    // Select primary fee currency: cNGN if verified, else cUSD if verified
    const feeCurrency = paymentAssets.cNGN?.verificationStatus === 'VERIFIED'
      ? paymentAssets.cNGN.address
      : (paymentAssets.cUSD?.verificationStatus === 'VERIFIED' ? paymentAssets.cUSD.address : null);

    const entity = {
      urn: identifier.urn,
      scoped: identifier.scoped,
      display: identifier.display,
      handle: identifier.handle,
      namespace: identifier.namespace,
      country: identifier.countryCode,
      currency: identifier.currencyCode,

      // Security Invariant: Resolving a tag conveys ZERO financial or execution authority
      authority: 'NONE',
      financialAuthority: false,
      authorityNotice: 'Identity is not authority. Direct cryptographic signatures or bounded PermissionGrants are required for transactions.',

      // Layer 1: Address & Wallet Binding
      address: primaryAddress,
      owner: identityRecord?.owner || profile?.owner || null,
      wallet: {
        primary: primaryAddress,
        chain: 'celo',
        chainId: identifier.config.defaultChainId,
        feeCurrency
      },

      // Currency & Verified Payment Assets
      assets: {
        currencyCode: identifier.currencyCode,
        paymentAssets
      },

      // Layer 1b: Local Identity vs Local Settlement Architecture
      settlementRouting: {
        identityCountry: identifier.countryCode,
        identityCurrency: identifier.currencyCode,
        hasNativeStablecoin: Boolean(paymentAssets[`c${identifier.currencyCode}`]?.verificationStatus === 'VERIFIED'),
        settlementAsset: feeCurrency ? {
          symbol: paymentAssets.cNGN?.address === feeCurrency ? 'cNGN' : (paymentAssets.cUSD?.address === feeCurrency ? 'cUSD' : 'CELO'),
          address: feeCurrency,
          isNativeFiatToken: Boolean(paymentAssets[`c${identifier.currencyCode}`]?.verificationStatus === 'VERIFIED')
        } : null,
        supportedRamps: profile?.supportedRamps?.length ? profile.supportedRamps : (
          identifier.countryCode === 'NG' ? ['nibss', 'flutterwave'] :
          (identifier.countryCode === 'GH' ? ['momo', 'yellowcard'] :
          (identifier.countryCode === 'KE' ? ['mpesa', 'yellowcard'] :
          (identifier.countryCode === 'ZA' ? ['ozow', 'stitch'] :
          (identifier.countryCode === 'BR' ? ['pix'] : ['crypto_direct']))))
        ),
        fallbackSettlementToken: 'cUSD'
      },

      // Layer 2: Agent Profile & Category
      isAgent: Boolean(profile || identityRecord?.type === 'agent'),
      category: profile?.category || identityRecord?.type || 'human',
      name: profile?.name || identifier.display,
      description: profile?.description || '',

      // Layer 3: Capability Directory
      capabilities: profile ? profile.capabilities.map(c => c.toJSON()) : [],

      // Layer 4: Interoperable Endpoints with Multi-tier Trust & Revocation Check
      endpoints: {
        a2a: profile?.endpoints?.a2a || null,
        mcp: profile?.endpoints?.mcp || null,
        http: profile?.endpoints?.http || null,
        trustTier: profile?.endpointAttestation?.tier || 'unverified',
        trusted: Boolean(
          profile?.endpointAttestation?.tier === 'cryptographically_attested' &&
          !profile?.endpointAttestation?.isRevoked
        ),
        revocationStatus: profile?.endpointAttestation?.isRevoked ? 'REVOKED' : 'ACTIVE'
      },

      // Layer 5: Trust, Verification & Reputation
      verified: isVerified,
      verificationLevel: profile?.verificationLevel || 'self_reported',
      reputation: profile?.reputation || { score: 80, tasksCompleted: 0 },

      // ERC-8004 Card compatibility
      agentCard: profile ? profile.toAgentCard() : null,

      resolvedAt: new Date().toISOString()
    };

    this._setCache(identifier.urn, entity);
    return entity;
  }

  /**
   * Safe resolution wrapper that catches malformed, unresolvable, or spoofed inputs without throwing.
   *
   * @param {string} rawInput
   * @returns {Promise<{ ok: boolean, data?: Object, error?: string, code?: string }>}
   */
  async safeResolve(rawInput) {
    try {
      const data = await this.resolve(rawInput);
      return { ok: true, data };
    } catch (err) {
      return {
        ok: false,
        error: err.message,
        code: 'RESOLVER_ERROR'
      };
    }
  }

  /**
   * Capability Discovery Engine: Searches for Agents that can perform a specific task.
   *
   * @param {Object} query - { category, region, query, maxResults }
   * @returns {Array<Object>} List of matching agent resolutions
   */
  discoverAgents(query = {}) {
    const results = [];
    const max = query.maxResults || 20;

    for (const profile of this._profiles.values()) {
      const hasMatchingCap = profile.capabilities.some(c => c.matches(query));
      const hasMatchingCategory = !query.category || profile.category === query.category;
      const hasMatchingRegion = !query.region || profile.regions.includes('*') || profile.regions.includes(query.region.toUpperCase());

      if (hasMatchingCap || (hasMatchingCategory && hasMatchingRegion)) {
        results.push(profile.toJSON());
        if (results.length >= max) break;
      }
    }

    return results;
  }

  _getCached(urn) {
    const entry = this._cache.get(urn);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.cacheTtlMs) {
      this._cache.delete(urn);
      return null;
    }
    return entry.data;
  }

  _setCache(urn, data) {
    this._cache.set(urn, { timestamp: Date.now(), data });
  }

  clearCache() {
    this._cache.clear();
  }
}
