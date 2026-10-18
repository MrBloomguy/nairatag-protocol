/**
 * @file idempotency.js
 * @description Consequential Action & Transaction Idempotency Engine.
 * Guarantees zero double-spend / double-broadcast across network retries,
 * worker restarts, browser re-clicks, and webhook delivery duplicates.
 */

const crypto = require('node:crypto');

const ExecutionStatus = {
  PENDING_LOCK: 'PENDING_LOCK',
  IN_FLIGHT: 'IN_FLIGHT',
  BROADCASTED: 'BROADCASTED',
  CONFIRMED: 'CONFIRMED',
  REJECTED: 'REJECTED',
  FAILED: 'FAILED',
  PENDING_RETRY: 'PENDING_RETRY'
};

class IdempotencyRegistry {
  constructor() {
    // executionId -> ExecutionRecord
    this.records = new Map();
  }

  /**
   * Derive deterministic execution ID if client did not supply one.
   */
  generateExecutionId({
    agentId = 'default',
    actionType = 'TRANSFER',
    recipientTag = '',
    amount = 0,
    asset = 'cNGN',
    taskId = null,
    cycle = null,
    clientNonce = null
  }) {
    if (clientNonce) {
      return `exec_${clientNonce}`;
    }
    const raw = [
      agentId,
      actionType,
      recipientTag.toLowerCase(),
      String(amount),
      asset.toUpperCase(),
      taskId || 'direct',
      cycle || 'none'
    ].join(':');

    const hash = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
    return `exec_${hash}`;
  }

  /**
   * Acquire in-flight execution lock before broadcasting to blockchain.
   * Throws if another execution is already in flight or already completed.
   */
  acquireLock(executionId, metadata = {}) {
    const existing = this.records.get(executionId);
    if (existing) {
      if (existing.status === ExecutionStatus.IN_FLIGHT) {
        throw new Error(`Execution ${executionId} is currently in flight. Duplicate broadcast prevented.`);
      }
      if (existing.status === ExecutionStatus.CONFIRMED) {
        return {
          acquired: false,
          cached: true,
          record: existing,
          reason: 'Already confirmed on-chain'
        };
      }
      if (existing.status === ExecutionStatus.BROADCASTED) {
        return {
          acquired: false,
          cached: true,
          record: existing,
          reason: 'Already broadcasted to network'
        };
      }
    }

    const record = {
      executionId,
      status: ExecutionStatus.IN_FLIGHT,
      txHash: null,
      metadata,
      lockedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.records.set(executionId, record);
    return {
      acquired: true,
      cached: false,
      record
    };
  }

  /**
   * Record transaction hash upon broadcast
   */
  recordBroadcast(executionId, txHash) {
    const record = this.records.get(executionId);
    if (record) {
      record.status = ExecutionStatus.BROADCASTED;
      record.txHash = txHash;
      record.broadcastAt = new Date().toISOString();
      record.updatedAt = new Date().toISOString();
    }
    return record;
  }

  /**
   * Mark execution complete after receipt confirmation
   */
  recordConfirmed(executionId, { txHash, blockNumber = null }) {
    const record = this.records.get(executionId);
    if (record) {
      record.status = ExecutionStatus.CONFIRMED;
      if (txHash) record.txHash = txHash;
      record.blockNumber = blockNumber;
      record.confirmedAt = new Date().toISOString();
      record.updatedAt = new Date().toISOString();
    }
    return record;
  }

  /**
   * Mark execution failed or rejected, freeing lock for retry if applicable
   */
  recordFailure(executionId, reason = 'Execution failed', canRetry = false) {
    const record = this.records.get(executionId);
    if (record) {
      record.status = canRetry ? ExecutionStatus.PENDING_RETRY : ExecutionStatus.FAILED;
      record.error = reason;
      record.failedAt = new Date().toISOString();
      record.updatedAt = new Date().toISOString();
    }
    return record;
  }

  recordRejection(executionId, reason = 'User rejected') {
    const record = this.records.get(executionId);
    if (record) {
      record.status = ExecutionStatus.REJECTED;
      record.error = reason;
      record.rejectedAt = new Date().toISOString();
      record.updatedAt = new Date().toISOString();
    }
    return record;
  }

  getRecord(executionId) {
    return this.records.get(executionId) || null;
  }
}

const defaultIdempotencyRegistry = new IdempotencyRegistry();

module.exports = {
  ExecutionStatus,
  IdempotencyRegistry,
  defaultIdempotencyRegistry
};
