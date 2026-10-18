import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createResolver } from '../src/index.js';

test('NairaTagResolver: resolves tag into canonical entity with uri and fallback url', async () => {
  let callCount = 0;
  const mockFetch = async (url) => {
    callCount++;
    return {
      ok: true,
      json: async () => ({
        ok: true,
        tag: 'mikki',
        address: '0x1111111111111111111111111111111111111111',
        settlement: {
          virtualAccount: {
            bankName: 'Flutterwave MFB',
            accountNumber: '0195778910'
          }
        }
      })
    };
  };

  const resolver = createResolver({
    apiBase: 'http://127.0.0.1:8787',
    webBase: 'https://nairatag.ng',
    customFetch: mockFetch
  });

  const entity = await resolver.resolveTag('₦mikki');

  assert.equal(entity.tag, 'MIKKI');
  assert.equal(entity.canonical, '₦MIKKI');
  assert.equal(entity.uri, 'nairatag://MIKKI');
  assert.equal(entity.profileUrl, 'https://nairatag.ng/MIKKI');
  assert.equal(entity.verified, true);
  assert.equal(entity.owner, '0x1111111111111111111111111111111111111111');
  assert.equal(entity.virtualAccount.accountNumber, '0195778910');
  assert.equal(callCount, 1);

  // Cached resolution test
  const cachedEntity = await resolver.resolveTag('MIKKI');
  assert.equal(cachedEntity.canonical, '₦MIKKI');
  assert.equal(callCount, 1, 'Should return cached result without secondary fetch');
});

test('NairaTagResolver: checks availability accurately', async () => {
  const mockFetch = async () => ({
    ok: true,
    json: async () => ({
      ok: true,
      tag: 'unclaimed_tag',
      address: null
    })
  });

  const resolver = createResolver({ customFetch: mockFetch });
  const isAvailable = await resolver.checkAvailability('₦unclaimed_tag');
  assert.equal(isAvailable, true);
});

test('NairaTagResolver: rejects currency amounts or invalid format', async () => {
  const resolver = createResolver();

  await assert.rejects(
    async () => { await resolver.resolveTag('₦5,000'); },
    /Invalid NairaTag format/
  );

  await assert.rejects(
    async () => { await resolver.resolveTag(''); },
    /Tag input is required/
  );
});
