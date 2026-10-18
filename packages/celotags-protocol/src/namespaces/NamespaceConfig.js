/**
 * @file NamespaceConfig.js
 * @description Extensible Multi-Country Namespace Registry & Asset Boundary Engine.
 *
 * Implements CeloTags Master Prompt Section 5.3 & Local Currency Tags Layer:
 * - Dynamic, validated namespace configuration schema.
 * - Strict separation between Country (ISO 3166-1), Fiat Currency (ISO 4217), and Blockchain Assets.
 * - Token verification statuses: VERIFIED | UNVERIFIED | UNAVAILABLE.
 * - Never infers a token address from a currency ticker.
 */

/**
 * Token Verification Lifecycle Status
 */
export const ASSET_VERIFICATION_STATUS = {
  VERIFIED: 'VERIFIED',
  UNVERIFIED: 'UNVERIFIED',
  UNAVAILABLE: 'UNAVAILABLE'
};

/**
 * Namespace Lifecycle Status
 */
export const NAMESPACE_LIFECYCLE_STATUS = {
  ACTIVE: 'ACTIVE',
  PILOT: 'PILOT',
  DRAFT: 'DRAFT',
  DEPRECATED: 'DEPRECATED'
};

/**
 * Universal Reserved Identifiers across all namespaces.
 * Includes protocol infrastructure, role keywords, and country codes to prevent namespace collision.
 */
export const GLOBAL_RESERVED_HANDLES = new Set([
  'admin',
  'celo',
  'celotag',
  'celotags',
  'registry',
  'resolver',
  'system',
  'official',
  'protocol',
  'governance',
  'security',
  'escrow',
  'bounty',
  'bounties',
  'rewards',
  'support',
  'verify',
  'verified',
  'help',
  'root',
  'null',
  'undefined',
  'api',
  'app',
  'bot',
  'agent',
  // Reserved country codes to prevent confusion with sub-namespaces
  'ng',
  'gh',
  'ke',
  'za',
  'mx',
  'br',
  'rw',
  'ug',
  'tz',
  'eg'
]);

/**
 * Validates a namespace configuration object against schema rules.
 *
 * @param {Object} def
 * @returns {Object} Normalized namespace definition
 */
export function validateNamespaceDefinition(def) {
  if (!def || typeof def !== 'object') {
    throw new Error('Namespace definition must be an object');
  }

  const namespace = String(def.namespace || '').trim().toLowerCase();
  if (!/^[a-z]{2,3}$/.test(namespace)) {
    throw new Error(`Invalid namespace identifier: "${def.namespace}". Must be 2-3 lowercase ASCII letters.`);
  }

  const countryCode = String(def.countryCode || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    throw new Error(`Invalid countryCode: "${def.countryCode}". Must be ISO 3166-1 alpha-2.`);
  }

  const currencyCode = String(def.currencyCode || '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    throw new Error(`Invalid currencyCode: "${def.currencyCode}". Must be ISO 4217 3-letter code.`);
  }

  const symbol = String(def.symbol || '').trim();
  if (!symbol) {
    throw new Error('Namespace requires a display symbol (e.g. ₦, GH₵, KSh)');
  }

  const prefixSymbol = String(def.prefixSymbol || symbol).trim();
  const lifecycleStatus = def.lifecycleStatus && Object.values(NAMESPACE_LIFECYCLE_STATUS).includes(def.lifecycleStatus)
    ? def.lifecycleStatus
    : NAMESPACE_LIFECYCLE_STATUS.DRAFT;

  // Validate payment assets explicitly - never infer contract addresses
  const paymentAssets = {};
  if (def.paymentAssets && typeof def.paymentAssets === 'object') {
    for (const [key, asset] of Object.entries(def.paymentAssets)) {
      const assetKey = key.toUpperCase();
      const status = Object.values(ASSET_VERIFICATION_STATUS).includes(asset.verificationStatus)
        ? asset.verificationStatus
        : ASSET_VERIFICATION_STATUS.UNAVAILABLE;

      // If status is VERIFIED, address must be a valid EVM address
      const address = asset.address && /^0x[a-fA-F0-9]{40}$/.test(asset.address)
        ? asset.address.toLowerCase()
        : null;

      if (status === ASSET_VERIFICATION_STATUS.VERIFIED && !address) {
        throw new Error(`Cannot register asset "${key}" as VERIFIED without a valid contract address`);
      }

      paymentAssets[assetKey] = {
        chainId: Number(asset.chainId) || 42220,
        address: address,
        symbol: String(asset.symbol || key).toUpperCase(),
        decimals: Number(asset.decimals) || 18,
        verificationStatus: status,
        source: asset.source || 'unverified'
      };
    }
  }

  return {
    namespace,
    countryCode,
    countryName: def.countryName || countryCode,
    currencyCode,
    currencyName: def.currencyName || currencyCode,
    symbol,
    prefixSymbol,
    flag: def.flag || '🌐',
    isFlagship: Boolean(def.isFlagship),
    brandName: def.brandName || `${countryCode}Tags`,
    lifecycleStatus,
    minHandleLength: Number(def.minHandleLength) || 3,
    maxHandleLength: Number(def.maxHandleLength) || 32,
    allowedCharsRegex: def.allowedCharsRegex instanceof RegExp ? def.allowedCharsRegex : /^[a-z0-9_]+$/,
    paymentAssets,
    defaultChainId: Number(def.defaultChainId) || 42220,
    supportedChains: Array.isArray(def.supportedChains) ? def.supportedChains : ['celo']
  };
}

