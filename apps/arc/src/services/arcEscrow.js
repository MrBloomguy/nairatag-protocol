/**
 * @file arcEscrow.js
 * @description Arc Mainnet NairaTagBountyEscrow Service using Viem.
 * Interacts with NairaTagBountyEscrow deployed at 0x69f1af5b02703ad0f9e59892e6bc472b6c5599ab
 * Handles:
 * - On-chain bounty locking in native USDC with prior approval
 * - Worker assignment (agent/human tag)
 * - Cryptographic deliverable submission hash recording
 * - On-chain conditional payout release (transfers locked USDC to worker)
 * - Refund upon expiration
 */

import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  parseUnits,
  formatUnits,
  isAddress,
  getAddress,
  encodeFunctionData,
  keccak256,
  stringToHex,
  toBytes,
} from 'viem';
import {
  arcMainnet,
  arcTestnet,
  isArcMainnet,
  ARC_USDC_ADDRESS,
  ARC_USDC_DECIMALS,
  ERC20_ABI,
  ARC_MAINNET_ESCROW_ADDRESS,
  ARC_NAIRATAG_ESCROW_ADDRESS,
  NAIRATAG_BOUNTY_ESCROW_ABI,
} from '../config/arc.js';
import { getEthereumProvider } from './arcPayment.js';

export const activeArcChain = arcMainnet;

export const publicClient = createPublicClient({
  chain: activeArcChain,
  transport: http(),
});

/**
 * Returns canonical escrow contract address on Arc Mainnet
 */
export function getEscrowContractAddress() {
  return ARC_NAIRATAG_ESCROW_ADDRESS;
}

/**
 * Converts a string taskId (e.g. "task_12345" or UUID) to a deterministic bytes32 identifier.
 */
export function taskIdToBytes32(taskId) {
  if (!taskId) throw new Error('Task ID is required');
  const str = String(taskId).trim();
  // If already bytes32 format (0x + 64 hex)
  if (/^0x[0-9a-fA-F]{64}$/.test(str)) {
    return str;
  }
  return keccak256(stringToHex(str));
}

/**
 * Reads on-chain bounty state from NairaTagBountyEscrow.
 */
export async function getOnChainBounty(taskId) {
  try {
    const bytes32Id = taskIdToBytes32(taskId);
    const bounty = await publicClient.readContract({
      address: ARC_NAIRATAG_ESCROW_ADDRESS,
      abi: NAIRATAG_BOUNTY_ESCROW_ABI,
      functionName: 'getBounty',
      args: [bytes32Id],
    });

    const statusMap = ['Open', 'Assigned', 'Submitted', 'Released', 'Refunded'];
    return {
      exists: bounty.reward > 0n,
      id: bounty.id,
      creator: bounty.creator,
      creatorTag: bounty.creatorTag,
      token: bounty.token,
      rewardRaw: bounty.reward,
      rewardFormatted: formatUnits(bounty.reward, ARC_USDC_DECIMALS),
      assignee: bounty.assignee,
      assigneeTag: bounty.assigneeTag,
      deadline: Number(bounty.deadline),
      deadlineDate: new Date(Number(bounty.deadline) * 1000).toISOString(),
      statusIndex: Number(bounty.status),
      statusLabel: statusMap[Number(bounty.status)] || 'Unknown',
      deliverableHash: bounty.deliverableHash,
    };
  } catch (err) {
    console.warn('[getOnChainBounty error]', err.message);
    return null;
  }
}

/**
 * Locks USDC into NairaTagBountyEscrow on Arc Mainnet.
 * Automatically checks and executes ERC-20 approve() if current allowance is insufficient.
 */
export async function lockTaskBountyOnChain({
  taskId,
  creatorTag,
  amountUsdc,
  deadlineDays = 14,
  fromAddress,
  onStatusUpdate = () => {},
}) {
  if (!fromAddress || !isAddress(fromAddress)) {
    throw new Error('Valid creator wallet address is required.');
  }

  const cleanAmount = String(amountUsdc).trim();
  if (!cleanAmount || isNaN(Number(cleanAmount)) || Number(cleanAmount) <= 0) {
    throw new Error('Please enter a valid reward amount greater than 0.');
  }

  const rewardUnits = parseUnits(cleanAmount, ARC_USDC_DECIMALS);
  const bytes32Id = taskIdToBytes32(taskId);
  const deadlineSeconds = BigInt(Math.floor(Date.now() / 1000) + deadlineDays * 86400);

  const provider = getEthereumProvider();
  if (!provider) throw new Error('EVM wallet provider unavailable.');

  const walletClient = createWalletClient({
    chain: activeArcChain,
    transport: custom(provider),
  });

  // 1. Check current USDC allowance for Escrow contract
  onStatusUpdate({ step: 'checking_allowance', message: 'Checking USDC escrow allowance...' });
  const allowance = await publicClient.readContract({
    address: ARC_USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [getAddress(fromAddress), ARC_NAIRATAG_ESCROW_ADDRESS],
  });

  if (allowance < rewardUnits) {
    onStatusUpdate({ step: 'approving', message: 'Approving USDC for Escrow deposit...' });
    const approveTx = await walletClient.writeContract({
      account: getAddress(fromAddress),
      address: ARC_USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [ARC_NAIRATAG_ESCROW_ADDRESS, rewardUnits * 10n], // Approve enough to avoid repeat popups
    });

    onStatusUpdate({ step: 'waiting_approval', message: 'Confirming USDC approval on Arc...' });
    await publicClient.waitForTransactionReceipt({ hash: approveTx });
  }

  // 2. Call lockBounty on NairaTagBountyEscrow
  onStatusUpdate({ step: 'locking', message: 'Locking USDC bounty into Escrow contract...' });
  const cleanCreatorTag = String(creatorTag || '').replace(/^[₦$@#]/, '').trim();

  const lockTx = await walletClient.writeContract({
    account: getAddress(fromAddress),
    address: ARC_NAIRATAG_ESCROW_ADDRESS,
    abi: NAIRATAG_BOUNTY_ESCROW_ABI,
    functionName: 'lockBounty',
    args: [bytes32Id, cleanCreatorTag, ARC_USDC_ADDRESS, rewardUnits, deadlineSeconds],
  });

  onStatusUpdate({ step: 'confirming', message: 'Waiting for Arc Mainnet finality...' });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: lockTx });

  if (receipt.status !== 'success') {
    throw new Error(`Escrow deposit reverted on Arc. Tx Hash: ${lockTx}`);
  }

  return {
    txHash: lockTx,
    contractAddress: ARC_NAIRATAG_ESCROW_ADDRESS,
    explorerUrl: `${activeArcChain.blockExplorers.default.url}/tx/${lockTx}`,
    blockNumber: Number(receipt.blockNumber),
    bountyId: bytes32Id,
    amount: cleanAmount,
  };
}

