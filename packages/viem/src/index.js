/**
 * @file index.js
 * @package @nairatag/viem
 * @description Viem adapter and resolution plugin for NairaTag Identity Protocol (NTS-100 / NTS-101).
 *
 * Adheres to:
 * - EIP-137 / ENSIP-1 (addr(bytes32))
 * - EIP-165 (supportsInterface)
 * - EIP-181 / ENSIP-3 (name(bytes32))
 * - EIP-2304 / ENSIP-9 (addr(bytes32, uint256))
 * - EIP-634 / ENSIP-5 (text(bytes32, string))
 * - EIP-55 (getAddress checksumming)
 * - NTS-100 (Normalization, mutual anti-spoofing)
 * - NTS-101 (Discovery and input classification)
 */

const {
  createPublicClient,
  http,
  defineChain,
  keccak256,
  stringToBytes,
  toBytes,
  concat,
  getAddress,
  isAddress,
  zeroAddress,
} = require('viem');

/**
 * Canonical reverse namespace hash: keccak256("nairatag.reverse")
 */
const REVERSE_NAMESPACE_BYTES = toBytes('0x11df080ac2434bfc6a41d7d54fdf1d3347cecce959d86d43a9b12ef7364dc224');

/**
 * Viem Chain Definition for TagProtocol Devnet
 */
const nairatagDevnet = defineChain({
  id: 901,
  name: 'TagProtocol Devnet',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:9545', 'https://rpc.nairatag.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'NairaTagScan',
      url: 'https://scan.nairatag.org',
    },
  },
});

/**
 * Canonical default discovery configuration
 */
const DEFAULT_DISCOVERY = {
  chainId: 901,
  rpcUrl: 'http://127.0.0.1:9545',
  registryAddress: '0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82',
  resolverAddress: '0x9A676e781A523b5d0C0e43731313A708CB607508',
};

/**
 * Minimal ABIs for Registry & Resolver
 */
const REGISTRY_ABI = [
  {
    type: 'function',
    name: 'owner',
    stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'resolver',
    stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'resolve',
    stateMutability: 'view',
    inputs: [{ name: 'tag', type: 'string' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'exists',
    stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
  },
];

const RESOLVER_ABI = [
  {
    type: 'function',
    name: 'addr',
    stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'addr',
    stateMutability: 'view',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'coinType', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bytes' }],
  },
  {
    type: 'function',
    name: 'name',
    stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'text',
    stateMutability: 'view',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'key', type: 'string' },
    ],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'paymentEndpoint',
    stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'string' }],
  },
];

/**
 * Classifies an incoming address bar / recipient input string (NTS-101).
 * @param {string} input
 * @returns {'evm_address' | 'ens' | 'nairatag' | 'invalid'}
 */
function classifyRecipientInput(input) {
  if (!input || typeof input !== 'string') return 'invalid';
  const trimmed = input.trim();
  if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) return 'evm_address';
  if (/\.(eth|xyz|kred|luxe)$/i.test(trimmed)) return 'ens';
  if (/^(?:₦|ng:)[a-z0-9_]{3,32}$/i.test(trimmed)) return 'nairatag';
  return 'invalid';
}

/**
 * Checks whether an input string is a valid NairaTag candidate.
 * @param {string} name
 * @returns {boolean}
 */
function isNairaTag(name) {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  return /^(?:₦|ng:)[a-z0-9_]{3,32}$/i.test(trimmed) || /^[a-z0-9_]{3,32}$/i.test(trimmed);
}

/**
 * Normalizes a raw NairaTag handle into its canonical machine identifier (NTS-100).
 * @param {string} rawTag
 * @returns {string} Canonical label (e.g. "micheal")
 */
function normalizeTag(rawTag) {
  if (!rawTag || typeof rawTag !== 'string') {
    throw new Error('Invalid tag: input must be a non-empty string');
  }

  let clean = rawTag.trim();

  // Strict rejection of '@'
  if (clean.includes('@')) {
    throw new Error("Invalid tag character: '@' is prohibited in NairaTag handles");
  }

  // Strip leading '₦' (U+20A6) or 'ng:'
  if (clean.startsWith('₦')) {
    clean = clean.slice(1);
  } else if (clean.startsWith('ng:') || clean.startsWith('NG:')) {
    clean = clean.slice(3);
  }

  const canonical = clean.toLowerCase();
  const len = canonical.length;

  if (len < 3 || len > 32) {
    throw new Error(`Invalid tag length: expected 3-32 characters, got ${len}`);
  }

  if (!/^[a-z0-9_]+$/.test(canonical)) {
    throw new Error(`Invalid tag format: '${canonical}' contains forbidden characters`);
  }

  if (canonical.startsWith('_') || canonical.endsWith('_')) {
    throw new Error(`Invalid tag format: '${canonical}' cannot start or end with an underscore`);
  }

  if (canonical.includes('__')) {
    throw new Error(`Invalid tag format: '${canonical}' cannot contain consecutive underscores ('__')`);
  }

  return canonical;
}

