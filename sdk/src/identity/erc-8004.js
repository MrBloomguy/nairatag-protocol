/**
 * @file erc-8004.js
 * @description ERC-8004: Agent Trust Protocol Implementation on Celo for NairaTag.
 * Manages Identity Registry (ERC-721 Agent NFTs), Reputation Registry (starred ratings,
 * feedback summaries), and standard registration manifest generation.
 */

const { 
  createPublicClient, 
  createWalletClient, 
  http, 
  getAddress, 
  keccak256, 
  stringToBytes, 
  formatUnits,
  parseEventLogs,
  zeroHash 
} = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

const ERC8004_CONTRACTS = {
  mainnet: {
    chainId: 42220,
    rpcUrl: 'https://forno.celo.org',
    identityRegistry: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
    reputationRegistry: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63'
  },
  testnet: {
    chainId: 11142220,
    rpcUrl: 'https://forno.celo-sepolia.celo-testnet.org',
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713'
  }
};

const ERC8004_IDENTITY_ABI = [
  {
    type: 'function',
    name: 'name',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }]
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }]
  },
  {
    type: 'function',
    name: 'register',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'agentURI', type: 'string' }],
    outputs: [{ name: 'agentId', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'setAgentURI',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'agentId', type: 'uint256' }, { name: 'newURI', type: 'string' }],
    outputs: []
  },
  {
    type: 'function',
    name: 'tokenURI',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ type: 'string' }]
  },
  {
    type: 'function',
    name: 'ownerOf',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ type: 'address' }]
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ type: 'uint256' }]
  },
  {
    type: 'event',
    name: 'Registered',
    inputs: [
      { name: 'agentId', type: 'uint256', indexed: true },
      { name: 'agentURI', type: 'string' },
      { name: 'owner', type: 'address', indexed: true }
    ]
  }
];

const ERC8004_REPUTATION_ABI = [
  {
    type: 'function',
    name: 'giveFeedback',
    stateMutability: 'nonpayable',
    outputs: [],
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'value', type: 'int128' },
      { name: 'valueDecimals', type: 'uint8' },
      { name: 'tag1', type: 'string' },
      { name: 'tag2', type: 'string' },
      { name: 'endpoint', type: 'string' },
      { name: 'feedbackURI', type: 'string' },
      { name: 'feedbackHash', type: 'bytes32' }
    ]
  },
  {
    type: 'function',
    name: 'getClients',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address[]' }]
  },
  {
    type: 'function',
    name: 'getSummary',
    stateMutability: 'view',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'clients', type: 'address[]' },
      { name: 'tag1', type: 'string' },
      { name: 'tag2', type: 'string' }
    ],
    outputs: [
      { name: 'count', type: 'uint64' },
      { name: 'value', type: 'int128' },
      { name: 'valueDecimals', type: 'uint8' }
    ]
  }
];

/**
 * Generates an ERC-8004 compliant agent registration JSON manifest.
 */
function createAgentRegistrationManifest({
  tag,
  name,
  description,
  agentWallet,
  agentId,
  endpoints = {},
  network = 'testnet'
}) {
  const cleanTag = String(tag || '').replace(/^₦/, '').toUpperCase();
  const netConfig = ERC8004_CONTRACTS[network] || ERC8004_CONTRACTS.testnet;
  const baseUrl = 'https://nairatag.ng';

  const manifest = {
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: name || `NairaTag Agent ₦${cleanTag}`,
    description: description || `Autonomous sovereign agent on Celo backed by NairaTag handle ₦${cleanTag} and Self Protocol proof-of-human.`,
    image: `${baseUrl}/hub/nairatag-icon.png`,
    tag: `₦${cleanTag}`,
    agentWallet: agentWallet ? getAddress(agentWallet) : undefined,
    services: [
      {
        name: 'web',
        endpoint: `${baseUrl}/agent?tag=${cleanTag.toLowerCase()}`
      },
      {
        name: 'A2A',
        endpoint: `${baseUrl}/api/a2a/${cleanTag.toLowerCase()}`,
        version: '0.3.0'
      },
      {
        name: 'MCP',
        endpoint: `${baseUrl}/api/mcp/${cleanTag.toLowerCase()}`,
        version: '2025-06-18'
      }
    ],
    x402Support: true,
    active: true,
    supportedTrust: ['reputation', 'self-agent-id'],
    registrations: []
  };

  if (agentId) {
    manifest.registrations.push({
      agentId: Number(agentId),
      agentRegistry: `eip155:${netConfig.chainId}:${netConfig.identityRegistry}`
    });
  }

  return manifest;
}

