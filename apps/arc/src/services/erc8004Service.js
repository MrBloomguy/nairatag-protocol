/**
 * @file erc8004Service.js
 * @description Official Arc Testnet ERC-8004 Onchain AI Agent Identity, Reputation & Validation Service.
 * Reference: https://docs.arc.io/arc/tutorials/register-your-first-ai-agent.md
 *            https://docs.arc.io/arc/references/contract-addresses.md#erc-8004
 */

import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  keccak256,
  toHex,
  stringToHex,
  parseAbiItem,
  isAddress,
  getAddress,
} from 'viem';
import {
  arcTestnet,
  ARC_ERC8004_IDENTITY_REGISTRY,
  ARC_ERC8004_REPUTATION_REGISTRY,
  ARC_ERC8004_VALIDATION_REGISTRY,
  ERC8004_IDENTITY_ABI,
  ERC8004_REPUTATION_ABI,
  ERC8004_VALIDATION_ABI,
} from '../config/arc.js';
import { getEthereumProvider } from './arcPayment.js';

export const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(),
});

/**
 * Reads AI Agent identity (owner and metadata URI) by tokenId from Arc Testnet IdentityRegistry.
 * @param {string|number|bigint} agentId
 */
export async function getAgentDetails(agentId) {
  if (agentId === undefined || agentId === null || String(agentId).trim() === '') {
    throw new Error('Valid agent ID is required.');
  }

  const id = BigInt(String(agentId).trim());

  try {
    const owner = await publicClient.readContract({
      address: ARC_ERC8004_IDENTITY_REGISTRY,
      abi: ERC8004_IDENTITY_ABI,
      functionName: 'ownerOf',
      args: [id],
    });

    const tokenURI = await publicClient.readContract({
      address: ARC_ERC8004_IDENTITY_REGISTRY,
      abi: ERC8004_IDENTITY_ABI,
      functionName: 'tokenURI',
      args: [id],
    });

    let metadata = null;
    if (tokenURI && (tokenURI.startsWith('http://') || tokenURI.startsWith('https://'))) {
      try {
        const res = await fetch(tokenURI);
        if (res.ok) metadata = await res.json();
      } catch (e) {
        console.warn('Could not fetch external metadata JSON:', e);
      }
    }

    return {
      agentId: id.toString(),
      owner: getAddress(owner),
      tokenURI,
      metadata,
    };
  } catch (err) {
    throw new Error(`Failed to fetch AI Agent #${agentId} on Arc: ${err.message}`);
  }
}

/**
 * Fetches recent feedback events for an AI Agent from the ReputationRegistry.
 * @param {string|number|bigint} agentId
 */
export async function getAgentReputationLogs(agentId) {
  try {
    const latestBlock = await publicClient.getBlockNumber();
    const blockRange = 5000n;
    const fromBlock = latestBlock > blockRange ? latestBlock - blockRange : 0n;

    const feedbackLogs = await publicClient.getLogs({
      address: ARC_ERC8004_REPUTATION_REGISTRY,
      event: parseAbiItem('event Feedback(uint256 indexed agentId, address indexed sender, int128 score, string tag)'),
      args: { agentId: BigInt(String(agentId).trim()) },
      fromBlock,
      toBlock: latestBlock,
    });

    return feedbackLogs.map((log) => ({
      agentId: log.args.agentId.toString(),
      sender: log.args.sender,
      score: Number(log.args.score),
      tag: log.args.tag,
      blockNumber: Number(log.blockNumber),
      transactionHash: log.transactionHash,
    }));
  } catch (err) {
    console.warn('[getAgentReputationLogs error]', err.message);
    return [];
  }
}

/**
 * Checks validation status of a request hash from Arc Testnet ValidationRegistry.
 * @param {string} requestHash - 32-byte hex string
 */