/**
 * Formats a canonical or raw tag into its canonical display string.
 * @param {string} rawTag
 * @returns {string} e.g. "₦micheal"
 */
function formatDisplayTag(rawTag) {
  const canonical = normalizeTag(rawTag);
  return `₦${canonical}`;
}

/**
 * Computes 32-byte node hash for a NairaTag.
 * @param {string} rawTag
 * @returns {`0x${string}`}
 */
function namehash(rawTag) {
  const canonical = normalizeTag(rawTag);
  return keccak256(stringToBytes(canonical));
}

/**
 * Computes reverse resolution node hash for an address according to NTS-100.
 * reverseNode = keccak256(keccak256("nairatag.reverse") + rawAddressBytes)
 * @param {`0x${string}`} address
 * @returns {`0x${string}`}
 */
function reverseNode(address) {
  if (!isAddress(address)) {
    throw new Error(`Invalid address for reverseNode: ${address}`);
  }
  const cleanAddr = address.toLowerCase();
  const addrBytes = toBytes(cleanAddr);
  return keccak256(concat([REVERSE_NAMESPACE_BYTES, addrBytes]));
}

/**
 * Creates a dedicated NairaTag resolution adapter for Viem.
 *
 * CRITICAL ARCHITECTURAL GUARANTEE:
 * Resolution RPC != Transaction RPC.
 * This client executes read-only eth_calls against Chain 901 without
 * affecting the user's active wallet connection or transaction network.
 *
 * @param {Object} [config]
 * @param {string} [config.rpcUrl]
 * @param {`0x${string}`} [config.registryAddress]
 * @param {`0x${string}`} [config.resolverAddress]
 * @param {import('viem').PublicClient} [config.client]
 */