/**
 * ERC8004Client
 * Interacts with the ERC-8004 Identity and Reputation Registries on Celo.
 */
class ERC8004Client {
  constructor(options = {}) {
    const network = options.network === 'mainnet' ? 'mainnet' : 'testnet';
    const netConfig = ERC8004_CONTRACTS[network];

    this.network = network;
    this.chainId = options.chainId || netConfig.chainId;
    this.rpcUrl = options.rpcUrl || netConfig.rpcUrl;
    this.identityAddress = getAddress(options.identityRegistry || netConfig.identityRegistry);
    this.reputationAddress = getAddress(options.reputationRegistry || netConfig.reputationRegistry);

    this.publicClient = createPublicClient({
      transport: http(this.rpcUrl)
    });

    if (options.privateKey) {
      this.account = privateKeyToAccount(options.privateKey);
      this.walletClient = createWalletClient({
        account: this.account,
        transport: http(this.rpcUrl)
      });
    }
  }

  /**
   * Reads metadata name and symbol of the Identity Registry.
   */
  async getRegistryInfo() {
    const [name, symbol] = await Promise.all([
      this.publicClient.readContract({
        address: this.identityAddress,
        abi: ERC8004_IDENTITY_ABI,
        functionName: 'name'
      }),
      this.publicClient.readContract({
        address: this.identityAddress,
        abi: ERC8004_IDENTITY_ABI,
        functionName: 'symbol'
      })
    ]);
    return { name, symbol, address: this.identityAddress, network: this.network };
  }

  /**
   * Queries reputation summary safely without reverting on unrated agents.
   */
  async getAgentReputation(agentId, tag = 'starred') {
    const id = BigInt(agentId);

    try {
      const clients = await this.publicClient.readContract({
        address: this.reputationAddress,
        abi: ERC8004_REPUTATION_ABI,
        functionName: 'getClients',
        args: [id]
      });

      if (!clients || clients.length === 0) {
        return {
          agentId: Number(id),
          count: 0,
          score: 100, // Default baseline for newly minted sovereign identity
          tag,
          clientsCount: 0,
          hasReviews: false
        };
      }

      const [count, value, decimals] = await this.publicClient.readContract({
        address: this.reputationAddress,
        abi: ERC8004_REPUTATION_ABI,
        functionName: 'getSummary',
        args: [id, clients, tag, '']
      });

      if (count === 0n) {
        return {
          agentId: Number(id),
          count: 0,
          score: 100,
          tag,
          clientsCount: clients.length,
          hasReviews: false
        };
      }

      const scoreNum = Number(formatUnits(value, decimals));
      return {
        agentId: Number(id),
        count: Number(count),
        score: scoreNum,
        tag,
        clientsCount: clients.length,
        hasReviews: true
      };
    } catch {
      return {
        agentId: Number(id),
        count: 0,
        score: 95,
        tag,
        clientsCount: 0,
        hasReviews: false
      };
    }
  }

  /**
   * Simulates or encodes the registration call.
   */
  async prepareRegistration(agentURI) {
    return {
      to: this.identityAddress,
      abi: ERC8004_IDENTITY_ABI,
      functionName: 'register',
      args: [agentURI]
    };
  }
}

module.exports = {
  ERC8004_CONTRACTS,
  ERC8004_IDENTITY_ABI,
  ERC8004_REPUTATION_ABI,
  createAgentRegistrationManifest,
  ERC8004Client
};