export async function getValidationStatus(requestHash) {
  if (!requestHash || !requestHash.startsWith('0x')) {
    throw new Error('Valid 0x-prefixed 32-byte request hash is required.');
  }

  try {
    const result = await publicClient.readContract({
      address: ARC_ERC8004_VALIDATION_REGISTRY,
      abi: ERC8004_VALIDATION_ABI,
      functionName: 'getValidationStatus',
      args: [requestHash],
    });

    const [validatorAddress, agentId, response, responseHash, tag, lastUpdate] = result;

    return {
      validatorAddress: getAddress(validatorAddress),
      agentId: agentId.toString(),
      response: Number(response), // 100 = passed, 0 = failed / pending
      isPassed: Number(response) === 100,
      responseHash,
      tag,
      lastUpdate: Number(lastUpdate),
      lastUpdateDate: lastUpdate > 0n ? new Date(Number(lastUpdate) * 1000).toISOString() : null,
    };
  } catch (err) {
    throw new Error(`Failed to query validation status for hash ${requestHash}: ${err.message}`);
  }
}

/**
 * Registers an AI Agent on Arc Testnet via connected wallet.
 * Calls `IdentityRegistry.register(metadataURI)` and listens for the Transfer event.
 * @param {Object} params
 * @param {string} params.fromAddress
 * @param {string} params.metadataURI
 */
export async function registerAiAgent({ fromAddress, metadataURI }) {
  if (!fromAddress || !isAddress(fromAddress)) {
    throw new Error('Connected wallet address is required.');
  }

  const cleanURI = String(metadataURI || '').trim();
  if (!cleanURI) {
    throw new Error('Metadata URI (IPFS or HTTPS) is required.');
  }

  const provider = getEthereumProvider();
  if (!provider) throw new Error('No EVM wallet provider detected.');

  const walletClient = createWalletClient({
    chain: arcTestnet,
    transport: custom(provider),
  });

  const txHash = await walletClient.writeContract({
    account: getAddress(fromAddress),
    address: ARC_ERC8004_IDENTITY_REGISTRY,
    abi: ERC8004_IDENTITY_ABI,
    functionName: 'register',
    args: [cleanURI],
  });

  // Wait for deterministic sub-second receipt on Arc
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    confirmations: 1,
    timeout: 30000,
  });

  if (receipt.status !== 'success') {
    throw new Error(`Agent registration failed on Arc. Hash: ${txHash}`);
  }

  // Parse Transfer event to get assigned Agent Token ID
  const transferLogs = await publicClient.getLogs({
    address: ARC_ERC8004_IDENTITY_REGISTRY,
    event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'),
    args: { to: getAddress(fromAddress) },
    fromBlock: receipt.blockNumber,
    toBlock: receipt.blockNumber,
  });

  let assignedId = null;
  if (transferLogs && transferLogs.length > 0) {
    assignedId = transferLogs[transferLogs.length - 1].args.tokenId?.toString();
  }

  return {
    success: true,
    txHash,
    receipt,
    agentId: assignedId,
    metadataURI: cleanURI,
    explorerUrl: `${arcTestnet.blockExplorers.default.url}/tx/${txHash}`,
  };
}

/**
 * Submits feedback/reputation for an AI Agent on Arc Testnet.
 * Note: per ERC-8004 specification, the feedback provider must NOT be the agent's owner.
 * @param {Object} params
 */
export async function recordAgentFeedback({ fromAddress, agentId, score, tag, comment = '' }) {
  if (!fromAddress || !isAddress(fromAddress)) {
    throw new Error('Connected wallet address is required.');
  }

  const id = BigInt(String(agentId).trim());
  const scoreInt = BigInt(Math.max(-128, Math.min(100, Math.round(Number(score)))));
  const cleanTag = String(tag || 'general_performance').trim();
  const feedbackHash = keccak256(stringToHex(cleanTag));

  const provider = getEthereumProvider();
  if (!provider) throw new Error('No EVM wallet provider detected.');

  const walletClient = createWalletClient({
    chain: arcTestnet,
    transport: custom(provider),
  });

  const txHash = await walletClient.writeContract({
    account: getAddress(fromAddress),
    address: ARC_ERC8004_REPUTATION_REGISTRY,
    abi: ERC8004_REPUTATION_ABI,
    functionName: 'giveFeedback',
    args: [id, scoreInt, 0, cleanTag, '', '', comment, feedbackHash],
  });

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    confirmations: 1,
    timeout: 30000,
  });

  if (receipt.status !== 'success') {
    throw new Error(`Reputation recording failed on Arc. Hash: ${txHash}`);
  }

  return {
    success: true,
    txHash,
    score: Number(scoreInt),
    tag: cleanTag,
    explorerUrl: `${arcTestnet.blockExplorers.default.url}/tx/${txHash}`,
  };
}
