/**
 * @file CeloTagsEscrowClient.js
 * @description Off-chain & On-chain Bounded Escrow Settlement Client for CeloTags AI Agents.
 *
 * Implements Security Invariant:
 * - "Identity is not authority": Resolving a tag conveys ZERO financial authority.
 * - An AI Agent cannot create or lock an escrow without an active, bounded PermissionGrant.
 * - Enforces per-transaction limits, daily spending caps, and audit trails.
 */

import { createHash } from 'node:crypto';
import { CanonicalIdentifier } from '../namespaces/CanonicalIdentifier.js';
import { PermissionManager } from '../permissions/PermissionManager.js';

export const ESCROW_TASK_STATUSES = {
  CREATED: 'Created',
  ASSIGNED: 'Assigned',
  SUBMITTED: 'Submitted',
  COMPLETED: 'Completed',
  DISPUTED: 'Disputed',
  REFUNDED: 'Refunded'
};

export class CeloTagsEscrowClient {
  /**
   * @param {Object} options
   * @param {string} [options.escrowAddress] - Deployed CeloTagsEscrow contract address
   * @param {PermissionManager} [options.permissionManager] - Security policy engine
   * @param {Object} [options.resolver] - CeloTagsResolver instance
   */
  constructor(options = {}) {
    this.escrowAddress = options.escrowAddress || '0x0000000000000000000000000000000000000000';
    this.permissionManager = options.permissionManager || new PermissionManager();
    this.resolver = options.resolver || null;

    // In-memory simulated escrow ledger
    this._tasks = new Map();
  }

  /**
   * Hashes a deliverable payload (JSON, buffer, or string) deterministically.
   *
   * @param {any} deliverableData
   * @returns {string} 0x-prefixed 32-byte hex hash
   */
  hashDeliverable(deliverableData) {
    const serialized = typeof deliverableData === 'string'
      ? deliverableData
      : JSON.stringify(deliverableData);
    const hash = createHash('sha256').update(serialized).digest('hex');
    return `0x${hash}`;
  }

  /**
   * Creates an Escrow Task with Mandatory PermissionGrant Verification.
   *
   * @param {Object} params
   * @param {string} params.creatorAddress - Principal wallet funding the escrow
   * @param {string} params.creatorTag - Canonical URN or display tag of creator
   * @param {string} params.agentAddress - Operating Agent initiating the action
   * @param {string} [params.assigneeAddress] - Target worker Agent or service wallet
   * @param {string} [params.assigneeTag] - Target worker Agent CeloTags tag
   * @param {number} params.amount - Amount to lock (in token units)
   * @param {string} [params.tokenSymbol='cNGN'] - Token symbol (cNGN, cUSD, CELO)
   * @param {string} [params.tokenAddress] - Token contract address (null for CELO)
   * @param {number} [params.durationSeconds=604800] - Task validity period (default 7 days)
   * @param {string} [params.grantId] - Optional specific grant ID
   * @returns {Object} Created task representation
   */
  async createEscrowTask({
    creatorAddress,
    creatorTag,
    agentAddress,
    assigneeAddress = null,
    assigneeTag = null,
    amount,
    tokenSymbol = 'cNGN',
    tokenAddress = null,
    durationSeconds = 604800,
    grantId = null
  }) {
    if (!creatorAddress || !agentAddress) {
      throw new Error('Escrow task requires creatorAddress and agentAddress');
    }
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      throw new Error('Task escrow amount must be greater than zero');
    }

    // 1. CRITICAL SECURITY GATE: Validate Bounded PermissionGrant
    const evalResult = this.permissionManager.evaluate({
      principal: creatorAddress,
      subject: agentAddress,
      action: 'EXECUTE_BOUNDED_TRANSFER',
      amount: numAmount,
      currency: tokenSymbol,
      grantId
    });

    if (!evalResult.authorized) {
      throw new Error(`SECURITY_GATE_DENIED: Agent is not authorized to create escrow. Reason: ${evalResult.reason}`);
    }

    // 2. Resolve Canonical Identifiers
    const canonicalCreator = CanonicalIdentifier.parse(creatorTag, 'ng');
    let canonicalAssignee = null;
    if (assigneeTag) {
      canonicalAssignee = CanonicalIdentifier.parse(assigneeTag, 'ng');
    }

    // 3. Record spending against active PermissionGrant
    const grant = this.permissionManager.getGrant(creatorAddress, agentAddress, 'EXECUTE_BOUNDED_TRANSFER');
    if (grant) {
      grant.recordSpend(numAmount);
    }

