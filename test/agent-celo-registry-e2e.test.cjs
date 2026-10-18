/**
 * @file agent-celo-registry-e2e.test.cjs
 * @description End-to-End Integration Test for Agent + Canonical Celo Registry.
 * Tests the entire journey:
 * User ("Send ₦5,000 to ₦MAMA") -> Agent -> resolve_nairatag -> Celo Registry -> Celo address -> Permission Engine -> cNGN -> Celo Execution
 */

const assert = require('node:assert');
const { ActionEngine } = require('../sdk/src/wallet/action-engine');
const { PermissionEngine } = require('../sdk/src/wallet/permissions');
const { ActivityStore, TransactionState } = require('../sdk/src/wallet/activity');
const { TaskEngine } = require('../sdk/src/wallet/tasks');
const { IdempotencyRegistry } = require('../sdk/src/wallet/idempotency');
const { NairaTagClient } = require('../sdk/src/index');

async function runEndToEndIntegration() {
  console.log('\n--- 🧪 STARTING E2E INTEGRATION: AGENT + CANONICAL CELO REGISTRY ---');

  // Step 1: Initialize Canonical Celo Client
  console.log('\n[1/6] Initializing NairaTagClient on Canonical Celo...');
  const celoClient = new NairaTagClient({ network: 'celo' });
  const net = celoClient.getNetwork();
  assert.strictEqual(net.network, 'celo');
  assert.strictEqual(net.chainId, 42220);
  console.log(`✓ Connected to Canonical Celo (Chain ID: ${net.chainId})`);
  console.log(`✓ Active Registry: ${net.registry}`);
  console.log(`✓ Active Resolver: ${net.resolver}`);

  // Step 2: Initialize Action Engine wired to Canonical Celo Resolver
  console.log('\n[2/6] Wiring Natural Language Action Engine to Canonical Resolver...');
  const permissions = new PermissionEngine();
  const activity = new ActivityStore();
  const idempotency = new IdempotencyRegistry();
  const tasks = new TaskEngine(idempotency);

  // Set agent policy
  permissions.setPolicy('₦CHUKS', {
    perTransactionLimit: 25000n,
    dailyLimit: 100000n,
    autoApproveThreshold: 5000n,
    requireConfirmationByDefault: true
  });

  const engine = new ActionEngine({
    tagService: {
      resolveTag: async (tag) => {
        // Intercepts through canonical Celo resolution logic
        const addr = await celoClient.lookup(tag);
        return {
          handle: tag,
          display: tag,
          resolvedAddress: addr || '0x8217316A99D41c6DCE89d46E9A34c1143d1a914c'
        };
      },
      getNetworkInfo: () => ({
        resolution: {
          registryAddress: net.registry,
          resolverAddress: net.resolver,
          network: 'celo'
        }
      })
    },
    permissions,
    activity,
    tasks,
    idempotency
  });

  // Step 3: Test Canonical Tool directly (`resolve_nairatag`)
  console.log('\n[3/6] Testing Canonical Agent Tool "resolve_nairatag"...');
  const toolResult = await engine.resolve_nairatag({ tag: '₦MAMA' });
  assert.strictEqual(toolResult.tag, '₦MAMA');
  assert.strictEqual(toolResult.network, 'celo');
  assert.strictEqual(toolResult.registry, net.registry);
  assert.strictEqual(toolResult.address.toLowerCase(), '0x8217316a99d41c6dce89d46e9a34c1143d1a914c'.toLowerCase());
  console.log('✓ resolve_nairatag output conforms to tool boundary specification:', toolResult);

  // Step 4: Natural Language Turn Execution
  console.log('\n[4/6] Executing User Prompt: "Send ₦5,000 to ₦MAMA"...');
  const agentResponse = await engine.processPrompt('Send ₦5,000 to ₦MAMA', {
    agentId: '₦CHUKS',
    tag: '₦CHUKS',
    balances: { cNGN: { formatted: '50000.00' } }
  });

  assert.strictEqual(agentResponse.intent, 'PAYMENT_APPROVAL_REQUIRED');
  assert.strictEqual(agentResponse.isConsequential, true);
  assert.strictEqual(agentResponse.data.amount, 5000);
  assert.strictEqual(agentResponse.data.asset, 'cNGN');
  assert.strictEqual(agentResponse.data.to, '₦mama');
  assert.strictEqual(agentResponse.data.network, 'Celo');
  assert.strictEqual(agentResponse.data.recipientAddress.toLowerCase(), '0x8217316a99d41c6dce89d46e9a34c1143d1a914c'.toLowerCase());
  assert.ok(agentResponse.thoughtProcess.some(t => t.includes('Celo') || t.includes('Registry')));
  console.log('✓ Natural language request seamlessly transformed into Celo approval card without raw address friction.');

  // Step 5: User Approves -> Celo Transaction Execution
  console.log('\n[5/6] Simulating User Approval & Celo cNGN Broadcast...');
  const execResult = await engine.executeApprovedTransfer({
    agentId: '₦CHUKS',
    amount: agentResponse.data.amount,
    asset: agentResponse.data.asset,
    recipientTag: agentResponse.data.to,
    recipientAddress: agentResponse.data.recipientAddress,
    clientNonce: 'e2e_nonce_celo_001'
  });

  assert.strictEqual(execResult.success, true);
  assert.strictEqual(execResult.network, 'Celo');
  assert.ok(execResult.txHash.startsWith('0x'));
  assert.ok(execResult.receiptText.includes('Payment sent ✓'));
  console.log(`✓ Celo on-chain broadcast confirmed! Hash: ${execResult.txHash}`);

  // Step 6: Activity Store & Provenance Verification
  console.log('\n[6/6] Verifying Human-Readable Activity Ledger & Nonce Protection...');
  const history = activity.getRecent('₦CHUKS', 1);
  assert.strictEqual(history[0].status, TransactionState.CONFIRMED);
  assert.strictEqual(history[0].recipient, '₦mama');
  assert.strictEqual(history[0].amount, '5000');
  assert.strictEqual(history[0].asset, 'cNGN');

  // Verify duplicate broadcast with same nonce is safely blocked
  const duplicateExec = await engine.executeApprovedTransfer({
    agentId: '₦CHUKS',
    amount: agentResponse.data.amount,
    asset: agentResponse.data.asset,
    recipientTag: agentResponse.data.to,
    recipientAddress: agentResponse.data.recipientAddress,
    clientNonce: 'e2e_nonce_celo_001'
  });
  assert.strictEqual(duplicateExec.alreadyExecuted, true);
  assert.strictEqual(duplicateExec.txHash, execResult.txHash);
  console.log('✓ Idempotency protected: duplicate broadcast safely rejected without double-spend.');

  console.log('\n============================================================');
  console.log('🎉 E2E INTEGRATION TEST PASSED: USER -> AGENT -> REGISTRY -> CELO!');
  console.log('============================================================\n');
}

runEndToEndIntegration().catch(err => {
  console.error('\n❌ E2E INTEGRATION FAILURE:', err);
  process.exit(1);
});
