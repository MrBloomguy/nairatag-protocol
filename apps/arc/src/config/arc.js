/**
 * @file arc.js
 * @description Official Arc Network chain configurations and USDC contract parameters.
 * Reference: https://docs.arc.io/arc/references/connect-to-arc.md
 *            https://docs.arc.io/arc/references/contract-addresses.md
 */

import { defineChain } from 'viem';

/**
 * Arc Testnet (Chain ID 5042002 / 0x4CF3F2)
 * Native gas asset is USDC (18 decimals for gas, 6 decimals on the canonical ERC-20 interface).
 */
export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: {
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.arc.io'],
    },
    public: {
      http: ['https://rpc.testnet.arc.io'],
    },
  },
  blockExplorers: {
    default: {
      name: 'ArcScan Testnet',
      url: 'https://explorer.testnet.arc.io',
    },
  },
  testnet: true,
});

/**
 * Arc Mainnet (Chain ID 5042 / 0x13B2)
 */
export const arcMainnet = defineChain({
  id: 5042,
  name: 'Arc',
  nativeCurrency: {
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.mainnet.arc.io'],
    },
    public: {
      http: ['https://rpc.mainnet.arc.io'],
    },
  },
  blockExplorers: {
    default: {
      name: 'ArcScan',
      url: 'https://explorer.arc.io',
    },
  },
  testnet: false,
});

/**
 * Canonical USDC ERC-20 interface address on Arc.
 * Deployed at the identical system address on both Testnet & Mainnet.
 * Decimals: 6
 */
export const ARC_USDC_ADDRESS = '0x3600000000000000000000000000000000000000';
export const ARC_USDC_DECIMALS = 6;

/**
 * Deployed Canonical NairaTag Contracts
 * - Arc Mainnet (Chain ID 5042): Deployed and verified onchain
 * - Arc Testnet (Chain ID 5042002): Verified via Arc Studio CLI
 */
export const ARC_MAINNET_REGISTRY_ADDRESS = '0xb3a2d06ead0a889485a844a63be309c4df4b17b3';
export const ARC_MAINNET_RESOLVER_ADDRESS = '0xf46dc708be8391090b83fb9a5d54c4a568bd64f3';

export const ARC_TESTNET_REGISTRY_ADDRESS = '0x034f64b644988406ded382ebabb5c981bd19684a';
export const ARC_TESTNET_RESOLVER_ADDRESS = '0xaee1af632006a5062accdb74f73930439b76efbf';

export const isArcMainnet = ((typeof import.meta !== 'undefined' && import.meta.env?.VITE_ARC_NETWORK) || 'mainnet') === 'mainnet';

export const ARC_NAIRATAG_REGISTRY_ADDRESS = isArcMainnet ? ARC_MAINNET_REGISTRY_ADDRESS : ARC_TESTNET_REGISTRY_ADDRESS;
export const ARC_NAIRATAG_RESOLVER_ADDRESS = isArcMainnet ? ARC_MAINNET_RESOLVER_ADDRESS : ARC_TESTNET_RESOLVER_ADDRESS;

/**
 * Arc Protocol Constants & Predeployed Infrastructure
 * Reference: https://docs.arc.io/arc/references/evm-differences.md
 *            https://docs.arc.io/arc/references/contract-addresses.md
 */
export const ARC_SYSTEM_EMITTER = '0xffffFFFfFFffffffffffffffFfFFFfffFFFfFFfE';
export const ARC_MEMPOOL_MIN_MAX_FEE_PER_GAS = 20000000000n; // 20 Gwei floor required by Arc mempool

/**
 * Arc Predeployed Transaction Extension: Memo
 * Attaches memo metadata to contract calls (e.g. USDC transfers) while preserving msg.sender via CallFrom precompile.
 */
export const ARC_MEMO_ADDRESS = '0x5294E9927c3306DcBaDb03fe70b92e01cCede505';

/**
 * Official ERC-8004 Agentic Economy Registries on Arc Testnet
 * Reference: https://docs.arc.io/arc/tutorials/register-your-first-ai-agent.md
 */
export const ARC_ERC8004_IDENTITY_REGISTRY = '0x8004A818BFB912233c491871b3d84c89A494BD9e';
export const ARC_ERC8004_REPUTATION_REGISTRY = '0x8004B663056A597Dffe9eCcC1965A193B7388713';
export const ARC_ERC8004_VALIDATION_REGISTRY = '0x8004Cb1BF31DAf7788923b405b754f57acEB4272';

/**
 * Supported Arc Tokens for App Kit Swap & Collateral
 */
