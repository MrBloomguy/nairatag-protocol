/**
 * @file engine.js
 * Central Action Engine for NairaTag Social Protocol.
 *
 * Implements security rule: Always re-resolves the recipient tag immediately
 * prior to transaction confirmation, avoiding DOM injection or spoofing.
 */

import { validateAction, generateDeepLink } from './schema.js';
import { createResolver } from '../../nairatag-resolver/src/index.js';

export class ActionEngine {
  /**
   * @param {Object} [config]
   * @param {Object} [config.resolver] - Custom NairaTagResolver instance
   * @param {string} [config.apiBase]
   * @param {string} [config.webBase]
   */
  constructor(config = {}) {
    this.resolver = config.resolver || createResolver({
      apiBase: config.apiBase,
      webBase: config.webBase
    });
    this.webBase = config.webBase || 'https://nairatag.ng';
    this.providers = new Map();

    // Register built-in default provider for web redirection
    this.registerProvider('deeplink', {
      name: 'NairaTag DeepLink Provider',
      canHandle: () => true,
      execute: async (action) => ({
        success: true,
        type: 'redirect',
        url: generateDeepLink(action, this.webBase)
      })
    });
  }

  /**
   * Registers a payment or identity action provider.
   *
   * @param {string} id
   * @param {Object} provider
   * @param {string} provider.name
   * @param {function(Object): boolean} provider.canHandle
   * @param {function(Object, Object): Promise<Object>} provider.execute
   */
  registerProvider(id, provider) {
    if (!provider || typeof provider.execute !== 'function') {
      throw new Error(`Provider "${id}" must implement an execute(action, context) method`);
    }
    this.providers.set(id, provider);
  }

  /**
   * Executes a validated social action.
   *
   * @param {Object} actionPayload
   * @param {Object} [context] - Execution context (e.g. senderAddress, signer, preferredRail)
   * @returns {Promise<Object>} Execution result with receipt
   */
  async execute(actionPayload, context = {}) {
    // 1. Strict schema validation
    const action = validateAction(actionPayload);

    // 2. Authoritative re-resolution (Security Rule 28)
    const resolved = await this.resolver.resolveTag(action.cleanRecipient);

    // If attempting to send/tip to an unclaimed tag, guide to claim
    if (['send', 'tip'].includes(action.action) && resolved.available) {
      return {
        success: false,
        code: 'TAG_UNCLAIMED',
        message: `${action.recipient} is currently unclaimed. You can claim it or invite someone to claim it.`,
        claimUrl: resolved.claimUrl,
        deepLink: generateDeepLink({ action: 'claim', recipient: action.recipient }, this.webBase)
      };
    }

    // 3. Select appropriate provider
    const rail = context.preferredRail || (context.signer ? 'wallet' : 'deeplink');
    const provider = this.providers.get(rail) || this.providers.get('deeplink');

    const executionResult = await provider.execute(action, {
      ...context,
      resolved
    });

    return {
      ...executionResult,
      action: action.action,
      recipient: action.recipient,
      resolvedRecipient: resolved.address,
      timestamp: Date.now()
    };
  }
}

export function createActionEngine(config) {
  return new ActionEngine(config);
}
