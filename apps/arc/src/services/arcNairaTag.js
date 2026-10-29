import { createWalletClient, custom, decodeEventLog, isAddress, parseAbiItem } from 'viem';
import { ARC_NAIRATAG_REGISTRY_ADDRESS, ARC_NAIRATAG_RESOLVER_ADDRESS } from '../config/arc.js';
import { activeArcChain, getEthereumProvider, publicClient, switchOrAddArcNetwork } from './arcPayment.js';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const ZERO_NODE = `0x${'0'.repeat(64)}`;
const ARC_NAIRATAG_ABI = [
  { type: 'function', name: 'ownerOf', stateMutability: 'view', inputs: [{ name: 'tag', type: 'string' }], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'primaryTagOf', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: '', type: 'bytes32' }] },
  { type: 'function', name: 'getRecord', stateMutability: 'view', inputs: [{ name: 'node', type: 'bytes32' }], outputs: [{ name: '', type: 'tuple', components: [{ name: 'owner', type: 'address' }, { name: 'resolver', type: 'address' }, { name: 'registeredAt', type: 'uint64' }, { name: 'canonical', type: 'string' }] }] },
  { type: 'function', name: 'claim', stateMutability: 'nonpayable', inputs: [{ name: 'tag', type: 'string' }, { name: 'targetResolver', type: 'address' }], outputs: [{ name: 'node', type: 'bytes32' }] },
];
const TAG_CLAIMED_EVENT = parseAbiItem('event TagClaimed(bytes32 indexed node, string canonical, string rawTag, address indexed owner, address resolver)');

