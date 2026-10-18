/**
 * @file index.js
 * @description Official NairaTag Identity Protocol Client SDK (NTS-100 Compliant)
 * Implements EIP-137, EIP-181, EIP-2304, EIP-634, EIP-55, and mutual anti-spoofing verification.
 */

const { keccak256 } = require('js-sha3');

const REVERSE_NAMESPACE_HEX = '11df080ac2434bfc6a41d7d54fdf1d3347cecce959d86d43a9b12ef7364dc224';

/**
 * Normalizes a raw NairaTag into its canonical alphanumeric label according to NTS-100.
 *
 * Rules:
 * 1. Strips leading '₦' (Unicode U+20A6).
 * 2. Rejects any string containing '@'.
 * 3. ASCII lowercase conversion.
 * 4. Allowed character set: [a-z0-9_].
 * 5. Length between 3 and 32 characters.
 * 6. Underscore cannot be first, last, or consecutive.
 *
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

  // Strip leading '₦' (U+20A6) or legacy 'N-' / 'n-' prefixes
  if (clean.startsWith('₦')) {
    clean = clean.slice(1);
  } else if (clean.startsWith('N-') || clean.startsWith('n-') || clean.startsWith('N$') || clean.startsWith('n$')) {
    clean = clean.slice(2);
  }

  const canonical = clean.toLowerCase();
  const len = canonical.length;

  if (len < 3 || len > 32) {
    throw new Error(`Invalid tag length: expected 3-32 characters, got ${len}`);
  }

  // Must only contain [a-z0-9_]
  if (!/^[a-z0-9_]+$/.test(canonical)) {
    throw new Error(`Invalid tag format: '${canonical}' contains forbidden characters (only a-z, 0-9, and _ allowed)`);
  }

  // Underscore cannot be first or last
  if (canonical.startsWith('_') || canonical.endsWith('_')) {
    throw new Error(`Invalid tag format: '${canonical}' cannot start or end with an underscore`);
  }

  // Cannot contain consecutive underscores
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
 * Computes the 32-byte node hash for a tag according to NTS-100.
 * @param {string} rawTag
 * @returns {string} 0x-prefixed 32-byte hex hash
 */
function namehash(rawTag) {
  const canonical = normalizeTag(rawTag);
  return '0x' + keccak256(canonical);
}

/**
 * Encodes an Ethereum address into an EIP-55 mixed-case checksum format.
 * @param {string} address
 * @returns {string} Checksummed address (e.g. 0xAbC...)
 */
function toChecksumAddress(address) {
  if (!address || typeof address !== 'string') return '';
  const clean = address.toLowerCase().replace(/^0x/, '');
  if (clean.length !== 40) return address;

  const hash = keccak256(clean);
  let ret = '0x';
  for (let i = 0; i < 40; i++) {
    if (parseInt(hash[i], 16) >= 8) {
      ret += clean[i].toUpperCase();
    } else {
      ret += clean[i];
    }
  }
  return ret;
}

/**
 * Computes the canonical reverse resolution node hash for an address according to NTS-100.
 * @param {string} address
 * @returns {string} 0x-prefixed 32-byte reverse node hash
 */
function reverseNode(address) {
  const cleanAddr = address.toLowerCase().replace(/^0x/, '');
  if (cleanAddr.length !== 40) {
    throw new Error(`Invalid address length for reverseNode: expected 40 hex chars, got ${cleanAddr.length}`);
  }
  const payload = Buffer.concat([
    Buffer.from(REVERSE_NAMESPACE_HEX, 'hex'),
    Buffer.from(cleanAddr, 'hex')
  ]);
  return '0x' + keccak256(payload);
}

const { getNetworkConfig } = require('./wallet/config');
const { defaultTokenRegistry, TokenRegistry } = require('./token-registry');
const { defaultMigrationManager, IdentityMigrationManager, MigrationState } = require('./identity/migration');

/**
 * NairaTagClient
 * High-level, network-aware client for resolving handles, records, and identities on NairaTag Protocol.
 */
class NairaTagClient {
  /**
   * @param {Object} [config]
   * @param {string} [config.network] - 'celo' | 'celoSepolia' | 'local' | 'base'
   * @param {string} [config.rpcUrl] - JSON-RPC URL (overrides network default)
   * @param {string} [config.registryAddress] - NairaTagRegistry address (overrides network default)
   * @param {string} [config.resolverAddress] - NairaTagResolver address (overrides network default)
   */
  constructor(config = {}) {
    const defaultNet = process.env.NAIRATAG_NETWORK || process.env.AGENT_NETWORK || 'celoSepolia';
    const networkKey = config.network || defaultNet;
    const netConfig = getNetworkConfig(networkKey);

    this.networkKey = networkKey;
    this.networkName = netConfig.name;
    this.chainId = netConfig.chainId;
    this.rpcUrl = config.rpcUrl || netConfig.rpcUrl;
    this.registryAddress = config.registryAddress || netConfig.contracts?.registry || '0xb34518cC33314ee63841120bDd3Baa3BD1baf9e0';
    this.resolverAddress = config.resolverAddress || netConfig.contracts?.resolver || '0x293EA56588b8abac78Bab6241466ad8C30bB955A';
    this.marketplaceAddress = config.marketplaceAddress || netConfig.contracts?.marketplace || '0xa379EC02E8709582AEd02efeD0a27B9ED71bec34';
    this.netConfig = netConfig;
  }

