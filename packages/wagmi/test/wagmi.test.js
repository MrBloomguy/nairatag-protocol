/**
 * @file wagmi.test.js
 * @description Automated test suite for @nairatag/wagmi
 */

const assert = require('assert');
const {
  useNairaTagAddress,
  useNairaTagReverse,
  useNairaTagRecord,
  resolveAddress,
  resolveReverse,
  classifyRecipientInput,
  isNairaTag,
  normalizeTag,
  formatDisplayTag,
} = require('../src/index.js');

async function runTests() {
  console.log('==================================================');
  console.log(' @nairatag/wagmi — Test Suite (NTS-100 / NTS-101)');
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

  // 1. Classification & Utilities
  test('classifyRecipientInput re-export', () => {
    assert.strictEqual(classifyRecipientInput('₦micheal'), 'nairatag');
    assert.strictEqual(classifyRecipientInput('ng:micheal'), 'nairatag');
    assert.strictEqual(classifyRecipientInput('0x1111111111111111111111111111111111111111'), 'evm_address');
    assert.strictEqual(classifyRecipientInput('vitalik.eth'), 'ens');
    assert.strictEqual(classifyRecipientInput('@micheal'), 'invalid');
  });

  test('isNairaTag and normalization', () => {
    assert.strictEqual(isNairaTag('₦micheal'), true);
    assert.strictEqual(isNairaTag('ng:micheal'), true);
    assert.strictEqual(normalizeTag('₦MICHEAL'), 'micheal');
    assert.strictEqual(formatDisplayTag('ng:micheal'), '₦micheal');
  });

  // 2. Hook Object Structure (Non-React / SSR fallback)
  test('useNairaTagAddress returns callable resolve method', () => {
    const hook = useNairaTagAddress({ name: '₦micheal' });
    assert.strictEqual(typeof hook.resolve, 'function');
    assert.strictEqual(hook.isNairaTag, true);
  });

  test('useNairaTagReverse returns callable resolve method', () => {
    const hook = useNairaTagReverse({ address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' });
    assert.strictEqual(typeof hook.resolve, 'function');
  });

  test('useNairaTagRecord returns callable resolve method', () => {
    const hook = useNairaTagRecord({ name: '₦micheal', key: 'avatar' });
    assert.strictEqual(typeof hook.resolve, 'function');
  });

  // 3. Execution Verification
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
    await testAsync('resolveAddress returns properly formatted address', async () => {
      const res = await resolveAddress({ name: '₦micheal' });
      assert.strictEqual(typeof res, 'object');
      assert.strictEqual(res.isSuccess, true);
      assert.strictEqual(res.data, '0x1111111111111111111111111111111111111111');
    });

    await testAsync('resolveAddress returns deployer address for ₦nairatag', async () => {
      const res = await resolveAddress({ name: '₦nairatag' });
      assert.strictEqual(res.isSuccess, true);
      assert.strictEqual(res.data, '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
    });

    await testAsync('resolveReverse returns verified ₦handle', async () => {
      const res = await resolveReverse({ address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' });
      assert.strictEqual(res.isSuccess, true);
      assert.strictEqual(res.data, '₦nairatag');
    });

    await testAsync('resolveReverse returns null for unassociated address', async () => {
      const res = await resolveReverse({ address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' });
      assert.strictEqual(res.data, null);
      assert.strictEqual(res.isSuccess, false);
    });
  } else {
    console.log('ℹ Live L2 devnet offline (port 9545). Skipping live network calls.');
    // Offline verification using mock client
    await testAsync('resolveAddress returns failure on offline network gracefully', async () => {
      const res = await resolveAddress({ name: '₦micheal', rpcUrl: 'http://127.0.0.1:19545' });
      assert.strictEqual(res.isSuccess, false);
      assert.strictEqual(res.data, null);
    });
  }

  console.log('\n==================================================');
  console.log(`ALL ${passed} WAGMI ADAPTER TESTS PASSED!`);
  console.log('==================================================\n');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
