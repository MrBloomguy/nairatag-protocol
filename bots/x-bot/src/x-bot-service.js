/**
 * @file x-bot-service.js
 * Execution Service for @NairaTagBot (X Mobile Fallback Bridge).
 *
 * Adheres strictly to X Automation policies:
 * - 100% user-initiated
 * - Zero unsolicited replies
 * - Rate limited per X user
 */

import { parseXBotCommand } from './command-parser.js';
import { createResolver } from '../../../packages/nairatag-resolver/src/index.js';
import { generateDeepLink } from '../../../packages/nairatag-actions/src/index.js';

export class XBotService {
  /**
   * @param {Object} [config]
   * @param {Object} [config.resolver]
   * @param {string} [config.webBase]
   * @param {number} [config.rateLimitPerMin]
   */
  constructor(config = {}) {
    this.resolver = config.resolver || createResolver({
      apiBase: config.apiBase || 'http://127.0.0.1:8787',
      webBase: config.webBase || 'https://nairatag.ng'
    });
    this.webBase = config.webBase || 'https://nairatag.ng';
    this.rateLimitPerMin = config.rateLimitPerMin || 6;
    this.userHistory = new Map(); // username -> array of timestamps
  }

  /**
   * Rate limiting check per user handle
   * @private
   */
  _isRateLimited(username) {
    if (!username) return false;
    const now = Date.now();
    const oneMinAgo = now - 60000;
    const history = (this.userHistory.get(username) || []).filter(t => t > oneMinAgo);

    if (history.length >= this.rateLimitPerMin) {
      return true;
    }

    history.push(now);
    this.userHistory.set(username, history);
    return false;
  }

  /**
   * Processes an incoming X tweet mention
   *
   * @param {Object} tweet
   * @param {string} tweet.text - Full text of the mention
   * @param {string} tweet.sender - Handle of the sender without @
   * @returns {Promise<Object>} Reply payload
   */
  async handleTweet(tweet) {
    if (!tweet || !tweet.text) {
      return { reply: null, ignored: true, reason: 'EMPTY_TEXT' };
    }

    const sender = (tweet.sender || 'user').replace(/^@/, '');

    // Anti-spam rate limit check
    if (this._isRateLimited(sender)) {
      return {
        reply: `@${sender} You are performing commands too quickly. Please wait a moment before trying again.`,
        rateLimited: true
      };
    }

    // Parse deterministic command
    const cmd = parseXBotCommand(tweet.text);
    if (!cmd) {
      return {
        reply: `@${sender} Welcome to @NairaTagBot! Try:\n• check ₦TAG\n• claim ₦TAG\n• send ₦5,000 to ₦TAG\n• tip ₦TAG ₦1,000\n• profile ₦TAG`,
        commandType: 'help'
      };
    }

    // Execute based on command type
    switch (cmd.type) {
      case 'check':
      case 'claim': {
        const available = await this.resolver.checkAvailability(cmd.cleanRecipient);
        if (available) {
          const claimUrl = generateDeepLink({ action: 'claim', recipient: cmd.cleanRecipient, source: 'x-bot' }, this.webBase);
          return {
            reply: `@${sender} 🟢 ${cmd.recipient} is available!\n\nClaim it now before someone else does:\n🔗 ${claimUrl}`,
            commandType: 'claim',
            available: true,
            claimUrl
          };
        } else {
          const profileUrl = generateDeepLink({ action: 'profile', recipient: cmd.cleanRecipient, source: 'x-bot' }, this.webBase);
          return {
            reply: `@${sender} 🔴 ${cmd.recipient} is already claimed.\n\nView profile & payment options:\n🔗 ${profileUrl}`,
            commandType: 'check',
            available: false,
            profileUrl
          };
        }
      }

      case 'profile': {
        const profile = await this.resolver.getProfile(cmd.cleanRecipient);
        if (profile.available) {
          const claimUrl = generateDeepLink({ action: 'claim', recipient: cmd.cleanRecipient, source: 'x-bot' }, this.webBase);
          return {
            reply: `@${sender} 🟢 ${cmd.recipient} is currently unclaimed!\n\nClaim it here:\n🔗 ${claimUrl}`,
            commandType: 'profile',
            available: true
          };
        }

        const payUrl = generateDeepLink({ action: 'send', recipient: cmd.cleanRecipient, amount: 5000, source: 'x-bot' }, this.webBase);
        return {
          reply: `@${sender} ${cmd.recipient} ✓ (Verified NairaTag)\n🇳🇬 Lagos, Nigeria · Dual-Rail Active\n\n• Profile: ${profile.profileUrl}\n• Send ₦: ${payUrl}`,
          commandType: 'profile',
          available: false,
          profileUrl: profile.profileUrl,
          payUrl
        };
      }

      case 'send':
      case 'tip': {
        const isTip = cmd.type === 'tip';
        const actionType = isTip ? 'tip' : 'send';
        const payUrl = generateDeepLink({
          action: actionType,
          recipient: cmd.cleanRecipient,
          amount: cmd.amount,
          source: 'x-bot'
        }, this.webBase);

        const amtFormatted = `₦${cmd.amount.toLocaleString()}`;
        return {
          reply: `@${sender} Ready to ${isTip ? 'tip' : 'send'} ${amtFormatted} to ${cmd.recipient} ✓\n\nClick to confirm securely on NairaTag:\n🔗 ${payUrl}`,
          commandType: actionType,
          amount: cmd.amount,
          payUrl
        };
      }

      case 'request': {
        const reqUrl = generateDeepLink({
          action: 'request',
          recipient: cmd.cleanRecipient,
          amount: cmd.amount,
          source: 'x-bot'
        }, this.webBase);

        const amtFormatted = `₦${cmd.amount.toLocaleString()}`;
        return {
          reply: `@${sender} Payment request for ${amtFormatted} from ${cmd.recipient}:\n🔗 ${reqUrl}`,
          commandType: 'request',
          amount: cmd.amount,
          reqUrl
        };
      }

      default:
        return { reply: null, ignored: true };
    }
  }
}

export function createXBotService(config) {
  return new XBotService(config);
}