function createNairaTagResolver(config = {}) {
  const rpcUrl = config.rpcUrl || DEFAULT_DISCOVERY.rpcUrl;
  const registryAddress = config.registryAddress ? getAddress(config.registryAddress) : DEFAULT_DISCOVERY.registryAddress;
  const resolverAddress = config.resolverAddress ? getAddress(config.resolverAddress) : DEFAULT_DISCOVERY.resolverAddress;

  // Use provided public client or initialize a dedicated read-only client
  const client = config.client || createPublicClient({
    chain: nairatagDevnet,
    transport: http(rpcUrl),
  });

  return {
    client,
    chainId: DEFAULT_DISCOVERY.chainId,
    registryAddress,
    resolverAddress,

    /**
     * Syntactic classifier
     */
    classifyInput: classifyRecipientInput,
    isNairaTag,
    normalize: normalizeTag,
    formatDisplay: formatDisplayTag,
    namehash,
    reverseNode,

    /**
     * Resolves a NairaTag handle to an EIP-55 checksummed EVM address.
     * @param {string} name - e.g. "₦micheal" or "micheal"
     * @param {Object} [options]
     * @param {number} [options.coinType] - EIP-2304 / SLIP-0044 coin type (default: 60)
     * @returns {Promise<`0x${string}` | null>}
     */
    async resolveName(name, options = {}) {
      try {
        const canonical = normalizeTag(name);
        const node = namehash(canonical);

        // Multicoin resolution if requested and not coinType 60
        if (options.coinType !== undefined && options.coinType !== 60) {
          const rawBytes = await client.readContract({
            address: resolverAddress,
            abi: RESOLVER_ABI,
            functionName: 'addr',
            args: [node, BigInt(options.coinType)],
          });
          if (!rawBytes || rawBytes === '0x') return null;
          return rawBytes;
        }

        // Standard EVM resolution (EIP-137 / ENSIP-1)
        const resolved = await client.readContract({
          address: resolverAddress,
          abi: RESOLVER_ABI,
          functionName: 'addr',
          args: [node],
        });

        if (!resolved || resolved === zeroAddress) {
          return null;
        }

        // Return EIP-55 checksummed address
        return getAddress(resolved);
      } catch (err) {
        return null;
      }
    },

    /**
     * Resolves an address to its canonical display handle using the
     * MANDATORY MUTUAL ANTI-SPOOFING RULE (NTS-100 / NTS-101).
     *
     * 1. Query reverse record: resolver.name(reverseNode(address))
     * 2. Cross-verify forward record: resolver.addr(namehash(claimedHandle))
     * 3. Return claimedHandle ONLY if forward === inspectedAddress.
     *
     * @param {`0x${string}`} address
     * @returns {Promise<string | null>} Verified handle (e.g. "₦micheal") or null
     */
    async lookupAddress(address) {
      if (!isAddress(address)) return null;
      const targetAddress = getAddress(address);

      try {
        const rNode = reverseNode(targetAddress);
        const claimedName = await client.readContract({
          address: resolverAddress,
          abi: RESOLVER_ABI,
          functionName: 'name',
          args: [rNode],
        });

        if (!claimedName || typeof claimedName !== 'string' || claimedName.trim() === '') {
          return null;
        }

        // Mutual Cross-Verification: Forward check
        const canonical = normalizeTag(claimedName);
        const fNode = namehash(canonical);
        const forwardAddress = await client.readContract({
          address: resolverAddress,
          abi: RESOLVER_ABI,
          functionName: 'addr',
          args: [fNode],
        });

        if (!forwardAddress || forwardAddress === zeroAddress) {
          return null;
        }

        if (getAddress(forwardAddress) !== targetAddress) {
          // Anti-spoofing alert: Claimed reverse handle points to a different address!
          return null;
        }

        return formatDisplayTag(canonical);
      } catch (err) {
        return null;
      }
    },

    /**
     * Retrieves a text record (EIP-634 / ENSIP-5).
     * @param {string} name
     * @param {string} key - e.g. "avatar", "email", "url"
     * @returns {Promise<string | null>}
     */
    async getTextRecord(name, key) {
      try {
        const node = namehash(name);
        const val = await client.readContract({
          address: resolverAddress,
          abi: RESOLVER_ABI,
          functionName: 'text',
          args: [node, key],
        });
        return val || null;
      } catch (err) {
        return null;
      }
    },

    /**
     * Retrieves a NairaTag-specific payment endpoint URI / webhook.
     * @param {string} name
     * @returns {Promise<string | null>}
     */
    async getPaymentEndpoint(name) {
      try {
        const node = namehash(name);
        const endpoint = await client.readContract({
          address: resolverAddress,
          abi: RESOLVER_ABI,
          functionName: 'paymentEndpoint',
          args: [node],
        });
        return endpoint || null;
      } catch (err) {
        return null;
      }
    },

    /**
     * Retrieves the owner address from NairaTagRegistry.
     * @param {string} name
     * @returns {Promise<`0x${string}` | null>}
     */
    async getOwner(name) {
      try {
        const node = namehash(name);
        const owner = await client.readContract({
          address: registryAddress,
          abi: REGISTRY_ABI,
          functionName: 'owner',
          args: [node],
        });
        if (!owner || owner === zeroAddress) return null;
        return getAddress(owner);
      } catch (err) {
        return null;
      }
    },

    /**
     * Resolves full canonical visual identity and protocol capabilities (NTS-102 / V4).
     * @param {string} name - e.g. "₦michael"
     * @param {Object} [options]
     * @param {string} [options.apiBase] - API base URL
     * @returns {Promise<Object>}
     */
    async resolveNairaTag(name, options = {}) {
      const canonical = normalizeTag(name);
      const apiBase = options.apiBase || 'http://127.0.0.1:8787';

      let forwardAddress = null;
      try {
        forwardAddress = await this.resolveAddress(canonical);
      } catch {}

      try {
        const res = await fetch(`${apiBase}/api/resolver/resolve-tag?tag=${encodeURIComponent(canonical)}`);
        if (res.ok) {
          const json = await res.json();
          if (json && (json.resolved || json.avatar)) {
            return {
              tag: `₦${canonical}`,
              canonicalTag: canonical,
              address: forwardAddress || json.walletAddress,
              avatar: json.avatar,
              agent: json.agent,
              phoneVerified: json.phoneVerified,
              identityVerified: json.identityVerified,
              verificationBadge: json.verificationBadge,
              capabilities: json.capabilities
            };
          }
        }
      } catch {}

      return {
        tag: `₦${canonical}`,
        canonicalTag: canonical,
        address: forwardAddress,
        avatar: {
          id: `av_seed_${canonical}`,
          version: 1,
          type: 'pixel',
          source: 'deterministic',
          uri: `${apiBase}/api/avatar/render/${canonical}/64.svg`,
          sizes: {
            '32': `${apiBase}/api/avatar/render/${canonical}/32.svg`,
            '64': `${apiBase}/api/avatar/render/${canonical}/64.svg`,
            '128': `${apiBase}/api/avatar/render/${canonical}/128.svg`,
            '256': `${apiBase}/api/avatar/render/${canonical}/256.svg`
          }
        },
        agent: {
          name: `${canonical.charAt(0).toUpperCase() + canonical.slice(1)} Agent`,
          handle: `agenttag://${canonical}`,
          avatar: `${apiBase}/api/avatar/render/${canonical}/128.svg?agent=1`,
          status: 'active'
        },
        phoneVerified: false,
        identityVerified: false,
        verificationBadge: null,
        capabilities: ['p2p_payment', 'chowdeck_food_ordering', 'chowdeck_relay_delivery', 'ojalm_commerce']
      };
    },
  };
}

