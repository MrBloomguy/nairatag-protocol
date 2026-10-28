/**
 * ═══════════════════════════════════════════════════════════════════════
 * NAIRATAG ONCHAIN CLAIMS & IDENTITY REGISTRY ENGINE
 * Enforces:
 * 1. 1 Tag Per User Limit (No user can claim twice)
 * 2. Uniqueness & Anti-Squatting (No user can claim already-claimed tags)
 * 3. Verified Explorer Feed (Real onchain & session claims, zero mock tickers)
 * ═══════════════════════════════════════════════════════════════════════
 */

import { 
  getSupabaseClaims, 
  findClaimByWallet, 
  findClaimByTag, 
  insertSupabaseClaim 
} from '../lib/supabase.js';
import { CanonicalIdentifier, ClaimSignatureVerifier } from '../packages/celotags-protocol/src/index.js';

// Cryptographic EIP-712 Claim Signature Verifier
const claimSignatureVerifier = new ClaimSignatureVerifier({
  mandatorySignatures: process.env.CELOTAGS_STRICT_MODE === 'true' || (process.env.NODE_ENV === 'production' && process.env.ALLOW_INSECURE_SESSION_CLAIMS !== 'true')
});

// In-flight tag lock to prevent concurrent claim race conditions
const pendingTagClaims = new Set();

/**
 * Determines whether production security gate is active.
 * Enforces mandatory EIP-712 cryptographic authorization unless
 * explicitly isolated dev/test mode is enabled.
 */
export function isProductionClaimMode() {
  if (process.env.CELOTAGS_STRICT_MODE === 'true') {
    return true;
  }
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_INSECURE_SESSION_CLAIMS !== 'true') {
    return true;
  }
  return false;
}

// In-memory claims cache (populated only by real verified claims)
const verifiedClaims = [];

// In-memory lookup maps
const walletToClaim = new Map();
const tagToClaim = new Map();

for (const c of verifiedClaims) {
  walletToClaim.set(c.address.toLowerCase(), c);
  tagToClaim.set(c.cleanTag.toLowerCase(), c);
}

// Protected sovereign keywords
const RESERVED_TAGS = new Set([
  'cbn', 'police', 'efcc', 'gov', 'npopc', 'inec', 'firs', 'admin', 'official', 'support', 'nairatag'
]);

export async function getClaimsList() {
  const fromDb = await getSupabaseClaims();
  if (fromDb && fromDb.length > 0) {
    return fromDb;
  }
  return [...verifiedClaims];
}

export async function checkTagAvailabilityAsync(rawTag, walletAddress = null) {
  let canonical;
  try {
    canonical = CanonicalIdentifier.parse(rawTag, 'ng');
  } catch (err) {
    return {
      available: false,
      reason: err.message
    };
  }

  const clean = canonical.handle;

  if (RESERVED_TAGS.has(clean)) {
    return {
      available: false,
      reason: `₦${clean} is a protected system identifier.`
    };
  }

  // 1. Check Supabase first for tag claim
  const dbTagClaim = await findClaimByTag(clean);
  if (dbTagClaim || tagToClaim.has(clean)) {
    const existing = dbTagClaim || tagToClaim.get(clean);
    return {
      available: false,
      isTaken: true,
      tag: `₦${clean}`,
      canonicalUrn: canonical.urn,
      owner: existing.address,
      network: existing.network,
      reason: `₦${clean} is already registered onchain.`
    };
  }

  // 2. Check 1-Tag-Per-Wallet rule in Supabase & memory
  if (walletAddress && /^0x[a-fA-F0-9]{40}$/i.test(walletAddress)) {
    const normalizedWallet = walletAddress.toLowerCase();
    const dbWalletClaim = await findClaimByWallet(normalizedWallet);
    if (dbWalletClaim || walletToClaim.has(normalizedWallet)) {
      const userExisting = dbWalletClaim || walletToClaim.get(normalizedWallet);
      return {
        available: false,
        walletRestricted: true,
        existingTag: userExisting.tag,
        reason: `1 Tag Per User Limit: Wallet ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)} already owns ${userExisting.tag}.`
      };
    }
  }

  return {
    available: true,
    tag: `₦${clean}`,
    cleanTag: clean,
    canonicalUrn: canonical.urn,
    display: canonical.display,
    network: 'Celo Sepolia (Chain 11142220)'
  };
}

