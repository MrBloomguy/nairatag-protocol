/**
 * @file activity.js
 * @description Agent Activity, Transaction State Machine, and Human-Readable History.
 */

const TransactionState = {
  PREPARING: 'PREPARING',
  CREATED: 'CREATED',
  VALIDATING: 'VALIDATING',
  WAITING_APPROVAL: 'WAITING_APPROVAL',
  AWAITING_APPROVAL: 'WAITING_APPROVAL',
  AWAITING_WALLET: 'AWAITING_WALLET',
  SUBMITTING: 'SUBMITTING',
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  REJECTED: 'REJECTED',
  FAILED: 'FAILED',
  PENDING_RETRY: 'PENDING_RETRY',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED'
};

class ActivityStore {
  constructor() {
    this.activities = [];
    this.listeners = new Set();
  }

  record({
    id = `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    agentId = 'default',
    type = 'PAYMENT_SENT', // 'PAYMENT_SENT' | 'PAYMENT_RECEIVED' | 'TASK_CREATED' | 'TASK_EXECUTED' | 'SWAP'
    status = TransactionState.CONFIRMED,
    title,
    description = '',
    amount = null,
    asset = 'cNGN',
    sender = null,
    recipient = null,
    txHash = null,
    taskId = null,
    metadata = {}
  }) {
    const record = {
      id,
      agentId,
      type,
      status,
      title: title || this._formatDefaultTitle(type, amount, asset, recipient),
      description,
      amount: amount !== null ? String(amount) : null,
      asset,
      sender,
      recipient,
      txHash,
      taskId,
      metadata,
      createdAt: new Date().toISOString(),
      confirmedAt: status === TransactionState.CONFIRMED ? new Date().toISOString() : null
    };

    this.activities.unshift(record);
    if (this.activities.length > 500) this.activities.pop();

    this._notify(record);
    return record;
  }

  updateStatus(id, newStatus, extra = {}) {
    const item = this.activities.find(a => a.id === id);
    if (item) {
      item.status = newStatus;
      if (newStatus === TransactionState.CONFIRMED) {
        item.confirmedAt = new Date().toISOString();
      }
      Object.assign(item, extra);
      this._notify(item);
    }
    return item;
  }

  getRecent(agentId = 'default', limit = 20) {
    return this.activities
      .filter(a => a.agentId === agentId || agentId === 'all')
      .slice(0, limit);
  }

  _formatDefaultTitle(type, amount, asset, recipient) {
    const amtStr = amount ? `₦${Number(amount).toLocaleString()} ${asset}` : asset;
    switch (type) {
      case 'PAYMENT_SENT':
        return `Sent ${amtStr} to ${recipient || 'recipient'}`;
      case 'PAYMENT_RECEIVED':
        return `Received ${amtStr} from ${recipient || 'sender'}`;
      case 'TASK_CREATED':
        return `Created task: ${recipient || 'action'}`;
      case 'TASK_EXECUTED':
        return `Executed task: ${amtStr} to ${recipient || 'recipient'}`;
      case 'SWAP':
        return `Swapped ${amtStr}`;
      default:
        return `${type}: ${amtStr}`;
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _notify(record) {
    for (const fn of this.listeners) {
      try { fn(record); } catch (err) { console.warn('Activity listener error:', err); }
    }
  }
}

const defaultActivityStore = new ActivityStore();

module.exports = {
  TransactionState,
  ActivityStore,
  defaultActivityStore
};
