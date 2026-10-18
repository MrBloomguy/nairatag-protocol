/**
 * @file tag2tag-protocol.test.cjs
 * @description Comprehensive Test Suite for the Tag2Tag Protocol on Celo.
 * Tests the Killer 6 Primitives:
 * 1. Pay & Multi-Agent Split
 * 2. Peer-to-Peer Request & Invoice
 * 3. Agent-to-Agent Talk & Messaging
 * 4. Delegate & Hire Specialist Agents
 * 5. Escrow & Proof-of-Delivery Lifecycle
 * 6. Discover & Autonomous Negotiation
 * Plus Trust Levels and Reputation Scoring.
 */

const assert = require('node:assert');
const {
  ActionEngine,
  AgentMemory,
  Tag2TagProtocol,
  TrustLevel,
  EscrowStatus
} = require('../sdk/src/index');

async function runTag2TagTests() {
  console.log('\n--- 🤝 STARTING NAIRATAG TAG2TAG PROTOCOL TEST SUITE ---\n');

  const memory = new AgentMemory({ agentTag: '₦segun' });
  const tag2tag = new Tag2TagProtocol();
  const engine = new ActionEngine({ memory, a2a: tag2tag });

  // -------------------------------------------------------------
  // [1/7] Test Tag2Tag Pay & Multi-Agent Split
  // -------------------------------------------------------------
  console.log('[1/7] Testing Tag2Tag Pay & Split Bill...');
  const splitPrompt = 'Split ₦30k between ₦MAMA, ₦BRO and ₦SIS';
  const splitRes = await engine.processPrompt(splitPrompt, { tag: '₦segun' });

  assert.strictEqual(splitRes.intent, 'TAG2TAG_SPLIT_CREATED');
  assert.strictEqual(splitRes.data.totalAmount, 30000);
  assert.strictEqual(splitRes.data.items.length, 3);
  assert.strictEqual(splitRes.data.items[0].amount, 10000);
  console.log('✓ Bill split generated: ₦10,000 cNGN each for ₦MAMA, ₦BRO, and ₦SIS.');

  // -------------------------------------------------------------
  // [2/7] Test Tag2Tag Request & Merchant Invoice
  // -------------------------------------------------------------
  console.log('\n[2/7] Testing Tag2Tag Request & Invoice...');
  const invoicePrompt = 'Ask ₦CUSTOMER for ₦25,000 for the laptop';
  const invRes = await engine.processPrompt(invoicePrompt, { tag: '₦store' });

  assert.strictEqual(invRes.intent, 'PAYMENT_REQUEST_CREATED');
  assert.strictEqual(invRes.data.to, '₦customer');
  assert.strictEqual(invRes.data.payload.amount, 25000);
  console.log('✓ Structured merchant invoice created for ₦25,000 cNGN.');

  // -------------------------------------------------------------
  // [3/7] Test Tag2Tag Talk (Conversational Messaging)
  // -------------------------------------------------------------
  console.log('\n[3/7] Testing Tag2Tag Talk ("Ask Mama if she needs anything from the market")...');
  const talkPrompt = 'Ask Mama if she needs anything from the market';
  const talkRes = await engine.processPrompt(talkPrompt, { tag: '₦segun' });

  assert.strictEqual(talkRes.intent, 'TAG2TAG_TALK_REPLIED');
  assert.ok(talkRes.replyText.toLowerCase().includes('rice') || talkRes.replyText.toLowerCase().includes('cooking oil'));
  console.log(`✓ ₦MAMA Agent replied: "${talkRes.replyText}"`);

  // -------------------------------------------------------------
  // [4/7] Test Tag2Tag Discover (Specialist Agent Search)
  // -------------------------------------------------------------
  console.log('\n[4/7] Testing Tag2Tag Discover ("Find me a Lagos designer under ₦100k")...');
  const discPrompt = 'Find me a Lagos designer under ₦100k';
  const discRes = await engine.processPrompt(discPrompt, { tag: '₦segun' });

  assert.strictEqual(discRes.intent, 'TAG2TAG_AGENTS_FOUND');
  assert.ok(discRes.data.agents.length > 0);
  const designer = discRes.data.agents.find(a => a.tag === '₦DESIGNER');
  assert.ok(designer);
  assert.strictEqual(designer.reputation, 96);
  assert.strictEqual(designer.trustLevel, TrustLevel.VERIFIED_MERCHANT);
  console.log(`✓ Discovered ${designer.tag} (${designer.name}): Rep ${designer.reputation}%, ${designer.completedJobs} jobs.`);

  // -------------------------------------------------------------
  // [5/7] Test Tag2Tag Autonomous Negotiation
  // -------------------------------------------------------------
  console.log('\n[5/7] Testing Tag2Tag Autonomous Negotiation...');
  const negPrompt = 'Negotiate with ₦DEV to build landing page for ₦100k';
  const negRes = await engine.processPrompt(negPrompt, { tag: '₦segun' });

  assert.strictEqual(negRes.intent, 'TAG2TAG_NEGOTIATION_AGREED');
  assert.ok(negRes.data.agreementReached);
  assert.ok(negRes.data.agreedAmount >= 80000);
  console.log(`✓ Negotiation reached agreement: ₦${negRes.data.agreedAmount.toLocaleString()} cNGN.`);

  // -------------------------------------------------------------
  // [6/7] Test Tag2Tag Escrow & Proof-of-Delivery Lifecycle
  // -------------------------------------------------------------
  console.log('\n[6/7] Testing Tag2Tag Escrow & Proof-of-Delivery Lifecycle...');

  // Step A: Lock Escrow
  const escrowPrompt = 'Pay ₦DESIGNER ₦50k when the logo is delivered';
  const escrowRes = await engine.processPrompt(escrowPrompt, { tag: '₦segun' });
  assert.strictEqual(escrowRes.intent, 'TAG2TAG_ESCROW_LOCKED');
  assert.strictEqual(escrowRes.data.status, EscrowStatus.LOCKED);
  assert.strictEqual(escrowRes.data.amount, 50000);
  const escrowId = escrowRes.data.escrowId;
  console.log(`✓ Escrow locked on Celo (ID: ${escrowId}) for ₦50,000 cNGN.`);

  // Step B: Submit Proof of Delivery
  const delivered = tag2tag.submitDeliveryProof(escrowId, 'Logo SVG and brand guidelines package uploaded');
  assert.strictEqual(delivered.status, EscrowStatus.DELIVERED);
  assert.ok(delivered.deliveryProof);
  console.log('✓ Designer submitted verified deliverable package.');

  // Step C: Release Escrow
  const releasePrompt = 'Release escrow for ₦DESIGNER';
  const releaseRes = await engine.processPrompt(releasePrompt, { tag: '₦segun' });
  assert.strictEqual(releaseRes.intent, 'TAG2TAG_ESCROW_RELEASED');
  assert.strictEqual(releaseRes.data.status, EscrowStatus.RELEASED);
  console.log('✓ Escrow released to ₦DESIGNER on Celo upon delivery confirmation.');

  // -------------------------------------------------------------
  // [7/7] Test Trust Tiers & Reputation Policies
  // -------------------------------------------------------------
  console.log('\n[7/7] Testing Trust Levels & Permission Boundaries...');
  assert.strictEqual(tag2tag.getMaxUnapprovedLimit(TrustLevel.UNKNOWN), 1000);
  assert.strictEqual(tag2tag.getMaxUnapprovedLimit(TrustLevel.KNOWN), 10000);
  assert.strictEqual(tag2tag.getMaxUnapprovedLimit(TrustLevel.TRUSTED), 25000);
  assert.strictEqual(tag2tag.getMaxUnapprovedLimit(TrustLevel.VERIFIED_MERCHANT), 50000);
  console.log('✓ Trust level spending limits strictly enforced (Unknown: ≤ ₦1k, Known: ≤ ₦10k, Verified: ≤ ₦50k).');

  console.log('\n============================================================');
  console.log('🎉 ALL 7 TAG2TAG PROTOCOL TESTS PASSED CLEANLY!');
  console.log('============================================================\n');
}

runTag2TagTests().catch(err => {
  console.error('❌ Tag2Tag Protocol Test Failed:', err);
  process.exit(1);
});
