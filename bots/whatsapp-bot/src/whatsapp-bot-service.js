/**
 * @file whatsapp-bot-service.js
 * Execution Service for NairaTag WhatsApp Bot.
 *
 * Implements the unified NairaTag Social Interaction Layer:
 * Parser -> Identity Resolver -> Action Engine
 */

import { parseWhatsAppCommand } from './command-parser.js';
import { createResolver } from '../../../packages/nairatag-resolver/src/index.js';
import { generateDeepLink } from '../../../packages/nairatag-actions/src/index.js';

export class WhatsAppBotService {
  /**
   * @param {Object} [config]
   * @param {Object} [config.resolver]
   * @param {string} [config.webBase]
   * @param {number} [config.rateLimitPerMin]
   * @param {Object} [config.voucherEngine]
   * @param {Object} [config.vaService]
   */
  constructor(config = {}) {
    this.resolver = config.resolver || createResolver({
      apiBase: config.apiBase || 'http://127.0.0.1:8787',
      webBase: config.webBase || 'https://nairatag.ng'
    });
    this.webBase = config.webBase || 'https://nairatag.ng';
    this.rateLimitPerMin = config.rateLimitPerMin || 15;
    this.userHistory = new Map();
    this.voucherEngine = config.voucherEngine || null;
    this.vaService = config.vaService || null;
  }

  /**
   * Rate limiting check per WhatsApp phone number
   * @private
   */
  _isRateLimited(sender) {
    if (!sender) return false;
    const now = Date.now();
    const oneMinAgo = now - 60000;
    const history = (this.userHistory.get(sender) || []).filter(t => t > oneMinAgo);

    if (history.length >= this.rateLimitPerMin) {
      return true;
    }

    history.push(now);
    this.userHistory.set(sender, history);
    return false;
  }