/**
 * Standard Verified Namespace Definitions.
 * Grounded in ISO 3166-1 (Country), ISO 4217 (Currency), and verified on-chain Celo contracts.
 */
export const INITIAL_NAMESPACES = {
  NG: validateNamespaceDefinition({
    namespace: 'ng',
    countryCode: 'NG',
    countryName: 'Nigeria',
    currencyCode: 'NGN',
    currencyName: 'Nigerian Naira',
    symbol: '₦',
    prefixSymbol: '₦',
    flag: '🇳🇬',
    isFlagship: true,
    brandName: 'NairaTag',
    lifecycleStatus: NAMESPACE_LIFECYCLE_STATUS.ACTIVE,
    minHandleLength: 3,
    maxHandleLength: 32,
    allowedCharsRegex: /^[a-z0-9_]+$/,
    defaultChainId: 42220,
    supportedChains: ['celo', 'celoSepolia'],
    paymentAssets: {
      cNGN: {
        chainId: 42220,
        address: '0xe2702bd97ee33c88c8f6f92da3b733608aa76f71',
        symbol: 'cNGN',
        decimals: 18,
        verificationStatus: ASSET_VERIFICATION_STATUS.VERIFIED,
        source: 'mento_celo_mainnet'
      },
      cNGN_Sepolia: {
        chainId: 11142220,
        address: '0x717C2f9C5FDE1f05489886326Ebe828a2b535B29',
        symbol: 'cNGN',
        decimals: 18,
        verificationStatus: ASSET_VERIFICATION_STATUS.VERIFIED,
        source: 'celo_sepolia_canonical'
      },
      cUSD: {
        chainId: 42220,
        address: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
        symbol: 'cUSD',
        decimals: 18,
        verificationStatus: ASSET_VERIFICATION_STATUS.VERIFIED,
        source: 'mento_celo_mainnet_settlement'
      }
    }
  }),
  GH: validateNamespaceDefinition({
    namespace: 'gh',
    countryCode: 'GH',
    countryName: 'Ghana',
    currencyCode: 'GHS',
    currencyName: 'Ghanaian Cedi',
    symbol: 'GH₵',
    prefixSymbol: 'GH₵',
    flag: '🇬🇭',
    isFlagship: false,
    brandName: 'GhanaTags',
    lifecycleStatus: NAMESPACE_LIFECYCLE_STATUS.PILOT,
    minHandleLength: 3,
    maxHandleLength: 32,
    allowedCharsRegex: /^[a-z0-9_]+$/,
    defaultChainId: 42220,
    supportedChains: ['celo'],
    paymentAssets: {
      cGHS: {
        chainId: 42220,
        address: null,
        symbol: 'cGHS',
        decimals: 18,
        verificationStatus: ASSET_VERIFICATION_STATUS.UNAVAILABLE,
        source: 'no_native_mento_deployment_yet'
      },
      cUSD: {
        chainId: 42220,
        address: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
        symbol: 'cUSD',
        decimals: 18,
        verificationStatus: ASSET_VERIFICATION_STATUS.VERIFIED,
        source: 'mento_celo_mainnet_settlement'
      }
    }
  }),
  KE: validateNamespaceDefinition({
    namespace: 'ke',
    countryCode: 'KE',
    countryName: 'Kenya',
    currencyCode: 'KES',
    currencyName: 'Kenyan Shilling',
    symbol: 'KSh',
    prefixSymbol: 'KSh·',
    flag: '🇰🇪',
    isFlagship: false,
    brandName: 'KenyaTags',
    lifecycleStatus: NAMESPACE_LIFECYCLE_STATUS.PILOT,
    minHandleLength: 3,
    maxHandleLength: 32,
    allowedCharsRegex: /^[a-z0-9_]+$/,
    defaultChainId: 42220,
    supportedChains: ['celo'],
    paymentAssets: {
      cKES: {
        chainId: 42220,
        address: null,
        symbol: 'cKES',
        decimals: 18,
        verificationStatus: ASSET_VERIFICATION_STATUS.UNAVAILABLE,
        source: 'no_verified_mainnet_deployment'
      },
      cUSD: {
        chainId: 42220,
        address: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
        symbol: 'cUSD',
        decimals: 18,
        verificationStatus: ASSET_VERIFICATION_STATUS.VERIFIED,
        source: 'mento_celo_mainnet_settlement'
      }
    }
  }),
  ZA: validateNamespaceDefinition({
    namespace: 'za',
    countryCode: 'ZA',
    countryName: 'South Africa',
    currencyCode: 'ZAR',
    currencyName: 'South African Rand',
    symbol: 'R',
    prefixSymbol: 'R·',
    flag: '🇿🇦',
    isFlagship: false,
    brandName: 'SouthAfricaTags',
    lifecycleStatus: NAMESPACE_LIFECYCLE_STATUS.DRAFT,
    minHandleLength: 3,
    maxHandleLength: 32,
    allowedCharsRegex: /^[a-z0-9_]+$/,
    defaultChainId: 42220,
    supportedChains: ['celo'],
    paymentAssets: {
      cZAR: {
        chainId: 42220,
        address: null,
        symbol: 'cZAR',
        decimals: 18,
        verificationStatus: ASSET_VERIFICATION_STATUS.UNAVAILABLE,
        source: 'no_verified_mainnet_deployment'
      },
      cUSD: {
        chainId: 42220,
        address: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
        symbol: 'cUSD',
        decimals: 18,
        verificationStatus: ASSET_VERIFICATION_STATUS.VERIFIED,
        source: 'mento_celo_mainnet_settlement'
      }
    }
  }),
  MX: validateNamespaceDefinition({
    namespace: 'mx',
    countryCode: 'MX',
    countryName: 'Mexico',
    currencyCode: 'MXN',
    currencyName: 'Mexican Peso',
    symbol: 'MX$',
    prefixSymbol: 'MX$',
    flag: '🇲🇽',
    isFlagship: false,
    brandName: 'MexicoTags',
    lifecycleStatus: NAMESPACE_LIFECYCLE_STATUS.DRAFT,
    minHandleLength: 3,
    maxHandleLength: 32,
    allowedCharsRegex: /^[a-z0-9_]+$/,
    defaultChainId: 42220,
    supportedChains: ['celo'],
    paymentAssets: {
      // NOTE: cREAL is Mento Brazilian Real (BRL), NOT Mexican Peso!
      // cMXN does not exist on Celo Mainnet and is marked UNAVAILABLE.
      cMXN: {
        chainId: 42220,
        address: null,
        symbol: 'cMXN',
        decimals: 18,
        verificationStatus: ASSET_VERIFICATION_STATUS.UNAVAILABLE,
        source: 'no_verified_mainnet_deployment'
      },
      cUSD: {
        chainId: 42220,
        address: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
        symbol: 'cUSD',
        decimals: 18,
        verificationStatus: ASSET_VERIFICATION_STATUS.VERIFIED,
        source: 'mento_celo_mainnet_settlement'
      }
    }
  }),
  BR: validateNamespaceDefinition({
    namespace: 'br',
    countryCode: 'BR',
    countryName: 'Brazil',
    currencyCode: 'BRL',
    currencyName: 'Brazilian Real',
    symbol: 'R$',
    prefixSymbol: 'R$',
    flag: '🇧🇷',
    isFlagship: false,
    brandName: 'BrazilTags',
    lifecycleStatus: NAMESPACE_LIFECYCLE_STATUS.DRAFT,
    minHandleLength: 3,
    maxHandleLength: 32,
    allowedCharsRegex: /^[a-z0-9_]+$/,
    defaultChainId: 42220,
    supportedChains: ['celo'],
    paymentAssets: {
      // cREAL is the verified Mento Brazilian Real on Celo Mainnet
      cREAL: {
        chainId: 42220,
        address: '0xe8537a3d056da446677b9e9d6c5db704eaab4787',
        symbol: 'cREAL',
        decimals: 18,
        verificationStatus: ASSET_VERIFICATION_STATUS.VERIFIED,
        source: 'mento_celo_mainnet'
      },
      cUSD: {
        chainId: 42220,
        address: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
        symbol: 'cUSD',
        decimals: 18,
        verificationStatus: ASSET_VERIFICATION_STATUS.VERIFIED,
        source: 'mento_celo_mainnet_settlement'
      }
    }
  })
};

