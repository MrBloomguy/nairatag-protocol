/**
 * @file command-parser.js
 * Conversational command parser for WhatsApp NairaTag Bot
 */

import {
  parseNairaTags,
  getCanonicalIdentifier,
  isNairaTag
} from '../../../packages/nairatag-parser/src/index.js';

export function parseWhatsAppCommand(text) {
  if (!text || typeof text !== 'string') return null;
  const cleaned = text.trim();
  if (!cleaned) return null;

  // Help / Greeting
  if (/^(?:hi|hello|hey|help|start|\/?start|\/?help)$/i.test(cleaned)) {
    return { type: 'help' };
  }

  // Voucher Intent
  if (/^(?:voucher|my\s+vouchers?|rewards?|my\s+rewards?|check\s+voucher)$/i.test(cleaned)) {
    return { type: 'voucher' };
  }

  // Account / Bank Details Intent
  if (/^(?:my\s+account|account|bank\s+details|receive\s+money|receive\s+ngn|my\s+bank|my\s+receiving\s+account)$/i.test(cleaned)) {
    return { type: 'account' };
  }

  // Send / Pay: e.g. "send ₦5,000 to ₦MIKKI", "pay 5000 to ₦MIKKI", "send 5k to ₦MIKKI"
  const sendMatch = cleaned.match(/^(?:send|pay)\s+(?:₦)?([0-9,]+(?:\.[0-9]{1,2})?k?m?)\s+to\s+(@?₦?[a-zA-Z0-9_-]+)/i);
  if (sendMatch) {
    const rawAmt = sendMatch[1].replace(/,/g, '').toLowerCase();
    let amount = parseFloat(rawAmt);
    if (rawAmt.endsWith('k')) amount = parseFloat(rawAmt.slice(0, -1)) * 1000;
    if (rawAmt.endsWith('m')) amount = parseFloat(rawAmt.slice(0, -1)) * 1000000;

    const rawTarget = sendMatch[2].replace(/^@/, '');
    const cleanRecipient = getCanonicalIdentifier(rawTarget);
    return {
      type: 'send',
      amount: isNaN(amount) ? 0 : amount,
      recipient: `₦${cleanRecipient}`,
      cleanRecipient
    };
  }

  // Tip: e.g. "tip ₦1,000 to ₦MIKKI" or "tip ₦MIKKI ₦1,000"
  const tipMatch1 = cleaned.match(/^tip\s+(?:₦)?([0-9,]+(?:\.[0-9]{1,2})?k?m?)\s+to\s+(@?₦?[a-zA-Z0-9_-]+)/i);
  const tipMatch2 = cleaned.match(/^tip\s+(@?₦?[a-zA-Z0-9_-]+)\s+(?:₦)?([0-9,]+(?:\.[0-9]{1,2})?k?m?)/i);
  if (tipMatch1 || tipMatch2) {
    const match = tipMatch1 || tipMatch2;
    const rawAmt = (tipMatch1 ? match[1] : match[2]).replace(/,/g, '').toLowerCase();
    let amount = parseFloat(rawAmt);
    if (rawAmt.endsWith('k')) amount = parseFloat(rawAmt.slice(0, -1)) * 1000;
    if (rawAmt.endsWith('m')) amount = parseFloat(rawAmt.slice(0, -1)) * 1000000;

    const rawTarget = (tipMatch1 ? match[2] : match[1]).replace(/^@/, '');
    const cleanRecipient = getCanonicalIdentifier(rawTarget);
    return {
      type: 'tip',
      amount: isNaN(amount) ? 0 : amount,
      recipient: `₦${cleanRecipient}`,
      cleanRecipient
    };
  }

  // Request: e.g. "request ₦10,000 from ₦MIKKI"
  const reqMatch = cleaned.match(/^request\s+(?:₦)?([0-9,]+(?:\.[0-9]{1,2})?k?m?)\s+from\s+(@?₦?[a-zA-Z0-9_-]+)/i);
  if (reqMatch) {
    const rawAmt = reqMatch[1].replace(/,/g, '').toLowerCase();
    let amount = parseFloat(rawAmt);
    if (rawAmt.endsWith('k')) amount = parseFloat(rawAmt.slice(0, -1)) * 1000;
    if (rawAmt.endsWith('m')) amount = parseFloat(rawAmt.slice(0, -1)) * 1000000;

    const rawTarget = reqMatch[2].replace(/^@/, '');
    const cleanRecipient = getCanonicalIdentifier(rawTarget);
    return {
      type: 'request',
      amount: isNaN(amount) ? 0 : amount,
      recipient: `₦${cleanRecipient}`,
      cleanRecipient
    };
  }

  // Check: e.g. "check ₦MIKKI" or "check mikki"
  const checkMatch = cleaned.match(/^check\s+(@?₦?[a-zA-Z0-9_-]+)/i);
  if (checkMatch) {
    const rawTarget = checkMatch[1].replace(/^@/, '');
    const cleanRecipient = getCanonicalIdentifier(rawTarget);
    return {
      type: 'check',
      recipient: `₦${cleanRecipient}`,
      cleanRecipient
    };
  }

  // Claim: e.g. "claim ₦MIKKI" or "claim mikki"
  const claimMatch = cleaned.match(/^claim\s+(@?₦?[a-zA-Z0-9_-]+)/i);
  if (claimMatch) {
    const rawTarget = claimMatch[1].replace(/^@/, '');
    const cleanRecipient = getCanonicalIdentifier(rawTarget);
    return {
      type: 'claim',
      recipient: `₦${cleanRecipient}`,
      cleanRecipient
    };
  }

  // Profile: e.g. "profile ₦MIKKI" or "profile mikki"
  const profileMatch = cleaned.match(/^profile\s+(@?₦?[a-zA-Z0-9_-]+)/i);
  if (profileMatch) {
    const rawTarget = profileMatch[1].replace(/^@/, '');
    const cleanRecipient = getCanonicalIdentifier(rawTarget);
    return {
      type: 'profile',
      recipient: `₦${cleanRecipient}`,
      cleanRecipient
    };
  }

  // Bounties Intent: e.g. "bounties", "tasks", "jobs", "bounties dev"
  const bountyMatch = cleaned.match(/^(?:bounties|tasks|jobs)(?:\s+(.+))?$/i);
  if (bountyMatch) {
    return {
      type: 'bounties',
      category: bountyMatch[1] ? bountyMatch[1].trim().toLowerCase() : null
    };
  }

  // Balance / Wallet: e.g. "balance", "wallet", "bal"
  if (/^(?:balance|wallet|bal)$/i.test(cleaned)) {
    return { type: 'balance' };
  }

  // Receive: e.g. "receive", "receive money"
  if (/^(?:receive|receive\s+cngn)$/i.test(cleaned)) {
    return { type: 'receive' };
  }

  // QR Code: e.g. "qr", "qr code"
  if (/^(?:qr|qr\s+code)$/i.test(cleaned)) {
    return { type: 'qr' };
  }

  // Activity / Timeline: e.g. "activity", "timeline", "recent"
  if (/^(?:activity|timeline|recent)$/i.test(cleaned)) {
    return { type: 'activity' };
  }

  // Tag2Tag Intent: e.g. "tag2tag ₦RESEARCHER compare fees" or "ask ₦RESEARCHER to quote"
  const t2tMatch = cleaned.match(/^(?:tag2tag|ask)\s+(@?₦?[a-zA-Z0-9_-]+)\s+(?:to\s+)?(.+)$/i);
  if (t2tMatch) {
    const rawTarget = t2tMatch[1].replace(/^@/, '');
    const cleanRecipient = getCanonicalIdentifier(rawTarget);
    return {
      type: 'tag2tag',
      target: `₦${cleanRecipient}`,
      cleanTarget: cleanRecipient,
      prompt: t2tMatch[2].trim()
    };
  }

  // Find / Discover: e.g. "find dev", "find research", "discover"
  const findMatch = cleaned.match(/^(?:find|search|discover)\s+(.+)$/i);
  if (findMatch) {
    return {
      type: 'find',
      query: findMatch[1].trim()
    };
  }

  // Settings
  if (/^settings$/i.test(cleaned)) {
    return { type: 'settings' };
  }

  // Explicit Agent Intent: e.g. "agent what is cNGN?" or "ai write a brief"
  const agentMatch = cleaned.match(/^(?:agent|ai)\s+(.+)$/i);
  if (agentMatch) {
    return {
      type: 'agent',
      prompt: agentMatch[1].trim()
    };
  }

  // Single tag pasted directly: e.g. "₦MIKKI"
  if (isNairaTag(cleaned)) {
    const cleanRecipient = getCanonicalIdentifier(cleaned);
    return {
      type: 'profile',
      recipient: `₦${cleanRecipient}`,
      cleanRecipient
    };
  }

  // Fallback: Check if message contains any NairaTags anywhere in the sentence
  const parsedTags = parseNairaTags(cleaned);
  if (parsedTags.length > 0) {
    return {
      type: 'tags_detected',
      tags: parsedTags
    };
  }

  // Conversational Agent Query Fallback
  return {
    type: 'agent',
    prompt: cleaned
  };
}
