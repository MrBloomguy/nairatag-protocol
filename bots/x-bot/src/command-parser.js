/**
 * @file command-parser.js
 * Deterministic Command Parser for @NairaTagBot on X.
 */

import {
  parseNairaTags,
  getCanonicalIdentifier,
  isNairaTag
} from '../../../packages/nairatag-parser/src/index.js';

/**
 * Parses raw tweet mention text into an executable @NairaTagBot command.
 *
 * @param {string} text - Full tweet text including "@NairaTagBot"
 * @returns {Object|null} Parsed command object or null if not an explicit command
 */
export function parseXBotCommand(text) {
  if (!text || typeof text !== 'string') return null;

  // Strip @NairaTagBot mention and extra spaces
  const clean = text.replace(/@NairaTagBot/gi, '').trim();
  if (!clean) return null;

  // 1. Send Command: "send ₦5,000 to ₦MIKKI" or "send 5000 to ₦MIKKI"
  const sendMatch = clean.match(/^send\s+₦?([0-9,.]+k?m?)\s+to\s+₦?([A-Za-z0-9_-]+)/i);
  if (sendMatch) {
    const rawAmt = sendMatch[1].replace(/,/g, '');
    let amtNum = parseFloat(rawAmt);
    if (/k$/i.test(rawAmt)) amtNum *= 1000;
    if (/m$/i.test(rawAmt)) amtNum *= 1000000;

    const rawTag = sendMatch[2];
    if (isNairaTag(rawTag)) {
      return {
        type: 'send',
        recipient: `₦${getCanonicalIdentifier(rawTag)}`,
        cleanRecipient: getCanonicalIdentifier(rawTag),
        amount: amtNum,
        currency: 'NGN'
      };
    }
  }

  // 2. Tip Command: "tip ₦MIKKI ₦1,000" or "tip ₦MIKKI 1000"
  const tipMatch = clean.match(/^tip\s+₦?([A-Za-z0-9_-]+)\s+₦?([0-9,.]+k?m?)/i);
  if (tipMatch) {
    const rawTag = tipMatch[1];
    const rawAmt = tipMatch[2].replace(/,/g, '');
    let amtNum = parseFloat(rawAmt);
    if (/k$/i.test(rawAmt)) amtNum *= 1000;
    if (/m$/i.test(rawAmt)) amtNum *= 1000000;

    if (isNairaTag(rawTag)) {
      return {
        type: 'tip',
        recipient: `₦${getCanonicalIdentifier(rawTag)}`,
        cleanRecipient: getCanonicalIdentifier(rawTag),
        amount: amtNum,
        currency: 'NGN'
      };
    }
  }

  // 3. Request Command: "request ₦5,000 from ₦MIKKI"
  const reqMatch = clean.match(/^request\s+₦?([0-9,.]+k?m?)\s+from\s+₦?([A-Za-z0-9_-]+)/i);
  if (reqMatch) {
    const rawAmt = reqMatch[1].replace(/,/g, '');
    let amtNum = parseFloat(rawAmt);
    if (/k$/i.test(rawAmt)) amtNum *= 1000;
    if (/m$/i.test(rawAmt)) amtNum *= 1000000;

    const rawTag = reqMatch[2];
    if (isNairaTag(rawTag)) {
      return {
        type: 'request',
        recipient: `₦${getCanonicalIdentifier(rawTag)}`,
        cleanRecipient: getCanonicalIdentifier(rawTag),
        amount: amtNum,
        currency: 'NGN'
      };
    }
  }

  // 4. Claim Command: "claim ₦MIKKI"
  const claimMatch = clean.match(/^claim\s+₦?([A-Za-z0-9_-]+)/i);
  if (claimMatch) {
    const rawTag = claimMatch[1];
    if (isNairaTag(rawTag)) {
      return {
        type: 'claim',
        recipient: `₦${getCanonicalIdentifier(rawTag)}`,
        cleanRecipient: getCanonicalIdentifier(rawTag)
      };
    }
  }

  // 5. Check Command: "check ₦MIKKI"
  const checkMatch = clean.match(/^check\s+₦?([A-Za-z0-9_-]+)/i);
  if (checkMatch) {
    const rawTag = checkMatch[1];
    if (isNairaTag(rawTag)) {
      return {
        type: 'check',
        recipient: `₦${getCanonicalIdentifier(rawTag)}`,
        cleanRecipient: getCanonicalIdentifier(rawTag)
      };
    }
  }

  // 6. Profile Command: "profile ₦MIKKI"
  const profileMatch = clean.match(/^profile\s+₦?([A-Za-z0-9_-]+)/i);
  if (profileMatch) {
    const rawTag = profileMatch[1];
    if (isNairaTag(rawTag)) {
      return {
        type: 'profile',
        recipient: `₦${getCanonicalIdentifier(rawTag)}`,
        cleanRecipient: getCanonicalIdentifier(rawTag)
      };
    }
  }

  // 7. General tag mention fallback: "₦MIKKI"
  const tags = parseNairaTags(clean);
  if (tags.length === 1) {
    return {
      type: 'profile',
      recipient: tags[0].canonical,
      cleanRecipient: tags[0].tag
    };
  }

  return null;
}
