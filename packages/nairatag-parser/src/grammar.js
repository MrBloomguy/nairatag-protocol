/**
 * @file grammar.js
 * Formal grammar definitions & currency disambiguation rules for NairaTag.
 *
 * A NairaTag represents a sovereign identity (e.g., ₦MIKKI, ₦ASAKE).
 * It is NOT a currency payment amount (e.g., ₦5,000, ₦5k, ₦10.50).
 */

export const NAIRA_SYMBOL = '₦'; // \u20A6
export const NAIRA_SYMBOL_CODE = 0x20a6;

export const MIN_TAG_LENGTH = 2;
export const MAX_TAG_LENGTH = 32;

/**
 * Regex detecting common Nigerian currency amount expressions following the ₦ symbol.
 * Matches:
 *  - 5000, 5,000, 5,000.00, 50.5
 *  - 5k, 5K, 10m, 10M, 2b, 2B, 1t, 1T
 *  - 500k, 1.5m, 2.5bn
 */
export const CURRENCY_AMOUNT_PATTERN =
  /^\d+(?:,\d{3})*(?:\.\d+)?(?:\s*(?:k|m|b|t|bn|tn|thousand|million|billion|naira|ngn))?$/i;

/**
 * Standalone number with standard short abbreviation (5k, 10m, 2.5b, etc.)
 */
export const SHORT_CURRENCY_PATTERN = /^\d+(?:\.\d+)?[kmbt]$/i;

/**
 * Strict Tag Identifier specification:
 * - 2 to 32 characters
 * - Characters allowed: Letters (A-Z, a-z), Digits (0-9), Underscores (_), Hyphens (-)
 * - Must begin with an alphanumeric character
 * - Must end with an alphanumeric character
 * - Cannot contain consecutive hyphens/underscores (-- or __)
 */
export const TAG_IDENTIFIER_PATTERN =
  /^[A-Za-z0-9](?:[A-Za-z0-9_-]{0,30}[A-Za-z0-9])?$/;

/**
 * Global scanner regex for finding potential ₦TAG occurrences in arbitrary text.
 * Requires ₦ followed by at least 2 word/hyphen characters.
 */
export const GLOBAL_TAG_SCANNER = /₦([A-Za-z0-9][A-Za-z0-9_-]{1,31})/g;

/**
 * Checks whether an extracted text segment is a currency figure rather than a tag.
 * @param {string} raw - The token following '₦', e.g. "5,000", "5k", "MIKKI"
 * @returns {boolean}
 */
export function isCurrencyAmount(raw) {
  if (!raw || typeof raw !== 'string') return false;
  const trimmed = raw.trim();
  if (CURRENCY_AMOUNT_PATTERN.test(trimmed)) return true;
  if (SHORT_CURRENCY_PATTERN.test(trimmed)) return true;
  // Pure numeric check
  if (/^\d+$/.test(trimmed.replace(/,/g, ''))) return true;
  return false;
}

/**
 * Validates whether an identifier adheres to the strict NairaTag grammar.
 * @param {string} rawTag - Identifier string without '₦'
 * @returns {boolean}
 */
export function isValidTagIdentifier(rawTag) {
  if (!rawTag || typeof rawTag !== 'string') return false;
  const len = rawTag.length;
  if (len < MIN_TAG_LENGTH || len > MAX_TAG_LENGTH) return false;
  if (!TAG_IDENTIFIER_PATTERN.test(rawTag)) return false;
  // Reject consecutive separators
  if (rawTag.includes('--') || rawTag.includes('__') || rawTag.includes('-_') || rawTag.includes('_-')) {
    return false;
  }
  // Reject if it is a currency expression (e.g. 50k, 10m, 5000)
  if (isCurrencyAmount(rawTag)) return false;

  return true;
}