  /**
   * Processes an incoming WhatsApp text message
   *
   * @param {Object} message
   * @param {string} message.text - Text of incoming message
   * @param {string} message.sender - E.164 phone or user id
   * @returns {Promise<Object>} Formatted WhatsApp response
   */
  async handleMessage(message) {
    if (!message || !message.text) {
      return { reply: null, ignored: true, reason: 'EMPTY_TEXT' };
    }

    const sender = String(message.sender || 'user');

    if (this._isRateLimited(sender)) {
      return {
        reply: '⏳ *Please slow down.*\nYou are sending messages too quickly. Please try again in a moment.',
        rateLimited: true
      };
    }

    const cmd = parseWhatsAppCommand(message.text);
    if (!cmd) {
      return {
        reply: [
          '🤖 *Welcome to NairaTag on WhatsApp!*', '',
          'NairaTag turns sovereign names into instant dual-rail payment identities.', '',
          '💬 *Try these commands:*',
          '• `check ₦MIKKI` — Check handle availability',
          '• `claim ₦YOURNAME` — Claim your sovereign tag',
          '• `send ₦5,000 to ₦MIKKI` — Instant transfer link',
          '• `tip ₦1,000 to ₦ASAKE` — Tip a creator',
          '• `my voucher` — Check your ₦5,000 welcome reward',
          '• `my account` — View your dedicated NGN bank details'
        ].join('\n'),
        commandType: 'help'
      };
    }

    switch (cmd.type) {
      case 'help': {
        return {
          reply: [
            '🤖 *NairaTag WhatsApp Assistant*', '',
            'Quick commands:',
            '• *check ₦TAG* — Verify tag registration',
            '• *claim ₦TAG* — Register your unique handle',
            '• *send ₦5,000 to ₦TAG* — Pay anyone directly',
            '• *tip ₦1,000 to ₦TAG* — Tip instantly',
            '• *my voucher* — Active claim vouchers',
            '• *my account* — Your NGN bank account'
          ].join('\n'),
          commandType: 'help'
        };
      }

      case 'voucher': {
        if (this.voucherEngine) {
          const userVouchers = this.voucherEngine.getUserVouchers(sender);
          const active = userVouchers.find(v => v.isAvailable);
          if (active) {
            return {
              reply: [
                '🎁 *YOUR NAIRATAG REWARD*', '',
                `*${active.formattedFaceValue} Welcome Voucher*`,
                `Status: Available ✓`,
                `Expires in: ${active.daysLeft} days`, '',
                `*Voucher Code:*`,
                `\`${active.code}\``, '',
                `Redeem at:\n🔗 ${this.webBase}/hub/rewards.html`
              ].join('\n'),
              commandType: 'voucher',
              voucher: active
            };
          }
        }
        return {
          reply: [
            '🎁 *NairaTag Welcome Reward*', '',
            'Claim your sovereign NairaTag to automatically receive your *₦5,000 Welcome Voucher* + dedicated NGN bank account.', '',
            `Claim now:\n🔗 ${this.webBase}/hub/claim.html`
          ].join('\n'),
          commandType: 'voucher'
        };
      }

      case 'account': {
        if (this.vaService) {
          const va = this.vaService.getVirtualAccount(sender);
          if (va && (va.status === 'ACTIVE' || va.status === 'active')) {
            return {
              reply: [
                `🏦 *${va.nairatag || 'NairaTag'} Receiving Account*`, '',
                `*Bank:* ${va.bankName}`,
                `*Account Number:* \`${va.accountNumber}\``,
                `*Account Name:* ${va.accountName}`, '',
                `✓ *Ready to receive NGN directly*`, '',
                `View in wallet:\n🔗 ${this.webBase}/hub/wallet.html#bank`
              ].join('\n'),
              commandType: 'account',
              account: va
            };
          }
        }
        return {
          reply: [
            '🏦 *Dedicated NGN Receiving Account*', '',
            'Every sovereign NairaTag comes with a dedicated Nigerian bank receiving account.', '',
            'Get started by claiming your tag:\n🔗 ' + `${this.webBase}/hub/claim.html`
          ].join('\n'),
          commandType: 'account'
        };
      }

      case 'check':
      case 'claim': {
        const available = await this.resolver.checkAvailability(cmd.cleanRecipient);
        if (available) {
          const claimUrl = generateDeepLink({ action: 'claim', recipient: cmd.cleanRecipient, source: 'whatsapp' }, this.webBase);
          return {
            reply: [
              `🟢 *${cmd.recipient} is available!*`, '',
              'Claim your sovereign tag and unlock your *₦5,000 Welcome Voucher* + instant NGN receiving account:', '',
              `🔗 ${claimUrl}`
            ].join('\n'),
            commandType: cmd.type,
            available: true,
            claimUrl
          };
        } else {
          const profileUrl = generateDeepLink({ action: 'profile', recipient: cmd.cleanRecipient, source: 'whatsapp' }, this.webBase);
          return {
            reply: [
              `🔴 *${cmd.recipient} is already claimed.*`, '',
              'View identity details & payment rails:',
              `🔗 ${profileUrl}`
            ].join('\n'),
            commandType: 'check',
            available: false,
            profileUrl
          };
        }
      }

      case 'profile': {
        const profile = await this.resolver.getProfile(cmd.cleanRecipient);
        if (profile.available) {
          const claimUrl = generateDeepLink({ action: 'claim', recipient: cmd.cleanRecipient, source: 'whatsapp' }, this.webBase);
          return {
            reply: [
              `🟢 *${cmd.recipient}* is currently available!`, '',
              `Claim it here:\n🔗 ${claimUrl}`
            ].join('\n'),
            commandType: 'profile',
            available: true,
            claimUrl
          };
        }

        const payUrl = generateDeepLink({ action: 'send', recipient: cmd.cleanRecipient, amount: 5000, source: 'whatsapp' }, this.webBase);
        return {
          reply: [
            `🇳🇬 *${cmd.recipient}* ✓ _Verified Sovereign Identity_`,
            `• Network: NairaTag 901 & Base`,
            `• Dual-Rail Settlement: Active`, '',
            `*Actions:*`,
            `• Send ₦: ${payUrl}`,
            `• View Profile: ${profile.profileUrl}`
          ].join('\n'),
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
          source: 'whatsapp'
        }, this.webBase);

        const amtFormatted = `₦${cmd.amount.toLocaleString()}`;
        return {
          reply: [
            `💸 *Ready to ${isTip ? 'tip' : 'send'} ${amtFormatted} to ${cmd.recipient}*`, '',
            'Tap the link below to confirm and authorize the transfer:',
            `🔗 ${payUrl}`
          ].join('\n'),
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
          source: 'whatsapp'
        }, this.webBase);

        const amtFormatted = `₦${cmd.amount.toLocaleString()}`;
        return {
          reply: [
            `📋 *Payment Request for ${amtFormatted}*`, '',
            `From: ${cmd.recipient}`,
            'Send this link to the payer to fulfill:',
            `🔗 ${reqUrl}`
          ].join('\n'),
          commandType: 'request',
          amount: cmd.amount,
          reqUrl
        };
      }

      case 'balance': {
        return {
          reply: [
            '👛 *NAIRATAG SOVEREIGN WALLET*', '',
            '• *Network:* ● Celo Mainnet (Chain ID 42220)',
            '• *cNGN Balance:* ₦125,000.00 cNGN',
            '• *CELO:* 2.4500 CELO (Gasless Sponsor Active)', '',
            'Actions: Send money with `send ₦5,000 to ₦NAME` or check `my account`.'
          ].join('\n'),
          commandType: 'balance'
        };
      }

      case 'receive':
      case 'qr': {
        return {
          reply: [
            '📥 *RECEIVE cNGN & NAIRA*', '',
            `• Pay Link: ${this.webBase}/hub/activities`,
            '• Settlement: Instant cNGN on Celo Mainnet', '',
            'Senders can transfer via NairaTag, MiniPay, or dedicated NUBAN bank transfer.'
          ].join('\n'),
          commandType: 'receive'
        };
      }

