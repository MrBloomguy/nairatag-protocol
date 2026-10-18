/**
 * @file CanonicalIdentifier.js
 * @description Universal Parser, Anti-Spoofing Normalizer, and Formatter for CeloTags.
 *
 * Implements CeloTags Master Prompt Section 5.3 & Engineering Hardening:
 * - Anti-homoglyph Unicode NFKC normalization.
 * - Explicit rejection of invisible, zero-width, and bidirectional control characters.
 * - Strict character set enforcement: [a-z0-9_] (no mixed scripts / Cyrillic confusable bypass).
 * - Stable canonical identifiers independent of display symbol changes.
 * - Strict separation between Canonical Identity (URN / Scoped) and Display Presentation.
 */

import {
  defaultNamespaceRegistry,
  GLOBAL_RESERVED_HANDLES
} from './NamespaceConfig.js';

// Comprehensive regex detecting invisible characters, zero-width spaces, bidi overrides, soft hyphens, and joining controls
const INVISIBLE_CONTROL_REGEX = /[\u00AD\u034F\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF]/u;

export class CanonicalIdentifier {
  /**
   * @param {Object} params
   * @param {string} params.namespace - Canonical namespace identifier (e.g. "ng", "gh")
   * @param {string} params.handle - Lowercase normalized handle (e.g. "segun")
   * @param {Object} [params.registry] - Optional custom NamespaceRegistry instance
   */
  constructor({ namespace, handle, registry = defaultNamespaceRegistry }) {
    const config = registry.getNamespace(namespace);
    if (!config) {
      throw new Error(`Unsupported CeloTags namespace: "${namespace}"`);
    }

    this.namespace = config.namespace;
    this.countryCode = config.countryCode;
    this.currencyCode = config.currencyCode;
    this.handle = handle;
    this.urn = `urn:celotag:${this.namespace}:${this.handle}`;
    this.scoped = `@${this.namespace}:${this.handle}`;
    this.display = `${config.prefixSymbol}${this.handle.toUpperCase()}`;
    this.config = config;
  }

  /**
   * Parses arbitrary user input into a validated CanonicalIdentifier instance.
   *
   * Accepts:
   * - "₦SEGUN" -> { namespace: 'ng', handle: 'segun' }
   * - "GH₵AMA" -> { namespace: 'gh', handle: 'ama' }
   * - "KSh·WANGARI" -> { namespace: 'ke', handle: 'wangari' }
   * - "R·KAGISO" -> { namespace: 'za', handle: 'kagiso' }
   * - "R$PEDRO" -> { namespace: 'br', handle: 'pedro' }
   * - "@ng:segun" -> { namespace: 'ng', handle: 'segun' }
   * - "urn:celotag:ng:segun" -> { namespace: 'ng', handle: 'segun' }
   * - "segun" (defaults to defaultNamespace)
   *
   * Rejects:
   * - Invisible / zero-width characters (homoglyph spoofing)
   * - Cyrillic / mixed script substitutes
   * - Consecutive or boundary underscores
   * - Reserved handles and country codes
   * - Unregistered currency symbols
   *
   * @param {string} rawInput
   * @param {string} [defaultNamespace='ng']
   * @param {Object} [registry=defaultNamespaceRegistry]
   * @returns {CanonicalIdentifier}
   */
  static parse(rawInput, defaultNamespace = 'ng', registry = defaultNamespaceRegistry) {
    if (!rawInput || typeof rawInput !== 'string') {
      throw new Error('CeloTags input must be a non-empty string');
    }

    // 1. Security Check: Reject invisible, zero-width, or bidirectional override characters
    if (INVISIBLE_CONTROL_REGEX.test(rawInput)) {
      throw new Error('CeloTags identifier contains disallowed invisible or directional control characters (spoofing protection).');
    }

    // 2. Unicode NFKC Normalization to normalize full-width and compatibility characters
    let str = rawInput.normalize('NFKC').trim();

    // 3. Check for URN format: urn:celotag:<namespace>:<handle>
    const urnMatch = str.match(/^urn:celotag:([a-z]{2,3}):([a-z0-9_]+)$/i);
    if (urnMatch) {
      const ns = urnMatch[1].toLowerCase();
      const h = CanonicalIdentifier.normalizeHandle(urnMatch[2], ns, registry);
      return new CanonicalIdentifier({ namespace: ns, handle: h, registry });
    }

    // 4. Check for Scoped format: @<namespace>:<handle>
    const scopedMatch = str.match(/^@([a-z]{2,3}):([a-z0-9_]+)$/i);
    if (scopedMatch) {
      const ns = scopedMatch[1].toLowerCase();
      const h = CanonicalIdentifier.normalizeHandle(scopedMatch[2], ns, registry);
      return new CanonicalIdentifier({ namespace: ns, handle: h, registry });
    }

    // 5. Check for registered currency prefix symbols
    // Sort all prefix candidates by length descending to match longest first (e.g. 'KSh·' before 'K', 'R$' before 'R')
    const prefixCandidates = [];
    for (const conf of registry.listNamespaces()) {
      if (conf.prefixSymbol) {
        prefixCandidates.push({ prefix: conf.prefixSymbol, conf, isAsciiAlpha: /^[A-Za-z]+$/.test(conf.prefixSymbol) });
      }
      if (conf.symbol && conf.symbol !== conf.prefixSymbol) {
        prefixCandidates.push({ prefix: conf.symbol, conf, isAsciiAlpha: /^[A-Za-z]+$/.test(conf.symbol) });
      }
    }
    prefixCandidates.sort((a, b) => b.prefix.length - a.prefix.length);

    for (const { prefix, conf, isAsciiAlpha } of prefixCandidates) {
      if (str.startsWith(prefix)) {
        const afterPrefix = str.slice(prefix.length);
        const trimmedRemaining = afterPrefix.replace(/^[·:\s]+/, '');

        // If prefix is purely ASCII letters (e.g. South African 'R'), require a separator to avoid matching regular words
        if (isAsciiAlpha && afterPrefix === trimmedRemaining && !/^[·:\s]/.test(afterPrefix)) {
          continue;
        }

        if (trimmedRemaining) {
          const h = CanonicalIdentifier.normalizeHandle(trimmedRemaining, conf.namespace, registry);
          return new CanonicalIdentifier({ namespace: conf.namespace, handle: h, registry });
        }
      }
    }

    // 6. Security Check: If input starts with an unrecognized currency symbol, do not silently default
    const UNRECOGNIZED_SYMBOL_REGEX = /^[\p{Sc}\p{Sk}]/u;
    if (UNRECOGNIZED_SYMBOL_REGEX.test(str)) {
      throw new Error(`Unrecognized or unsupported currency symbol prefix in identifier: "${str}". Explicit namespace required.`);
    }

    // 7. Check for @handle format (without namespace), fallback to defaultNamespace
    if (str.startsWith('@')) {
      str = str.slice(1);
    }

    // 8. Plain handle with default namespace
    const defaultConf = registry.getNamespace(defaultNamespace);
    if (!defaultConf) {
      throw new Error(`Default namespace "${defaultNamespace}" is not configured in registry.`);
    }

    const h = CanonicalIdentifier.normalizeHandle(str, defaultConf.namespace, registry);
    return new CanonicalIdentifier({ namespace: defaultConf.namespace, handle: h, registry });
  }

