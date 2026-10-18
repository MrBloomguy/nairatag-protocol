/**
 * @file resolver.js
 * Identity Resolver and Profile Engine for NairaTag Social Protocol.
 *
 * Consumes existing onchain registry and backend settlement layer.
 * Caches resolved identities to prevent redundant RPC/network calls during social timeline scrolling.
 */

import {
  isNairaTag,
  normalizeNairaTag,
  getCanonicalIdentifier,
  DEFAULT_WEB_BASE
} from '../../nairatag-parser/src/index.js';

export class NairaTagResolver {
  /**
   * @param {Object} [config]
   * @param {string} [config.apiBase] - NairaTag API endpoint (default: http://127.0.0.1:8787)
   * @param {string} [config.webBase] - Web link fallback base (default: https://nairatag.ng)
   * @param {number} [config.cacheTtlMs] - Cache duration in ms (default: 60,000 / 1 min)
   * @param {Function} [config.customFetch] - Optional custom fetch provider
   */
  constructor(config = {}) {
    this.apiBase = (config.apiBase || 'http://127.0.0.1:8787').replace(/\/+$/, '');
    this.webBase = (config.webBase || DEFAULT_WEB_BASE).replace(/\/+$/, '');
    this.cacheTtlMs = config.cacheTtlMs ?? 60000;
    this.fetch = config.customFetch || (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : null);
    this._cache = new Map();
  }

  /**
   * Clears in-memory resolution cache.
   */
  clearCache() {
    this._cache.clear();
  }

  /**
   * Checks if an identity is cached and valid.
   * @private
   */
  _getCached(cleanTag) {
    const entry = this._cache.get(cleanTag);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.cacheTtlMs) {
      this._cache.delete(cleanTag);
      return null;
    }
    return entry.data;
  }

  /**
   * Saves entity to cache.
   * @private
   */
  _setCache(cleanTag, data) {
    this._cache.set(cleanTag, {
      timestamp: Date.now(),
      data
    });
  }

  /**
   * Resolves a NairaTag into its full sovereign entity representation.
   *
   * @param {string} tagInput - e.g. "₦MIKKI", "MIKKI", "₦asake"
   * @returns {Promise<Object>} Resolved entity
   */
  async resolveTag(tagInput) {
    if (!tagInput) {
      throw new Error('Tag input is required');
    }

    const cleanTag = getCanonicalIdentifier(tagInput);
    if (!isNairaTag(cleanTag)) {
      throw new Error(`Invalid NairaTag format: "${tagInput}"`);
    }

    const cached = this._getCached(cleanTag);
    if (cached) return cached;

    const canonical = `${cleanTag}`;
    const baseEntity = {
      type: 'nairatag',
      tag: canonical,
      display: `₦${canonical}`,
      canonical: `₦${canonical}`,
      uri: `nairatag://${canonical}`,
      profileUrl: `${this.webBase}/${canonical}`,
      claimUrl: `${this.webBase}/claim/${canonical}`,
      payUrl: `${this.webBase}/pay/${canonical}`,
      available: false,
      owner: null,
      address: null,
      verified: false,
      avatar: `${this.apiBase}/cards/${canonical.toLowerCase()}.svg?mode=card`,
      virtualAccount: null,
      metadata: {}
    };

    if (!this.fetch) {
      // Offline fallback
      return baseEntity;
    }

    try {
      // Query backend wallet-info & settlement
      const res = await this.fetch(`${this.apiBase}/api/agent/wallet-info?tag=${encodeURIComponent(cleanTag.toLowerCase())}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.ok) {
        const isRegistered = Boolean(data.address && data.address !== '0x0000000000000000000000000000000000000000');
        const entity = {
          ...baseEntity,
          available: !isRegistered,
          owner: isRegistered ? data.address : null,
          address: isRegistered ? data.address : null,
          verified: isRegistered,
          virtualAccount: data.settlement?.virtualAccount || null,
          metadata: {
            balances: data.balances || {},
            points: data.points || 0
          }
        };

        this._setCache(cleanTag, entity);
        return entity;
      }
    } catch (err) {
      // Graceful fallback: return unverified/available entity without throwing
    }

    // Default optimistic entity if unmined/unclaimed
    const fallbackEntity = {
      ...baseEntity,
      available: true
    };
    this._setCache(cleanTag, fallbackEntity);
    return fallbackEntity;
  }

  /**
   * Checks whether a tag is available for claiming.
   *
   * @param {string} tagInput
   * @returns {Promise<boolean>}
   */
  async checkAvailability(tagInput) {
    const entity = await this.resolveTag(tagInput);
    return Boolean(entity.available);
  }

  /**
   * Fetches public profile details for a NairaTag.
   *
   * @param {string} tagInput
   * @returns {Promise<Object>}
   */
  async getProfile(tagInput) {
    const entity = await this.resolveTag(tagInput);
    return {
      tag: entity.tag,
      display: entity.display,
      canonical: entity.canonical,
      owner: entity.owner,
      address: entity.address,
      verified: entity.verified,
      available: entity.available,
      avatar: entity.avatar,
      profileUrl: entity.profileUrl,
      payUrl: entity.payUrl,
      claimUrl: entity.claimUrl,
      virtualAccount: entity.virtualAccount
    };
  }
}

/**
 * Convenience factory
 */
export function createResolver(config) {
  return new NairaTagResolver(config);
}
