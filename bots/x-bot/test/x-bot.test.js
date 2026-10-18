import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseXBotCommand } from '../src/command-parser.js';
import { createXBotService } from '../src/x-bot-service.js';

test('parseXBotCommand: parses deterministic commands from tweet mentions', () => {
  // Check
  const checkCmd = parseXBotCommand('@NairaTagBot check ₦MIKKI');
  assert.equal(checkCmd.type, 'check');
  assert.equal(checkCmd.cleanRecipient, 'MIKKI');

  // Claim
  const claimCmd = parseXBotCommand('@NairaTagBot claim ₦ASAKE');
  assert.equal(claimCmd.type, 'claim');
  assert.equal(claimCmd.cleanRecipient, 'ASAKE');

  // Send
  const sendCmd = parseXBotCommand('@NairaTagBot send ₦5,000 to ₦MIKKI');
  assert.equal(sendCmd.type, 'send');
  assert.equal(sendCmd.cleanRecipient, 'MIKKI');
  assert.equal(sendCmd.amount, 5000);

  // Tip
  const tipCmd = parseXBotCommand('@NairaTagBot tip ₦TEMI ₦1k');
  assert.equal(tipCmd.type, 'tip');
  assert.equal(tipCmd.cleanRecipient, 'TEMI');
  assert.equal(tipCmd.amount, 1000);

  // Request
  const reqCmd = parseXBotCommand('@NairaTagBot request ₦10,000 from ₦SEGUN');
  assert.equal(reqCmd.type, 'request');
  assert.equal(reqCmd.cleanRecipient, 'SEGUN');
  assert.equal(reqCmd.amount, 10000);
});

test('XBotService: executes commands and produces pre-filled deep links', async () => {
  const mockResolver = {
    checkAvailability: async (tag) => tag === 'AVAILABLE_TAG',
    getProfile: async (tag) => ({
      tag,
      available: false,
      profileUrl: `https://nairatag.ng/tag/${tag}`
    })
  };

  const bot = createXBotService({ resolver: mockResolver });

  // 1. Available tag claim
  const claimRes = await bot.handleTweet({
    sender: 'cryptouser',
    text: '@NairaTagBot check ₦AVAILABLE_TAG'
  });
  assert.equal(claimRes.available, true);
  assert.ok(claimRes.reply.includes('🟢 ₦AVAILABLE_TAG is available!'));
  assert.ok(claimRes.reply.includes('/claim?tag=AVAILABLE_TAG'));

  // 2. Claimed tag check
  const checkClaimed = await bot.handleTweet({
    sender: 'cryptouser',
    text: '@NairaTagBot check ₦MIKKI'
  });
  assert.equal(checkClaimed.available, false);
  assert.ok(checkClaimed.reply.includes('🔴 ₦MIKKI is already claimed'));

  // 3. Send command
  const sendRes = await bot.handleTweet({
    sender: 'cryptouser',
    text: '@NairaTagBot send ₦5,000 to ₦MIKKI'
  });
  assert.equal(sendRes.commandType, 'send');
  assert.ok(sendRes.reply.includes('Ready to send ₦5,000 to ₦MIKKI'));
  assert.ok(sendRes.reply.includes('/pay?tag=MIKKI&amount=5000&currency=NGN&source=x-bot'));
});

test('XBotService: anti-spam rate limiting triggers on excess commands', async () => {
  const bot = createXBotService({ rateLimitPerMin: 2 });

  await bot.handleTweet({ sender: 'spammer', text: '@NairaTagBot check ₦MIKKI' });
  await bot.handleTweet({ sender: 'spammer', text: '@NairaTagBot check ₦ASAKE' });

  // Third attempt should be rate limited
  const third = await bot.handleTweet({ sender: 'spammer', text: '@NairaTagBot check ₦TEMI' });
  assert.equal(third.rateLimited, true);
  assert.ok(third.reply.includes('too quickly'));
});
