/**
 * @file resolver.test.js
 * @description Comprehensive automated test suite for @nairatag/viem
 */

const assert = require('assert');
const {
  createNairaTagResolver,
  classifyRecipientInput,
  isNairaTag,
  normalizeTag,
  formatDisplayTag,
  namehash,
  reverseNode,
  validateDiscoveryManifest,
  DEFAULT_DISCOVERY,
} = require('../src/index.js');

async function runTests() {
  console.log('==================================================');
  console.log(' @nairatag/viem — Test Suite (NTS-100 / NTS-101)');
  console.log('==================================================\n');

  let passed = 0;
  function test(name, fn) {
    try {
      fn();
      console.log(`✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`✗ ${name}`);
      console.error(err);
      process.exit(1);
    }
  }

  async function testAsync(name, fn) {
    try {
      await fn();
      console.log(`✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`✗ ${name}`);
      console.error(err);
      process.exit(1);
    }
  }

  // 1. Syntactic Classifier Tests (NTS-101)
  test('classifyRecipientInput: hex address', () => {
    assert.strictEqual(
      classifyRecipientInput('0x1111111111111111111111111111111111111111'),
      'evm_address'
    );
  });

  test('classifyRecipientInput: ENS domains', () => {
    assert.strictEqual(classifyRecipientInput('vitalik.eth'), 'ens');
    assert.strictEqual(classifyRecipientInput('myname.xyz'), 'ens');
  });

  test('classifyRecipientInput: NairaTag canonical handle (₦)', () => {
    assert.strictEqual(classifyRecipientInput('₦micheal'), 'nairatag');
    assert.strictEqual(classifyRecipientInput('₦dev_wallet'), 'nairatag');
  });

  test('classifyRecipientInput: NairaTag ASCII fallback (ng:)', () => {
    assert.strictEqual(classifyRecipientInput('ng:micheal'), 'nairatag');
  });

  test('classifyRecipientInput: Invalid handles', () => {
    assert.strictEqual(classifyRecipientInput('@micheal'), 'invalid');
    assert.strictEqual(classifyRecipientInput('random_text_without_marker'), 'invalid');
  });

  // 2. Normalization Tests (NTS-100)
  test('normalizeTag: Strips ₦ and lowercases', () => {
    assert.strictEqual(normalizeTag('₦MICHEAL'), 'micheal');
    assert.strictEqual(normalizeTag('ng:micheal'), 'micheal');
  });

  test('normalizeTag: Rejects prohibited characters', () => {
    assert.throws(() => normalizeTag('@micheal'), /prohibited/);
    assert.throws(() => normalizeTag('₦_leading'), /cannot start or end with an underscore/);
    assert.throws(() => normalizeTag('₦trailing_'), /cannot start or end with an underscore/);
    assert.throws(() => normalizeTag('₦double__under'), /consecutive underscores/);
    assert.throws(() => normalizeTag('₦ab'), /Invalid tag length/);
  });

  // 3. Namehash and Reverse Node Tests
  test('namehash: Computes deterministic 32-byte hash', () => {
    const hash = namehash('₦micheal');
    assert.strictEqual(hash, '0x643dbd58af0b489c995d96b0539c960ce6cbca0add0c6a046f919f2d4cff8dce');
  });

  test('reverseNode: Derives reverse resolution node', () => {
    const rNode = reverseNode('0x1111111111111111111111111111111111111111');
    assert.strictEqual(rNode.startsWith('0x'), true);
    assert.strictEqual(rNode.length, 66);
  });

  // 4. NTS-102 Manifest Validation Tests
  const validManifest = {
    protocol: 'NTS-100',
    discoveryVersion: 'NTS-102',
    network: { chainId: 901 },
    resolution: {
      rpcUrls: ['https://rpc.nairatag.org', 'https://rpc-backup.nairatag.network'],
      registryAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      resolverAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    },
  };

  test('validateDiscoveryManifest: Valid production manifest passes', () => {
    assert.strictEqual(validateDiscoveryManifest(validManifest), true);
  });

  test('validateDiscoveryManifest: Rejects insecure HTTP in production', () => {
    const badManifest = {
      ...validManifest,
      resolution: { ...validManifest.resolution, rpcUrls: ['http://rpc.nairatag.org'] },
    };
    assert.throws(() => validateDiscoveryManifest(badManifest), /Insecure RPC URL prohibited by NTS-102/);
  });

  test('validateDiscoveryManifest: Rejects localhost in production manifest', () => {
    const badManifest = {
      ...validManifest,
      resolution: { ...validManifest.resolution, rpcUrls: ['http://127.0.0.1:9545'] },
    };
    assert.throws(() => validateDiscoveryManifest(badManifest), /prohibited/);
  });

  test('validateDiscoveryManifest: Rejects unchecksummed addresses', () => {
    const badManifest = {
      ...validManifest,
      resolution: {
        ...validManifest.resolution,
        registryAddress: '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512', // all lowercase
      },
    };
    assert.throws(() => validateDiscoveryManifest(badManifest), /not EIP-55 checksummed/);
  });

  test('validateDiscoveryManifest: Rejects incompatible version', () => {
    const badManifest = { ...validManifest, discoveryVersion: 'NTS-999' };
    assert.throws(() => validateDiscoveryManifest(badManifest), /Unsupported discoveryVersion/);
  });

  // 5. Live L2 Network Tests (Direct RPC to Chain 901)
  let isL2Live = false;
  try {
    const probe = await fetch('http://127.0.0.1:9545', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_chainId', params: [], id: 1 }),
    }).catch(() => null);
    if (probe && probe.ok) isL2Live = true;
  } catch {}

  if (isL2Live) {
    const resolver = createNairaTagResolver({
      rpcUrl: 'http://127.0.0.1:9545',
      registryAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      resolverAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    });

    await testAsync('Live L2: resolveName(₦micheal) returns EIP-55 checksummed address', async () => {
      const addr = await resolver.resolveName('₦micheal');
      assert.strictEqual(addr, '0x1111111111111111111111111111111111111111');
    });

    await testAsync('Live L2: resolveName(₦nairatag) returns Deployer address', async () => {
      const addr = await resolver.resolveName('₦nairatag');
      assert.strictEqual(addr, '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
    });

    await testAsync('Live L2: lookupAddress with mutual anti-spoofing verification', async () => {
      const handle = await resolver.lookupAddress('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
      assert.strictEqual(handle, '₦nairatag');
    });

    await testAsync('Live L2: lookupAddress returns null for unassociated address', async () => {
      const handle = await resolver.lookupAddress('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
      assert.strictEqual(handle, null);
    });

    await testAsync('Live L2: getTextRecord retrieves avatar metadata', async () => {
      const avatar = await resolver.getTextRecord('₦micheal', 'avatar');
      assert.strictEqual(avatar, 'ipfs://bafybeicmicheal');
    });

    await testAsync('Live L2: getPaymentEndpoint retrieves payment URI', async () => {
      const endpoint = await resolver.getPaymentEndpoint('₦micheal');
      assert.strictEqual(endpoint, 'https://pay.nairatag.network/micheal');
    });

    await testAsync('Live L2: getOwner retrieves registry ownership', async () => {
      const owner = await resolver.getOwner('₦micheal');
      assert.strictEqual(owner, '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
    });
  } else {
    console.log('ℹ Live L2 devnet offline (port 9545). Skipping live network calls.');
  }

  console.log('\n==================================================');
  console.log(`ALL ${passed} VIEM ADAPTER TESTS PASSED!`);
  console.log('==================================================\n');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