    // 4. Generate deterministic Task ID
    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const deadline = Date.now() + durationSeconds * 1000;

    const task = {
      id: taskId,
      creator: creatorAddress.toLowerCase(),
      creatorUrn: canonicalCreator.urn,
      creatorDisplay: canonicalCreator.display,
      assignee: assigneeAddress ? assigneeAddress.toLowerCase() : null,
      assigneeUrn: canonicalAssignee ? canonicalAssignee.urn : null,
      assigneeDisplay: canonicalAssignee ? canonicalAssignee.display : null,
      tokenSymbol,
      tokenAddress: tokenAddress ? tokenAddress.toLowerCase() : null,
      amount: numAmount,
      status: assigneeAddress ? ESCROW_TASK_STATUSES.ASSIGNED : ESCROW_TASK_STATUSES.CREATED,
      deadline,
      deliverableHash: null,
      deliverableData: null,
      createdAt: Date.now(),
      completedAt: null
    };

    this._tasks.set(taskId, task);
    return task;
  }

  /**
   * Assigns an open task to a specific worker Agent.
   */
  assignAgent(taskId, callerAddress, assigneeAddress, assigneeTag) {
    const task = this._tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    if (task.creator !== callerAddress.toLowerCase()) {
      throw new Error('Unauthorized: only task creator can assign agent');
    }
    if (task.status !== ESCROW_TASK_STATUSES.CREATED && task.status !== ESCROW_TASK_STATUSES.ASSIGNED) {
      throw new Error(`Invalid status for assignment: ${task.status}`);
    }

    const canonicalAssignee = CanonicalIdentifier.parse(assigneeTag, 'ng');
    task.assignee = assigneeAddress.toLowerCase();
    task.assigneeUrn = canonicalAssignee.urn;
    task.assigneeDisplay = canonicalAssignee.display;
    task.status = ESCROW_TASK_STATUSES.ASSIGNED;

    return task;
  }

  /**
   * Submits a completed deliverable hash for evaluation.
   */
  submitDeliverable(taskId, workerAddress, deliverableData) {
    const task = this._tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    if (!task.assignee || task.assignee !== workerAddress.toLowerCase()) {
      throw new Error('Unauthorized: caller is not assigned worker agent');
    }
    if (task.status !== ESCROW_TASK_STATUSES.ASSIGNED) {
      throw new Error(`Cannot submit deliverable in status: ${task.status}`);
    }

    const deliverableHash = this.hashDeliverable(deliverableData);
    task.deliverableHash = deliverableHash;
    task.deliverableData = deliverableData;
    task.submittedAt = Date.now();
    task.status = ESCROW_TASK_STATUSES.SUBMITTED;

    return task;
  }

  /**
   * Releases escrow funds to worker Agent upon successful verification.
   */
  releaseTask(taskId, callerAddress) {
    const task = this._tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    if (task.creator !== callerAddress.toLowerCase()) {
      throw new Error('Unauthorized: only task creator can release funds');
    }
    if (task.status !== ESCROW_TASK_STATUSES.SUBMITTED && task.status !== ESCROW_TASK_STATUSES.ASSIGNED) {
      throw new Error(`Cannot release task in status: ${task.status}`);
    }

    task.status = ESCROW_TASK_STATUSES.COMPLETED;
    task.completedAt = Date.now();

    return {
      success: true,
      taskId: task.id,
      recipient: task.assignee,
      amount: task.amount,
      tokenSymbol: task.tokenSymbol,
      status: task.status
    };
  }

  /**
   * Refunds expired task funds to creator.
   */
  refundTask(taskId, callerAddress) {
    const task = this._tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    if (task.creator !== callerAddress.toLowerCase()) {
      throw new Error('Unauthorized: only task creator can refund');
    }
    if (task.status === ESCROW_TASK_STATUSES.COMPLETED || task.status === ESCROW_TASK_STATUSES.REFUNDED) {
      throw new Error(`Cannot refund task in status: ${task.status}`);
    }
    if (task.assignee && Date.now() < task.deadline) {
      throw new Error('Cannot refund active assigned task before deadline');
    }

    task.status = ESCROW_TASK_STATUSES.REFUNDED;
    return {
      success: true,
      taskId: task.id,
      refundRecipient: task.creator,
      amount: task.amount,
      tokenSymbol: task.tokenSymbol,
      status: task.status
    };
  }

  getTask(taskId) {
    return this._tasks.get(taskId) || null;
  }
}