export const ARC_EURC_ADDRESS = '0xe4d3ff5390F240Eb765954a72d377b21E01766a3';
export const ARC_CIRBTC_ADDRESS = '0x8b548bF79E8853b9DEfa29d47aF5d8525b6a7aE4';

export const ARC_TESTNET_CONFIG = {
  chainId: 5042002,
  name: 'Arc Testnet',
  rpcUrl: 'https://rpc.testnet.arc.io',
  explorerUrl: 'https://explorer.testnet.arc.io',
  contracts: {
    usdcNative: ARC_USDC_ADDRESS,
    eurc: ARC_EURC_ADDRESS,
    cirBTC: ARC_CIRBTC_ADDRESS,
    nairatagRegistry: ARC_NAIRATAG_REGISTRY_ADDRESS,
    nairatagResolver: ARC_NAIRATAG_RESOLVER_ADDRESS,
    memo: ARC_MEMO_ADDRESS,
    erc8004Identity: ARC_ERC8004_IDENTITY_REGISTRY,
    erc8004Reputation: ARC_ERC8004_REPUTATION_REGISTRY,
    erc8004Validation: ARC_ERC8004_VALIDATION_REGISTRY,
  },
};

/**
 * Minimal ERC-20 ABI for USDC transfers and balance reading on Arc.
 */
export const ERC20_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: 'success', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },
];

/**
 * Arc Memo Precompile Contract ABI
 */
export const ARC_MEMO_ABI = [
  {
    type: 'function',
    name: 'memo',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'target', type: 'address' },
      { name: 'data', type: 'bytes' },
      { name: 'memoId', type: 'bytes32' },
      { name: 'memoData', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    type: 'event',
    name: 'Memo',
    anonymous: false,
    inputs: [
      { name: 'sender', type: 'address', indexed: true },
      { name: 'target', type: 'address', indexed: true },
      { name: 'callDataHash', type: 'bytes32', indexed: false },
      { name: 'memoId', type: 'bytes32', indexed: true },
      { name: 'memo', type: 'bytes', indexed: false },
      { name: 'memoIndex', type: 'uint256', indexed: false },
    ],
  },
];

/**
 * ERC-8004 Identity Registry ABI
 */
export const ERC8004_IDENTITY_ABI = [
  {
    type: 'function',
    name: 'register',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'metadataURI', type: 'string' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'ownerOf',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'tokenURI',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'setAgentURI',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'agentId', type: 'uint256' }, { name: 'newURI', type: 'string' }],
    outputs: [],
  },
  {
    type: 'event',
    name: 'Transfer',
    anonymous: false,
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: true },
    ],
  },
];

/**
 * ERC-8004 Reputation Registry ABI
 */
export const ERC8004_REPUTATION_ABI = [
  {
    type: 'function',
    name: 'giveFeedback',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'score', type: 'int128' },
      { name: 'feedbackType', type: 'uint8' },
      { name: 'tag', type: 'string' },
      { name: 'metadataURI', type: 'string' },
      { name: 'evidenceURI', type: 'string' },
      { name: 'comment', type: 'string' },
      { name: 'feedbackHash', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    type: 'event',
    name: 'Feedback',
    anonymous: false,
    inputs: [
      { name: 'agentId', type: 'uint256', indexed: true },
      { name: 'sender', type: 'address', indexed: true },
      { name: 'score', type: 'int128', indexed: false },
      { name: 'tag', type: 'string', indexed: false },
    ],
  },
];

/**
 * ERC-8004 Validation Registry ABI
 */
export const ERC8004_VALIDATION_ABI = [
  {
    type: 'function',
    name: 'validationRequest',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'validator', type: 'address' },
      { name: 'agentId', type: 'uint256' },
      { name: 'requestURI', type: 'string' },
      { name: 'requestHash', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'validationResponse',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'requestHash', type: 'bytes32' },
      { name: 'response', type: 'uint8' },
      { name: 'responseURI', type: 'string' },
      { name: 'responseHash', type: 'bytes32' },
      { name: 'tag', type: 'string' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getValidationStatus',
    stateMutability: 'view',
    inputs: [{ name: 'requestHash', type: 'bytes32' }],
    outputs: [
      { name: 'validatorAddress', type: 'address' },
      { name: 'agentId', type: 'uint256' },
      { name: 'response', type: 'uint8' },
      { name: 'responseHash', type: 'bytes32' },
      { name: 'tag', type: 'string' },
      { name: 'lastUpdate', type: 'uint256' },
    ],
  },
];

