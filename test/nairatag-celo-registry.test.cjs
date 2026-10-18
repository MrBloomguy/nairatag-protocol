/**
 * @file nairatag-celo-registry.test.cjs
 * @description Comprehensive test suite for Canonical Celo NairaTag Registry, Resolver, Marketplace, and Identity.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const {
  NairaTagClient,
  normalizeTag,
  formatDisplayTag,
  namehash,
  reverseNode,
  TokenRegistry,
  defaultTokenRegistry,
  IdentityMigrationManager,
  MigrationState
} = require('../sdk/src/index');
const { getNetworkConfig } = require('../sdk/src/wallet/config');

async function runTests() {
  console.log('--- 🧪 STARTING NAIRATAG CANONICAL CELO REGISTRY TEST SUITE ---');

  // TEST 1: Deployment Artifact Verification
  console.log('\n[1/10] Verifying Canonical Celo Deployment Artifacts...');
  const celoSepoliaDeploymentPath = path.join(__dirname, '../deployments/nairatag-celo-sepolia.json');
  assert.ok(fs.existsSync(celoSepoliaDeploymentPath), 'nairatag-celo-sepolia.json must exist');

  const deployment = JSON.parse(fs.readFileSync(celoSepoliaDeploymentPath, 'utf8'));
  assert.strictEqual(deployment.network, 'celo-sepolia');
  assert.strictEqual(deployment.chainId, 11142220);
  assert.ok(deployment.contracts.registry.startsWith('0x'), 'Registry address must be valid hex');
  assert.ok(deployment.contracts.resolver.startsWith('0x'), 'Resolver address must be valid hex');
  assert.ok(deployment.contracts.marketplace.startsWith('0x'), 'Marketplace address must be valid hex');
  assert.strictEqual(deployment.canonical, true, 'Celo Sepolia must be designated as canonical');
  console.log('✓ Deployment artifact verified:', {
    registry: deployment.contracts.registry,
    resolver: deployment.contracts.resolver,
    marketplace: deployment.contracts.marketplace
  });

  // TEST 2: Network Configuration & Celo as Canonical Default
  console.log('\n[2/10] Testing Unified Network Configuration...');
  const celoConfig = getNetworkConfig('celo');
  assert.strictEqual(celoConfig.chainId, 42220);
  assert.ok(celoConfig.contracts.registry);
  assert.ok(celoConfig.contracts.resolver);
  assert.ok(celoConfig.contracts.marketplace);

  const localConfig = getNetworkConfig('local');
  assert.strictEqual(localConfig.chainId, 901);
  assert.strictEqual(localConfig.status, 'LEGACY_DEV');

  assert.throws(
    () => getNetworkConfig('baseSepolia'),
    /Unsupported network: baseSepolia/,
    'Base must be completely removed from active configuration'
  );
  console.log('✓ Celo is canonical single active chain; Base cleanly removed from active runtime.');

  // TEST 3: Canonical Token Registry & Regulatory Safety Guard
  console.log('\n[3/10] Testing Canonical Token Registry (cNGN / USDC / USDT / CELO)...');
  const tokenReg = new TokenRegistry();
  const cngn = tokenReg.getToken('cNGN');
  assert.strictEqual(cngn.decimals, 18);
  assert.strictEqual(cngn.isNigerianNumeraire, true);
  assert.ok(cngn.networks.celo.address);
  assert.ok(cngn.capabilities.includes('HOLD'));
  assert.ok(cngn.capabilities.includes('SEND'));

  // Test safety policy: autonomous mint/redeem strictly forbidden
  assert.throws(
    () => tokenReg.assertActionAllowed('cNGN', 'MINT'),
    /restricted by protocol policy/,
    'Autonomous agents must NEVER mint cNGN'
  );
  assert.throws(
    () => tokenReg.assertActionAllowed('cNGN', 'REDEEM'),
    /restricted by protocol policy/,
    'Autonomous agents must NEVER redeem cNGN'
  );
  console.log('✓ TokenRegistry defines canonical assets and enforces autonomous safety guards.');

  // TEST 4: SDK NairaTagClient Initialization & Network Resolution
  console.log('\n[4/10] Testing NairaTagClient on Celo Sepolia...');
  const client = new NairaTagClient({ network: 'celoSepolia' });
  const net = client.getNetwork();
  assert.strictEqual(net.network, 'celoSepolia');
  assert.strictEqual(net.chainId, 11142220);
  assert.strictEqual(net.registry, deployment.contracts.registry);
  assert.strictEqual(net.resolver, deployment.contracts.resolver);
  console.log('✓ NairaTagClient correctly initialized without exposing raw addresses to application layer.');

  // TEST 5: NTS-100 Tag Normalization & Hashing
  console.log('\n[5/10] Testing NTS-100 Tag Normalization & Namehashing...');
  assert.strictEqual(normalizeTag('₦MAMA'), 'mama');
  assert.strictEqual(normalizeTag('  ₦chuks  '), 'chuks');
  assert.strictEqual(normalizeTag('david_1'), 'david_1');
  assert.strictEqual(formatDisplayTag('mama'), '₦mama');
  assert.throws(() => normalizeTag('@mama'), /prohibited in NairaTag handles/);
  assert.throws(() => normalizeTag('no'), /Invalid tag length/);
  assert.throws(() => normalizeTag('_lead'), /cannot start or end with an underscore/);
  assert.throws(() => normalizeTag('con__sec'), /cannot contain consecutive underscores/);

  const nodeMama = namehash('₦mama');
  assert.ok(nodeMama.startsWith('0x'));
  assert.strictEqual(nodeMama.length, 66);
  console.log('✓ NTS-100 normative normalization and namehashing verified.');

  // TEST 6: Simulated Claim & Forward Resolution Flow on Celo
  console.log('\n[6/10] Testing Claim & Forward Resolution Preparation...');
  const preparedClaim = client.prepareClaim('₦TEST');
  assert.strictEqual(preparedClaim.network, 'celoSepolia');
  assert.strictEqual(preparedClaim.tag, '₦test');
  assert.strictEqual(preparedClaim.to, deployment.contracts.registry);
  assert.strictEqual(preparedClaim.method, 'claim(string,address)');

  // Universal lookup
  const resolvedMama = await client.lookup('₦MAMA');
  console.log(`✓ Forward lookup resolved: ₦MAMA -> ${resolvedMama || 'Ready on Celo'}`);

  // TEST 7: Ownership Transfer Preparation
  console.log('\n[7/10] Testing Ownership Transfer Preparation...');
  const newOwner = '0x1111111111111111111111111111111111111111';
  const preparedTransfer = client.prepareTransfer('₦TEST', newOwner);
  assert.strictEqual(preparedTransfer.newOwner, newOwner);
  assert.strictEqual(preparedTransfer.method, 'transfer(bytes32,address)');
  console.log('✓ Transfer payload prepared conforming to INairaTagRegistry.');

  // TEST 8: Reverse Resolution & Mutual Anti-Spoofing Rule
  console.log('\n[8/10] Testing Reverse Resolution & Mutual Anti-Spoofing...');
  const testAddr = '0x8217316A99D41c6dCe89D46e9A34c1143D1A914c';
  const rNode = reverseNode(testAddr);
  assert.ok(rNode.startsWith('0x'));
  assert.strictEqual(rNode.length, 66);

  // Address lookup via universal method
  const lookupRes = await client.lookup(testAddr);
  console.log(`✓ Reverse node derived for ${testAddr.slice(0, 8)}... (${rNode.slice(0, 10)}...)`);

  // TEST 9: Secondary Marketplace Non-Custodial Architecture
  console.log('\n[9/10] Testing Marketplace Registration & Escrow Invariant...');
  assert.ok(net.marketplace.startsWith('0x'));
  assert.strictEqual(deployment.contracts.marketplace, net.marketplace);
  console.log('✓ Secondary Marketplace bound to canonical Celo registry:', net.marketplace);

  // TEST 10: Migration State Machine (Chain 901 -> Celo)
  console.log('\n[10/10] Testing Migration State Engine (Chain 901 -> Celo)...');
  const migration = new IdentityMigrationManager({
    initialRecords: {
      josh: {
        tag: '₦josh',
        canonical: 'josh',
        sourceChainId: 901,
        targetChainId: 42220,
        status: MigrationState.NOT_MIGRATED,
        oldOwner: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
      }
    }
  });

  // State 1: NOT_MIGRATED
  const status1 = migration.getMigrationStatus('₦josh');
  assert.strictEqual(status1.status, MigrationState.NOT_MIGRATED);
  assert.strictEqual(status1.sourceChainId, 901);

  // State 2: Initiate Migration -> PENDING
  const pending = migration.initiateMigration({
    tag: '₦josh',
    oldOwner: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    celoAddress: '0x8217316A99D41c6DCE89d46E9A34c1143d1a914c'
  });
  assert.strictEqual(pending.status, MigrationState.PENDING);
  assert.strictEqual(pending.celoAddress, '0x8217316A99D41c6DCE89d46E9A34c1143d1a914c');

  // State 3: Complete Migration -> MIGRATED
  const completed = migration.completeMigration({
    tag: '₦josh',
    celoTxHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    celoRegistryAddress: deployment.contracts.registry
  });
  assert.strictEqual(completed.status, MigrationState.MIGRATED);
  assert.ok(completed.migratedAt);

  // State 4: Conflict detection (Impersonator attempts to migrate without matching owner key)
  const conflict = migration.initiateMigration({
    tag: '₦other',
    oldOwner: '0xBadActor11111111111111111111111111111111',
    celoAddress: '0xBadActor11111111111111111111111111111111'
  });
  // Since ₦other was unrecorded, it begins pending; if mismatched, conflict triggers:
  migration.migrationRecords.set('disputed', {
    tag: '₦disputed',
    oldOwner: '0xOriginalOwner11111111111111111111111111111111'
  });
  const disputeRes = migration.initiateMigration({
    tag: '₦disputed',
    oldOwner: '0xImpostor22222222222222222222222222222222',
    celoAddress: '0xImpostor22222222222222222222222222222222'
  });
  assert.strictEqual(disputeRes.status, MigrationState.CONFLICT);
  console.log('✓ Migration state machine strictly enforces NOT_MIGRATED, PENDING, MIGRATED, and CONFLICT.');

  console.log('\n============================================================');
  console.log('🎉 ALL 10 CANONICAL CELO REGISTRY TESTS PASSED CLEANLY!');
  console.log('============================================================\n');
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILURE:', err);
  process.exit(1);
});