/**
 * Assigns worker to an open bounty in NairaTagBountyEscrow.
 */
export async function assignTaskWorkerOnChain({
  taskId,
  workerAddress,
  workerTag = '',
  fromAddress,
  onStatusUpdate = () => {},
}) {
  if (!fromAddress || !isAddress(fromAddress)) {
    throw new Error('Valid wallet is required.');
  }
  if (!workerAddress || !isAddress(workerAddress)) {
    throw new Error('Valid worker wallet address is required.');
  }

  const bytes32Id = taskIdToBytes32(taskId);
  const cleanTag = String(workerTag || '').replace(/^[₦$@#]/, '').trim();

  const provider = getEthereumProvider();
  if (!provider) throw new Error('EVM wallet provider unavailable.');

  const walletClient = createWalletClient({
    chain: activeArcChain,
    transport: custom(provider),
  });

  onStatusUpdate({ step: 'assigning', message: 'Assigning worker on-chain...' });
  const tx = await walletClient.writeContract({
    account: getAddress(fromAddress),
    address: ARC_NAIRATAG_ESCROW_ADDRESS,
    abi: NAIRATAG_BOUNTY_ESCROW_ABI,
    functionName: 'assignAgent',
    args: [bytes32Id, getAddress(workerAddress), cleanTag],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
  return {
    txHash: tx,
    explorerUrl: `${activeArcChain.blockExplorers.default.url}/tx/${tx}`,
    blockNumber: Number(receipt.blockNumber),
  };
}

/**
 * Worker records cryptographic deliverable hash on-chain in NairaTagBountyEscrow.
 */
export async function submitDeliverableOnChain({
  taskId,
  deliverableText,
  fromAddress,
  onStatusUpdate = () => {},
}) {
  if (!fromAddress || !isAddress(fromAddress)) {
    throw new Error('Valid worker wallet is required.');
  }

  const bytes32Id = taskIdToBytes32(taskId);
  const deliverableHash = keccak256(stringToHex(String(deliverableText || '').trim()));

  const provider = getEthereumProvider();
  if (!provider) throw new Error('EVM wallet provider unavailable.');

  const walletClient = createWalletClient({
    chain: activeArcChain,
    transport: custom(provider),
  });

  onStatusUpdate({ step: 'submitting', message: 'Recording deliverable hash on Arc Mainnet...' });
  const tx = await walletClient.writeContract({
    account: getAddress(fromAddress),
    address: ARC_NAIRATAG_ESCROW_ADDRESS,
    abi: NAIRATAG_BOUNTY_ESCROW_ABI,
    functionName: 'submitDeliverable',
    args: [bytes32Id, deliverableHash],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
  return {
    txHash: tx,
    deliverableHash,
    explorerUrl: `${activeArcChain.blockExplorers.default.url}/tx/${tx}`,
    blockNumber: Number(receipt.blockNumber),
  };
}

/**
 * Releases locked USDC bounty to the assigned worker on Arc Mainnet.
 * Emits BountyReleased event and transfers USDC directly to worker!
 */
export async function releaseTaskBountyOnChain({
  taskId,
  fromAddress,
  onStatusUpdate = () => {},
}) {
  if (!fromAddress || !isAddress(fromAddress)) {
    throw new Error('Valid creator wallet is required.');
  }

  const bytes32Id = taskIdToBytes32(taskId);

  const provider = getEthereumProvider();
  if (!provider) throw new Error('EVM wallet provider unavailable.');

  const walletClient = createWalletClient({
    chain: activeArcChain,
    transport: custom(provider),
  });

  onStatusUpdate({ step: 'releasing', message: 'Releasing USDC escrow payout on Arc Mainnet...' });
  const tx = await walletClient.writeContract({
    account: getAddress(fromAddress),
    address: ARC_NAIRATAG_ESCROW_ADDRESS,
    abi: NAIRATAG_BOUNTY_ESCROW_ABI,
    functionName: 'releaseBounty',
    args: [bytes32Id],
  });

  onStatusUpdate({ step: 'confirming', message: 'Waiting for Arc confirmation...' });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });

  if (receipt.status !== 'success') {
    throw new Error(`Escrow payout release reverted on Arc. Tx Hash: ${tx}`);
  }

  return {
    txHash: tx,
    contractAddress: ARC_NAIRATAG_ESCROW_ADDRESS,
    explorerUrl: `${activeArcChain.blockExplorers.default.url}/tx/${tx}`,
    blockNumber: Number(receipt.blockNumber),
  };
}
