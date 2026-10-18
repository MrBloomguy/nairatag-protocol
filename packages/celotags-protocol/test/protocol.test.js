/**
 * @file protocol.test.js
 * @description Comprehensive Test Suite for @celotags/protocol.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CanonicalIdentifier,
  SUPPORTED_NAMESPACES,
  getNamespaceConfig,
  NamespaceRegistry,
  validateNamespaceDefinition,
  ASSET_VERIFICATION_STATUS,
  NAMESPACE_LIFECYCLE_STATUS,
  IdentityRecord,
  CeloTagsRegistry,
  CapabilityManifest,
  AgentProfile,
  CeloTagsResolver,
  PermissionGrant,
  PermissionManager,
  buildCip64Tx,
  getCeloConfig,
  validateFeeCurrency
} from '../src/index.js';

test('1. Multi-Country Namespace & Local Currency Tags Layer', (t) => {
  // Test Nigerian Flagship
  const idNg = CanonicalIdentifier.parse('₦SEGUN');
  assert.equal(idNg.namespace, 'ng');
  assert.equal(idNg.handle, 'segun');
  assert.equal(idNg.display, '₦SEGUN');
  assert.equal(idNg.urn, 'urn:celotag:ng:segun');
  assert.equal(idNg.scoped, '@ng:segun');
  assert.equal(idNg.currencyCode, 'NGN');

  // Test Ghana Namespace
  const idGh = CanonicalIdentifier.parse('GH₵AMA');
  assert.equal(idGh.namespace, 'gh');
  assert.equal(idGh.handle, 'ama');
  assert.equal(idGh.display, 'GH₵AMA');
  assert.equal(idGh.urn, 'urn:celotag:gh:ama');
  assert.equal(idGh.currencyCode, 'GHS');

  // Test Kenya Namespace
  const idKe = CanonicalIdentifier.parse('KSh·WANGARI');
  assert.equal(idKe.namespace, 'ke');
  assert.equal(idKe.handle, 'wangari');
  assert.equal(idKe.display, 'KSh·WANGARI');
  assert.equal(idKe.currencyCode, 'KES');

  // Test Mexico Namespace
  const idMx = CanonicalIdentifier.parse('MX$LUIS');
  assert.equal(idMx.namespace, 'mx');
  assert.equal(idMx.handle, 'luis');
  assert.equal(idMx.display, 'MX$LUIS');
  assert.equal(idMx.currencyCode, 'MXN');

  // Test URN Input Parsing
  const idUrn = CanonicalIdentifier.parse('urn:celotag:ng:chowdeck');
  assert.equal(idUrn.handle, 'chowdeck');
  assert.equal(idUrn.display, '₦CHOWDECK');

  // Test Scoped Input Parsing
  const idScoped = CanonicalIdentifier.parse('@gh:kofi');
  assert.equal(idScoped.namespace, 'gh');
  assert.equal(idScoped.handle, 'kofi');
  assert.equal(idScoped.display, 'GH₵KOFI');
});

test('2. Anti-Spoofing & Normalization Rules', () => {
  // NFKC Unicode Normalization converts full-width chars
  const idFullWidth = CanonicalIdentifier.parse('₦ＳＥＧＵＮ');
  assert.equal(idFullWidth.handle, 'segun');

  // Rejects invalid characters
  assert.throws(() => CanonicalIdentifier.parse('₦bad!tag'), /invalid characters/);

  // Rejects leading/trailing underscores
  assert.throws(() => CanonicalIdentifier.parse('₦_segun'), /cannot start or end with an underscore/);

  // Rejects consecutive underscores
  assert.throws(() => CanonicalIdentifier.parse('₦se__gun'), /cannot contain consecutive underscores/);

  // Rejects reserved handles
  assert.throws(() => CanonicalIdentifier.parse('₦admin'), /protected protocol reserved identifier/);
});

test('3. Identity Registry & Ownership Management', () => {
  const registry = new CeloTagsRegistry({ enforceOneTagPerWallet: true });
  const walletA = '0x1111111111111111111111111111111111111111';
  const walletB = '0x2222222222222222222222222222222222222222';

  // 3a. Register new identity
  const record = registry.registerIdentity({
    identifier: '₦SEGUN',
    owner: walletA,
    type: 'human'
  });
  assert.equal(record.identifier.urn, 'urn:celotag:ng:segun');
  assert.equal(record.owner, walletA.toLowerCase());
  assert.equal(record.isActive(), true);

  // 3b. Duplicate claim is rejected
  const avail = registry.checkAvailability('₦SEGUN');
  assert.equal(avail.available, false);

  // 3c. 1 Tag Per User Limit is enforced
  const availSecond = registry.checkAvailability('₦NEWTAG', walletA);
  assert.equal(availSecond.available, false);
  assert.equal(availSecond.walletRestricted, true);

  // 3d. Transfer ownership to walletB
  registry.transferOwnership('₦SEGUN', walletA, walletB);
  const updated = registry.getIdentity('₦SEGUN');
  assert.equal(updated.owner, walletB.toLowerCase());
});

test('4. Capability Manifest & Agent Discovery', () => {
  const cap = new CapabilityManifest({
    id: 'finance.cngn.transfer',
    name: 'Instant cNGN Transfer',
    category: 'finance',
    description: 'Autonomous micro-transfer settled via Celo CIP-64',
    pricing: { amount: 250, currency: 'cNGN' },
    regions: ['NG', 'GH']
  });

  assert.equal(cap.category, 'finance');
  assert.equal(cap.matches({ category: 'finance' }), true);
  assert.equal(cap.matches({ category: 'logistics' }), false);
  assert.equal(cap.matches({ region: 'NG' }), true);
  assert.equal(cap.matches({ region: 'US' }), false);
});

test('5. Agent Profile & ERC-8004 Serialization', () => {
  const profile = new AgentProfile({
    identifier: '₦SEGUN',
    name: '₦SEGUN Autonomous Agent',
    owner: '0x8217316A99D41c6dCe89D46e9A34c1143D1A914c',
    operator: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    category: 'personal',
    description: 'Personal orchestration and Celo payments agent',
    verificationLevel: 'integration_reported',
    capabilities: [
      {
        id: 'research.fintech.prices',
        name: 'Nigerian Price Research',
        category: 'research'
      }
    ],
    endpoints: {
      a2a: 'https://nairatag.ng/api/a2a/segun',
      mcp: 'https://nairatag.ng/api/mcp/segun'
    }
  });

  assert.equal(profile.identifier.urn, 'urn:celotag:ng:segun');
  assert.equal(profile.category, 'personal');
  assert.equal(profile.capabilities.length, 1);

  // Verify ERC-8004 Agent Card export
  const card = profile.toAgentCard();
  assert.equal(card.protocol, 'ERC-8004');
  assert.equal(card.celotag, 'urn:celotag:ng:segun');
  assert.equal(card.endpoints.a2a, 'https://nairatag.ng/api/a2a/segun');
});

test('6. Agentic Resolver End-to-End & Task Discovery', async () => {
  const registry = new CeloTagsRegistry();
  const resolver = new CeloTagsResolver({ registry });

  registry.registerIdentity({
    identifier: '₦CHOWDECK',
    owner: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    type: 'agent'
  });

  resolver.registerProfile({
    identifier: '₦CHOWDECK',
    name: 'Chowdeck Logistics Agent',
    owner: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    category: 'service',
    verificationLevel: 'cryptographically_evidenced',
    capabilities: [
      {
        id: 'logistics.delivery.dispatch',
        name: 'Lagos Fast Food Dispatch',
        category: 'logistics',
        regions: ['NG']
      }
    ]
  });

  // Resolve identity
  const resolved = await resolver.resolve('₦CHOWDECK');
  assert.equal(resolved.urn, 'urn:celotag:ng:chowdeck');
  assert.equal(resolved.address, '0x90f79bf6eb2c4f870365e785982e1f101e93b906');
  assert.equal(resolved.isAgent, true);
  assert.equal(resolved.verified, true);
  assert.equal(resolved.capabilities.length, 1);
  assert.equal(resolved.wallet.chain, 'celo');

  // Capability Discovery: find logistics Agents
  const found = resolver.discoverAgents({ category: 'logistics' });
  assert.equal(found.length, 1);
  assert.equal(found[0].identifier.handle, 'chowdeck');
});

test('7. Permissions & Security Engine ("Identity is not Authority")', () => {
  const pm = new PermissionManager();
  const userWallet = '0x8217316A99D41c6dCe89D46e9A34c1143D1A914c';
  const agentTag = '@ng:segun-agent';

  // 7a. Without grant, action is rejected
  const unauth = pm.evaluate({
    principal: userWallet,
    subject: agentTag,
    action: 'EXECUTE_BOUNDED_TRANSFER',
    amount: 1000
  });
  assert.equal(unauth.authorized, false);

  // 7b. Issue bounded permission grant (Max ₦5,000 per tx, ₦20,000 daily cap)
  const grant = pm.createGrant({
    principal: userWallet,
    subject: agentTag,
    action: 'EXECUTE_BOUNDED_TRANSFER',
    spendingLimits: {
      maxPerTx: 5000,
      dailyCap: 20000,
      currency: 'cNGN'
    }
  });

  // 7c. Allowed transfer <= 5000
  const allowed = pm.evaluate({
    principal: userWallet,
    subject: agentTag,
    action: 'EXECUTE_BOUNDED_TRANSFER',
    amount: 2500
  });
  assert.equal(allowed.authorized, true);

  // Record spend
  pm.recordExecution({ principal: userWallet, subject: agentTag, action: 'EXECUTE_BOUNDED_TRANSFER', amount: 2500 });

  // 7d. Exceeding per-tx limit requires explicit signature
  const overPerTx = pm.evaluate({
    principal: userWallet,
    subject: agentTag,
    action: 'EXECUTE_BOUNDED_TRANSFER',
    amount: 6000
  });
  assert.equal(overPerTx.authorized, false);
  assert.equal(overPerTx.requiresSignature, true);

  // 7e. Revocation works immediately
  pm.revokeGrant(grant.grantId, userWallet);
  const afterRevoke = pm.evaluate({
    principal: userWallet,
    subject: agentTag,
    action: 'EXECUTE_BOUNDED_TRANSFER',
    amount: 100
  });
  assert.equal(afterRevoke.authorized, false);
});

test('8. Celo CIP-64 Fee Abstraction Adapter', () => {
  const config = getCeloConfig('celo');
  assert.equal(config.chainId, 42220);
  assert.equal(config.tokens.cNGN.symbol, 'cNGN');

  const cip64Tx = buildCip64Tx({
    to: '0x1111111111111111111111111111111111111111',
    data: '0x'
  }, 'celo');

  assert.equal(cip64Tx.feeCurrency, config.tokens.cNGN.address);
  assert.equal(cip64Tx.chainId, 42220);

  // Validate fee currencies
  const validCngn = validateFeeCurrency('cNGN');
  assert.equal(validCngn.valid, true);

  const validCusd = validateFeeCurrency('cUSD');
  assert.equal(validCusd.valid, true);

  const validCreal = validateFeeCurrency('cREAL');
  assert.equal(validCreal.valid, true);

  // Unverified tokens cannot be used as fee currency
  const invalidFee = validateFeeCurrency('cKES');
  assert.equal(invalidFee.valid, false);
});

test('9. Dynamic Namespace Registration & Extensibility', () => {
  const customRegistry = new NamespaceRegistry();

  // Register Rwanda namespace (RW / RWF / FRw)
  const rwDef = customRegistry.registerNamespace({
    namespace: 'rw',
    countryCode: 'RW',
    countryName: 'Rwanda',
    currencyCode: 'RWF',
    currencyName: 'Rwandan Franc',
    symbol: 'FRw',
    prefixSymbol: 'FRw·',
    flag: '🇷🇼',
    lifecycleStatus: NAMESPACE_LIFECYCLE_STATUS.PILOT,
    paymentAssets: {
      cUSD: {
        chainId: 42220,
        address: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
        symbol: 'cUSD',
        decimals: 18,
        verificationStatus: ASSET_VERIFICATION_STATUS.VERIFIED
      }
    }
  });

  assert.equal(rwDef.namespace, 'rw');
  assert.equal(rwDef.currencyCode, 'RWF');
  assert.equal(rwDef.lifecycleStatus, NAMESPACE_LIFECYCLE_STATUS.PILOT);

  // Parse tag using custom registry
  const idRw = CanonicalIdentifier.parse('FRw·KAGAME', 'rw', customRegistry);
  assert.equal(idRw.namespace, 'rw');
  assert.equal(idRw.handle, 'kagame');
  assert.equal(idRw.display, 'FRw·KAGAME');
  assert.equal(idRw.urn, 'urn:celotag:rw:kagame');
  assert.equal(idRw.scoped, '@rw:kagame');

  // Rejects invalid namespace definition schema
  assert.throws(() => customRegistry.registerNamespace({ namespace: 'toolong', countryCode: 'XX', currencyCode: 'XXX', symbol: 'X' }), /Invalid namespace identifier/);
  assert.throws(() => customRegistry.registerNamespace({ namespace: 'xx', countryCode: 'invalid', currencyCode: 'XXX', symbol: 'X' }), /Invalid countryCode/);
  assert.throws(() => customRegistry.registerNamespace({ namespace: 'xx', countryCode: 'XX', currencyCode: 'XXXX', symbol: 'X' }), /Invalid currencyCode/);
});

test('10. Advanced Anti-Spoofing, Invisible Characters & Homoglyph Defense', () => {
  // 10a. Rejection of invisible / zero-width characters
  assert.throws(() => CanonicalIdentifier.parse('₦se\u200Bgun'), /disallowed invisible/);
  assert.throws(() => CanonicalIdentifier.parse('₦se\u00ADgun'), /disallowed invisible/);
  assert.throws(() => CanonicalIdentifier.parse('₦se\u2060gun'), /disallowed invisible/);
  assert.throws(() => CanonicalIdentifier.parse('₦se\uFEFFgun'), /disallowed invisible/);
  assert.throws(() => CanonicalIdentifier.parse('₦\u202Ereversed'), /disallowed invisible/);

  // 10b. Rejection of Cyrillic & Greek homoglyphs (bypasses naive NFKC)
  // Cyrillic Small Letter O: \u043E looks identical to Latin 'o'
  assert.throws(() => CanonicalIdentifier.parse('₦s\u043Egun'), /invalid characters/);
  // Cyrillic Small Letter A: \u0430 looks identical to Latin 'a'
  assert.throws(() => CanonicalIdentifier.parse('₦s\u0430m'), /invalid characters/);

  // 10c. Homoglyph confusable detection helper
  assert.equal(CanonicalIdentifier.areConfusable('segun', 'ＳＥＧＵＮ'), true);
  assert.equal(CanonicalIdentifier.areConfusable('segun', 'different'), false);

  // 10d. Reserved country codes & protocol keywords cannot be claimed as handles
  assert.throws(() => CanonicalIdentifier.parse('₦ng'), /protected protocol reserved identifier/);
  assert.throws(() => CanonicalIdentifier.parse('₦gh'), /protected protocol reserved identifier/);
  assert.throws(() => CanonicalIdentifier.parse('₦celo'), /protected protocol reserved identifier/);
  assert.throws(() => CanonicalIdentifier.parse('₦admin'), /protected protocol reserved identifier/);
});

test('11. Prefix Disambiguation & Single-Letter Delimiter Security', () => {
  // 11a. South Africa with delimiter resolves to ZA
  const idZa = CanonicalIdentifier.parse('R·KAGISO');
  assert.equal(idZa.namespace, 'za');
  assert.equal(idZa.handle, 'kagiso');

  // 11b. Plain word starting with ASCII 'R' does NOT falsely match South Africa prefix
  const idRobert = CanonicalIdentifier.parse('ROBERT');
  assert.equal(idRobert.namespace, 'ng');
  assert.equal(idRobert.handle, 'robert');

  // 11c. Brazil R$ resolves to BR
  const idBr = CanonicalIdentifier.parse('R$PEDRO');
  assert.equal(idBr.namespace, 'br');
  assert.equal(idBr.handle, 'pedro');

  // 11d. Unrecognized currency prefix rejects safely without silent guessing
  assert.throws(() => CanonicalIdentifier.parse('$ALICE'), /Unrecognized or unsupported currency symbol prefix/);
  assert.throws(() => CanonicalIdentifier.parse('€BOB'), /Unrecognized or unsupported currency symbol prefix/);
  assert.throws(() => CanonicalIdentifier.parse('¥CHARLIE'), /Unrecognized or unsupported currency symbol prefix/);
});

test('12. Currency vs Token Separation & Verified Asset Grounding', () => {
  const customRegistry = new NamespaceRegistry();

  // Nigeria: cNGN verified with real contract address
  const ngAsset = customRegistry.getPaymentAsset('ng', 'cNGN');
  assert.equal(ngAsset.verificationStatus, ASSET_VERIFICATION_STATUS.VERIFIED);
  assert.equal(ngAsset.address, '0xe2702bd97ee33c88c8f6f92da3b733608aa76f71');

  // Ghana: cGHS is UNAVAILABLE, cUSD is settlement
  const ghAsset = customRegistry.getPaymentAsset('gh', 'cGHS');
  assert.equal(ghAsset.verificationStatus, ASSET_VERIFICATION_STATUS.UNAVAILABLE);
  assert.equal(ghAsset.address, null);

  const ghSettlement = customRegistry.getPaymentAsset('gh', 'cUSD');
  assert.equal(ghSettlement.verificationStatus, ASSET_VERIFICATION_STATUS.VERIFIED);

  // Brazil: cREAL is verified Mento contract, NOT Mexican Peso
  const brAsset = customRegistry.getPaymentAsset('br', 'cREAL');
  assert.equal(brAsset.verificationStatus, ASSET_VERIFICATION_STATUS.VERIFIED);
  assert.equal(brAsset.address, '0xe8537a3d056da446677b9e9d6c5db704eaab4787');

  // Mexico: cMXN does not exist on Mainnet and is UNAVAILABLE
  const mxAsset = customRegistry.getPaymentAsset('mx', 'cMXN');
  assert.equal(mxAsset.verificationStatus, ASSET_VERIFICATION_STATUS.UNAVAILABLE);
  assert.equal(mxAsset.address, null);

  // Attempting to register an invented VERIFIED asset without address throws error
  assert.throws(() => {
    validateNamespaceDefinition({
      namespace: 'tz',
      countryCode: 'TZ',
      currencyCode: 'TZS',
      symbol: 'TSh',
      paymentAssets: {
        cTZS: {
          verificationStatus: ASSET_VERIFICATION_STATUS.VERIFIED,
          address: null
        }
      }
    });
  }, /Cannot register asset "cTZS" as VERIFIED without a valid contract address/);
});

test('13. Protocol Multi-Tag Ownership vs Campaign Limits', () => {
  // Protocol registry defaults to multi-tag ownership (enforceOneTagPerWallet = false)
  const registry = new CeloTagsRegistry({ enforceOneTagPerWallet: false });
  const bizWallet = '0x9999999999999999999999999999999999999999';

  // Business registers 3 distinct identities across namespaces
  const rec1 = registry.registerIdentity({ identifier: '₦CHOWDECK', owner: bizWallet, type: 'business' });
  const rec2 = registry.registerIdentity({ identifier: '₦CHOWDECK_OPS', owner: bizWallet, type: 'agent' });
  const rec3 = registry.registerIdentity({ identifier: 'GH₵CHOWDECK_ACCRA', owner: bizWallet, type: 'business' });

  assert.equal(rec1.identifier.handle, 'chowdeck');
  assert.equal(rec2.identifier.handle, 'chowdeck_ops');
  assert.equal(rec3.identifier.handle, 'chowdeck_accra');

  const owned = registry.getIdentitiesByOwner(bizWallet);
  assert.equal(owned.length, 3);

  // Custom Product Policy: Consumer campaign restricts non-businesses to 1 tag
  const campaignRegistry = new CeloTagsRegistry({
    ownershipPolicy: ({ wallet, identifier, existingRecords }) => {
      if (existingRecords.length >= 1) {
        return { allowed: false, reason: 'Campaign Limit: Free claim allows max 1 tag per user' };
      }
      return { allowed: true };
    }
  });

  const userWallet = '0x8888888888888888888888888888888888888888';
  campaignRegistry.registerIdentity({ identifier: '₦ALICE', owner: userWallet });

  const secondAvail = campaignRegistry.checkAvailability('₦BOB', userWallet);
  assert.equal(secondAvail.available, false);
  assert.equal(secondAvail.walletRestricted, true);
});

test('14. Sovereign Recovery, Delegation & Revocation Lifecycle', () => {
  const registry = new CeloTagsRegistry();
  const owner = '0x1234567890123456789012345678901234567890';
  const recovery = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  const newOwner = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';
  const operator = '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC';

  registry.registerIdentity({
    identifier: '₦SOVEREIGN',
    owner,
    recoveryAddress: recovery
  });

  // 14a. Delegate Operator
  registry.delegateOperator('₦SOVEREIGN', owner, operator);
  const withOp = registry.getIdentity('₦SOVEREIGN');
  assert.equal(withOp.metadata.operator, operator.toLowerCase());
  assert.equal(withOp.owner, owner.toLowerCase()); // owner unchanged

  // 14b. Recovery Address recovers identity to new owner
  registry.recoverIdentity('₦SOVEREIGN', recovery, newOwner);
  const recovered = registry.getIdentity('₦SOVEREIGN');
  assert.equal(recovered.owner, newOwner.toLowerCase());

  // Non-recovery address fails recovery
  assert.throws(() => registry.recoverIdentity('₦SOVEREIGN', owner, owner), /caller is not designated recovery address/);

  // 14c. Revocation
  registry.revokeIdentity('₦SOVEREIGN', newOwner, 'user_decommission');
  const revoked = registry.getIdentity('₦SOVEREIGN');
  assert.equal(revoked.status, 'REVOKED');
  assert.equal(revoked.isActive(), false);
});

test('15. Resolver Security Boundary & Safe Failure Handling', async () => {
  const registry = new CeloTagsRegistry();
  const resolver = new CeloTagsResolver({ registry });

  resolver.registerProfile({
    identifier: '₦UNVERIFIED_AGENT',
    name: 'Unverified Third-Party Agent',
    owner: '0x3333333333333333333333333333333333333333',
    verificationLevel: 'self_reported',
    endpoints: {
      a2a: 'https://untrusted-agent.io/a2a'
    }
  });

  const resolved = await resolver.resolve('₦UNVERIFIED_AGENT');

  // Invariant 1: Resolving a tag conveys NO financial or execution authority
  assert.equal(resolved.authority, 'NONE');
  assert.equal(resolved.financialAuthority, false);

  // Invariant 2: Unverified agent endpoints are untrusted by default
  assert.equal(resolved.endpoints.trusted, false);
  assert.equal(resolved.verified, false);

  // Invariant 3: Safe resolution catches malformed inputs without throwing unhandled exceptions
  const safeBad = await resolver.safeResolve('₦invalid!!tag');
  assert.equal(safeBad.ok, false);
  assert.equal(safeBad.code, 'RESOLVER_ERROR');

  const safeGood = await resolver.safeResolve('₦UNVERIFIED_AGENT');
  assert.equal(safeGood.ok, true);
  assert.equal(safeGood.data.handle, 'unverified_agent');
});

test('16. Backward Compatibility for Legacy NairaTag Handles', () => {
  // Plain handle defaults to 'ng'
  const idPlain = CanonicalIdentifier.parse('michael');
  assert.equal(idPlain.namespace, 'ng');
  assert.equal(idPlain.handle, 'michael');
  assert.equal(idPlain.display, '₦MICHAEL');

  // @handle format defaults to 'ng'
  const idAt = CanonicalIdentifier.parse('@michael');
  assert.equal(idAt.namespace, 'ng');
  assert.equal(idAt.handle, 'michael');

  // ₦handle format resolves to 'ng'
  const idNaira = CanonicalIdentifier.parse('₦michael');
  assert.equal(idNaira.namespace, 'ng');
  assert.equal(idNaira.handle, 'michael');

  // Display symbol changes do not alter canonical URN
  assert.equal(idPlain.urn, 'urn:celotag:ng:michael');
  assert.equal(idAt.urn, 'urn:celotag:ng:michael');
  assert.equal(idNaira.urn, 'urn:celotag:ng:michael');
  assert.equal(idPlain.equals(idNaira), true);
});
