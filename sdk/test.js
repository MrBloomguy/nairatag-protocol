/**
 * NairaTag SDK Test Suite
 * Validates NTS-100 normalization, EIP-55 checksumming, namehash,
 * and live resolution on TagProtocol.
 */

const assert = require('assert');
const {
  normalizeTag,
  formatDisplayTag,
  namehash,
  toChecksumAddress,
  reverseNode,
  NairaTagClient
} = require('./src/index.js');

async function runTests() {
  console.log('==================================================');
  console.log(' NairaTag SDK — Test Suite (NTS-100)');
  console.log('==================================================\n');

  let passed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`✗ ${name}`);
      throw err;
    }
  }

  async function testAsync(name, fn) {
    try {
      await fn();
      console.log(`✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`✗ ${name}`);
      throw err;
    }
  }

  // 1. Normalization Tests
  test('Normalize ₦micheal -> micheal', () => {
    assert.strictEqual(normalizeTag('₦micheal'), 'micheal');
  });

  test('Normalize uppercase ₦MICHEAL -> micheal', () => {
    assert.strictEqual(normalizeTag('₦MICHEAL'), 'micheal');
  });

  test('Normalize prefix-optional micheal -> micheal', () => {
    assert.strictEqual(normalizeTag('micheal'), 'micheal');
  });

  test('Normalize valid separator ₦dev_wallet -> dev_wallet', () => {
    assert.strictEqual(normalizeTag('₦dev_wallet'), 'dev_wallet');
  });

  test('Format display tag -> ₦micheal', () => {
    assert.strictEqual(formatDisplayTag('micheal'), '₦micheal');
  });

  test('Reject @ in handle (@micheal)', () => {
    assert.throws(() => normalizeTag('@micheal'), /prohibited/);
  });

  test('Reject short handle (₦ab)', () => {
    assert.throws(() => normalizeTag('₦ab'), /length/);
  });

  test('Reject leading underscore (₦_leading)', () => {
    assert.throws(() => normalizeTag('₦_leading'), /underscore/);
  });

  test('Reject trailing underscore (₦trailing_)', () => {
    assert.throws(() => normalizeTag('₦trailing_'), /underscore/);
  });

  test('Reject consecutive underscores (₦double__under)', () => {
    assert.throws(() => normalizeTag('₦double__under'), /consecutive/);
  });

  // 2. Hash & Checksum Tests
  test('Namehash test vector (₦micheal)', () => {
    assert.strictEqual(namehash('₦micheal'), '0x643dbd58af0b489c995d96b0539c960ce6cbca0add0c6a046f919f2d4cff8dce');
  });

  test('EIP-55 Checksum address encoding', () => {
    assert.strictEqual(
      toChecksumAddress('0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'),
      '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
    );
    assert.strictEqual(
      toChecksumAddress('0x1111111111111111111111111111111111111111'),
      '0x1111111111111111111111111111111111111111'
    );
  });

  test('Reverse node derivation formula', () => {
    assert.strictEqual(
      reverseNode('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'),
      '0xe72ae76df44257e3c1ee3a1593bc7d1200974dae5330f74ed9f41b3ec32bab58'
    );
  });

  // 3. Live L2 Client Resolution Tests
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
    const client = new NairaTagClient({
      rpcUrl: 'http://127.0.0.1:9545',
      registryAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      resolverAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    });

    await testAsync('Live L2: Forward resolve ₦micheal', async () => {
      const addr = await client.resolve('₦micheal');
      assert.strictEqual(addr, '0x1111111111111111111111111111111111111111');
    });

    await testAsync('Live L2: Forward resolve ₦nairatag (Deployer)', async () => {
      const addr = await client.resolve('₦nairatag');
      assert.strictEqual(addr, '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
    });

    await testAsync('Live L2: Reverse lookup with mutual anti-spoofing verification', async () => {
      const handle = await client.lookupAddress('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
      assert.strictEqual(handle, '₦nairatag');
    });

    await testAsync('Live L2: Reverse lookup rejects unassociated address (returns null)', async () => {
      const handle = await client.lookupAddress('0x9999999999999999999999999999999999999999');
      assert.strictEqual(handle, null);
    });

    await testAsync('Live L2: Retrieve metadata text record (avatar)', async () => {
      const avatar = await client.getText('₦micheal', 'avatar');
      assert.strictEqual(avatar, 'ipfs://bafybeicmicheal');
    });

    await testAsync('Live L2: Retrieve payment endpoint', async () => {
      const endpoint = await client.getPaymentEndpoint('₦micheal');
      assert.strictEqual(endpoint, 'https://pay.nairatag.network/micheal');
    });
  } else {
    console.log('ℹ Live L2 devnet offline (port 9545). Skipping live network calls.');
  }

  console.log('\n==================================================');
  console.log(`ALL ${passed} SDK TESTS PASSED!`);
  console.log('==================================================');
}

runTests().catch(err => {
  console.error('\nSDK TEST FAILED:');
  console.error(err);
  process.exit(1);
});
