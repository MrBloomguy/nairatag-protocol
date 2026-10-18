/**
 * @file identity-addressed-agent.test.cjs
 * @description Comprehensive Test Suite for NairaTag Identity-Addressed Agent Network.
 * Tests:
 * 1. Agent Memory & Context Engine (Relationships & Preferences)
 * 2. Identity Resolution & Lookup
 * 3. Money, Utilities & Bounded Permissions
 * 4. Agent-to-Agent (A2A) Protocol
 * 5. Multi-Step Intent Decomposer & Task DAG
 * 6. Autonomous Execution on Celo with cNGN Settlement
 */

const assert = require('node:assert');
const {
  ActionEngine,
  AgentMemory,
  AgentToAgentProtocol,
  IntentPlanner,
  NairaTagClient
} = require('../sdk/src/index');

async function runIdentityAgentTests() {
  console.log('\n--- 🧠 STARTING NAIRATAG IDENTITY-ADDRESSED AGENT SUITE ---\n');

  const memory = new AgentMemory({ agentTag: '₦segun' });
  const a2a = new AgentToAgentProtocol();
  const planner = new IntentPlanner({ memory });
  const engine = new ActionEngine({ memory, a2a, planner });

  // -------------------------------------------------------------
  // [1/6] Test Agent Memory: Relationships & Preferences
  // -------------------------------------------------------------
  console.log('[1/6] Testing Agent Memory Engine...');
  const relResult = await engine.processPrompt('₦MAMA is my mother', { tag: '₦segun' });
  assert.strictEqual(relResult.intent, 'MEMORY_LEARNED');
  assert.ok(relResult.replyText.toLowerCase().includes('mama'));

  // Verify memory lookup
  assert.strictEqual(memory.resolveContact('mother'), '₦mama');
  assert.strictEqual(memory.resolveContact('mum'), '₦mama');

  const prefResult = await engine.processPrompt('Always use cNGN for Nigerian payments', { tag: '₦segun' });
  assert.strictEqual(prefResult.intent, 'MEMORY_PREFERENCE_SAVED');
  assert.strictEqual(memory.getPreference('currency'), 'cNGN');
  console.log('✓ Memory successfully learned relationships and preferences.');

  // -------------------------------------------------------------
  // [2/6] Test Identity Resolution on Celo
  // -------------------------------------------------------------
  console.log('\n[2/6] Testing Identity Discovery ("What address is ₦MAMA?")...');
  const idResult = await engine.processPrompt('What address is ₦MAMA?', { tag: '₦segun' });
  assert.strictEqual(idResult.intent, 'IDENTITY_FOUND');
  assert.strictEqual(idResult.data.address, '0x8217316A99D41c6DCE89d46E9A34c1143d1a914c');
  assert.strictEqual(idResult.data.network, 'celo');
  console.log(`✓ Identity resolved to Celo address: ${idResult.data.address}`);

  // -------------------------------------------------------------
  // [3/6] Test Natural Money Flow Using Memory
  // -------------------------------------------------------------
  console.log('\n[3/6] Testing Payment Flow via Memory Contact ("Send ₦5k to mother")...');
  const sendResult = await engine.processPrompt('Send ₦5k to mother', {
    tag: '₦segun',
    wallet: '0x1804c8AB1F12E6bbf3894d4083f33e07309d1f38',
    balances: { cNGN: { formatted: '50000' } }
  });

  assert.strictEqual(sendResult.intent, 'PAYMENT_APPROVAL_REQUIRED');
  assert.strictEqual(sendResult.data.to, '₦mama');
  assert.strictEqual(sendResult.data.amount, 5000);
  assert.strictEqual(sendResult.data.asset, 'cNGN');
  assert.strictEqual(sendResult.data.network, 'Celo');
  console.log('✓ Payment card formulated using memory relationship alias ("mother" -> ₦mama).');

  // -------------------------------------------------------------
  // [4/6] Test Utility Bills & Services (Electricity)
  // -------------------------------------------------------------
  console.log('\n[4/6] Testing Utility Service Flow ("Pay my electricity bill")...');
  const billResult = await engine.processPrompt('Pay my electricity bill', { tag: '₦segun' });
  assert.strictEqual(billResult.intent, 'BILL_APPROVAL_REQUIRED');
  assert.strictEqual(billResult.data.provider, 'Ikeja Electric');
  assert.strictEqual(billResult.data.asset, 'cNGN');
  assert.strictEqual(billResult.data.network, 'Celo');
  console.log(`✓ Electricity bill card prepared for ${billResult.data.provider} (Meter ${billResult.data.meter}).`);

  // -------------------------------------------------------------
  // [5/6] Test Agent-to-Agent (A2A) Coordination
  // -------------------------------------------------------------
  console.log('\n[5/6] Testing Agent-to-Agent Protocol (₦SEGUN Agent <-> ₦MAMA Agent)...');

  // Step A: ₦SEGUN executes transfer to ₦MAMA
  const execResult = await engine.executeApprovedTransfer({
    agentId: '₦segun',
    amount: 5000,
    asset: 'cNGN',
    recipientTag: '₦mama',
    recipientAddress: '0x8217316A99D41c6DCE89d46E9A34c1143d1a914c'
  });
  assert.strictEqual(execResult.success, true);
  console.log(`✓ Payment broadcasted on Celo. Tx: ${execResult.txHash.slice(0, 16)}...`);

  // Step B: Inquire recipient agent: "Did ₦MAMA receive the money?"
  const inquiryResult = await engine.processPrompt('Did ₦MAMA receive the money?', { tag: '₦segun' });
  assert.strictEqual(inquiryResult.intent, 'A2A_QUERY_RECEIPT');
  assert.ok(inquiryResult.replyText.includes('confirmed receipt'));
  console.log('✓ ₦MAMA Agent acknowledged receipt over A2A protocol.');

  // Step C: Invoice request: "Tell ₦SEGUN to send me ₦10k"
  const invoiceResult = await engine.processPrompt('Tell ₦SEGUN to send me ₦10k', { tag: '₦mama' });
  assert.strictEqual(invoiceResult.intent, 'PAYMENT_REQUEST_CREATED');
  console.log('✓ Invoice request dispatched over A2A protocol.');

  // -------------------------------------------------------------
  // [6/6] Test Multi-Step Intent Decomposer (Composite Plan)
  // -------------------------------------------------------------
  console.log('\n[6/6] Testing Multi-Step Intent Decomposer ("I\'m travelling next week...")...');
  const planPrompt = "I'm travelling next week. Make sure my bills are paid, send Mama her allowance, keep ₦50k available, and tell me if anything unusual happens.";
  const planResult = await engine.processPrompt(planPrompt, { tag: '₦segun' });

  assert.strictEqual(planResult.intent, 'PLAN_PROPOSAL');
  assert.strictEqual(planResult.data.steps.length, 4);
  assert.strictEqual(planResult.data.steps[0].type, 'PAY_BILL');
  assert.strictEqual(planResult.data.steps[1].type, 'RECURRING_TRANSFER');
  assert.strictEqual(planResult.data.steps[2].type, 'BALANCE_GUARD');
  assert.strictEqual(planResult.data.steps[3].type, 'ANOMALY_MONITOR');
  console.log('✓ High-level composite human intent cleanly decomposed into 4 deterministic tasks:');
  planResult.data.steps.forEach((s, idx) => console.log(`   ${idx + 1}. [${s.type}] ${s.title}`));

  console.log('\n============================================================');
  console.log('🎉 ALL 6 IDENTITY-ADDRESSED AGENT NETWORK TESTS PASSED!');
  console.log('============================================================\n');
}

runIdentityAgentTests().catch(err => {
  console.error('❌ Identity Agent Test Suite Failed:', err);
  process.exit(1);
});