/**
 * Validates a discovery manifest against NTS-102 security invariants.
 *
 * @param {Object} manifest - Parsed NTS-102 manifest object
 * @param {Object} [options]
 * @param {boolean} [options.allowLocalhost=false] - Whether to allow http://127.0.0.1 during local dev
 * @returns {boolean} True if valid
 * @throws {Error} If any validation check fails
 */
function validateDiscoveryManifest(manifest, options = {}) {
  const { allowLocalhost = false } = options;
  if (!manifest || typeof manifest !== 'object') {
    throw new Error('Invalid manifest: Expected an object');
  }
  if (manifest.protocol !== 'NTS-100') {
    throw new Error(`Unsupported protocol: ${manifest.protocol}, expected NTS-100`);
  }
  if (manifest.discoveryVersion !== 'NTS-102') {
    throw new Error(`Unsupported discoveryVersion: ${manifest.discoveryVersion}, expected NTS-102`);
  }
  if (!manifest.network || typeof manifest.network.chainId !== 'number') {
    throw new Error('Invalid manifest: network.chainId must be a number');
  }
  if (!manifest.resolution || typeof manifest.resolution !== 'object') {
    throw new Error('Invalid manifest: Missing resolution object');
  }

  const { rpcUrls, registryAddress, resolverAddress } = manifest.resolution;
  if (!Array.isArray(rpcUrls) || rpcUrls.length === 0) {
    throw new Error('Invalid manifest: resolution.rpcUrls must be a non-empty array');
  }

  for (const url of rpcUrls) {
    const isLocal =
      url.startsWith('http://127.0.0.1') ||
      url.startsWith('http://localhost') ||
      url.startsWith('https://127.0.0.1') ||
      url.startsWith('https://localhost');

    if (!allowLocalhost && isLocal) {
      throw new Error(`Localhost RPC URL prohibited in production NTS-102 manifest: ${url}`);
    }
    if (!url.startsWith('https://')) {
      if (!allowLocalhost || !isLocal) {
        throw new Error(`Insecure RPC URL prohibited by NTS-102: ${url} (must use HTTPS)`);
      }
    }
  }

  if (!isAddress(registryAddress)) {
    throw new Error(`Invalid registryAddress: ${registryAddress}`);
  }
  if (getAddress(registryAddress) !== registryAddress) {
    throw new Error(`registryAddress is not EIP-55 checksummed: ${registryAddress}`);
  }

  if (!isAddress(resolverAddress)) {
    throw new Error(`Invalid resolverAddress: ${resolverAddress}`);
  }
  if (getAddress(resolverAddress) !== resolverAddress) {
    throw new Error(`resolverAddress is not EIP-55 checksummed: ${resolverAddress}`);
  }

  return true;
}

/**
 * Standalone convenience resolver for viem applications
 */
async function resolveNairaTag(name, config = {}) {
  const resolver = createNairaTagResolver(config);
  return resolver.resolveNairaTag(name, config);
}

module.exports = {
  createNairaTagResolver,
  resolveNairaTag,
  classifyRecipientInput,
  isNairaTag,
  normalizeTag,
  formatDisplayTag,
  namehash,
  reverseNode,
  validateDiscoveryManifest,
  nairatagDevnet,
  DEFAULT_DISCOVERY,
  REGISTRY_ABI,
  RESOLVER_ABI,
};