/**
 * Extensible Namespace Registry.
 * Allows applications to query, register, and manage country namespaces dynamically.
 */
export class NamespaceRegistry {
  constructor(initialNamespaces = INITIAL_NAMESPACES) {
    this._namespaces = new Map();
    for (const [key, def] of Object.entries(initialNamespaces)) {
      this.registerNamespace(def);
    }
  }

  /**
   * Registers or updates a validated country namespace.
   *
   * @param {Object} def
   * @returns {Object} Validated definition
   */
  registerNamespace(def) {
    const validated = validateNamespaceDefinition(def);
    this._namespaces.set(validated.namespace, validated);
    this._namespaces.set(validated.countryCode, validated);
    return validated;
  }

  /**
   * Resolves namespace configuration from namespace key, country code, or display symbol.
   * STRICT and unambiguous matching - never performs arbitrary prefix substring matching.
   *
   * @param {string} input - e.g. "ng", "NG", "₦", "gh", "GH₵", "NGN"
   * @returns {Object|null}
   */
  getNamespace(input) {
    if (!input) return null;
    const raw = String(input).trim();
    const upper = raw.toUpperCase();
    const lower = raw.toLowerCase();

    // 1. Direct match by country code or namespace key
    if (this._namespaces.has(lower)) return this._namespaces.get(lower);
    if (this._namespaces.has(upper)) return this._namespaces.get(upper);

    // 2. Exact match on ISO 4217 currencyCode
    for (const conf of this.listNamespaces()) {
      if (upper === conf.currencyCode) {
        return conf;
      }
    }

    // 3. Exact match on symbol or prefixSymbol
    for (const conf of this.listNamespaces()) {
      if (raw === conf.symbol || raw === conf.prefixSymbol || upper === conf.symbol.toUpperCase() || upper === conf.prefixSymbol.toUpperCase()) {
        return conf;
      }
    }

    return null;
  }