export function checkTagAvailability(rawTag, walletAddress = null) {
  let canonical;
  try {
    canonical = CanonicalIdentifier.parse(rawTag, 'ng');
  } catch (err) {
    return { available: false, reason: err.message };
  }

  const clean = canonical.handle;

  if (RESERVED_TAGS.has(clean)) {
    return { available: false, reason: `₦${clean} is a protected system identifier.` };
  }
  if (tagToClaim.has(clean)) {
    const existing = tagToClaim.get(clean);
    return {
      available: false,
      isTaken: true,
      tag: `₦${clean}`,
      canonicalUrn: canonical.urn,
      owner: existing.address,
      network: existing.network,
      reason: `₦${clean} is already registered onchain.`
    };
  }
  if (walletAddress && /^0x[a-fA-F0-9]{40}$/i.test(walletAddress)) {
    const normalizedWallet = walletAddress.toLowerCase();
    if (walletToClaim.has(normalizedWallet)) {
      const userExisting = walletToClaim.get(normalizedWallet);
      return {
        available: false,
        walletRestricted: true,
        existingTag: userExisting.tag,
        reason: `1 Tag Per User Limit: Wallet ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)} already owns ${userExisting.tag}.`
      };
    }
  }
  return {
    available: true,
    tag: `₦${clean}`,
    cleanTag: clean,
    canonicalUrn: canonical.urn,
    display: canonical.display,
    network: 'Celo Sepolia (Chain 11142220)'
  };
}

/**
 * Retrieves a verified claim by wallet address or clean tag.
 * Checks in-memory cache and Supabase backend.
 */
export async function getClaimRecord(identifierOrWallet) {
  if (!identifierOrWallet) return null;
  const input = String(identifierOrWallet).trim();

  // 1. If EVM wallet address
  if (/^0x[a-fA-F0-9]{40}$/i.test(input)) {
    const norm = input.toLowerCase();
    const inMem = walletToClaim.get(norm);
    if (inMem) return inMem;
    const dbClaim = await findClaimByWallet(norm);
      if (dbClaim) {
        walletToClaim.set(norm, dbClaim);
        return dbClaim;
      }
    return null;
  }

  // 2. If tag or handle
  let handle = input.toLowerCase();
  try {
    const canonical = CanonicalIdentifier.parse(input, 'ng');
    handle = canonical.handle;
  } catch {}

  const inMem = tagToClaim.get(handle);
  if (inMem) return inMem;
  const dbClaim = await findClaimByTag(handle);
    if (dbClaim) {
      tagToClaim.set(handle, dbClaim);
      return dbClaim;
    }
  return null;
}

async function broadcastClaimOnChain(cleanTag) {
  const privateKey = process.env.CELO_RELAYER_PRIVATE_KEY || process.env.CELO_AGENT_PRIVATE_KEY;
  if (!privateKey || !privateKey.startsWith('0x') || privateKey.length !== 66) return null;
  try {
    const { createWalletClient, http } = await import('viem');
    const { privateKeyToAccount } = await import('viem/accounts');
    const celoSepolia = {
      id: 11142220,
      name: 'Celo Sepolia',
      nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
      rpcUrls: { default: { http: ['https://forno.celo-sepolia.celo-testnet.org'] } }
    };
    const account = privateKeyToAccount(privateKey);
    const client = createWalletClient({
      account,
      chain: celoSepolia,
      transport: http('https://forno.celo-sepolia.celo-testnet.org')
    });
    const hash = await client.writeContract({
      address: '0xb34518cC33314ee63841120bDd3Baa3BD1baf9e0',
      abi: [{
        name: 'claim',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'tag', type: 'string' }],
        outputs: [{ name: 'node', type: 'bytes32' }]
      }],
      functionName: 'claim',
      args: [`₦${cleanTag}`]
    });
    return hash;
  } catch (err) {
    console.error('Failed to broadcast claim on-chain:', err.message);
    return null;
  }
}

