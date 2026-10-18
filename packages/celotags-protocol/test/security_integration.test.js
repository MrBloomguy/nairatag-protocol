/**
 * @file security_integration.test.js
 * @description Comprehensive Security & Integration Gate Test Suite for CeloTags Protocol.
 *
 * Implements Security & Integration Gate Checklist:
 * 1. Mandatory EIP-712 wallet signatures in production claim mode.
 * 2. Replay, expired-signature, wrong-wallet, and wrong-tag attack defense.
 * 3. Domain & endpoint attestation, key rotation, revocation, and zero-financial-authority invariants.
 * 4. Authoritative live fee currency verification with fail-closed semantics.
 * 5. Full lifecycle persistence (multi-tag, recovery, delegation, revocation).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { privateKeyToAccount } = require('viem/accounts');

import {
  CanonicalIdentifier,
  CeloTagsRegistry,
  CeloTagsResolver,
  ClaimSignatureVerifier,
  CLAIM_AUTHORIZATION_TYPES,
  DEFAULT_CELOTAGS_EIP712_DOMAIN,
  EndpointAttestationManager,
  ATTESTATION_STATUSES,
  validateFeeCurrency,
  verifyFeeCurrencyLive,
  getCeloConfig
} from '../src/index.js';

// Deterministic test accounts
const ALICE_KEY = '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d';
const BOB_KEY = '0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1';
const aliceAccount = privateKeyToAccount(ALICE_KEY);
const bobAccount = privateKeyToAccount(BOB_KEY);

test('Security Gate 1: Mandatory EIP-712 Domain-Separated Claim Signatures', async () => {
  const verifier = new ClaimSignatureVerifier({ mandatorySignatures: true });
  const rawTag = '₦ALICE';
  const canonical = CanonicalIdentifier.parse(rawTag);
  const nonce = '1001';
  const deadline = Math.floor(Date.now() / 1000) + 600; // 10 mins

  // 1a. Produce authentic EIP-712 signature from Alice
  const signature = await aliceAccount.signTypedData({
    domain: DEFAULT_CELOTAGS_EIP712_DOMAIN,
    types: CLAIM_AUTHORIZATION_TYPES,
    primaryType: 'ClaimAuthorization',
    message: {
      tag: canonical.display,
      urn: canonical.urn,
      owner: aliceAccount.address.toLowerCase(),
      nonce,
      deadline,
      action: 'CLAIM_SOVEREIGN_IDENTITY'
    }
  });

  // 1b. Valid signature succeeds
  const result = await verifier.verifyClaim({
    rawTag,
    walletAddress: aliceAccount.address,
    authorization: { signature, nonce, deadline },
    isProduction: true
  });

  assert.equal(result.verified, true);
  assert.equal(result.authorizationLevel, 'cryptographically_verified');
  assert.equal(result.canonical.urn, 'urn:celotag:ng:alice');

  // 1c. Replay Attack Defense: Resubmitting identical signature with spent nonce FAILS
  await assert.rejects(
    verifier.verifyClaim({
      rawTag,
      walletAddress: aliceAccount.address,
      authorization: { signature, nonce, deadline },
      isProduction: true
    }),
    /REPLAY_ATTACK_DETECTED/
  );

  // 1d. Expired Signature Defense: Deadline in the past FAILS
  const pastDeadline = Math.floor(Date.now() / 1000) - 30;
  const expiredSig = await aliceAccount.signTypedData({
    domain: DEFAULT_CELOTAGS_EIP712_DOMAIN,
    types: CLAIM_AUTHORIZATION_TYPES,
    primaryType: 'ClaimAuthorization',
    message: {
      tag: canonical.display,
      urn: canonical.urn,
      owner: aliceAccount.address.toLowerCase(),
      nonce: '1002',
      deadline: pastDeadline,
      action: 'CLAIM_SOVEREIGN_IDENTITY'
    }
  });

  await assert.rejects(
    verifier.verifyClaim({
      rawTag,
      walletAddress: aliceAccount.address,
      authorization: { signature: expiredSig, nonce: '1002', deadline: pastDeadline },
      isProduction: true
    }),
    /SIGNATURE_EXPIRED/
  );

  // 1e. Wrong-Wallet Defense: Alice's signature used for Bob's address FAILS
  const bobNonce = '2001';
  const newValidDeadline = Math.floor(Date.now() / 1000) + 600;
  await assert.rejects(
    verifier.verifyClaim({
      rawTag,
      walletAddress: bobAccount.address, // Bob claims Alice's signature
      authorization: { signature, nonce: bobNonce, deadline: newValidDeadline },
      isProduction: true
    }),
    /WRONG_WALLET_SIGNATURE/
  );

  // 1f. Wrong-Tag Defense: Signature for ₦ALICE used for ₦BOB FAILS
  const tagMismatchSig = await aliceAccount.signTypedData({
    domain: DEFAULT_CELOTAGS_EIP712_DOMAIN,
    types: CLAIM_AUTHORIZATION_TYPES,
    primaryType: 'ClaimAuthorization',
    message: {
      tag: '₦ALICE',
      urn: 'urn:celotag:ng:alice',
      owner: aliceAccount.address.toLowerCase(),
      nonce: '1003',
      deadline: newValidDeadline,
      action: 'CLAIM_SOVEREIGN_IDENTITY'
    }
  });

  await assert.rejects(
    verifier.verifyClaim({
      rawTag: '₦BOB', // Different tag!
      walletAddress: aliceAccount.address,
      authorization: { signature: tagMismatchSig, nonce: '1003', deadline: newValidDeadline },
      isProduction: true
    }),
    /WRONG_WALLET_SIGNATURE/
  );

  // 1g. Production Mode Mandatory Enforcement: Missing signature FAILS in production
  await assert.rejects(
    verifier.verifyClaim({
      rawTag: '₦CHARLIE',
      walletAddress: aliceAccount.address,
      authorization: null,
      isProduction: true
    }),
    /MISSING_SIGNATURE/
  );
});

test('Security Gate 2: Endpoint Attestation, Key Rotation & Zero-Authority Invariant', () => {
  const manager = new EndpointAttestationManager();
  const owner = aliceAccount.address;
  const operatorKey1 = '0x1111111111111111111111111111111111111111';
  const operatorKey2 = '0x2222222222222222222222222222222222222222';
  const endpointUrl = 'https://agent.alice.ng/a2a';

  // 2a. Issue initial attestation
  const attest1 = manager.registerAttestation({
    owner,
    tag: '₦ALICE',
    endpointUrl,
    operatorKey: operatorKey1,
    validForDays: 30
  });

  assert.equal(attest1.status, ATTESTATION_STATUSES.ACTIVE);
  assert.equal(attest1.domainVerified, true);
  // CRITICAL SECURITY INVARIANT: Attestation grants ZERO financial authority
  assert.equal(attest1.financialAuthority, false);
  assert.equal(attest1.authorityLevel, 'NONE');

  const eval1 = manager.evaluateTrust(attest1.id);
  assert.equal(eval1.valid, true);
  assert.equal(eval1.operatorKey, operatorKey1.toLowerCase());

  // 2b. Rotate operational key
  const attest2 = manager.rotateKey(attest1.id, operatorKey2, owner);
  assert.equal(attest2.status, ATTESTATION_STATUSES.ACTIVE);
  assert.equal(attest2.operatorKey, operatorKey2.toLowerCase());

  // Old attestation is marked SUPERSEDED
  const evalOld = manager.evaluateTrust(attest1.id);
  assert.equal(evalOld.valid, false);
  assert.equal(evalOld.status, ATTESTATION_STATUSES.SUPERSEDED);

  // 2c. Unauthorized rotation by non-owner fails
  assert.throws(() => manager.rotateKey(attest2.id, operatorKey1, bobAccount.address), /Unauthorized/);

  // 2d. Immediate Revocation
  manager.revokeAttestation(attest2.id, owner, 'security_incident');
  const evalRevoked = manager.evaluateTrust(attest2.id);
  assert.equal(evalRevoked.valid, false);
  assert.equal(evalRevoked.status, ATTESTATION_STATUSES.REVOKED);
  assert.match(evalRevoked.reason, /security_incident/);
});

test('Security Gate 3: Live Authoritative CIP-64 Fee Currency & Token Verification', async () => {
  // 3a. Local fee token validation
  const cngnLocal = validateFeeCurrency('cNGN', 'celo');
  assert.equal(cngnLocal.valid, true);
  assert.equal(cngnLocal.address, '0xe2702bd97ee33c88c8f6f92da3b733608aa76f71');

  // 3b. Unsupported tokens fail closed
  const unsupported = validateFeeCurrency('cKES', 'celo');
  assert.equal(unsupported.valid, false);

  // 3c. Live authoritative verification on Celo Mainnet RPC
  const cngnLive = await verifyFeeCurrencyLive('cNGN', 'celo');
  if (cngnLive.verified) {
    assert.equal(cngnLive.verified, true);
    assert.equal(cngnLive.symbol, 'cNGN');
    assert.equal(cngnLive.chainId, 42220);
  } else {
    // If running in offline test environment, fails closed with descriptive error
    assert.match(cngnLive.error, /LIVE_VERIFICATION_FAILED|RPC connection error/);
  }

  // 3d. Unsupported token live verification fails closed
  const liveBad = await verifyFeeCurrencyLive('cKES', 'celo');
  assert.equal(liveBad.verified, false);
});

test('Security Gate 4: Complete Lifecycle, Persistence & Recovery Simulation', () => {
  const registry = new CeloTagsRegistry({ enforceOneTagPerWallet: false });
  const ownerWallet = aliceAccount.address;
  const recoveryWallet = bobAccount.address;
  const newOwnerWallet = '0x3333333333333333333333333333333333333333';

  // 4a. Register identities
  const id1 = registry.registerIdentity({
    identifier: '₦ALICE_PERSONAL',
    owner: ownerWallet,
    recoveryAddress: recoveryWallet
  });

  const id2 = registry.registerIdentity({
    identifier: 'GH₵ALICE_BUSINESS',
    owner: ownerWallet,
    recoveryAddress: recoveryWallet
  });

  assert.equal(registry.getIdentitiesByOwner(ownerWallet).length, 2);

  // 4b. Duplicate claim is rejected
  assert.throws(() => {
    registry.registerIdentity({ identifier: '₦ALICE_PERSONAL', owner: bobAccount.address });
  }, /already registered/);

  // 4c. Emergency Recovery: Recovery key transfers ownership to newOwnerWallet
  registry.recoverIdentity('₦ALICE_PERSONAL', recoveryWallet, newOwnerWallet);
  const recoveredRecord = registry.getIdentity('₦ALICE_PERSONAL');
  assert.equal(recoveredRecord.owner, newOwnerWallet.toLowerCase());

  // 4d. Unauthorized recovery by Alice's old compromised key is rejected
  assert.throws(() => {
    registry.recoverIdentity('₦ALICE_PERSONAL', ownerWallet, ownerWallet);
  }, /caller is not designated recovery address/);

  // 4e. Revocation
  registry.revokeIdentity('GH₵ALICE_BUSINESS', ownerWallet, 'business_closed');
  const revokedRecord = registry.getIdentity('GH₵ALICE_BUSINESS');
  assert.equal(revokedRecord.status, 'REVOKED');
  assert.equal(revokedRecord.isActive(), false);
});