  getNetwork() {
    return {
      network: this.networkKey,
      name: this.networkName,
      chainId: this.chainId,
      registry: this.registryAddress,
      resolver: this.resolverAddress,
      marketplace: this.marketplaceAddress
    };
  }

  /**
   * Universal lookup: handles both forward tag resolution ("₦MAMA") and reverse address lookup ("0x...")
   */
  async lookup(input) {
    if (!input || typeof input !== 'string') return null;
    const clean = input.trim();
    if (clean.startsWith('0x') && clean.length === 42) {
      return this.lookupAddress(clean);
    }
    return this.resolve(clean);
  }

  /**
   * Prepares unsigned claim transaction calldata for the canonical registry.
   */
  prepareClaim(rawTag, resolver = this.resolverAddress) {
    const display = formatDisplayTag(rawTag);
    const node = namehash(rawTag);
    return {
      to: this.registryAddress,
      network: this.networkKey,
      chainId: this.chainId,
      tag: display,
      node,
      resolver,
      method: 'claim(string,address)'
    };
  }

  /**
   * Prepares unsigned transfer transaction calldata.
   */
  prepareTransfer(rawTag, newOwner) {
    const display = formatDisplayTag(rawTag);
    const node = namehash(rawTag);
    return {
      to: this.registryAddress,
      network: this.networkKey,
      chainId: this.chainId,
      tag: display,
      node,
      newOwner,
      method: 'transfer(bytes32,address)'
    };
  }

