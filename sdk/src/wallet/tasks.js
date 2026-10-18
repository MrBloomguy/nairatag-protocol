/**
 * @file tasks.js
 * @description Autonomous Agent Task Scheduler with strict financial idempotency.
 * Prevents double-execution of recurring payments on worker or container restart.
 */

const { defaultIdempotencyRegistry } = require('./idempotency');

class TaskEngine {
  constructor(idempotency = defaultIdempotencyRegistry) {
    this.tasks = new Map(); // taskId -> TaskRecord
    this.executedKeys = new Set(); // Set of idempotencyKey strings
    this.idempotency = idempotency;
  }

  createTask({
    id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    agentId = 'default',
    type = 'RECURRING_PAYMENT', // 'RECURRING_PAYMENT' | 'PRICE_WATCH' | 'DATA_RELOAD'
    instruction,
    schedule = 'MONTHLY', // 'DAILY' | 'WEEKLY' | 'MONTHLY'
    amount,
    asset = 'cNGN',
    recipientTag,
    recipientAddress = null,
    network = 'celo',
    permissions = 'AUTOMATIC'
  }) {
    const nextRun = this._calculateNextRun(schedule);

    const task = {
      id,
      agentId,
      type,
      instruction: instruction || `Send ₦${Number(amount).toLocaleString()} ${asset} to ${recipientTag} (${schedule.toLowerCase()})`,
      schedule,
      amount: String(amount),
      asset,
      recipientTag,
      recipientAddress,
      network,
      permissions,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      lastRunAt: null,
      nextRunAt: nextRun.toISOString(),
      executionsCount: 0
    };

    this.tasks.set(id, task);
    return task;
  }

  cancelTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    task.status = 'CANCELLED';
    task.cancelledAt = new Date().toISOString();
    return true;
  }

  listTasks(agentId = 'default') {
    return Array.from(this.tasks.values())
      .filter(t => (agentId === 'all' || t.agentId === agentId) && t.status !== 'CANCELLED');
  }

  getTask(taskId) {
    return this.tasks.get(taskId) || null;
  }

  /**
   * Idempotency key prevents duplicate execution for any scheduled cycle
   */
  generateIdempotencyKey(taskId, periodDate = new Date()) {
    const period = periodDate.toISOString().slice(0, 10); // YYYY-MM-DD
    return `${taskId}:${period}`;
  }

  hasExecutedForPeriod(taskId, periodDate = new Date()) {
    const key = this.generateIdempotencyKey(taskId, periodDate);
    return this.executedKeys.has(key);
  }

  recordExecutionSuccess(taskId, txHash, periodDate = new Date()) {
    const key = this.generateIdempotencyKey(taskId, periodDate);
    this.executedKeys.add(key);

    const task = this.tasks.get(taskId);
    if (task) {
      task.lastRunAt = new Date().toISOString();
      task.nextRunAt = this._calculateNextRun(task.schedule).toISOString();
      task.executionsCount += 1;
      task.lastTxHash = txHash;
    }
  }

  /**
   * Full atomic execution lifecycle:
   * Validate -> Check Idempotency -> Lock -> Execute -> Broadcast -> Confirm
   */
  async executeTaskSafely(taskId, executionFn, periodDate = new Date()) {
    const task = this.getTask(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);
    if (task.status !== 'ACTIVE') throw new Error(`Task ${taskId} is not active (${task.status})`);

    const executionKey = this.generateIdempotencyKey(taskId, periodDate);

    // 1. Acquire idempotent lock
    const lock = this.idempotency.acquireLock(executionKey, { taskId, schedule: task.schedule });
    if (lock.cached) {
      return {
        alreadyExecuted: true,
        record: lock.record,
        reason: lock.reason
      };
    }

    try {
      // 2. Broadcast / Execute
      const result = await executionFn(task);
      this.idempotency.recordBroadcast(executionKey, result.txHash);

      // 3. Confirm
      this.idempotency.recordConfirmed(executionKey, { txHash: result.txHash });
      this.recordExecutionSuccess(taskId, result.txHash, periodDate);

      return {
        alreadyExecuted: false,
        success: true,
        txHash: result.txHash,
        task
      };
    } catch (err) {
      this.idempotency.recordFailure(executionKey, err.message, true);
      throw err;
    }
  }

  _calculateNextRun(schedule) {
    const d = new Date();
    switch (schedule.toUpperCase()) {
      case 'DAILY':
        d.setDate(d.getDate() + 1);
        break;
      case 'WEEKLY':
        d.setDate(d.getDate() + 7);
        break;
      case 'MONTHLY':
      default:
        d.setMonth(d.getMonth() + 1);
        break;
    }
    return d;
  }
}

const defaultTaskEngine = new TaskEngine();

module.exports = {
  TaskEngine,
  defaultTaskEngine
};
