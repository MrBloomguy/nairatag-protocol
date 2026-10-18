import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { privateKeyToAccount, generatePrivateKey } = require('viem/accounts');
import { 
  DEFAULT_CELOTAGS_EIP712_DOMAIN, 
  CLAIM_AUTHORIZATION_TYPES, 
  CanonicalIdentifier,
  ClaimSignatureVerifier
} from '../src/index.js';

test('E2E Claims API with EIP-712 typed signing, strict gate, and negative defenses', async (t) => {
  // Ensure strict production mode is active for these tests
  process.env.CELOTAGS_STRICT_MODE = 'true';
  const { registerClaim, isProductionClaimMode } = await import('../../../api/claims.js');
  assert.equal(isProductionClaimMode(), true, 'Production claim mode must be active');

  const testPrivateKey = generatePrivateKey();
  const account = privateKeyToAccount(testPrivateKey);
  const tag = `₦E2E${Date.now().toString(36).slice(-5).toUpperCase()}`;
  const canonical = CanonicalIdentifier.parse(tag, 'ng');
  const nonce = String(Date.now());
  const deadline = Math.floor(Date.now() / 1000) + 600;

  // 1. Success Path: Valid EIP-712 ClaimAuthorization
  const signature = await account.signTypedData({
    domain: DEFAULT_CELOTAGS_EIP712_DOMAIN,
    types: CLAIM_AUTHORIZATION_TYPES,
    primaryType: 'ClaimAuthorization',
    message: {
      tag: canonical.display,
      urn: canonical.urn,
      owner: account.address.toLowerCase(),
      nonce,
      deadline,
      action: 'CLAIM_SOVEREIGN_IDENTITY'
    }
  });

  const claim = await registerClaim({
    tag,
    walletAddress: account.address,
    network: 'Celo Sepolia',
    signature,
    nonce,
    deadline,
    action: 'CLAIM_SOVEREIGN_IDENTITY',
    chainId: DEFAULT_CELOTAGS_EIP712_DOMAIN.chainId
  });

  assert.equal(claim.authorization, 'cryptographically_verified', 'Must be cryptographically verified');
  assert.equal(claim.tag.toLowerCase(), canonical.display.toLowerCase());
  assert.equal(claim.canonicalUrn || claim.urn, canonical.urn);

  // 2. Negative Test: Missing Signature in Production Mode
  const unauthWallet = privateKeyToAccount(generatePrivateKey());
  await assert.rejects(
    async () => {
      await registerClaim({
        tag: `₦NOAUTH${Date.now().toString(36).slice(-4).toUpperCase()}`,
        walletAddress: unauthWallet.address
      });
    },
    /MISSING_SIGNATURE/i,
    'Unauthenticated claims must be rejected in production mode'
  );

  // 3. Negative Test: Wrong Wallet (Signer does not match claimant)
  const attackerWallet = privateKeyToAccount(generatePrivateKey());
  const victimWallet = privateKeyToAccount(generatePrivateKey());
  const wrongWalletNonce = String(Date.now() + 10);
  const attackerSignature = await attackerWallet.signTypedData({
    domain: DEFAULT_CELOTAGS_EIP712_DOMAIN,
    types: CLAIM_AUTHORIZATION_TYPES,
    primaryType: 'ClaimAuthorization',
    message: {
      tag: '₦VICTIMTAG',
      urn: 'urn:celotag:ng:victimtag',
      owner: victimWallet.address.toLowerCase(),
      nonce: wrongWalletNonce,
      deadline,
      action: 'CLAIM_SOVEREIGN_IDENTITY'
    }
  });

  await assert.rejects(
    async () => {
      await registerClaim({
        tag: '₦VICTIMTAG',
        walletAddress: victimWallet.address,
        signature: attackerSignature,
        nonce: wrongWalletNonce,
        deadline
      });
    },
    /WRONG_WALLET_SIGNATURE/i,
    'Signatures from wrong wallet must be rejected'
  );

  // 4. Negative Test: Wrong Tag (Tampered message identifier)
  const honestWallet = privateKeyToAccount(generatePrivateKey());
  const honestNonce = String(Date.now() + 20);
  const honestSigForTagA = await honestWallet.signTypedData({
    domain: DEFAULT_CELOTAGS_EIP712_DOMAIN,
    types: CLAIM_AUTHORIZATION_TYPES,
    primaryType: 'ClaimAuthorization',
    message: {
      tag: '₦HONESTA',
      urn: 'urn:celotag:ng:honesta',
      owner: honestWallet.address.toLowerCase(),
      nonce: honestNonce,
      deadline,
      action: 'CLAIM_SOVEREIGN_IDENTITY'
    }
  });

  await assert.rejects(
    async () => {
      // Submitting Tag A signature for Tag B
      await registerClaim({
        tag: '₦HONESTB',
        walletAddress: honestWallet.address,
        signature: honestSigForTagA,
        nonce: honestNonce,
        deadline
      });
    },
    /WRONG_WALLET_SIGNATURE|WRONG_TAG_CLAIM/i,
    'Signatures for different tags must fail verification'
  );

  // 5. Negative Test: Expired Deadline
  const expiredWallet = privateKeyToAccount(generatePrivateKey());
  const expiredNonce = String(Date.now() + 30);
  const pastDeadline = Math.floor(Date.now() / 1000) - 30; // 30 seconds ago
  const expiredSig = await expiredWallet.signTypedData({
    domain: DEFAULT_CELOTAGS_EIP712_DOMAIN,
    types: CLAIM_AUTHORIZATION_TYPES,
    primaryType: 'ClaimAuthorization',
    message: {
      tag: '₦EXPIREDTAG',
      urn: 'urn:celotag:ng:expiredtag',
      owner: expiredWallet.address.toLowerCase(),
      nonce: expiredNonce,
      deadline: pastDeadline,
      action: 'CLAIM_SOVEREIGN_IDENTITY'
    }
  });

  await assert.rejects(
    async () => {
      await registerClaim({
        tag: '₦EXPIREDTAG',
        walletAddress: expiredWallet.address,
        signature: expiredSig,
        nonce: expiredNonce,
        deadline: pastDeadline
      });
    },
    /SIGNATURE_EXPIRED/i,
    'Expired authorization signatures must be rejected'
  );

  // 6. Negative Test: Replay Attack (Reusing consumed nonce)
  await assert.rejects(
    async () => {
      await registerClaim({
        tag: `₦REPLAY${Date.now().toString(36).slice(-4).toUpperCase()}`,
        walletAddress: account.address,
        signature,
        nonce,
        deadline
      });
    },
    /REPLAY_ATTACK_DETECTED|already owns/i,
    'Replaying previously consumed nonces must be rejected'
  );

  // 7. Negative Test: Wrong Chain ID / Domain Tampering
  const wrongChainWallet = privateKeyToAccount(generatePrivateKey());
  const wrongChainNonce = String(Date.now() + 40);
  const wrongChainDomain = {
    ...DEFAULT_CELOTAGS_EIP712_DOMAIN,
    chainId: 1 // Ethereum Mainnet instead of Celo
  };
  const wrongChainSig = await wrongChainWallet.signTypedData({
    domain: wrongChainDomain,
    types: CLAIM_AUTHORIZATION_TYPES,
    primaryType: 'ClaimAuthorization',
    message: {
      tag: '₦WRONGCHAIN',
      urn: 'urn:celotag:ng:wrongchain',
      owner: wrongChainWallet.address.toLowerCase(),
      nonce: wrongChainNonce,
      deadline,
      action: 'CLAIM_SOVEREIGN_IDENTITY'
    }
  });

  await assert.rejects(
    async () => {
      await registerClaim({
        tag: '₦WRONGCHAIN',
        walletAddress: wrongChainWallet.address,
        signature: wrongChainSig,
        nonce: wrongChainNonce,
        deadline,
        chainId: 1
      });
    },
    /INVALID_DOMAIN/i,
    'Signatures targeting unapproved chain IDs must be rejected'
  );

  // 8. Negative Test: Concurrent Duplicate Claims Race Condition
  const concurrentWallet1 = privateKeyToAccount(generatePrivateKey());
  const concurrentWallet2 = privateKeyToAccount(generatePrivateKey());
  const contestedTag = `₦CONTEST${Date.now().toString(36).slice(-4).toUpperCase()}`;
  const contestUrn = `urn:celotag:ng:${contestedTag.slice(1).toLowerCase()}`;
  const contestNonce1 = String(Date.now() + 50);
  const contestNonce2 = String(Date.now() + 51);

  const sig1 = await concurrentWallet1.signTypedData({
    domain: DEFAULT_CELOTAGS_EIP712_DOMAIN,
    types: CLAIM_AUTHORIZATION_TYPES,
    primaryType: 'ClaimAuthorization',
    message: {
      tag: contestedTag,
      urn: contestUrn,
      owner: concurrentWallet1.address.toLowerCase(),
      nonce: contestNonce1,
      deadline,
      action: 'CLAIM_SOVEREIGN_IDENTITY'
    }
  });

  const sig2 = await concurrentWallet2.signTypedData({
    domain: DEFAULT_CELOTAGS_EIP712_DOMAIN,
    types: CLAIM_AUTHORIZATION_TYPES,
    primaryType: 'ClaimAuthorization',
    message: {
      tag: contestedTag,
      urn: contestUrn,
      owner: concurrentWallet2.address.toLowerCase(),
      nonce: contestNonce2,
      deadline,
      action: 'CLAIM_SOVEREIGN_IDENTITY'
    }
  });

  // Launch both simultaneously
  const results = await Promise.allSettled([
    registerClaim({
      tag: contestedTag,
      walletAddress: concurrentWallet1.address,
      signature: sig1,
      nonce: contestNonce1,
      deadline
    }),
    registerClaim({
      tag: contestedTag,
      walletAddress: concurrentWallet2.address,
      signature: sig2,
      nonce: contestNonce2,
      deadline
    })
  ]);

  const fulfilled = results.filter(r => r.status === 'fulfilled');
  const rejected = results.filter(r => r.status === 'rejected');

  assert.equal(fulfilled.length, 1, 'Exactly one claim must succeed in concurrent race');
  assert.equal(rejected.length, 1, 'Duplicate concurrent claim must be rejected');
  assert.match(rejected[0].reason.message, /already claimed|CONCURRENT_CLAIM_CONFLICT/i);

  // Reset strict mode env
  delete process.env.CELOTAGS_STRICT_MODE;
});