async function broadcastClaimToTelegram({ tag, cleanTag, walletAddress, network, txHash }) {
  const token = process.env.TELEGRAM_BOT_TOKEN || '8663138070:AAElmwCbB-vjoYXe3w__zqCxOUT5URIBMNk';
  const channel = process.env.TELEGRAM_CHANNEL_ID || '-1003984230029';
  if (!token) return;
  try {
    const explorerBase = /celo/i.test(network) ? 'https://celoscan.io/tx/' : 'https://explorer.arc.io/tx/';
    const explorerUrl = txHash ? `${explorerBase}${txHash}` : null;
    const shortWallet = walletAddress ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : '';
    const cleanUpper = String(cleanTag || tag || '').replace(/^[$₦@#]/, '').toUpperCase();
    const text = [
      `🎉 NEW NAIRATAG CLAIMED ON ${String(network || 'BLOCKCHAIN').toUpperCase()}`,
      '',
      `Tag: ₦${cleanUpper}`,
      `Owner: ${walletAddress} (${shortWallet})`,
      `Network: ${network || 'NairaTag Network'}`,
      ...(txHash ? [`Transaction: ${txHash}`] : []),
      ...(explorerUrl ? [`Explorer: ${explorerUrl}`] : []),
      '',
      'Claim your sovereign NairaTag: https://nairatag.ng/hub/claim.html'
    ].join('\n');

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: channel, text, disable_web_page_preview: false })
    });
  } catch (err) {
    console.warn('[Telegram Broadcast Warning]', err.message);
  }
}