export function normalizeArcTag(rawTag) {
  const tag = String(rawTag || '').trim().replace(/^[₦$@#]/, '').toLowerCase();
  if (tag.length < 3 || tag.length > 32) throw new Error('NairaTags must be between 3 and 32 characters.');
  if (!/^[a-z0-9_]+$/.test(tag) || tag.startsWith('_') || tag.endsWith('_') || tag.includes('__')) {
    throw new Error('Use letters, numbers, or single underscores inside the NairaTag.');
  }
  return tag;
}

export const RESERVED_PROTOCOL_AGENTS = {
  nairatag: { owner: '0x653f773C9062e71A6554b42a9525fcD47fCC1693', name: 'NairaTag Core Protocol' },
  bloom: { owner: '0x7c26a1F03339E2Ea74D261D97f5ab9C38181AF26', name: 'NairaTag Sovereign Agent' },
  defillama: { owner: '0xbfA1f73F632a54bFd04e9925dB6006135FcA6Ce6', name: 'DefiLlama Oracle' },
  meteo: { owner: '0x235d0Aa81F1c375c3325214f2dd7F205487eae36', name: 'Open-Meteo Weather' },
  coingecko: { owner: '0x1abfC727335489f2914Effd7e19C19C309850Ef8', name: 'CoinGecko FX' },
  arc: { owner: '0x653f773C9062e71A6554b42a9525fcD47fCC1693', name: 'Arc Protocol' },
};

async function getWalletTagRecord(walletAddress) {
  if (!walletAddress || !isAddress(walletAddress)) return null;
  const node = await publicClient.readContract({
    address: ARC_NAIRATAG_REGISTRY_ADDRESS,
    abi: ARC_NAIRATAG_ABI,
    functionName: 'primaryTagOf',
    args: [walletAddress],
  });
  if (node === ZERO_NODE) return null;
  const record = await publicClient.readContract({
    address: ARC_NAIRATAG_REGISTRY_ADDRESS,
    abi: ARC_NAIRATAG_ABI,
    functionName: 'getRecord',
    args: [node],
  });
  return { node, record };
}

export async function checkArcTagAvailability(rawTag, walletAddress = null) {
  let cleanTag;
  try {
    cleanTag = normalizeArcTag(rawTag);
  } catch (error) {
    return { available: false, reason: error.message };
  }

  // 1. Reserved platform & autonomous marketplace agents
  if (RESERVED_PROTOCOL_AGENTS[cleanTag]) {
    const agent = RESERVED_PROTOCOL_AGENTS[cleanTag];
    return {
      available: false,
      isTaken: true,
      owner: agent.owner,
      cleanTag,
      canonicalTag: `₦${cleanTag.toUpperCase()}`,
      reason: `₦${cleanTag.toUpperCase()} is an official sovereign protocol agent on Arc.`,
    };
  }

  // 2. Strict 1-Tag-Per-Account check across local storage & session
  if (typeof window !== 'undefined' && walletAddress) {
    const norm = String(walletAddress).toLowerCase();
    try {
      const activeClaim = JSON.parse(window.localStorage.getItem('nairatag_claimed_tag_v1') || 'null');
      if (activeClaim?.tag) {
        const activeClean = String(activeClaim.tag).replace(/^[₦$@#]/, '').toLowerCase();
        if (activeClean !== cleanTag) {
          return {
            available: false,
            walletRestricted: true,
            existingTag: activeClaim.tag,
            cleanTag,
            reason: `This account already owns ₦${activeClean.toUpperCase()} on Arc. Each sovereign account is limited to 1 NairaTag.`,
          };
        }
      }

      const localClaims = JSON.parse(window.localStorage.getItem('nairatag_local_claims_v1') || '{}');
      if (localClaims[cleanTag]) {
        return {
          available: false,
          isTaken: true,
          owner: localClaims[cleanTag].owner,
          cleanTag,
          canonicalTag: `₦${cleanTag.toUpperCase()}`,
          reason: `₦${cleanTag.toUpperCase()} is already claimed on Arc.`,
        };
      }
      const existing = Object.values(localClaims).find(
        (item) => String(item.owner).toLowerCase() === norm && item.tag.toLowerCase() !== 'bloom'
      );
      if (existing && existing.tag.toLowerCase() !== cleanTag) {
        return {
          available: false,
          walletRestricted: true,
          existingTag: existing.tag,
          cleanTag,
          reason: `This account already owns ₦${existing.tag.toUpperCase()} on Arc. Each sovereign account is limited to 1 NairaTag.`,
        };
      }
    } catch {}
  }

  // 3. Onchain registry checks
  try {
    const [owner, walletTag] = await Promise.all([
      publicClient.readContract({ address: ARC_NAIRATAG_REGISTRY_ADDRESS, abi: ARC_NAIRATAG_ABI, functionName: 'ownerOf', args: [cleanTag] }),
      getWalletTagRecord(walletAddress),
    ]);
    if (owner !== ZERO_ADDRESS) {
      return { available: false, isTaken: true, owner, cleanTag, canonicalTag: `₦${cleanTag.toUpperCase()}`, reason: `₦${cleanTag.toUpperCase()} is already claimed on Arc.` };
    }
    if (walletTag) {
      const existingTag = walletTag.record.canonical || walletTag.record[3] || '';
      if (existingTag && existingTag.toLowerCase() !== cleanTag) {
        return { available: false, walletRestricted: true, existingTag, cleanTag, reason: `This account already owns ₦${existingTag.toUpperCase()} on Arc. Each sovereign account is limited to 1 NairaTag.` };
      }
    }
    return { available: true, cleanTag, canonicalTag: `₦${cleanTag.toUpperCase()}` };
  } catch (error) {
    return { available: true, cleanTag, canonicalTag: `₦${cleanTag.toUpperCase()}` };
  }
}

export async function getArcTagForWallet(walletAddress) {
  if (!walletAddress) return { hasTag: false, tag: null };
  try {
    const result = await getWalletTagRecord(walletAddress);
    if (result) {
      const record = result.record;
      const tag = record.canonical || record[3] || '';
      if (tag) return { hasTag: true, tag: `₦${tag.toUpperCase()}`, cleanTag: tag.toLowerCase(), network: 'Arc Mainnet', claimedAt: Number(record.registeredAt ?? record[2] ?? 0n) * 1000 };
    }
  } catch (error) {
    console.warn('[getArcTagForWallet onchain check]', error.shortMessage || error.message);
  }
  // Local claims fallback with strict protocol agent protection
  if (typeof window !== 'undefined') {
    try {
      const norm = String(walletAddress).toLowerCase();
      const localClaims = JSON.parse(window.localStorage.getItem('nairatag_local_claims_v1') || '{}');

      // Sanitize: ₦bloom is the protocol agent (0x7c26...AF26), not a user tag
      if (localClaims.bloom && String(localClaims.bloom.owner).toLowerCase() !== '0x7c26a1f03339e2ea74d261d97f5ab9c38181af26') {
        localClaims.bloom.owner = '0x7c26a1F03339E2Ea74D261D97f5ab9C38181AF26';
        window.localStorage.setItem('nairatag_local_claims_v1', JSON.stringify(localClaims));
      }

      // Check user's sovereign claim
      const activeClaim = JSON.parse(window.localStorage.getItem('nairatag_claimed_tag_v1') || 'null');
      if (activeClaim?.tag) {
        const clean = String(activeClaim.tag).replace(/^[₦$@#]/, '').toLowerCase();
        // If bloom was mistakenly stored in claimed_tag_v1 for this user, sanitize it to ola if ola was claimed
        if (clean !== 'bloom') {
          return { hasTag: true, tag: `₦${clean.toUpperCase()}`, cleanTag: clean, network: 'Arc Mainnet', claimedAt: Date.now() };
        }
      }

      // Find user-owned non-system tag in local claims
      const match = Object.values(localClaims).find(
        (item) => String(item.owner).toLowerCase() === norm && item.tag.toLowerCase() !== 'bloom'
      );
      if (match) {
        return { hasTag: true, tag: `₦${match.tag.toUpperCase()}`, cleanTag: match.tag.toLowerCase(), network: 'Arc Mainnet', claimedAt: match.claimedAt || Date.now() };
      }
    } catch {}
  }
  return { hasTag: false, tag: null };
}

export async function claimArcNairaTag({ rawTag, walletAddress }) {
  const cleanTag = normalizeArcTag(rawTag);
  if (!walletAddress || !isAddress(walletAddress)) throw new Error('Connect a valid Arc wallet to claim a NairaTag.');
  const provider = getEthereumProvider();
  if (!provider) throw new Error('No EVM wallet provider detected.');
  const chainId = Number.parseInt(await provider.request({ method: 'eth_chainId' }), 16);
  if (chainId !== activeArcChain.id) await switchOrAddArcNetwork();

  const status = await checkArcTagAvailability(cleanTag, walletAddress);
  if (!status.available) throw new Error(status.reason || 'This NairaTag cannot be claimed.');

  const walletClient = createWalletClient({ chain: activeArcChain, transport: custom(provider) });
  const hash = await walletClient.writeContract({
    account: walletAddress,
    address: ARC_NAIRATAG_REGISTRY_ADDRESS,
    abi: ARC_NAIRATAG_ABI,
    functionName: 'claim',
    args: [cleanTag, ARC_NAIRATAG_RESOLVER_ADDRESS],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 30000 });
  if (receipt.status !== 'success') throw new Error(`Arc tag claim failed. Transaction: ${hash}`);

  let claim = null;
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== ARC_NAIRATAG_REGISTRY_ADDRESS.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({ abi: [TAG_CLAIMED_EVENT], data: log.data, topics: log.topics });
      if (decoded.eventName === 'TagClaimed') claim = decoded.args;
    } catch { /* Ignore unrelated logs in the same receipt. */ }
  }

  return {
    success: true,
    cleanTag,
    tag: claim?.canonical || cleanTag,
    owner: claim?.owner || walletAddress,
    txHash: hash,
    receipt,
    explorerUrl: `${activeArcChain.blockExplorers.default.url}/tx/${hash}`,
  };
}
