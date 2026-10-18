/**
 * @file celo-agent-wallet.test.cjs
 * @description Comprehensive automated test suite for NairaTag Agent Celo & MiniPay Migration.
 */

const assert = require('node:assert');
const { getNetworkConfig } = require('../sdk/src/wallet/config');
const { FeeService } = require('../sdk/src/wallet/fee-service');
const { isMiniPay } = require('../sdk/src/wallet/minipay/detection');
const { PermissionEngine } = require('../sdk/src/wallet/permissions');
const { ActivityStore, TransactionState } = require('../sdk/src/wallet/activity');
const { TaskEngine } = require('../sdk/src/wallet/tasks');
const { CeloAgentWallet } = require('../sdk/src/wallet/providers/CeloAgentWallet');
const { MiniPayWallet } = require('../sdk/src/wallet/providers/MiniPayWallet');
const { AgentWalletFactory } = require('../sdk/src/wallet/AgentWalletFactory');
const { ActionEngine } = require('../sdk/src/wallet/action-engine');

async function runTests() {
  console.log('--- 🧪 STARTING NAIRATAG AGENT CELO & MINIPAY TEST SUITE ---');

  // TEST 1: Celo Configuration & Token Definitions
  console.log('\n[1/7] Testing Celo Network & Asset Configuration...');
  const celoConfig = getNetworkConfig('celo');
  assert.strictEqual(celoConfig.chainId, 42220, 'Celo Mainnet chain ID must be 42220');
  assert.strictEqual(celoConfig.tokens.cNGN.decimals, 18, 'cNGN decimals must be 18');
  assert.strictEqual(celoConfig.tokens.cNGN.address.toLowerCase(), '0xe2702bd97ee33c88c8f6f92da3b733608aa76f71'.toLowerCase(), 'cNGN address must match verified token');
  assert.strictEqual(celoConfig.tokens.USDC.decimals, 6, 'USDC decimals must be 6');
  assert.ok(celoConfig.tokens.USDC.feeAdapter, 'USDC fee adapter must be configured for CIP-64 gas payment');
  console.log('✓ Celo Mainnet and token configurations verified.');

  // TEST 2: Fee Service & CIP-64 Gas Abstraction
  console.log('\n[2/7] Testing Celo CIP-64 Fee Abstraction...');
  const feeService = new FeeService('celo');
  const feeCurrencies = feeService.getSupportedFeeCurrencies();
  assert.ok(feeCurrencies.length >= 2, 'Must support multiple fee currencies');
  const selectedCngn = feeService.selectFeeCurrency('cNGN');
  assert.strictEqual(selectedCngn.symbol, 'cNGN');
  assert.strictEqual(selectedCngn.feeCurrency, '0xe2702bd97ee33c88c8f6f92da3b733608aa76f71');
  const feeQuote = feeService.formatEstimatedFee(65000n, 'cNGN');
  assert.ok(feeQuote.includes('₦0.50 cNGN'), 'Fee estimation formatted in cNGN');
  console.log('✓ Fee service correctly selects cNGN & USDC fee currencies.');

  // TEST 3: MiniPay Detection & Provider
  console.log('\n[3/7] Testing MiniPay Detection & Isolation...');
  assert.strictEqual(isMiniPay(null), false, 'Null window returns false');
  assert.strictEqual(isMiniPay({}), false, 'Empty window returns false');
  const mockMiniPayWindow = { ethereum: { isMiniPay: true } };
  assert.strictEqual(isMiniPay(mockMiniPayWindow), true, 'window.ethereum.isMiniPay detected');
  const miniPayWallet = new MiniPayWallet({ address: '0x8217316A99D41c6dCe89D46e9A34c1143D1A914c' });
  const prepared = miniPayWallet.prepareTokenTransfer({
    token: 'cNGN',
    to: '0x1d96e2a476323Dc87a5fe6732DfEB71a05354a79',
    amount: '5000'
  });
  assert.strictEqual(prepared.provider, 'MiniPay');
  assert.strictEqual(prepared.chainId, 42220);
  assert.ok(prepared.txPayload.data.startsWith('0xa9059cbb'), 'Prepares ERC-20 transfer() calldata for MiniPay signing');
  console.log('✓ MiniPay detection and non-custodial payload generation verified.');

  // TEST 4: Deterministic Permission Engine (ASK vs DO boundaries)
  console.log('\n[4/7] Testing Deterministic Permission Engine...');
  const permissions = new PermissionEngine();
  permissions.setPolicy('₦CHUKS', {
    perTransactionLimit: 25000n,
    dailyLimit: 100000n,
    autoApproveThreshold: 5000n,
    requireConfirmationByDefault: true
  });

  // Test Read operation (ASK)
  const readCheck = permissions.evaluatePermission({
    agentId: '₦CHUKS',
    action: 'INFORMATION'
  });
  assert.strictEqual(readCheck.allowed, true);
  assert.strictEqual(readCheck.requiresApproval, false, 'Read operations must not require approval');

  // Test within limit (₦5,000)
  const normalCheck = permissions.evaluatePermission({
    agentId: '₦CHUKS',
    action: 'TRANSFER',
    asset: 'cNGN',
    amount: 5000
  });
  assert.strictEqual(normalCheck.allowed, true);
  assert.strictEqual(normalCheck.requiresApproval, true, 'Transactions require explicit approval card');

  // Test exceeding single limit (₦50,000 > ₦25,000)
  const overLimitCheck = permissions.evaluatePermission({
    agentId: '₦CHUKS',
    action: 'TRANSFER',
    asset: 'cNGN',
    amount: 50000
  });
  assert.strictEqual(overLimitCheck.allowed, false, 'Amounts above single transaction limit must be blocked');
  assert.ok(overLimitCheck.reason.includes('exceeds single transaction limit'));

  // Test cumulative daily limit
  permissions.recordSpend('₦CHUKS', 90000);
  const dailyOverCheck = permissions.evaluatePermission({
    agentId: '₦CHUKS',
    action: 'TRANSFER',
    asset: 'cNGN',
    amount: 15000
  });
  assert.strictEqual(dailyOverCheck.allowed, false, 'Cumulative daily spend must be blocked when exceeding cap');
  console.log('✓ Permission engine enforces strict deterministic financial limits.');

  // TEST 5: Task Engine Idempotency
  console.log('\n[5/7] Testing Task Engine & Idempotency Locking...');
  const taskEngine = new TaskEngine();
  const task = taskEngine.createTask({
    agentId: '₦CHUKS',
    amount: '2000',
    asset: 'cNGN',
    recipientTag: '₦MAMA',
    schedule: 'MONTHLY'
  });
  assert.strictEqual(task.status, 'ACTIVE');
  assert.strictEqual(task.recipientTag, '₦MAMA');

  const now = new Date();
  assert.strictEqual(taskEngine.hasExecutedForPeriod(task.id, now), false, 'Task should not have executed for period yet');
  taskEngine.recordExecutionSuccess(task.id, '0x123abc...', now);
  assert.strictEqual(taskEngine.hasExecutedForPeriod(task.id, now), true, 'Task marked as executed for period');
  assert.strictEqual(task.executionsCount, 1);
  console.log('✓ Task engine prevents double-execution across execution cycles.');

  // TEST 6: Activity Store & State Machine
  console.log('\n[6/7] Testing Activity State Machine...');
  const activityStore = new ActivityStore();
  const rec = activityStore.record({
    agentId: '₦CHUKS',
    type: 'PAYMENT_SENT',
    amount: '5000',
    asset: 'cNGN',
    recipient: '₦MAMA',
    txHash: '0x9999...'
  });
  assert.strictEqual(rec.status, TransactionState.CONFIRMED);
  assert.strictEqual(rec.title, 'Sent ₦5,000 cNGN to ₦MAMA');
  console.log('✓ Activity store produces human-readable Nigerian transaction records.');

  // TEST 7: End-to-End Action Engine (Conversational Intents & Approval Card)
  console.log('\n[7/7] Testing Natural Language Action Engine E2E...');
  const actionEngine = new ActionEngine({
    tagService: {
      resolveTag: async (tag) => ({
        handle: tag,
        resolvedAddress: '0x8217316A99D41c6dCe89D46e9A34c1143D1A914c'
      })
    }
  });

  // Prompt A: "Send ₦5,000 to ₦MAMA"
  const transferRes = await actionEngine.processPrompt('Send ₦5,000 to ₦MAMA', { tag: '₦CHUKS' });
  assert.strictEqual(transferRes.intent, 'PAYMENT_APPROVAL_REQUIRED');
  assert.strictEqual(transferRes.isConsequential, true);
  assert.strictEqual(transferRes.widgetType, 'payment_approval_card');
  assert.strictEqual(transferRes.data.amount, 5000);
  assert.strictEqual(transferRes.data.to, '₦mama');
  assert.strictEqual(transferRes.data.network, 'Celo');
  assert.ok(transferRes.thoughtProcess.length >= 3, 'Thought process includes reasoning steps');

  // Prompt B: "Send ₦2,000 to ₦MAMA every month"
  const taskRes = await actionEngine.processPrompt('Send ₦2,000 to ₦MAMA every month', { tag: '₦CHUKS' });
  assert.strictEqual(taskRes.intent, 'TASK_CREATE_PROPOSAL');
  assert.strictEqual(taskRes.isConsequential, true);
  assert.strictEqual(taskRes.widgetType, 'task_approval_card');
  assert.strictEqual(taskRes.data.schedule, 'MONTHLY');

  // Prompt C: "What is my cNGN balance?" (ASK)
  const balanceRes = await actionEngine.processPrompt('What is my cNGN balance?', { wallet: '0x8217316A99D41c6dCe89D46e9A34c1143D1A914c' });
  assert.strictEqual(balanceRes.intent, 'INFORMATION_BALANCE');
  assert.strictEqual(balanceRes.isConsequential, false);
  assert.ok(balanceRes.replyText.includes('cNGN'));

  // Prompt D: Confirming approved transfer
  const confirmed = await actionEngine.executeApprovedTransfer({
    agentId: '₦CHUKS',
    amount: 5000,
    asset: 'cNGN',
    recipientTag: '₦MAMA',
    recipientAddress: '0x8217316A99D41c6dCe89D46e9A34c1143D1A914c'
  });
  assert.strictEqual(confirmed.success, true);
  assert.strictEqual(confirmed.network, 'Celo');
  assert.ok(confirmed.receiptText.includes('Payment sent ✓'));
  console.log('✓ Action engine handles full natural language lifecycle with conversational approval cards.');

  console.log('\n============================================================');
  console.log('🎉 ALL 7 TEST SUITES PASSED CLEANLY (Celo + MiniPay + Agent)!');
  console.log('============================================================\n');
}

runTests().catch(err => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
