import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  validateAction,
  generateDeepLink,
  createActionEngine
} from '../src/index.js';

test('validateAction: verifies valid action payloads', () => {
  const validSend = validateAction({
    action: 'send',
    recipient: '₦mikki',
    amount: '5000',
    currency: 'NGN',
    source: 'x-extension'
  });

  assert.equal(validSend.action, 'send');
  assert.equal(validSend.recipient, '₦MIKKI');
  assert.equal(validSend.cleanRecipient, 'MIKKI');
  assert.equal(validSend.amount, 5000);
  assert.equal(validSend.currency, 'NGN');
  assert.equal(validSend.source, 'x-extension');

  const validClaim = validateAction({
    action: 'claim',
    recipient: '₦ASAKE'
  });
  assert.equal(validClaim.action, 'claim');
  assert.equal(validClaim.recipient, '₦ASAKE');
  assert.equal(validClaim.amount, null);
});

test('validateAction: rejects invalid payload, invalid tag, or invalid amount', () => {
  assert.throws(
    () => validateAction({ action: 'unknown_action', recipient: '₦MIKKI' }),
    /Unsupported action type/
  );

  assert.throws(
    () => validateAction({ action: 'send', recipient: '₦5,000', amount: 500 }),
    /Invalid recipient/
  );

  assert.throws(
    () => validateAction({ action: 'send', recipient: '₦MIKKI', amount: -10 }),
    /Invalid amount/
  );
});

test('generateDeepLink: constructs standard universal deep links', () => {
  const payUrl = generateDeepLink({
    action: 'send',
    recipient: '₦MIKKI',
    amount: '5000',
    source: 'x-bot'
  }, 'https://nairatag.ng');

  assert.equal(payUrl, 'https://nairatag.ng/pay?tag=MIKKI&amount=5000&currency=NGN&source=x-bot');

  const claimUrl = generateDeepLink({
    action: 'claim',
    recipient: '₦NEWTAG'
  }, 'https://nairatag.ng');

  assert.equal(claimUrl, 'https://nairatag.ng/claim?tag=NEWTAG&source=web-app');
});

test('ActionEngine: securely re-resolves recipient before execution', async () => {
  const mockResolver = {
    resolveTag: async (tag) => ({
      tag,
      available: false,
      address: '0x1111111111111111111111111111111111111111',
      claimUrl: `https://nairatag.ng/claim/${tag}`
    })
  };

  const engine = createActionEngine({ resolver: mockResolver });

  // Custom in-timeline payment provider
  engine.registerProvider('wallet', {
    name: 'In-Timeline Wallet Provider',
    canHandle: () => true,
    execute: async (action, ctx) => ({
      success: true,
      txHash: '0xabc123',
      recipientAddress: ctx.resolved.address
    })
  });

  const res = await engine.execute({
    action: 'send',
    recipient: '₦mikki',
    amount: 5000
  }, { preferredRail: 'wallet' });

  assert.equal(res.success, true);
  assert.equal(res.recipient, '₦MIKKI');
  assert.equal(res.resolvedRecipient, '0x1111111111111111111111111111111111111111');
});