  /**
   * Retrieves a specific payment asset configuration from a namespace.
   * Returns null if not found or asset is UNAVAILABLE. Never guesses an address.
   *
   * @param {string} namespaceInput
   * @param {string} assetSymbol
   * @returns {Object|null}
   */
  getPaymentAsset(namespaceInput, assetSymbol) {
    const ns = this.getNamespace(namespaceInput);
    if (!ns || !ns.paymentAssets) return null;
    const assetKey = String(assetSymbol).trim().toUpperCase();
    const asset = ns.paymentAssets[assetKey];
    if (!asset) return null;
    return asset;
  }

  /**
   * Returns a deduplicated list of all registered country namespaces.
   *
   * @returns {Array<Object>}
   */
  listNamespaces() {
    const seen = new Set();
    const list = [];
    for (const conf of this._namespaces.values()) {
      if (!seen.has(conf.namespace)) {
        seen.add(conf.namespace);
        list.push(conf);
      }
    }
    return list;
  }
}

/**
 * Global default instance
 */
export const defaultNamespaceRegistry = new NamespaceRegistry();

/**
 * Compatibility helper exports
 */
export const SUPPORTED_NAMESPACES = INITIAL_NAMESPACES;

export function getNamespaceConfig(input) {
  return defaultNamespaceRegistry.getNamespace(input);
}