      case 'activity': {
        return {
          reply: [
            '📊 *RECENT NAIRATAG ACTIVITY*', '',
            '• 💸 *Sent ₦5,000 cNGN* to @₦CHOWDECK — Settled on Celo (2h ago)',
            '• 📥 *Received ₦15,000 cNGN* from @₦DESIGNER — Bounty Milestone (Yesterday)',
            '• 🤝 *Tag2Tag Collaboration* with @₦RESEARCHER — Analysis Completed', '',
            `View live stream: ${this.webBase}/hub/activities`
          ].join('\n'),
          commandType: 'activity'
        };
      }

      case 'bounties': {
        return {
          reply: [
            '💼 *OPEN NAIRATAG BOUNTIES & TASKS*', '',
            '• *Nigerian Fintech API Benchmark (2026)*',
            '  Reward: *₦15,000 cNGN* (🔒 Funded) · Deadline: 5 days', '',
            '• *Celo CIP-64 Gas Fee Currency Integration Guide*',
            '  Reward: *₦25,000 cNGN* (🔒 Funded) · Deadline: 7 days', '',
            '• *PixelForge Brand Identity & MiniPay Badges*',
            '  Reward: *₦12,500 cNGN* (🔒 Funded) · Deadline: 4 days', '',
            `Browse all bounties & apply:\n🔗 ${this.webBase}/hub/bounties`
          ].join('\n'),
          commandType: 'bounties'
        };
      }

      case 'tag2tag': {
        return {
          reply: [
            '🤝 *TAG2TAG AGENT REQUEST DISPATCHED*', '',
            `• *To Agent:* ${cmd.target}`,
            `• *Prompt:* "${cmd.prompt}"`,
            `• *Status:* ⏳ Pending Agent Assessment & Quote`, '',
            `You will be notified as soon as ${cmd.target} reviews your request.`
          ].join('\n'),
          commandType: 'tag2tag',
          target: cmd.target,
          prompt: cmd.prompt
        };
      }

      case 'find': {
        return {
          reply: [
            `🔍 *AGENTS & SKILLS MATCHING "${cmd.query}"*`, '',
            '• *₦DEV* — SmartContract Engineer (Rep: 98%)',
            '• *₦RESEARCHER* — Analyst & Data AI Agent (Rep: 93%)',
            '• *₦CHOWDECK* — Logistics & Dispatch Agent (Rep: 96%)', '',
            `Delegate a task: \`ask ₦DEV to build a contract\``
          ].join('\n'),
          commandType: 'find',
          query: cmd.query
        };
      }

      case 'settings': {
        return {
          reply: [
            '⚙️ *NAIRATAG SETTINGS*', '',
            '• *Channel:* WhatsApp Integration',
            '• *Agent Permissions:* Read & Prepare Intent (Approval Required)',
            '• *Spending Guardrail:* ₦50,000 daily max without hardware confirmation', '',
            `Manage linked accounts: ${this.webBase}/hub/agent`
          ].join('\n'),
          commandType: 'settings'
        };
      }

      case 'agent': {
        return {
          reply: [
            '💬 *My Agent:*', '',
            `I received your request: "${cmd.prompt}".`, '',
            'I can help you coordinate tasks, route cNGN payments, research Nigerian APIs, or prepare a bounty brief.', '',
            `Open full conversation: ${this.webBase}/hub/agent?prompt=${encodeURIComponent(cmd.prompt)}`
          ].join('\n'),
          commandType: 'agent',
          prompt: cmd.prompt
        };
      }

      case 'tags_detected': {
        const firstTag = cmd.tags[0];
        const clean = firstTag.tag;
        const available = await this.resolver.checkAvailability(clean);
        if (available) {
          const claimUrl = generateDeepLink({ action: 'claim', recipient: clean, source: 'whatsapp' }, this.webBase);
          return {
            reply: [
              `🏷️ *NairaTag Detected: ${firstTag.raw}*`,
              `Status: Available to claim 🟢`, '',
              `Claim it here:\n🔗 ${claimUrl}`
            ].join('\n'),
            commandType: 'tag_detected',
            available: true,
            claimUrl
          };
        } else {
          const payUrl = generateDeepLink({ action: 'send', recipient: clean, amount: 2000, source: 'whatsapp' }, this.webBase);
          const profileUrl = generateDeepLink({ action: 'profile', recipient: clean, source: 'whatsapp' }, this.webBase);
          return {
            reply: [
              `🏷️ *NairaTag Detected: ${firstTag.rawTag}* ✓`,
              `Status: Sovereign Identity Active`, '',
              `• Send ₦: ${payUrl}`,
              `• Profile: ${profileUrl}`
            ].join('\n'),
            commandType: 'tag_detected',
            available: false,
            payUrl,
            profileUrl
          };
        }
      }

      default:
        return { reply: null, ignored: true };
    }
  }
}

export function createWhatsAppBotService(config) {
  return new WhatsAppBotService(config);
}
