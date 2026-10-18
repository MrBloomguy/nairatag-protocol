/**
 * @file token-registry.js
 * @description Canonical Asset & Token Registry for NairaTag Network.
 * Defines approved economic rails (cNGN, USDC, USDT, CELO) across Celo and supported networks.
 *
 * REGULATORY & SAFETY POLICY:
 * - Autonomous agents are strictly permitted to: HOLD, SEND, RECEIVE, SWAP.
 * - Autonomous agents are STRICTLY PROHIBITED from executing: MINT, REDEEM.
 * - cNGN issuance and bank redemption are reserved for regulated KYC-compliant user channels.
 */

const CANONICAL_ASSETS = Object.freeze({
  cNGN: {
    symbol: 'cNGN',
    name: 'Compliant Nigerian Naira',
    decimals: 18,
    isNigerianNumeraire: true,
    networks: {
      celo: {
        chainId: 42220,
        address: '0xe2702bd97ee33c88c8f6f92da3b733608aa76f71',
        feeCurrencySupported: true,
        isDefaultFee: true
      },
      celoSepolia: {
        chainId: 11142220,
        address: '0x3d5ae86F34E2a82771496D140daFAEf3789dF888',
        feeCurrencySupported: true,
        isDefaultFee: true
      },
      local: {
        chainId: 901,
        address: '0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82',
        feeCurrencySupported: false
      }
    },
    capabilities: ['HOLD', 'SEND', 'RECEIVE', 'SWAP'],
    prohibitedAutonomousActions: ['MINT', 'REDEEM']
  },

  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    isNigerianNumeraire: false,
    networks: {
      celo: {
        chainId: 42220,
        address: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',
        feeAdapter: '0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B',
        feeCurrencySupported: true
      },
      celoSepolia: {
        chainId: 11142220,
        address: '0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B',
        feeCurrencySupported: true
      }
    },
    capabilities: ['HOLD', 'SEND', 'RECEIVE', 'SWAP']
  },

  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    isNigerianNumeraire: false,
    networks: {
      celo: {
        chainId: 42220,
        address: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e',
        feeCurrencySupported: false
      }
    },
    capabilities: ['HOLD', 'SEND', 'RECEIVE', 'SWAP']
  },

  CELO: {
    symbol: 'CELO',
    name: 'Celo Native Governance & Gas Token',
    decimals: 18,
    isNative: true,
    networks: {
      celo: {
        chainId: 42220,
        address: '0x471EcE3750Da237f93B8E339c536989b8978a438'
      },
      celoSepolia: {
        chainId: 11142220,
        address: '0x471EcE3750Da237f93B8E339c536989b8978a438'
      }
    },
    capabilities: ['HOLD', 'SEND', 'RECEIVE', 'SWAP']
  }
});

class TokenRegistry {
  constructor(assets = CANONICAL_ASSETS) {
    this.assets = assets;
  }

  getToken(symbol) {
    const raw = String(symbol || '').trim();
    const upper = raw.toUpperCase();
    for (const [key, val] of Object.entries(this.assets)) {
      if (key.toUpperCase() === upper) return val;
    }
    throw new Error(`Token ${symbol} is not defined in canonical TokenRegistry.`);
  }

  getTokenAddress(symbol, network = 'celo') {
    const token = this.getToken(symbol);
    const net = token.networks?.[network];
    if (!net || !net.address) {
      throw new Error(`Token ${symbol} does not have a registered deployment on network '${network}'.`);
    }
    return net.address;
  }

  assertActionAllowed(symbol, action) {
    const token = this.getToken(symbol);
    const act = String(action || '').toUpperCase();
    if (token.prohibitedAutonomousActions?.includes(act)) {
      throw new Error(
        `Action ${act} on token ${symbol} is restricted by protocol policy: Autonomous agents cannot mint/redeem regulated tokens.`
      );
    }
    if (!token.capabilities.includes(act)) {
      throw new Error(`Action ${act} is not supported for token ${symbol}.`);
    }
    return true;
  }
}

const defaultTokenRegistry = new TokenRegistry();

module.exports = {
  CANONICAL_ASSETS,
  TokenRegistry,
  defaultTokenRegistry
};
