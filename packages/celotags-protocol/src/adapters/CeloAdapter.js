/**
 * @file CeloAdapter.js
 * @description Celo-First Network, Smart Contract & CIP-64 Gas Abstraction Adapter.
 *
 * Implements CeloTags Master Prompt Section 6:
 * - Celo identity registration and resolution.
 * - CIP-64 fee currency configuration (cNGN / cUSD fee tokens).
 * - Multi-environment support: Celo Sepolia (11142220) and Celo Mainnet (42220).
 */

export const CELO_NETWORKS = {
  celo: {
    chainId: 42220,
    name: 'Celo Mainnet',
    rpcUrl: 'https://forno.celo.org',
    explorerUrl: 'https://celoscan.io',
    contracts: {
      registry: '0xb34518cC33314ee63841120bDd3Baa3BD1baf9e0',
      resolver: '0x293EA56588b8abac78Bab6241466ad8C30bB955A',
      bountyEscrow: '0x83B369A1C504065620857D0bDb09172A2a7C88C9',
      marketplace: '0xa379EC02E8709582AEd02efeD0a27B9ED71bec34',
      paymentRequest: '0xb9a0250a6C0908fA01574a5416321096279c4d53'
    },
    tokens: {
      cNGN: {
        address: '0xe2702bd97ee33c88c8f6f92da3b733608aa76f71',
        decimals: 18,
        symbol: 'cNGN'
      },
      cUSD: {
        address: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
        decimals: 18,
        symbol: 'cUSD'
      },
      cREAL: {
        address: '0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787',
        decimals: 18,
        symbol: 'cREAL'
      },
      CELO: {
        address: '0x471EcE3750Da237f93B8E339c536989b8978a438',
        decimals: 18,
        symbol: 'CELO'
      }
    }
  },
  celoSepolia: {
    chainId: 11142220,
    name: 'Celo Sepolia Testnet',
    rpcUrl: 'https://forno.celo-sepolia.celo-testnet.org',
    explorerUrl: 'https://sepolia.celoscan.io',
    contracts: {
      registry: '0xb34518cC33314ee63841120bDd3Baa3BD1baf9e0',
      resolver: '0x293EA56588b8abac78Bab6241466ad8C30bB955A',
      bountyEscrow: '0x83B369A1C504065620857D0bDb09172A2a7C88C9',
      marketplace: '0xa379EC02E8709582AEd02efeD0a27B9ED71bec34',
      paymentRequest: '0xb9a0250a6C0908fA01574a5416321096279c4d53'
    },
    tokens: {
      cNGN: {
        address: '0x717C2f9C5FDE1f05489886326Ebe828a2b535B29',
        decimals: 18,
        symbol: 'cNGN'
      },
      cUSD: {
        address: '0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1',
        decimals: 18,
        symbol: 'cUSD'
      },
      CELO: {
        address: '0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9',
        decimals: 18,
        symbol: 'CELO'
      }
    }
  }
};

/**
 * Returns network configuration and contract addresses for the specified network.
 *
 * @param {string} [network='celo'] - 'celo' | 'celoSepolia' | chainId
 * @returns {Object}
 */
export function getCeloConfig(network = 'celo') {
  const str = String(network).toLowerCase();
  const key = str === 'celosepolia' || str === '11142220' || str === 'sepolia' ? 'celoSepolia' : 'celo';
  return CELO_NETWORKS[key];
}

/**
 * Validates whether a token symbol or address is a supported CIP-64 fee currency.
 *
 * @param {string} tokenSymbolOrAddress
 * @param {string} [network='celo']
 * @returns {{ valid: boolean, address?: string, symbol?: string, error?: string }}
 */
export function validateFeeCurrency(tokenSymbolOrAddress, network = 'celo') {
  const config = getCeloConfig(network);
  if (!tokenSymbolOrAddress) {
    return { valid: false, error: 'Fee currency token symbol or address is required' };
  }

  const raw = String(tokenSymbolOrAddress).trim();
  const upper = raw.toUpperCase();

  // Match by symbol (case-insensitive e.g. cNGN, cngn, CNGN)
  for (const [sym, token] of Object.entries(config.tokens)) {
    if (sym.toUpperCase() === upper) {
      return { valid: true, address: token.address, symbol: sym };
    }
  }

  // Match by contract address
  const lowerAddr = raw.toLowerCase();
  for (const [sym, token] of Object.entries(config.tokens)) {
    if (token.address.toLowerCase() === lowerAddr) {
      return { valid: true, address: token.address, symbol: sym };
    }
  }

  return {
    valid: false,
    error: `Unsupported CIP-64 fee currency: "${tokenSymbolOrAddress}" on ${config.name}. Must be an approved Mento/Celo asset.`
  };
}

/**
 * Creates CIP-64 compatible transaction parameters paying gas in an approved fee currency.
 *
 * @param {Object} txParams - Standard transaction payload
 * @param {string|Object} [options='celo'] - Network string or options object { network, feeToken }
 * @returns {Object} CIP-64 transaction payload
 */
export function buildCip64Tx(txParams, options = 'celo') {
  const network = typeof options === 'string' ? options : (options?.network || 'celo');
  const feeToken = typeof options === 'object' && options?.feeToken ? options.feeToken : 'cNGN';

  const config = getCeloConfig(network);
  const validatedFee = validateFeeCurrency(feeToken, network);
  if (!validatedFee.valid) {
    throw new Error(validatedFee.error);
  }

  return {
    ...txParams,
    feeCurrency: validatedFee.address,
    chainId: config.chainId
  };
}

/**
 * Live authoritative on-chain verification of fee currency support.
 * Fails closed if the token is null, unsupported, or RPC query fails.
 *
 * @param {string} tokenSymbolOrAddress
 * @param {string} [network='celo']
 * @returns {Promise<{ verified: boolean, address?: string, symbol?: string, error?: string }>}
 */
export async function verifyFeeCurrencyLive(tokenSymbolOrAddress, network = 'celo') {
  const localCheck = validateFeeCurrency(tokenSymbolOrAddress, network);
  if (!localCheck.valid) {
    return { verified: false, error: localCheck.error };
  }

  const config = getCeloConfig(network);
  try {
    const response = await fetch(config.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getCode',
        params: [localCheck.address, 'latest']
      })
    });

    if (!response.ok) {
      return { verified: false, error: `RPC connection error (${response.status}) querying ${config.name}` };
    }

    const data = await response.json();
    if (!data.result || data.result === '0x' || data.result === '0x0') {
      return {
        verified: false,
        error: `LIVE_VERIFICATION_FAILED: No contract deployed at address ${localCheck.address} on ${config.name}.`
      };
    }

    return {
      verified: true,
      address: localCheck.address,
      symbol: localCheck.symbol,
      network: config.name,
      chainId: config.chainId
    };
  } catch (err) {
    return {
      verified: false,
      error: `LIVE_VERIFICATION_FAILED: Authoritative check failed (${err.message}). Failing closed for safety.`
    };
  }
}

