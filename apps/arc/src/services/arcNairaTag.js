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

export async function checkArcTagAvailability(rawTag, walletAddress = null, email = null) {
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

  // 2. Authoritative Database Check (Strict 1-Tag-Per-Account in Supabase via /api/claims)
  try {
    if (walletAddress) {
      const norm = String(walletAddress).toLowerCase();
      const userClaimRes = await fetch(`/api/claims?wallet=${encodeURIComponent(norm)}`, { cache: 'no-store' });
      const userClaimData = await userClaimRes.json().catch(() => ({}));
      if (userClaimData?.hasClaim && userClaimData.claim?.cleanTag) {
        const existingTag = userClaimData.claim.cleanTag.toLowerCase();
        if (existingTag !== cleanTag) {
          return {
            available: false,
            walletRestricted: true,
            existingTag,
            cleanTag,
            reason: `This wallet already owns ₦${existingTag.toUpperCase()} on Arc. Each sovereign account is limited to 1 NairaTag.`,
          };
        }
      }
    }

    const tagCheckRes = await fetch(`/api/claims?action=check&tag=${encodeURIComponent(cleanTag)}`, { cache: 'no-store' });
    const tagCheckData = await tagCheckRes.json().catch(() => ({}));
    if (tagCheckData && tagCheckData.ok === false) {
      return {
        available: false,
        isTaken: true,
        cleanTag,
        canonicalTag: `₦${cleanTag.toUpperCase()}`,
        reason: tagCheckData.reason || `₦${cleanTag.toUpperCase()} is already claimed on Arc.`,
      };
    }
  } catch (apiErr) {
    console.warn('[checkArcTagAvailability DB check]:', apiErr.message);
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
  const norm = String(walletAddress).toLowerCase();

  // 1. Authoritative Database claim check (Supabase via /api/claims)
  try {
    const dbRes = await fetch(`/api/claims?wallet=${encodeURIComponent(norm)}`, { cache: 'no-store' });
    const dbData = await dbRes.json().catch(() => ({}));
    if (dbData?.hasClaim && dbData.claim?.tag) {
      const clean = String(dbData.claim.cleanTag || dbData.claim.tag).toLowerCase().replace(/^[₦$@#]/, '');
      return {
        hasTag: true,
        tag: `₦${clean.toUpperCase()}`,
        cleanTag: clean,
        network: dbData.claim.network || 'Arc Mainnet',
        claimedAt: dbData.claim.timestamp || Date.now(),
      };
    }
  } catch (dbErr) {
    console.warn('[getArcTagForWallet db check]:', dbErr.message);
  }

  // 2. Onchain record check
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