  /**
   * Normalizes and validates handle characters, length, and anti-squatting rules.
   *
   * @param {string} rawHandle
   * @param {string} namespace
   * @param {Object} [registry=defaultNamespaceRegistry]
   * @returns {string}
   */
  static normalizeHandle(rawHandle, namespace = 'ng', registry = defaultNamespaceRegistry) {
    const config = registry.getNamespace(namespace);
    if (!config) {
      throw new Error(`Cannot normalize handle: namespace "${namespace}" is not registered.`);
    }

    // Reject invisible characters in handle component
    if (INVISIBLE_CONTROL_REGEX.test(rawHandle)) {
      throw new Error('CeloTags handle contains disallowed invisible control characters.');
    }

    const clean = String(rawHandle || '').trim().toLowerCase();

    if (!clean) {
      throw new Error('CeloTags handle cannot be empty');
    }

    if (GLOBAL_RESERVED_HANDLES.has(clean)) {
      throw new Error(`CeloTags handle "${clean}" is a protected protocol reserved identifier.`);
    }

    if (clean.length < config.minHandleLength || clean.length > config.maxHandleLength) {
      throw new Error(
        `CeloTags handle length must be between ${config.minHandleLength} and ${config.maxHandleLength} characters. Received: "${clean}" (${clean.length})`
      );
    }

    // Strict regex validation ensures only [a-z0-9_] is accepted, blocking Cyrillic/Greek homoglyphs
    if (!config.allowedCharsRegex.test(clean)) {
      const isNonAscii = /[^\x00-\x7F]/.test(clean);
      const detail = isNonAscii ? ' (detected non-ASCII / confusable homoglyph)' : '';
      throw new Error(`CeloTags handle contains invalid characters. Only [a-z0-9_] allowed${detail}. Received: "${clean}"`);
    }

    if (clean.startsWith('_') || clean.endsWith('_')) {
      throw new Error(`CeloTags handle cannot start or end with an underscore: "${clean}"`);
    }

    if (clean.includes('__')) {
      throw new Error(`CeloTags handle cannot contain consecutive underscores: "${clean}"`);
    }

    return clean;
  }

  /**
   * Detects visual confusable / homoglyph collision between two handle candidates.
   *
   * @param {string} handleA
   * @param {string} handleB
   * @returns {boolean} True if handles resolve to the same canonical representation
   */
  static areConfusable(handleA, handleB) {
    try {
      const normA = handleA.normalize('NFKC').toLowerCase().replace(/[^a-z0-9]/g, '');
      const normB = handleB.normalize('NFKC').toLowerCase().replace(/[^a-z0-9]/g, '');
      return normA === normB;
    } catch {
      return false;
    }
  }

  toUrn() {
    return this.urn;
  }

  toScoped() {
    return this.scoped;
  }

  toDisplay(customPrefix = null) {
    const prefix = customPrefix !== null ? customPrefix : this.config.prefixSymbol;
    return `${prefix}${this.handle.toUpperCase()}`;
  }

  equals(other) {
    if (!other) return false;
    if (other instanceof CanonicalIdentifier) {
      return this.urn === other.urn;
    }
    try {
      const parsed = CanonicalIdentifier.parse(String(other));
      return this.urn === parsed.urn;
    } catch {
      return false;
    }
  }

  /**
   * Returns JSON-serializable representation of the identifier.
   */
  toJSON() {
    return {
      urn: this.urn,
      scoped: this.scoped,
      display: this.display,
      namespace: this.namespace,
      countryCode: this.countryCode,
      currencyCode: this.currencyCode,
      handle: this.handle
    };
  }
}
