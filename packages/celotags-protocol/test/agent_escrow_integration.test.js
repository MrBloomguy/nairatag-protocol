import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  CeloTagsRegistry,
  CeloTagsResolver,
  PermissionManager,
  CeloTagsEscrowClient,
  ESCROW_TASK_STATUSES,
  ElizaOSPlugin,
  CeloTagsResolveTool,
  CeloTagsDiscoveryTool,
  CeloTagsEscrowTool
} from '../src/index.js';

test('Autonomous AI Agent Framework & Escrow Settlement Integration', async (t) => {
  // Common test fixture setup
  const registry = new CeloTagsRegistry({ enforceOneTagPerWallet: true });
  const resolver = new CeloTagsResolver({ registry });
  const permissionManager = new PermissionManager();
  const escrowClient = new CeloTagsEscrowClient({
    permissionManager,
    resolver
  });

  // Seed reference identities
  const aliceWallet = '0x1111111111111111111111111111111111111111';
  const agentWallet = '0x2222222222222222222222222222222222222222';
  const workerWallet = '0x3333333333333333333333333333333333333333';

  registry.registerIdentity({ identifier: '₦ALICE', owner: aliceWallet });
  registry.registerIdentity({ identifier: '₦DISPATCHER', owner: agentWallet, type: 'agent' });
  registry.registerIdentity({ identifier: 'GH₵WORKER', owner: workerWallet, type: 'agent' });

  resolver.registerProfile({
    identifier: 'GH₵WORKER',
    name: 'Ghana Research Worker Agent',
    owner: workerWallet,
    category: 'service',
    capabilities: [
      { id: 'research.fintech.market', name: 'Fintech Market Data', category: 'research' }
    ]
  });

  await t.test('1. Security Gate: Escrow Creation Requires Valid PermissionGrant', async () => {
    // 1a. Attempt to create escrow task WITHOUT permission grant -> MUST REJECT
    await assert.rejects(
      async () => {
        await escrowClient.createEscrowTask({
          creatorAddress: aliceWallet,
          creatorTag: '₦ALICE',
          agentAddress: agentWallet,
          assigneeAddress: workerWallet,
          assigneeTag: 'GH₵WORKER',
          amount: 5000,
          tokenSymbol: 'cNGN'
        });
      },
      /SECURITY_GATE_DENIED/i,
      'Escrow task must be rejected without active permission grant'
    );

    // 1b. Alice grants Agent a bounded permission: Max 10,000 cNGN per tx, Daily cap 25,000 cNGN
    const grant = permissionManager.createGrant({
      principal: aliceWallet,
      subject: agentWallet,
      action: 'EXECUTE_BOUNDED_TRANSFER',
      spendingLimits: {
        maxPerTx: 10000,
        dailyCap: 25000,
        currency: 'cNGN'
      }
    });
    assert.ok(grant.isValid());

    // 1c. Attempt to create escrow task EXCEEDING per-tx limit (15,000 > 10,000) -> MUST REJECT
    await assert.rejects(
      async () => {
        await escrowClient.createEscrowTask({
          creatorAddress: aliceWallet,
          creatorTag: '₦ALICE',
          agentAddress: agentWallet,
          assigneeAddress: workerWallet,
          assigneeTag: 'GH₵WORKER',
          amount: 15000,
          tokenSymbol: 'cNGN'
        });
      },
      /SECURITY_GATE_DENIED/i,
      'Escrow task must be rejected when exceeding maxPerTx'
    );

    // 1d. Create valid task within spending limit (5,000 <= 10,000) -> MUST SUCCEED
    const task = await escrowClient.createEscrowTask({
      creatorAddress: aliceWallet,
      creatorTag: '₦ALICE',
      agentAddress: agentWallet,
      assigneeAddress: workerWallet,
      assigneeTag: 'GH₵WORKER',
      amount: 5000,
      tokenSymbol: 'cNGN'
    });

    assert.ok(task.id);
    assert.equal(task.amount, 5000);
    assert.equal(task.creatorUrn, 'urn:celotag:ng:alice');
    assert.equal(task.assigneeUrn, 'urn:celotag:gh:worker');
    assert.equal(task.status, ESCROW_TASK_STATUSES.ASSIGNED);

    // Verify spending tracking updated
    assert.equal(grant.spendingLimits.spentToday, 5000);
  });

  await t.test('2. Complete Escrow Lifecycle: Deliverable Submission & Release', async () => {
    // Create task
    const task = await escrowClient.createEscrowTask({
      creatorAddress: aliceWallet,
      creatorTag: '₦ALICE',
      agentAddress: agentWallet,
      assigneeAddress: workerWallet,
      assigneeTag: 'GH₵WORKER',
      amount: 4000,
      tokenSymbol: 'cNGN'
    });

    // Worker submits deliverable
    const deliverablePayload = {
      reportId: 'rep_gh_001',
      metrics: { mobileMoneyShare: '84%', latencyMs: 310 },
      timestamp: Date.now()
    };

    const submitted = escrowClient.submitDeliverable(task.id, workerWallet, deliverablePayload);
    assert.equal(submitted.status, ESCROW_TASK_STATUSES.SUBMITTED);
    assert.ok(submitted.deliverableHash.startsWith('0x'));

    // Creator releases escrow
    const releaseResult = escrowClient.releaseTask(task.id, aliceWallet);
    assert.equal(releaseResult.success, true);
    assert.equal(releaseResult.recipient, workerWallet);
    assert.equal(releaseResult.status, ESCROW_TASK_STATUSES.COMPLETED);
  });

  await t.test('3. ElizaOS Plugin Integration', async () => {
    const elizaPlugin = new ElizaOSPlugin({
      resolver,
      escrowClient,
      permissionManager
    });

    const actions = elizaPlugin.getActions();
    const actionNames = actions.map(a => a.name);
    assert.ok(actionNames.includes('RESOLVE_CELOTAG'));
    assert.ok(actionNames.includes('DISCOVER_AGENTS'));
    assert.ok(actionNames.includes('CREATE_ESCROW_TASK'));
    assert.ok(actionNames.includes('SUBMIT_DELIVERABLE'));

    // 3a. Execute RESOLVE_CELOTAG action
    const resolveAction = actions.find(a => a.name === 'RESOLVE_CELOTAG');
    const resolveResult = await resolveAction.handler(null, { content: { tag: 'GH₵WORKER' } });
    assert.equal(resolveResult.success, true);
    assert.equal(resolveResult.data.urn, 'urn:celotag:gh:worker');
    assert.equal(resolveResult.data.wallet.primary, workerWallet);
    assert.equal(resolveResult.data.authority, 'NONE', 'Must preserve zero financial authority');

    // 3b. Execute DISCOVER_AGENTS action
    const discoverAction = actions.find(a => a.name === 'DISCOVER_AGENTS');
    const discoverResult = await discoverAction.handler(null, { content: { category: 'service' } });
    assert.equal(discoverResult.success, true);
    assert.ok(discoverResult.count >= 1);

    // 3c. Execute CREATE_ESCROW_TASK action
    const escrowAction = actions.find(a => a.name === 'CREATE_ESCROW_TASK');
    const escrowResult = await escrowAction.handler(null, {
      content: {
        creatorAddress: aliceWallet,
        creatorTag: '₦ALICE',
        agentAddress: agentWallet,
        assigneeAddress: workerWallet,
        assigneeTag: 'GH₵WORKER',
        amount: 3000,
        tokenSymbol: 'cNGN'
      }
    });
    assert.equal(escrowResult.success, true);
    assert.ok(escrowResult.task.id);
  });

  await t.test('4. LangChain / LangGraph Tools Integration', async () => {
    const resolveTool = new CeloTagsResolveTool(resolver);
    const discoveryTool = new CeloTagsDiscoveryTool(resolver);
    const escrowTool = new CeloTagsEscrowTool(escrowClient);

    // 4a. Resolve Tool
    const rawRes = await resolveTool.call('₦ALICE');
    const parsedRes = JSON.parse(rawRes);
    assert.equal(parsedRes.urn, 'urn:celotag:ng:alice');
    assert.equal(parsedRes.financialAuthority, false);

    // 4b. Discovery Tool
    const rawDisc = await discoveryTool.call({ category: 'service' });
    const parsedDisc = JSON.parse(rawDisc);
    assert.ok(parsedDisc.count >= 1);

    // 4c. Escrow Tool
    const rawEsc = await escrowTool.call({
      creatorAddress: aliceWallet,
      creatorTag: '₦ALICE',
      agentAddress: agentWallet,
      assigneeAddress: workerWallet,
      assigneeTag: 'GH₵WORKER',
      amount: 2000,
      tokenSymbol: 'cNGN'
    });
    const parsedEsc = JSON.parse(rawEsc);
    assert.equal(parsedEsc.success, true);
    assert.equal(parsedEsc.amount, 2000);
  });
});
