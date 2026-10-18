/**
 * @file schema.js
 * Formal Action Schema Specification for NairaTag Social Protocol.
 */

import {
  isNairaTag,
  normalizeNairaTag,
  getCanonicalIdentifier,
  DEFAULT_WEB_BASE
} from '../../nairatag-parser/src/index.js';

export const SUPPORTED_ACTIONS = Object.freeze([
  'resolve',
  'profile',
  'claim',
  'send',
  'tip',
  'request',
  'share',
  'copy'
]);

export const SUPPORTED_SOURCES = Object.freeze([
  'x-extension',
  'x-bot',
  'whatsapp',
  'open-social',
  'web-app'
]);

/**
 * Validates a structured NairaTag action payload.
 *
 * @param {Object} action
 * @throws {Error} If action payload is invalid
 * @returns {Object} Validated & normalized action object
 */
export function validateAction(action) {
  if (!action || typeof action !== 'object') {
    throw new Error('Action payload must be an object');
  }

  const { action: type, recipient, amount, currency = 'NGN', source = 'web-app', metadata = {} } = action;

  if (!SUPPORTED_ACTIONS.includes(type)) {
    throw new Error(`Unsupported action type "${type}". Allowed: ${SUPPORTED_ACTIONS.join(', ')}`);
  }

  if (!recipient) {
    throw new Error('Recipient tag is required');
  }

  const cleanRecipient = getCanonicalIdentifier(recipient);
  if (!isNairaTag(cleanRecipient)) {
    throw new Error(`Invalid recipient NairaTag: "${recipient}"`);
  }

  let parsedAmount = null;
  if (['send', 'tip', 'request'].includes(type)) {
    if (amount === undefined || amount === null || amount === '') {
      throw new Error(`Action "${type}" requires an amount`);
    }
    const num = Number(String(amount).replace(/,/g, ''));
    if (isNaN(num) || num <= 0) {
      throw new Error(`Invalid amount "${amount}" for action "${type}"`);
    }
    parsedAmount = num;
  }

  return {
    action: type,
    recipient: `₦${cleanRecipient}`,
    cleanRecipient,
    amount: parsedAmount,
    currency: currency.toUpperCase(),
    source,
    metadata
  };
}

/**
 * Generates universal pre-filled deep links from an action.
 * Works seamlessly whether user has the extension, mobile bot, or neither.
 *
 * @param {Object} action
 * @param {string} [webBase]
 * @returns {string} Fully qualified web URL
 */
export function generateDeepLink(action, webBase = DEFAULT_WEB_BASE) {
  const valid = validateAction(action);
  const base = webBase.replace(/\/+$/, '');
  const params = new URLSearchParams();

  params.set('tag', valid.cleanRecipient);
  if (valid.amount) {
    params.set('amount', String(valid.amount));
    if (valid.currency) params.set('currency', valid.currency);
  }
  if (valid.source) params.set('source', valid.source);

  switch (valid.action) {
    case 'claim':
      return `${base}/claim?${params.toString()}`;
    case 'send':
    case 'tip':
      return `${base}/pay?${params.toString()}`;
    case 'profile':
    case 'resolve':
      return `${base}/tag/${encodeURIComponent(valid.cleanRecipient)}`;
    case 'request':
      return `${base}/request?${params.toString()}`;
    default:
      return `${base}/tag/${encodeURIComponent(valid.cleanRecipient)}`;
  }
}
