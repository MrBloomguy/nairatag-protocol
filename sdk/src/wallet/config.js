/**
 * @file config.js
 * @description Central network & token configuration for Celo and legacy Base execution.
 * Official Celo Mainnet (42220) and Alfajores Testnet (44787) parameters.
 */

const { celo, celoAlfajores } = require('viem/chains');

const ERC20_ABI = [
  { type: 'function', name: 'name', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'transfer', stateMutability: 'nonpayable', inputs: [{ name: 'recipient', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { type: 'event', name: 'Transfer', inputs: [{ name: 'from', type: 'address', indexed: true }, { name: 'to', type: 'address', indexed: true }, { name: 'value', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'Approval', inputs: [{ name: 'owner', type: 'address', indexed: true }, { name: 'spender', type: 'address', indexed: true }, { name: 'value', type: 'uint256', indexed: false }] }
];

const NETWORKS = {
  celo: {
    chainId: 42220,
    name: 'Celo Mainnet',
    chain: celo,
    rpcUrl: process.env.CELO_RPC_URL || 'https://forno.celo.org',
    explorerUrl: 'https://celoscan.io',
    nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
    supportsFeeCurrency: true,
    contracts: {
      registry: process.env.CELO_REGISTRY_ADDRESS || '0xb34518cC33314ee63841120bDd3Baa3BD1baf9e0',
      resolver: process.env.CELO_RESOLVER_ADDRESS || '0x293EA56588b8abac78Bab6241466ad8C30bB955A',
      marketplace: process.env.CELO_MARKETPLACE_ADDRESS || '0xa379EC02E8709582AEd02efeD0a27B9ED71bec34',
      paymentRequest: process.env.CELO_PAYMENT_REQUEST_ADDRESS || '0xb9a0250a6C0908fA01574a5416321096279c4d53',
      // Self Protocol Agent ID & Visa Registries
      selfAgentRegistry: '0xaC3DF9ABf80d0F5c020C06B04Cced27763355944',
      selfReputationRegistry: '0x69Da18CF4Ac27121FD99cEB06e38c3DC78F363f4',
      selfValidationRegistry: '0x71a025e0e338EAbcB45154F8b8CA50b41e7A0577',
      celoAgentVisa: '0xCa97f7586CF9De62B8ca516d7Ee25f6AEae5e109',
      // ERC-8004 Standard Registries
      erc8004IdentityRegistry: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
      erc8004ReputationRegistry: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63'
    },
    tokens: {
      cNGN: {
        symbol: 'cNGN',
        name: 'Compliant Nigerian Naira (Mento NGNm)',
        address: '0xe2702bd97ee33c88c8f6f92da3b733608aa76f71',
        decimals: 18,
        type: 'erc20',
        isDefaultDisplay: true
      },
      USDC: {
        symbol: 'USDC',
        name: 'USD Coin',
        address: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',
        decimals: 6,
        type: 'erc20',
        feeAdapter: '0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B'
      },
      USDT: {
        symbol: 'USDT',
        name: 'Tether USD',
        address: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e',
        decimals: 6,
        type: 'erc20'
      },
      CELO: {
        symbol: 'CELO',
        name: 'Celo Native Token',
        address: '0x471EcE3750Da237f93B8E339c536989b8978a438',
        decimals: 18,
        type: 'native'
      }
    }
  },

  celoSepolia: {
    chainId: 11142220,
    name: 'Celo Sepolia Testnet',
    chain: {
      id: 11142220,
      name: 'Celo Sepolia',
      nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
      rpcUrls: {
        default: { http: [process.env.CELO_SEPOLIA_RPC_URL || 'https://forno.celo-sepolia.celo-testnet.org'] }
      },
      blockExplorers: {
        default: { name: 'CeloSepoliaScan', url: 'https://celo-sepolia.blockscout.com' }
      },
      testnet: true
    },
    rpcUrl: process.env.CELO_SEPOLIA_RPC_URL || 'https://forno.celo-sepolia.celo-testnet.org',
    explorerUrl: 'https://celo-sepolia.blockscout.com',
    nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
    supportsFeeCurrency: true,
    contracts: {
      registry: process.env.CELO_SEPOLIA_REGISTRY_ADDRESS || '0xb34518cC33314ee63841120bDd3Baa3BD1baf9e0',
      resolver: process.env.CELO_SEPOLIA_RESOLVER_ADDRESS || '0x293EA56588b8abac78Bab6241466ad8C30bB955A',
      marketplace: process.env.CELO_SEPOLIA_MARKETPLACE_ADDRESS || '0xa379EC02E8709582AEd02efeD0a27B9ED71bec34',
      paymentRequest: process.env.CELO_SEPOLIA_PAYMENT_REQUEST_ADDRESS || '0xb9a0250a6C0908fA01574a5416321096279c4d53',
      // Self Protocol Agent ID & Visa Registries
      selfAgentRegistry: '0x043DaCac8b0771DD5b444bCC88f2f8BBDBEdd379',
      selfReputationRegistry: '0x69Da18CF4Ac27121FD99cEB06e38c3DC78F363f4',
      selfValidationRegistry: '0x71a025e0e338EAbcB45154F8b8CA50b41e7A0577',
      celoAgentVisa: '0xf049FD6260Fce964B82728A86CF1BbEB8AB3E875',
      // ERC-8004 Standard Registries
      erc8004IdentityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
      erc8004ReputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713'
    },
    tokens: {
      cNGN: {
        symbol: 'cNGN',
        name: 'cNGN Sepolia Test Token',
        address: process.env.CNGN_SEPOLIA_TOKEN_ADDRESS || '0x3d5ae86F34E2a82771496D140daFAEf3789dF888',
        decimals: 18,
        type: 'erc20',
        isDefaultDisplay: true
      },
      USDC: {
        symbol: 'USDC',
        name: 'Sepolia USD Coin',
        address: process.env.USDC_SEPOLIA_TOKEN_ADDRESS || '0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B',
        decimals: 6,
        type: 'erc20'
      },
      CELO: {
        symbol: 'CELO',
        name: 'Sepolia CELO',
        address: '0x471EcE3750Da237f93B8E339c536989b8978a438',
        decimals: 18,
        type: 'native'
      }
    }
  },

  local: {
    chainId: 901,
    name: 'NairaTag L2 Local (Legacy Dev)',
    chain: {
      id: 901,
      name: 'NairaTag L2',
      nativeCurrency: { name: 'cNGN', symbol: 'cNGN', decimals: 18 },
      rpcUrls: {
        default: { http: [process.env.LOCAL_RPC_URL || 'http://127.0.0.1:9545'] }
      }
    },
    rpcUrl: process.env.LOCAL_RPC_URL || 'http://127.0.0.1:9545',
    explorerUrl: 'http://127.0.0.1:8088/scanner/index.html',
    nativeCurrency: { name: 'cNGN', symbol: 'cNGN', decimals: 18 },
    supportsFeeCurrency: false,
    status: 'LEGACY_DEV',
    contracts: {
      registry: '0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82',
      resolver: '0x9A676e781A523b5d0C0e43731313A708CB607508',
      marketplace: '0x9A676e781A523b5d0C0e43731313A708CB607508',
      paymentRequest: '0x0B306BF915C4d645ff596e518fAf3F9669b97016'
    },
    tokens: {
      cNGN: {
        symbol: 'cNGN',
        name: 'cNGN Local',
        address: '0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82',
        decimals: 18,
        type: 'erc20',
        isDefaultDisplay: true
      }
    }
  },

  celoAlfajores: {
    chainId: 44787,
    name: 'Celo Alfajores Testnet',
    chain: celoAlfajores,
    rpcUrl: process.env.CELO_TESTNET_RPC_URL || 'https://alfajores-forno.celo-testnet.org',
    explorerUrl: 'https://alfajores.celoscan.io',
    nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
    supportsFeeCurrency: true,
    tokens: {
      cNGN: {
        symbol: 'cNGN',
        name: 'cNGN Testnet Token',
        address: process.env.CNGN_TESTNET_TOKEN_ADDRESS || '0x3d5ae86F34E2a82771496D140daFAEf3789dF888',
        decimals: 18,
        type: 'erc20',
        isDefaultDisplay: true
      },
      USDC: {
        symbol: 'USDC',
        name: 'Testnet USD Coin',
        address: '0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B',
        decimals: 6,
        type: 'erc20'
      },
      CELO: {
        symbol: 'CELO',
        name: 'Testnet CELO',
        address: '0xF194afDf50B03e69Bd7D057c1Aa0e10c9954E4C9',
        decimals: 18,
        type: 'native'
      }
    }
  },

  arcTestnet: {
    chainId: 5042002,
    name: 'Arc Testnet',
    chain: {
      id: 5042002,
      name: 'Arc Testnet',
      nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 6 },
      rpcUrls: {
        default: { http: [process.env.ARC_TESTNET_RPC || 'https://rpc.testnet.arc.io'] }
      },
      blockExplorers: {
        default: { name: 'ArcExplorer', url: 'https://explorer.testnet.arc.io' }
      },
      testnet: true
    },
    rpcUrl: process.env.ARC_TESTNET_RPC || 'https://rpc.testnet.arc.io',
    explorerUrl: 'https://explorer.testnet.arc.io',
    nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 6 },
    circleBlockchain: 'ARC-TESTNET',
    supportsFeeCurrency: false,
    contracts: {
      registry: process.env.ARC_REGISTRY_ADDRESS || '0x034f64b644988406ded382ebabb5c981bd19684a',
      resolver: process.env.ARC_RESOLVER_ADDRESS || '0xaee1af632006a5062accdb74f73930439b76efbf',
      memo: process.env.ARC_MEMO_ADDRESS || '0x5294e9927c3306dcbadb03fe70b92e01ccede505',
      usdc: process.env.ARC_USDC_ADDRESS || '0x3600000000000000000000000000000000000000'
    },
    tokens: {
      USDC: {
        symbol: 'USDC',
        name: 'USD Coin',
        address: '0x3600000000000000000000000000000000000000',
        decimals: 6,
        type: 'native_gas',
        isDefaultDisplay: true
      }
    }
  },

  arc: {
    chainId: 5042,
    name: 'Arc Mainnet',
    chain: {
      id: 5042,
      name: 'Arc Mainnet',
      nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 6 },
      rpcUrls: {
        default: { http: [process.env.ARC_MAINNET_RPC || 'https://rpc.mainnet.arc.io'] }
      },
      blockExplorers: {
        default: { name: 'ArcExplorer', url: 'https://explorer.arc.io' }
      },
      testnet: false
    },
    rpcUrl: process.env.ARC_MAINNET_RPC || 'https://rpc.mainnet.arc.io',
    explorerUrl: 'https://explorer.arc.io',
    nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 6 },
    circleBlockchain: 'ARC',
    supportsFeeCurrency: false,
    contracts: {
      registry: process.env.ARC_REGISTRY_ADDRESS || '0x034f64b644988406ded382ebabb5c981bd19684a',
      resolver: process.env.ARC_RESOLVER_ADDRESS || '0xaee1af632006a5062accdb74f73930439b76efbf',
      memo: process.env.ARC_MEMO_ADDRESS || '0x5294e9927c3306dcbadb03fe70b92e01ccede505',
      usdc: process.env.ARC_USDC_ADDRESS || '0x3600000000000000000000000000000000000000'
    },
    tokens: {
      USDC: {
        symbol: 'USDC',
        name: 'USD Coin',
        address: '0x3600000000000000000000000000000000000000',
        decimals: 6,
        type: 'native_gas',
        isDefaultDisplay: true
      }
    }
  }
};

function getEnvironment() {
  const env = (process.env.NODE_ENV || 'development').toLowerCase();
  if (env === 'production' || env === 'prod') return 'production';
  if (env === 'testnet' || env === 'staging' || process.env.USE_TESTNET === 'true') return 'testnet';
  return 'testnet';
}

function resolveActiveNetwork() {
  const chosen = process.env.NAIRATAG_NETWORK || process.env.AGENT_NETWORK || process.env.CELO_NETWORK;
  if (chosen) {
    return getNetworkConfig(chosen);
  }
  return NETWORKS.celoSepolia;
}

function getNetworkConfig(networkKey = 'celoSepolia') {
  const normalized = String(networkKey || '').toLowerCase().replace(/[-_]/g, '');
  if (normalized === 'arctestnet' || normalized === 'arc5042002' || normalized === '5042002') return NETWORKS.arcTestnet;
  if (normalized === 'arc' || normalized === 'arcmainnet' || normalized === '5042') return NETWORKS.arc;
  if (normalized === 'celosepolia' || normalized === '11142220' || normalized === 'default') return NETWORKS.celoSepolia;
  if (normalized === 'celo' || normalized === '42220') return NETWORKS.celo;
  if (normalized === 'local' || normalized === '901' || normalized === 'devnet') return NETWORKS.local;
  if (normalized === 'celoalfajores' || normalized === 'alfajores' || normalized === '44787') return NETWORKS.celoAlfajores;
  throw new Error(`Unsupported network: ${networkKey}. Supported: arcTestnet, arc, celoSepolia, celo, local, celoAlfajores`);
}

const DEFAULT_LIMITS = {
  maxPerTx: BigInt(process.env.AGENT_MAX_PER_TX || 25000),
  dailyLimit: BigInt(process.env.AGENT_DAILY_LIMIT || 100000),
  autoApproveThreshold: BigInt(process.env.AGENT_AUTO_APPROVE_LIMIT || 5000)
};

module.exports = {
  ERC20_ABI,
  NETWORKS,
  DEFAULT_LIMITS,
  getEnvironment,
  resolveActiveNetwork,
  getNetworkConfig
};
