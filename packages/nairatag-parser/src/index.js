/**
 * @file index.js
 * Public entrypoint for @nairatag/parser
 */

export {
  NAIRA_SYMBOL,
  NAIRA_SYMBOL_CODE,
  MIN_TAG_LENGTH,
  MAX_TAG_LENGTH,
  CURRENCY_AMOUNT_PATTERN,
  TAG_IDENTIFIER_PATTERN,
  isCurrencyAmount,
  isValidTagIdentifier
} from './grammar.js';

export {
  DEFAULT_WEB_BASE,
  normalizeNairaTag,
  getCanonicalIdentifier,
  isNairaTag,
  parseNairaTags,
  extractNairaTags,
  replaceNairaTags
} from './parser.js';