  /**
   * Internal JSON-RPC call helper.
   */
  async _rpcCall(method, params = []) {
    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method,
        params,
        id: Math.floor(Math.random() * 100000)
      })
    });

    const json = await response.json();
    if (json.error) {
      throw new Error(json.error.message || 'RPC Error');
    }
    return json.result;
  }

  /**
   * Resolves a NairaTag handle directly to an EIP-55 checksummed EVM address.
   * Calls `registry.resolve(string)`.
   *
   * @param {string} rawTag - e.g. "₦micheal" or "micheal"
   * @returns {Promise<string|null>} EIP-55 checksummed address or null if not registered
   */
  async resolve(rawTag) {
    try {
      const display = formatDisplayTag(rawTag);
      // Function selector for resolve(string) = 0x461a4478
      const tagBytes = Buffer.from(display, 'utf8');
      const data = '0x461a4478' +
        '0000000000000000000000000000000000000000000000000000000000000020' + // offset
        tagBytes.length.toString(16).padStart(64, '0') + // length
        tagBytes.toString('hex').padEnd(Math.ceil(tagBytes.length / 32) * 64, '0'); // content

      const raw = await this._rpcCall('eth_call', [{
        to: this.registryAddress,
        data
      }, 'latest']);

      if (!raw || raw === '0x' || raw.length < 66) return null;
      const addrHex = '0x' + raw.slice(-40);
      if (addrHex === '0x0000000000000000000000000000000000000000') return null;

      return toChecksumAddress(addrHex);
    } catch {
      return null;
    }
  }

  /**
   * Reverse Resolution with MANDATORY Mutual Anti-Spoofing Verification Rule.
   *
   * Lookup flow:
   * 1. Derives reverse node for `address`.
   * 2. Queries `resolver.name(reverseNode)` to find the claimed handle.
   * 3. Queries `resolve(claimedHandle)` to confirm forward resolution.
   * 4. Asserts forward == reverse. If matching, returns verified handle.
   *
   * @param {string} address - 0x... EVM address
   * @returns {Promise<string|null>} Verified display handle (e.g. "₦micheal") or null if unverified
   */
  async lookupAddress(address) {
    try {
      const rNode = reverseNode(address);

      // selector name(bytes32) = 0x691f3431
      const data = '0x691f3431' + rNode.slice(2);

      const raw = await this._rpcCall('eth_call', [{
        to: this.resolverAddress,
        data
      }, 'latest']);

      if (!raw || raw === '0x' || raw.length <= 130) return null;

      // Decode ABI string
      const lenHex = raw.slice(66, 130);
      const strLen = parseInt(lenHex, 16);
      if (strLen === 0) return null;

      const strHex = raw.slice(130, 130 + strLen * 2);
      const claimedHandle = Buffer.from(strHex, 'hex').toString('utf8');

      // Mutual Anti-Spoofing Rule Verification
      const forwardAddress = await this.resolve(claimedHandle);
      if (forwardAddress && forwardAddress.toLowerCase() === address.toLowerCase()) {
        return claimedHandle;
      }

      // Mutual verification failed (unverified/spoofed)
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Retrieves a metadata text record (avatar, url, email, etc.) for a handle (ENSIP-5 / EIP-634).
   *
   * @param {string} rawTag
   * @param {string} key
   * @returns {Promise<string|null>}
   */
  async getText(rawTag, key) {
    try {
      const node = namehash(rawTag);
      const keyBytes = Buffer.from(key, 'utf8');

      // selector text(bytes32,string) = 0x59d1d43c
      const data = '0x59d1d43c' +
        node.slice(2) + // node
        '0000000000000000000000000000000000000000000000000000000000000040' + // offset to key
        keyBytes.length.toString(16).padStart(64, '0') +
        keyBytes.toString('hex').padEnd(Math.ceil(keyBytes.length / 32) * 64, '0');

      const raw = await this._rpcCall('eth_call', [{
        to: this.resolverAddress,
        data
      }, 'latest']);

      if (!raw || raw === '0x' || raw.length <= 130) return null;
      const strLen = parseInt(raw.slice(66, 130), 16);
      if (strLen === 0) return null;

      const strHex = raw.slice(130, 130 + strLen * 2);
      return Buffer.from(strHex, 'hex').toString('utf8');
    } catch {
      return null;
    }
  }

  /**
   * Retrieves the NairaTag-specific payment endpoint URI.
   *
   * @param {string} rawTag
   * @returns {Promise<string|null>}
   */
  async getPaymentEndpoint(rawTag) {
    try {
      const node = namehash(rawTag);

      // selector paymentEndpoint(bytes32) = 0xdf023f03
      // let's compute selector: cast sig "paymentEndpoint(bytes32)" = 0x05b22dc0 or similar
      const selector = keccak256('paymentEndpoint(bytes32)').slice(0, 8);
      const data = '0x' + selector + node.slice(2);

      const raw = await this._rpcCall('eth_call', [{
        to: this.resolverAddress,
        data
      }, 'latest']);

      if (!raw || raw === '0x' || raw.length <= 130) return null;
      const strLen = parseInt(raw.slice(66, 130), 16);
      if (strLen === 0) return null;

      const strHex = raw.slice(130, 130 + strLen * 2);
      return Buffer.from(strHex, 'hex').toString('utf8');
    } catch {
      return null;
    }
  }

  /**
   * Resolves full canonical visual identity and protocol capabilities for a NairaTag (NTS-102 / V4).
   * Returns: address, canonical pixel avatar (32/64/128/256), AgentTag identity, verification status.
   *
   * @param {string} rawTag
   * @param {Object} [options]
   * @param {string} [options.apiBase] - NairaTag Resolver API base URL
   * @returns {Promise<Object>}
   */
  async resolveNairaTag(rawTag, options = {}) {
    const canonical = normalizeTag(rawTag);
    const apiBase = options.apiBase || this.apiBase || 'http://127.0.0.1:8787';

    // 1. Resolve forward address onchain or via API
    let forwardAddress = null;
    try {
      forwardAddress = await this.resolve(canonical);
    } catch {}

    // 2. Fetch canonical visual identity from resolver API or fallback to deterministic engine
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

    // 3. Fallback: Deterministic Canonical Engine (Dual CommonJS compatibility)
    let deterministicProfile = null;
    try {
      const tagAvatar = require('../../hub/tag-avatar.cjs');
      deterministicProfile = tagAvatar.resolveTagProfile(canonical, { avatarSize: 64 });
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
        },
        svg: deterministicProfile?.avatarSvg || null
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
  }
}

/**
 * Top-level convenience resolver function: resolveNairaTag("₦michael")
 */
async function resolveNairaTag(rawTag, options = {}) {
  const client = new NairaTagClient(options);
  return client.resolveNairaTag(rawTag, options);
}

const { NairaTagAMM, ROUTER_ABI, ERC20_ABI, PAIR_ABI } = require('./amm');
const {
  RouteStatus,
  BridgeSwapStage,
  KNOWN_CHAINS,
  NairaTagBridgeAdapter,
  NativeBridgeAdapter,
  OPStackBridgeAdapter,
  HyperlaneWarpAdapter,
  MultiTransactionTracker
} = require('./bridge');
const { LiFiBridgeAdapter } = require('./lifi');

module.exports = {
  normalizeTag,
  formatDisplayTag,
  namehash,
  toChecksumAddress,
  reverseNode,
  NairaTagClient,
  resolveNairaTag,
  // AMM
  NairaTagAMM,
  ROUTER_ABI,
  ERC20_ABI,
  PAIR_ABI,
  // Bridge
  RouteStatus,
  BridgeSwapStage,
  KNOWN_CHAINS,
  NairaTagBridgeAdapter,
  NativeBridgeAdapter,
  OPStackBridgeAdapter,
  HyperlaneWarpAdapter,
  LiFiBridgeAdapter,
  MultiTransactionTracker,
// Token & Migration
  TokenRegistry,
  defaultTokenRegistry,
  IdentityMigrationManager,
  defaultMigrationManager,
  MigrationState,
  // Agent Digital Operator & Identity Network
  ...require('./wallet/memory'),
  ...require('./wallet/a2a'),
  ...require('./wallet/planner'),
  ...require('./wallet/action-engine'),
  ...require('./wallet/timeline')
};