export async function registerClaim({
  tag,
  walletAddress,
  network = 'Celo Sepolia',
  txHash = null,
  isSub = true,
  referrer = null,
  signature = null,
  message = null,
  nonce = null,
  deadline = null,
  action = 'CLAIM_SOVEREIGN_IDENTITY',
  chainId = null,
  verifyingContract = null
}) {
  const canonical = CanonicalIdentifier.parse(tag, 'ng');
  const clean = canonical.handle;
  const normalizedWallet = String(walletAddress || '').trim().toLowerCase();

  if (!/^0x[a-fA-F0-9]{40}$/.test(normalizedWallet)) {
    throw new Error('A valid 42-character EVM wallet address is required.');
  }

  // 1. Atomic in-flight tag reservation to prevent concurrent duplicate claims
  if (pendingTagClaims.has(clean)) {
    throw new Error(`CONCURRENT_CLAIM_CONFLICT: Claim for ₦${clean} is currently being processed.`);
  }
  pendingTagClaims.add(clean);

  try {
    const isProd = isProductionClaimMode();
    const effectiveChainId = chainId ? Number(chainId) : ((network && /mainnet/i.test(network)) ? 42220 : 11142220);

    // 2. Cryptographic EIP-712 Signature Enforcement
    let authorizationLevel = 'session_asserted';
    let recoveredSigner = null;

    if (signature) {
      if (nonce && deadline) {
        // EIP-712 Claim Authorization verification
        const verifyResult = await claimSignatureVerifier.verifyClaim({
          rawTag: tag,
          walletAddress: normalizedWallet,
          authorization: {
            signature,
            nonce,
            deadline: Number(deadline),
            action,
            chainId: effectiveChainId,
            verifyingContract
          },
          isProduction: isProd,
          expectedChainId: effectiveChainId,
          expectedContract: verifyingContract
        });
        authorizationLevel = verifyResult.authorizationLevel;
        recoveredSigner = verifyResult.recoveredSigner;
      } else {
        // In production mode, unanchored plain message signatures are rejected
        if (isProd) {
          throw new Error('MISSING_SIGNATURE: Nonce and deadline are mandatory for EIP-712 verification in production mode.');
        }

        // Backward-compatible plain message signature verification fallback ONLY in dev/test
        try {
          const { createRequire } = await import('node:module');
          const require = createRequire(import.meta.url);
          const { verifyMessage } = require('viem');
          const expectedMessage = message || `Claim NairaTag ${canonical.display} for ${normalizedWallet}`;
          const valid = await verifyMessage({
            address: normalizedWallet,
            message: expectedMessage,
            signature
          });
          if (!valid) {
            throw new Error('Invalid signature: wallet ownership verification failed.');
          }
          authorizationLevel = 'cryptographically_verified';
          recoveredSigner = normalizedWallet;
        } catch (err) {
          if (err.message.includes('Invalid signature')) throw err;
          console.warn('[Signature Verification Warning]', err.message);
        }
      }
    } else {
      if (isProd) {
        throw new Error('MISSING_SIGNATURE: A valid EIP-712 wallet signature is mandatory for sovereign claims in production mode.');
      }
    }

    // 3. Enforce 1 tag per wallet limit
    const existingWalletClaim = await findClaimByWallet(normalizedWallet);
    if (existingWalletClaim || walletToClaim.has(normalizedWallet)) {
      const existing = existingWalletClaim || walletToClaim.get(normalizedWallet);
      throw new Error(`Wallet already owns ${existing.tag}. 1 sovereign tag per wallet permitted.`);
    }

    // 4. Enforce tag uniqueness
    const existingTagClaim = await findClaimByTag(clean);
    if (existingTagClaim || tagToClaim.has(clean)) {
      throw new Error(`₦${clean} is already claimed.`);
    }

    let finalTx = txHash;
    if (!finalTx) finalTx = await broadcastClaimOnChain(clean);
    if (!finalTx || !/^0x[a-fA-F0-9]{64}$/.test(finalTx)) {
      throw new Error('The claim transaction was not submitted. Configure a working relayer or provide a confirmed transaction hash, then try again.');
    }

    const newClaim = await insertSupabaseClaim({
      tag: '₦' + clean,
      cleanTag: clean,
      walletAddress: normalizedWallet,
      network: network || 'Celo Sepolia',
      isSub,
      block: null,
      txHash: finalTx,
      reputation: null
    });
    newClaim.authorization = authorizationLevel;
    newClaim.urn = canonical.urn;
    verifiedClaims.unshift(newClaim);
    walletToClaim.set(normalizedWallet, newClaim);
    tagToClaim.set(clean, newClaim);

    broadcastClaimToTelegram({
      tag: '₦' + clean,
      cleanTag: clean,
      walletAddress: normalizedWallet,
      network: network || 'Celo Sepolia',
      txHash: finalTx
    }).catch(() => {});

    return newClaim;
  } finally {
    // Release atomic in-flight tag lock
    pendingTagClaims.delete(clean);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const { tag, wallet, action } = req.query || {};

  // GET /api/claims
  if (req.method === 'GET') {
    // 1. Resolve handle to address
    if (action === 'resolve' && tag) {
      const clean = String(tag || '').replace(/^[₦@#]/, '').trim().toLowerCase();
      const dbClaim = await findClaimByTag(clean);
      const existing = dbClaim || tagToClaim.get(clean);
      if (existing) {
        return res.status(200).json({ ok: true, tag: existing.tag, address: existing.address, network: existing.network });
      }
      return res.status(404).json({ ok: false, error: 'Tag not found' });
    }

    // 2. Query user claim by wallet address
    if (wallet && !tag && action !== 'check') {
      const normalizedWallet = String(wallet).trim().toLowerCase();
      const dbClaim = await findClaimByWallet(normalizedWallet);
      const userClaim = dbClaim || walletToClaim.get(normalizedWallet);
      return res.status(200).json({ ok: true, hasClaim: Boolean(userClaim), claim: userClaim || null });
    }

    // 3. Availability check
    if (action === 'check' || tag || wallet) {
      const check = await checkTagAvailabilityAsync(tag, wallet);
      if (!check.available) {
        const statusCode = check.walletRestricted ? 403 : 409;
        return res.status(statusCode).json({ ok: false, ...check });
      }
      return res.status(200).json({ ok: true, ...check });
    }

    // Return real verified claims stream from Supabase for explorer
    const allClaims = await getClaimsList();
    return res.status(200).json({
      ok: true,
      totalClaims: allClaims.length,
      claims: allClaims
    });
  }

  // POST /api/claims (Register verified claim in Supabase)
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const rawHandle = body?.handle || body?.tag;
      const account = body?.account || body?.walletAddress;
      const { network, txHash, isSub, referrer } = body || {};

      const check = await checkTagAvailabilityAsync(rawHandle, account);
      if (!check.available) {
        const statusCode = check.walletRestricted ? 403 : 409;
        return res.status(statusCode).json({ ok: false, error: check.reason, ...check });
      }

      const claim = await registerClaim({
        tag: rawHandle,
        walletAddress: account,
        network: network || 'Celo Sepolia',
        txHash,
        isSub,
        referrer,
        signature: body?.signature,
        message: body?.message,
        nonce: body?.nonce,
        deadline: body?.deadline,
        action: body?.action,
        chainId: body?.chainId,
        verifyingContract: body?.verifyingContract
      });

      return res.status(200).json({
        ok: true,
        claim,
        tag: claim.tag,
        cleanTag: claim.cleanTag,
        address: claim.address || claim.walletAddress,
        urn: claim.canonicalUrn || claim.urn,
        authorization: claim.authorization,
        message: `Successfully claimed ${claim.tag}!`
      });
    } catch (err) {
      return res.status(400).json({ ok: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
