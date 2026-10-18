/**
 * @file agent-hub-tag2tag.test.cjs
 * @description Verifies that the Agent Chat Hub and Muse Spark backend directly support
 * live Agent-to-Agent (Tag2Tag) conversations, bill splits, escrows, and discoveries right in chat.
 */

const assert = require('node:assert');
const { createMuseSparkAgent } = require('../bots/nairatag-claim/src/muse-spark');

async function testHubTag2TagChat() {
  console.log('\n--- 💬 STARTING AGENT HUB TAG2TAG CHAT TESTS ---\n');

  const mockTagService = {
    resolveTag: async (tag) => ({
      tag,
      resolvedAddress: '0x8217316A99D41c6DCE89d46E9A34c1143d1a914c'
    }),
    getNetworkInfo: () => ({ resolution: { registryAddress: '0x7FA9385bE102ac3EAc297483Dd6233D62b3e1496' } })
  };

  const agent = createMuseSparkAgent({
    tagService: mockTagService,
    phoneResolverService: {},
    pointsService: {},
    marketplaceService: {},
    chowdeckService: {},
    ojalmService: {}
  });

  // 1. Agent-to-Agent Talk
  console.log('[1/5] Testing A2A Chat in Hub ("Ask Mama if she needs anything from the market")...');
  const talkRes = await agent.processPrompt('Ask Mama if she needs anything from the market', { tag: '₦CHUKS' });
  assert.strictEqual(talkRes.intent, 'TAG2TAG_TALK_REPLIED');
  assert.ok(talkRes.replyText.toLowerCase().includes('rice') || talkRes.replyText.toLowerCase().includes('cooking oil'));
  console.log(`✓ Dialogue received from ₦MAMA Agent: "${talkRes.replyText}"`);

  // 2. Agent Autonomous Negotiation
  console.log('\n[2/5] Testing Autonomous Negotiation in Hub ("Negotiate with ₦DEV to build landing page for ₦100k")...');
  const negRes = await agent.processPrompt('Negotiate with ₦DEV to build landing page for ₦100k', { tag: '₦CHUKS' });
  assert.strictEqual(negRes.intent, 'TAG2TAG_NEGOTIATION_AGREED');
  assert.ok(negRes.data.agreementReached);
  console.log(`✓ Negotiation output: "${negRes.replyText}"`);

  // 3. Agent Bill Split
  console.log('\n[3/5] Testing Split Bill Widget in Hub ("Split ₦30k between ₦MAMA, ₦BRO and ₦SIS")...');
  const splitRes = await agent.processPrompt('Split ₦30k between ₦MAMA, ₦BRO and ₦SIS', { tag: '₦CHUKS' });
  assert.strictEqual(splitRes.intent, 'TAG2TAG_SPLIT_CREATED');
  assert.strictEqual(splitRes.widgetType, 'split_bill_card');
  assert.strictEqual(splitRes.data.items.length, 3);
  console.log(`✓ Split bill card generated with widgetType: ${splitRes.widgetType}`);

  // 4. Agent Conditional Escrow
  console.log('\n[4/5] Testing Conditional Escrow in Hub ("Pay ₦DESIGNER ₦50k when the logo is delivered")...');
  const escrowRes = await agent.processPrompt('Pay ₦DESIGNER ₦50k when the logo is delivered', { tag: '₦CHUKS' });
  assert.strictEqual(escrowRes.intent, 'TAG2TAG_ESCROW_LOCKED');
  assert.strictEqual(escrowRes.widgetType, 'escrow_locked_card');
  assert.strictEqual(escrowRes.data.amount, 50000);
  console.log(`✓ Escrow card generated with widgetType: ${escrowRes.widgetType}`);

  // 5. Agent Discovery & Directory
  console.log('\n[5/5] Testing Specialist Agent Search in Hub ("Find me a Lagos designer under ₦100k")...');
  const discRes = await agent.processPrompt('Find me a Lagos designer under ₦100k', { tag: '₦CHUKS' });
  assert.strictEqual(discRes.intent, 'TAG2TAG_AGENTS_FOUND');
  assert.strictEqual(discRes.widgetType, 'agent_directory_results');
  assert.ok(discRes.data.agents.length > 0);
  console.log(`✓ Agent directory results generated with widgetType: ${discRes.widgetType}`);

  console.log('\n============================================================');
  console.log('🎉 ALL AGENT HUB TAG2TAG CHAT TESTS PASSED CLEANLY!');
  console.log('============================================================\n');
}

testHubTag2TagChat().catch(err => {
  console.error('❌ Hub Tag2Tag Test Failed:', err);
  process.exit(1);
});
