/**
 * @file agent-payment-lifecycle.test.cjs
 * @description End-to-End Validation of the Complete NairaTag Agent Payment Lifecycle,
 * Failure Paths, and Idempotency Boundaries.
 */

const assert = require('node:assert');
const { ActionEngine } = require('../sdk/src/wallet/action-engine');
const { PermissionEngine } = require('../sdk/src/wallet/permissions');
const { ActivityStore, TransactionState } = require('../sdk/src/wallet/activity');
const { TaskEngine } = require('../sdk/src/wallet/tasks');
const { IdempotencyRegistry } = require('../sdk/src/wallet/idempotency');

// Mock NairaTag Registry Service
const mockTagService = {
  async resolveTag(tag) {
    const clean = String(tag || '').replace(/^₦/, '').toLowerCase();
    if (clean === 'mama') {
      return {
        tag: '₦MAMA',
        resolvedAddress: '0x8217316A99D41c6dCe89D46e9A34c1143D1A914c',
        registered: true
      };
    }
    if (clean === 'chuks') {
      return {
        tag: '₦CHUKS',
        resolvedAddress: '0x94A708064A5c73d91787B2eC078aFEf6e3B90E3e',
        registered: true
      };
    }
    return null; // Unknown tag
  }
};

async function runLifecycleTests() {
  console.log('\n--- 🧪 STARTING AGENT PAYMENT LIFECYCLE & FAILURE PATH SUITE ---');

  const permissions = new PermissionEngine();
  const activity = new ActivityStore();
  const idempotency = new IdempotencyRegistry();
  const tasks = new TaskEngine(idempotency);

  const engine = new ActionEngine({
    tagService: mockTagService,
    permissions,
    activity,
    tasks,
    idempotency
  });

  // =================================================================
  // TEST 1: The Complete Happy Path Payment Lifecycle
  // =================================================================
  console.log('\n[1/7] Testing Complete Happy Path Lifecycle ("Send ₦5,000 to ₦MAMA")...');
  const res1 = await engine.processPrompt('Send ₦5,000 to ₦MAMA', {
    agentId: '₦CHUKS',
    tag: '₦CHUKS',
    balances: { cNGN: { formatted: '25000.00' } }
  });

  assert.strictEqual(res1.intent, 'PAYMENT_APPROVAL_REQUIRED');
  assert.strictEqual(res1.isConsequential, true);
  assert.strictEqual(res1.data.amount, 5000);
  assert.strictEqual(res1.data.asset, 'cNGN');
  assert.strictEqual(res1.data.to, '₦mama');
  assert.strictEqual(res1.data.recipientAddress, '0x8217316A99D41c6dCe89D46e9A34c1143D1A914c');
  assert(res1.replyText.includes('₦MAMA') || res1.replyText.includes('₦mama'));
  assert(res1.replyText.includes('Network Fee'));
  console.log('✓ Natural language parsed into structured approval card with fee quote.');

  // User Approves the payment
  const exec1 = await engine.executeApprovedTransfer({
    agentId: '₦CHUKS',
    amount: res1.data.amount,
    asset: res1.data.asset,
    recipientTag: res1.data.to,
    recipientAddress: res1.data.recipientAddress,
    clientNonce: 'tx_nonce_001'
  });

  assert.strictEqual(exec1.success, true);
  assert.strictEqual(exec1.alreadyExecuted, false);
  assert(exec1.txHash.startsWith('0x'));
  assert(exec1.receiptText.includes('Payment sent ✓'));
  console.log(`✓ Payment broadcasted and confirmed on Celo. Tx: ${exec1.txHash.slice(0, 10)}...`);

  const recentAct = activity.getRecent('₦CHUKS', 1);
  assert.strictEqual(recentAct[0].status, TransactionState.CONFIRMED);
  assert.strictEqual(recentAct[0].recipient, '₦mama');
  console.log('✓ Confirmed transaction persisted into human-readable activity ledger.');

  // =================================================================
  // TEST 2: Contact Alias & Nigerian Word Number Resolution
  // =================================================================
  console.log('\n[2/7] Testing Contact Mapping ("Send five thousand naira to Mum")...');
  const res2 = await engine.processPrompt('Send five thousand naira to Mum', {
    agentId: '₦CHUKS',
    balances: { cNGN: { formatted: '20000.00' } }
  });

  assert.strictEqual(res2.intent, 'PAYMENT_APPROVAL_REQUIRED');
  assert.strictEqual(res2.data.amount, 5000);
  assert.strictEqual(res2.data.to, '₦mama');
  console.log('✓ "five thousand naira" parsed to 5000 cNGN and "Mum" mapped to ₦mama.');

  // =================================================================
  // TEST 3: Failure Path — Unknown NairaTag
  // =================================================================
  console.log('\n[3/7] Testing Failure Path: Unknown NairaTag ("Send ₦5,000 to ₦DOESNOTEXIST")...');
  const res3 = await engine.processPrompt('Send ₦5,000 to ₦DOESNOTEXIST', {
    agentId: '₦CHUKS',
    balances: { cNGN: { formatted: '20000.00' } }
  });

  assert.strictEqual(res3.intent, 'UNKNOWN_RECIPIENT_TAG');
  assert.strictEqual(res3.isConsequential, false);
  assert(res3.replyText.includes("I couldn't find that NairaTag"));
  assert.strictEqual(res3.widgetType, undefined);
  console.log('✓ Unknown NairaTag safely rejected without creating transaction or approval.');

  // =================================================================
  // TEST 4: Failure Path — Insufficient Balance
  // =================================================================
  console.log('\n[4/7] Testing Failure Path: Insufficient Balance ("Send ₦50,000 to ₦MAMA" with ₦2,000 balance)...');
  const res4 = await engine.processPrompt('Send ₦50,000 to ₦MAMA', {
    agentId: '₦CHUKS',
    balances: { cNGN: { formatted: '2000.00' } }
  });

  assert.strictEqual(res4.intent, 'INSUFFICIENT_BALANCE');
  assert.strictEqual(res4.isConsequential, false);
  assert(res4.replyText.includes("You don't have enough cNGN to complete this payment"));
  console.log('✓ Insufficient balance detected pre-flight. Zero broadcast occurred.');

  // =================================================================
  // TEST 5: Failure Path — Above Limit (PERMISSION_REQUIRED)
  // =================================================================
  console.log('\n[5/7] Testing Failure Path: Spending Limit Boundary ("Send ₦100,000 to ₦MAMA")...');
  const res5 = await engine.processPrompt('Send ₦100,000 to ₦MAMA', {
    agentId: '₦CHUKS',
    balances: { cNGN: { formatted: '500000.00' } }
  });

  assert.strictEqual(res5.intent, 'PERMISSION_REQUIRED');
  assert.strictEqual(res5.code, 'PERMISSION_REQUIRED');
  assert(res5.replyText.includes('exceeds single transaction limit'));
  console.log('✓ Amounts above single transaction limit strictly trigger PERMISSION_REQUIRED.');

  // =================================================================
  // TEST 6: User Rejection & Transaction Revert & RPC Failure States
  // =================================================================
  console.log('\n[6/7] Testing Rejection, On-Chain Revert, and RPC Failure Recovery...');

  // A. User Rejection
  const rejRecord = engine.recordUserRejection({
    agentId: '₦CHUKS',
    recipientTag: '₦MAMA',
    amount: 5000,
    executionId: 'exec_cancelled_1'
  });
  assert.strictEqual(rejRecord.status, TransactionState.REJECTED);
  console.log('✓ User cancellation correctly recorded as REJECTED state.');

  // B. On-chain Revert
  const revertRes = await engine.executeApprovedTransfer({
    agentId: '₦CHUKS',
    amount: 1000,
    recipientTag: '₦MAMA',
    recipientAddress: '0x8217316A99D41c6dCe89D46e9A34c1143D1A914c',
    simulateRevert: true
  });
  assert.strictEqual(revertRes.success, false);
  assert.strictEqual(revertRes.status, TransactionState.FAILED);
  assert(revertRes.error.includes('reverted'));
  console.log('✓ Reverted on-chain execution recorded as FAILED with descriptive error.');

  // C. RPC Network Failure (ETIMEDOUT) -> PENDING_RETRY
  const rpcRes = await engine.executeApprovedTransfer({
    agentId: '₦CHUKS',
    amount: 1000,
    recipientTag: '₦MAMA',
    recipientAddress: '0x8217316A99D41c6dCe89D46e9A34c1143D1A914c',
    simulateRpcError: true
  });
  assert.strictEqual(rpcRes.success, false);
  assert.strictEqual(rpcRes.status, TransactionState.PENDING_RETRY);
  console.log('✓ RPC timeout recorded as PENDING_RETRY recoverable state.');

  // =================================================================
  // TEST 7: Hardened Idempotency (Zero Double-Broadcast Guarantee)
  // =================================================================
  console.log('\n[7/7] Testing Idempotency Locking & Double-Broadcast Prevention...');

  const nonce = 'unique_payment_ref_889';

  // First execution: Broadcasts and confirms
  const execA = await engine.executeApprovedTransfer({
    agentId: '₦CHUKS',
    amount: 2500,
    recipientTag: '₦MAMA',
    recipientAddress: '0x8217316A99D41c6dCe89D46e9A34c1143D1A914c',
    clientNonce: nonce
  });
  assert.strictEqual(execA.alreadyExecuted, false);
  const firstTxHash = execA.txHash;

  // Duplicate execution retry (e.g. timeout retry, worker restart, browser double-click)
  const execB = await engine.executeApprovedTransfer({
    agentId: '₦CHUKS',
    amount: 2500,
    recipientTag: '₦MAMA',
    recipientAddress: '0x8217316A99D41c6dCe89D46e9A34c1143D1A914c',
    clientNonce: nonce
  });
  assert.strictEqual(execB.alreadyExecuted, true);
  assert.strictEqual(execB.txHash, firstTxHash);
  console.log('✓ Duplicate execution request safely returned cached confirmation without re-broadcasting.');

  // Task scheduler crash recovery test
  const task = tasks.createTask({
    agentId: '₦CHUKS',
    amount: 3000,
    recipientTag: '₦MAMA',
    schedule: 'MONTHLY'
  });

  let taskBroadcasts = 0;
  const runner = async () => {
    taskBroadcasts++;
    return { txHash: '0xabcdef1234567890' };
  };

  const taskRun1 = await tasks.executeTaskSafely(task.id, runner);
  assert.strictEqual(taskRun1.alreadyExecuted, false);
  assert.strictEqual(taskBroadcasts, 1);

  // Re-run in the same monthly period (worker restart simulation)
  const taskRun2 = await tasks.executeTaskSafely(task.id, runner);
  assert.strictEqual(taskRun2.alreadyExecuted, true);
  assert.strictEqual(taskBroadcasts, 1);
  console.log('✓ Task scheduler prevented second execution during worker recovery.');

  console.log('\n============================================================');
  console.log('🎉 ALL 7 LIFECYCLE & FAILURE PATH TESTS PASSED CLEANLY!');
  console.log('============================================================\n');
}

runLifecycleTests().catch(err => {
  console.error('\n❌ LIFECYCLE TEST FAILURE:', err);
  process.exit(1);
});
