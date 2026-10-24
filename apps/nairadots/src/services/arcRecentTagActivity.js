import { encodePacked, keccak256, parseAbiItem } from 'viem';
import { publicClient } from './arcPayment.js';
import {
  ARC_NAIRATAG_REGISTRY_ADDRESS,
  ARC_NAIRATAG_RESOLVER_ADDRESS,
  ARC_USDC_ADDRESS,
} from '../config/arc.js';

const CLAIMED_EVENT = parseAbiItem(
  'event TagClaimed(bytes32 indexed node, string canonical, string rawTag, address indexed owner, address resolver)',
);
const REVERSE_NAMESPACE = '0x11df080ac2434bfc6a41d7d54fdf1d3347cecce959d86d43a9b12ef7364dc224';
const REVERSE_RESOLVER_ABI = [
  { type: 'function', name: 'reverseNode', stateMutability: 'pure', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'bytes32' }] },
  { type: 'function', name: 'name', stateMutability: 'view', inputs: [{ name: 'node', type: 'bytes32' }], outputs: [{ name: '', type: 'string' }] },
];

/**
 * Reads the latest Arc registry claims and confirmed USDC transfers directly
 * from Arc. Usage is attached only to a wallet that owns a tag in the scanned
 * registry history; no sample names or inferred profiles are returned.
 */
export async function getRecentArcTagActivity(limit = 12) {
  const latestBlock = await publicClient.getBlockNumber();
  const [claimLogs, transferResponse] = await Promise.all([
    publicClient.getLogs({
      address: ARC_NAIRATAG_REGISTRY_ADDRESS,
      event: CLAIMED_EVENT,
      fromBlock: latestBlock > 2500n ? latestBlock - 2500n : 0n,
      toBlock: latestBlock,
    }),
    fetch(`https://explorer.testnet.arc.io/api/v2/tokens/${ARC_USDC_ADDRESS}/transfers`, {
      headers: { Accept: 'application/json' },
    }),
  ]);
  if (!transferResponse.ok) throw new Error(`Arc explorer activity returned ${transferResponse.status}.`);
  const transferPayload = await transferResponse.json();
  const transferLogs = (transferPayload.items || []).map((item) => ({
    args: { from: item.from?.hash, to: item.to?.hash, value: BigInt(item.total?.value || item.total?.decimal || 0) },
    blockNumber: BigInt(item.block_number || 0),
    transactionHash: item.tx_hash || item.transaction_hash || null,
    timestamp: item.timestamp,
  }));

  const newestClaimByOwner = new Map();
  const activities = [];

  for (const log of claimLogs) {
    const tag = String(log.args.canonical || log.args.rawTag || '').replace(/^[₦$@#]/, '').trim().toLowerCase();
    const owner = log.args.owner;
    if (!tag || !owner) continue;
    const claim = {
      tag,
      owner,
      activity: 'claimed',
      blockNumber: Number(log.blockNumber || 0n),
      transactionHash: log.transactionHash,
    };
    activities.push(claim);
    const ownerKey = owner.toLowerCase();
    const current = newestClaimByOwner.get(ownerKey);
    if (!current || current.blockNumber < claim.blockNumber) newestClaimByOwner.set(ownerKey, claim);
  }

  const transferWallets = [...new Set(transferLogs.flatMap((log) => [log.args.to, log.args.from])
    .filter((address) => address && !/^0x0{40}$/i.test(address))
    .map((address) => address.toLowerCase()))].slice(0, 12);
  const reverseNames = new Map();
  if (transferWallets.length) {
    try {
      const names = await Promise.all(transferWallets.map(async (address) => {
        const node = keccak256(encodePacked(['bytes32', 'address'], [REVERSE_NAMESPACE, address]));
        const name = await publicClient.readContract({
          address: ARC_NAIRATAG_RESOLVER_ADDRESS,
          abi: REVERSE_RESOLVER_ABI,
          functionName: 'name',
          args: [node],
        });
        return { address, name };
      }));
      names.forEach(({ address, name }) => {
        const tag = String(name || '').replace(/^[₦$@#]/, '').trim().toLowerCase();
        if (/^[a-z0-9_]{2,32}$/.test(tag)) reverseNames.set(address, tag);
      });
    } catch (error) {
      console.warn('[Recent Arc reverse tag lookup]', error.message);
    }
  }

  for (const log of transferLogs) {
    const from = log.args.from?.toLowerCase();
    const to = log.args.to?.toLowerCase();
    // A transfer means the tag was used as a recipient or sender identity.
    const claim = newestClaimByOwner.get(to)
      || newestClaimByOwner.get(from)
      || (reverseNames.has(to) ? { tag: reverseNames.get(to), owner: log.args.to } : null)
      || (reverseNames.has(from) ? { tag: reverseNames.get(from), owner: log.args.from } : null);
    if (!claim) continue;
    activities.push({
      ...claim,
      activity: 'used',
      blockNumber: Number(log.blockNumber || 0n),
      transactionHash: log.transactionHash,
      timestamp: log.timestamp || null,
    });
  }

  // Keep the most recent event per tag, then show tags in chain order.
  const newestByTag = new Map();
  for (const activity of activities) {
    const current = newestByTag.get(activity.tag);
    if (!current || current.blockNumber <= activity.blockNumber) newestByTag.set(activity.tag, activity);
  }

  return [...newestByTag.values()]
    .sort((a, b) => b.blockNumber - a.blockNumber)
    .slice(0, Math.max(0, limit));
}
