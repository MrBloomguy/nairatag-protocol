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
  decodeEventLog,
  isAddress,
  getAddress,
} from 'viem';
import {
  arcTestnet,
  arcMainnet,
  isArcMainnet,
  ARC_ERC8004_IDENTITY_REGISTRY,
  ARC_ERC8004_REPUTATION_REGISTRY,
  ARC_ERC8004_VALIDATION_REGISTRY,
  ERC8004_IDENTITY_ABI,
  ERC8004_REPUTATION_ABI,
  ERC8004_VALIDATION_ABI,
} from '../config/arc.js';
import { getEthereumProvider, switchOrAddArcNetwork, activeArcChain } from './arcPayment.js';

export const publicClient = createPublicClient({
  chain: activeArcChain,
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
    if (tokenURI?.startsWith('data:application/json;base64,')) {
      try {
        const encoded = tokenURI.slice('data:application/json;base64,'.length);
        const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
        metadata = JSON.parse(new TextDecoder().decode(bytes));
      } catch (e) {
        console.warn('Could not decode ERC-8004 data URI:', e);
      }
    } else if (tokenURI && (tokenURI.startsWith('http://') || tokenURI.startsWith('https://'))) {
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

/** Find an ERC-8004 identity whose registration metadata is linked to a NairaTag. */
export async function findArcAgentForTag(rawTag, ownerAddress) {
  if (!ownerAddress || !isAddress(ownerAddress)) return null;
  const tag = String(rawTag || '').replace(/^[₦$@#]/, '').trim().toLowerCase();
  const explorerApiBase = activeArcChain.id === 5042 ? 'https://explorer.arc.io' : 'https://explorer.testnet.arc.io';
  const url = new URL(`${explorerApiBase}/api/v2/tokens/${ARC_ERC8004_IDENTITY_REGISTRY}/instances`);
  url.searchParams.set('holder_address_hash', getAddress(ownerAddress));
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`ArcScan agent lookup returned ${response.status}.`);
  const payload = await response.json();
  for (const token of (payload.items || []).slice(0, 20)) {
    try {
      const details = await getAgentDetails(token.id);
      const metadataTag = String(details.metadata?.nairatag?.tag || details.metadata?.name || '')
        .replace(/^[₦$@#]/, '').trim().toLowerCase();
      if (metadataTag !== tag) continue;
      return {
        id: String(token.id),
        tag,
        name: details.metadata?.name || `₦${tag}`,
        role: details.metadata?.description || 'NairaTag agent on Arc',
        category: 'NairaTag',
        avatar: details.metadata?.image || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(tag)}`,
        owner: details.owner,
        metadataUri: details.tokenURI,
        status: 'Verified',
      };
    } catch (error) {
      console.warn(`[ERC-8004 tag lookup #${token.id}]`, error.message);
    }
  }
  return null;
}

/** Build a real ERC-8004 registration file for an Arc NairaTag identity. */
export function buildNairaTagAgentMetadataUri(rawTag, agentId = null) {
  const tag = String(rawTag || '').trim().replace(/^[₦$@#]/, '').toLowerCase();
  if (!/^[a-z0-9_]{3,32}$/.test(tag) || tag.startsWith('_') || tag.endsWith('_') || tag.includes('__')) {
    throw new Error('A valid Arc NairaTag is required to create the ERC-8004 record.');
  }
  // The ₦ prefix is the canonical on-chain identity, not presentation-only
  // formatting. Keep it in both the ERC-8004 display name and NairaTag field.
  const canonicalTag = `₦${tag.toUpperCase()}`;
  const metadata = {
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: canonicalTag,
    description: `NairaTag agent identity for ${canonicalTag} on Arc Testnet. Use this tag to discover the registered identity and pay its owner in USDC through NairaTag.`,
    image: 'https://arc.nairatag.ng/nairatag-logo.png',
    services: [{ name: 'NairaTag', endpoint: 'https://arc.nairatag.ng/' }],
    x402Support: false,
    active: true,
    registrations: agentId === null ? [] : [{
      agentId: Number(agentId),
      agentRegistry: `eip155:${activeArcChain.id}:${ARC_ERC8004_IDENTITY_REGISTRY.toLowerCase()}`,
    }],
    supportedTrust: [],
    nairatag: { tag: canonicalTag, chainId: activeArcChain.id, registry: ARC_NAIRATAG_REGISTRY_ADDRESS },
  };
  const bytes = new TextEncoder().encode(JSON.stringify(metadata));
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return `data:application/json;base64,${btoa(binary)}`;
}

export async function updateArcAgentRegistrationUri({ fromAddress, agentId, metadataURI }) {
  if (!fromAddress || !isAddress(fromAddress)) throw new Error('Connected wallet address is required.');
  if (agentId === undefined || agentId === null || !metadataURI) throw new Error('Agent ID and registration metadata are required.');
  const provider = getEthereumProvider();
  if (!provider) throw new Error('No EVM wallet provider detected.');
  const chainId = Number.parseInt(await provider.request({ method: 'eth_chainId' }), 16);
  if (chainId !== activeArcChain.id) await switchOrAddArcNetwork();
  const walletClient = createWalletClient({ chain: activeArcChain, transport: custom(provider) });
  const hash = await walletClient.writeContract({
    account: getAddress(fromAddress),
    address: ARC_ERC8004_IDENTITY_REGISTRY,
    abi: ERC8004_IDENTITY_ABI,
    functionName: 'setAgentURI',
    args: [BigInt(String(agentId)), metadataURI],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 30000 });
  if (receipt.status !== 'success') throw new Error(`ERC-8004 tag link update failed. Transaction: ${hash}`);
  return { txHash: hash, receipt, metadataURI, explorerUrl: `${activeArcChain.blockExplorers.default.url}/tx/${hash}` };
}

/** Register a NairaTag agent, then attach the final self-referencing ERC-8004 file. */
export async function registerNairaTagAgent({ fromAddress, tag }) {
  const provisionalURI = buildNairaTagAgentMetadataUri(tag);
  const registration = await registerAiAgent({ fromAddress, metadataURI: provisionalURI });
  const finalURI = buildNairaTagAgentMetadataUri(tag, registration.agentId);
  try {
    const linked = await updateArcAgentRegistrationUri({ fromAddress, agentId: registration.agentId, metadataURI: finalURI });
    return { ...registration, finalMetadataURI: finalURI, linkTxHash: linked.txHash };
  } catch (error) {
    error.partialRegistration = {
      agentId: registration.agentId,
      metadataURI: finalURI,
      registrationTxHash: registration.txHash,
    };
    throw error;
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
  const chainId = Number.parseInt(await provider.request({ method: 'eth_chainId' }), 16);
  if (chainId !== activeArcChain.id) await switchOrAddArcNetwork();

  const walletClient = createWalletClient({
    chain: activeArcChain,
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
  let assignedId = null;
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== ARC_ERC8004_IDENTITY_REGISTRY.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({
        abi: [parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)')],
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === 'Transfer' && decoded.args.to.toLowerCase() === getAddress(fromAddress).toLowerCase()) {
        assignedId = decoded.args.tokenId.toString();
      }
    } catch { /* Ignore non-ERC721 logs in the receipt. */ }
  }
  if (!assignedId) throw new Error(`Registration was mined, but Arc did not return the new ERC-8004 agent ID. Transaction: ${txHash}`);

  return {
    success: true,
    txHash,
    receipt,
    agentId: assignedId,
    metadataURI: cleanURI,
    explorerUrl: `${activeArcChain.blockExplorers.default.url}/tx/${txHash}`,
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
    chain: activeArcChain,
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
    explorerUrl: `${activeArcChain.blockExplorers.default.url}/tx/${txHash}`,
  };
}
