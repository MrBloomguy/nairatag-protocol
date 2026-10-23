import test from 'node:test';
import assert from 'node:assert/strict';
import { areEquivalentMcpSchemas, createPinnedMcpLookup, decryptMcpSecret, encryptMcpSecret, isPrivateMcpAddress, validateMcpEndpoint, validateMcpToolSchema } from '../lib/arc/mcp.js';

test('MCP endpoint validator requires HTTPS without credentials, local hosts, or URL secrets', async () => {
  await assert.rejects(validateMcpEndpoint('http://example.com/mcp'), /HTTPS/);
  await assert.rejects(validateMcpEndpoint('https://user:pass@example.com/mcp'), /HTTPS/);
  await assert.rejects(validateMcpEndpoint('https://localhost/mcp'), /HTTPS/);
  await assert.rejects(validateMcpEndpoint('https://127.0.0.1/mcp'), /Private or reserved/);
  await assert.rejects(validateMcpEndpoint('https://example.com/mcp?token=secret'), /HTTPS/);
});

test('MCP endpoint validation blocks private, loopback, link-local, multicast, and mapped IPv4 addresses', () => {
  for (const address of ['0.0.0.0', '10.2.3.4', '127.0.0.1', '169.254.3.2', '172.20.0.1', '192.168.1.1', '224.0.0.1', '::1', 'fc00::1', 'fe80::1', '::ffff:127.0.0.1']) {
    assert.equal(isPrivateMcpAddress(address), true, `${address} should be blocked`);
  }
  assert.equal(isPrivateMcpAddress('8.8.8.8'), false);
  assert.equal(isPrivateMcpAddress('2606:4700:4700::1111'), false);
});

test('MCP transport pins DNS results and rejects host changes', async () => {
  const lookup = createPinnedMcpLookup('tools.example', [
    { address: '8.8.8.8', family: 4 },
    { address: '2606:4700:4700::1111', family: 6 },
  ]);
  const result = (host, options) => new Promise((resolve) => lookup(host, options, (error, address, family) => resolve({ error, address, family })));
  const all = await result('tools.example', { all: true });
  assert.equal(all.error, null);
  assert.equal(all.address.length, 2);
  assert.deepEqual(await result('tools.example', { family: 6 }), { error: null, address: '2606:4700:4700::1111', family: 6 });
  assert.match((await result('other.example', {})).error.message, /change its server host/);
});

test('MCP tool schemas are bounded, local, and force object inputs closed', () => {
  const schema = validateMcpToolSchema({
    type: 'object',
    properties: { tag: { type: 'string', minLength: 2, maxLength: 32 } },
    required: ['tag'],
    additionalProperties: true,
  });
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.tag.maxLength, 32);
  assert.throws(() => validateMcpToolSchema({ $ref: 'https://evil.example/schema.json' }), /external references/);
  assert.throws(() => validateMcpToolSchema({ type: 'string', pattern: '^safe' }), /unsupported validation rules/);
  assert.throws(() => validateMcpToolSchema({ type: 'string', description: 'x'.repeat(33_000) }), /too large/);
  assert.equal(areEquivalentMcpSchemas({ type: 'object', properties: { tag: { type: 'string' } } }, { properties: { tag: { type: 'string' } }, type: 'object' }), true);
  assert.equal(areEquivalentMcpSchemas({ type: 'object', properties: { tag: { type: 'string' } } }, { type: 'object', properties: { tag: { type: 'number' } } }), false);
});

test('MCP credentials are encrypted at rest and tampering is detected', () => {
  const previousKey = process.env.ARC_MCP_ENCRYPTION_KEY;
  process.env.ARC_MCP_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
  try {
    const ciphertext = encryptMcpSecret('top-secret-token');
    assert.ok(ciphertext);
    assert.equal(ciphertext.includes('top-secret-token'), false);
    assert.equal(decryptMcpSecret(ciphertext), 'top-secret-token');
    const parts = ciphertext.split('.');
    parts[2] = Buffer.from('tampered').toString('base64');
    assert.throws(() => decryptMcpSecret(parts.join('.')));
  } finally {
    if (previousKey === undefined) delete process.env.ARC_MCP_ENCRYPTION_KEY;
    else process.env.ARC_MCP_ENCRYPTION_KEY = previousKey;
  }
});
