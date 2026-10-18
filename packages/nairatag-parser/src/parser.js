/**
 * @file parser.js
 * Core NairaTag Social Protocol Parser SDK.
 *
 * Universal, zero-dependency parser working seamlessly across:
 * Node.js, Browser, Chrome/Firefox Extension, React, and server-side bots.
 */

import {
  NAIRA_SYMBOL,
  isValidTagIdentifier,
  isCurrencyAmount,
  GLOBAL_TAG_SCANNER
} from './grammar.js';

export const DEFAULT_WEB_BASE = 'https://nairatag.ng';

/**
 * Normalizes any NairaTag representation into canonical form:
 * Example:
 *   "₦mikki"  -> "₦MIKKI"
 *   "mikki"   -> "₦MIKKI"
 *   "₦Mikki"  -> "₦MIKKI"
 *
 * @param {string} value
 * @returns {string} Canonical ₦TAG
 */
export function normalizeNairaTag(value) {
  if (!value || typeof value !== 'string') return '';
  // Unicode NFKC normalization
  const clean = value.normalize('NFKC').trim();
  const withoutSymbol = clean.replace(/^₦/, '').trim();
  return `${NAIRA_SYMBOL}${withoutSymbol.toUpperCase()}`;
}

/**
 * Extracts only the raw identifier (without ₦) in canonical uppercase.
 * @param {string} value
 * @returns {string}
 */
export function getCanonicalIdentifier(value) {
  if (!value || typeof value !== 'string') return '';
  return value.normalize('NFKC').trim().replace(/^₦/, '').toUpperCase();
}

/**
 * Checks whether a single given string is a valid NairaTag reference.
 * Returns false for currency amounts like "₦5,000" or "₦10k".
 *
 * @param {string} value - String to test, e.g. "₦MIKKI" or "MIKKI"
 * @returns {boolean}
 */
export function isNairaTag(value) {
  if (!value || typeof value !== 'string') return false;
  const normalized = value.normalize('NFKC').trim();
  const withoutSymbol = normalized.replace(/^₦/, '').trim();

  // If original had symbol and there's a space after symbol, it's not a tag
  if (normalized.startsWith(NAIRA_SYMBOL) && /^[₦]\s+/.test(normalized)) {
    return false;
  }

  return isValidTagIdentifier(withoutSymbol);
}

/**
 * Parses arbitrary text to extract all valid NairaTag entities with positions.
 * Automatically ignores currency amounts such as "₦5,000", "₦5k", etc.
 *
 * @param {string} text - Arbitrary social post/message content
 * @param {Object} [options]
 * @param {string} [options.webBase] - Custom web fallback base URL
 * @returns {Array<Object>} Array of structured NairaTag entities
 */
export function parseNairaTags(text, options = {}) {
  if (!text || typeof text !== 'string') return [];

  const webBase = (options.webBase || DEFAULT_WEB_BASE).replace(/\/+$/, '');
  const entities = [];
  const normalizedText = text.normalize('NFKC');

  // Scanner matches ₦ followed by tag candidates
  // We use word boundary checking to avoid capturing trailing punctuation
  const regex = /₦([A-Za-z0-9][A-Za-z0-9_-]{1,31})/g;
  let match;

  while ((match = regex.exec(normalizedText)) !== null) {
    let rawIdentifier = match[1];
    let fullRaw = match[0];
    let start = match.index;

    // Strip trailing punctuation often attached in social posts: .,;:!?)"'
    const punctuationMatch = rawIdentifier.match(/([.,;:!?)"']+)$/);
    if (punctuationMatch) {
      const punctLen = punctuationMatch[1].length;
      rawIdentifier = rawIdentifier.slice(0, -punctLen);
      fullRaw = fullRaw.slice(0, -punctLen);
    }

    // Validate the candidate against the strict grammar & currency filters
    if (isValidTagIdentifier(rawIdentifier)) {
      const canonicalTag = rawIdentifier.toUpperCase();
      const end = start + fullRaw.length;

      entities.push({
        type: 'nairatag',
        tag: canonicalTag,
        display: `${NAIRA_SYMBOL}${canonicalTag}`,
        canonical: `${NAIRA_SYMBOL}${canonicalTag}`,
        raw: fullRaw,
        uri: `nairatag://${canonicalTag}`,
        url: `${webBase}/${canonicalTag}`,
        start,
        end
      });
    }
  }

  return entities;
}

/**
 * Extracts a deduplicated array of canonical tag strings from text.
 * Example:
 *   "Send to ₦mikki and ₦asake, not ₦5,000 to ₦mikki"
 *   -> ["₦MIKKI", "₦ASAKE"]
 *
 * @param {string} text
 * @returns {string[]} Array of unique canonical tags
 */
export function extractNairaTags(text) {
  const entities = parseNairaTags(text);
  const seen = new Set();
  const result = [];

  for (const ent of entities) {
    if (!seen.has(ent.canonical)) {
      seen.add(ent.canonical);
      result.push(ent.canonical);
    }
  }

  return result;
}

/**
 * Replaces NairaTag occurrences in text using a custom renderer callback.
 *
 * @param {string} text - Raw input text
 * @param {function(Object): string} renderer - Function receiving entity and returning replacement string
 * @param {Object} [options]
 * @returns {string}
 */
export function replaceNairaTags(text, renderer, options = {}) {
  if (!text || typeof text !== 'string') return '';
  if (typeof renderer !== 'function') return text;

  const entities = parseNairaTags(text, options);
  if (entities.length === 0) return text;

  let result = '';
  let lastIndex = 0;

  for (const ent of entities) {
    result += text.slice(lastIndex, ent.start);
    result += renderer(ent);
    lastIndex = ent.end;
  }

  result += text.slice(lastIndex);
  return result;
}
