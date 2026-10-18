/**
 * @file index.js
 * Open Social Adapter specification & base class for NairaTag Social Protocol.
 *
 * Enables any social network (Mastodon, Bluesky, Nostr, Akkoma, etc.)
 * to integrate NairaTag references with a uniform, lightweight API.
 */

import { parseNairaTags, replaceNairaTags } from '../../nairatag-parser/src/index.js';
import { createResolver } from '../../nairatag-resolver/src/index.js';
import { createActionEngine, generateDeepLink } from '../../nairatag-actions/src/index.js';

export class NairaTagSocialAdapter {
  /**
   * @param {Object} [config]
   * @param {string} [config.platformName] - e.g. "mastodon", "bluesky", "x"
   * @param {string} [config.apiBase]
   * @param {string} [config.webBase]
   */
  constructor(config = {}) {
    this.platformName = config.platformName || 'open-social';
    this.resolver = config.resolver || createResolver({
      apiBase: config.apiBase,
      webBase: config.webBase
    });
    this.engine = config.engine || createActionEngine({
      resolver: this.resolver,
      webBase: config.webBase
    });
  }

  /**
   * Parses arbitrary post/status content and returns recognized NairaTag entities.
   *
   * @param {string} content
   * @returns {Array<Object>}
   */
  parse(content) {
    return parseNairaTags(content);
  }

  /**
   * Renders a NairaTag entity into a platform-appropriate interactive reference.
   *
   * @param {Object} entity
   * @returns {string} HTML / Markdown string
   */
  render(entity) {
    return `<a class="nairatag-social-pill" data-nairatag="${entity.tag}" href="${entity.url}" target="_blank" rel="noopener noreferrer">${entity.display}</a>`;
  }

  /**
   * Enhances text content by turning all ₦TAG occurrences into interactive references.
   *
   * @param {string} content
   * @returns {string}
   */
  enhanceContent(content) {
    return replaceNairaTags(content, (ent) => this.render(ent));
  }

  /**
   * Resolves a NairaTag into its full profile, availability, and payment details.
   *
   * @param {string} tag
   * @returns {Promise<Object>}
   */
  async resolve(tag) {
    return this.resolver.resolveTag(tag);
  }

  /**
   * Returns contextual actions available for an entity (e.g. claim vs send/tip).
   *
   * @param {Object} entity - Resolved entity
   * @returns {Array<Object>}
   */
  getActions(entity) {
    if (!entity) return [];

    if (entity.available) {
      return [
        {
          id: 'claim',
          label: `Claim ${entity.display}`,
          type: 'primary',
          url: entity.claimUrl || generateDeepLink({ action: 'claim', recipient: entity.tag, source: this.platformName })
        }
      ];
    }

    return [
      {
        id: 'send',
        label: 'Send ₦',
        type: 'primary',
        action: 'send'
      },
      {
        id: 'tip',
        label: 'Tip',
        type: 'secondary',
        action: 'tip'
      },
      {
        id: 'profile',
        label: 'Profile',
        type: 'link',
        url: entity.profileUrl
      },
      {
        id: 'share',
        label: 'Share',
        type: 'link',
        url: entity.profileUrl
      }
    ];
  }

  /**
   * Dispatches an action through the action engine.
   *
   * @param {Object} action
   * @param {Object} [context]
   * @returns {Promise<Object>}
   */
  async executeAction(action, context = {}) {
    return this.engine.execute({
      ...action,
      source: this.platformName
    }, context);
  }
}

export function createSocialAdapter(config) {
  return new NairaTagSocialAdapter(config);
}
