/**
 * @file planner.js
 * @description Multi-Step Intent Planner & Decomposer for NairaTag Digital Operators.
 * Decomposes complex human intents (e.g., travel preparation, monthly bills)
 * into deterministic, verifiable sub-tasks evaluated against the permission engine.
 */

class IntentPlanner {
  constructor(options = {}) {
    this.permissions = options.permissions || null;
    this.memory = options.memory || null;
    this.tasks = options.tasks || null;
  }

  /**
   * Decomposes high-level composite intents into structured tasks
   */
  decomposeIntent(intentText, context = {}) {
    const text = String(intentText || '').toLowerCase();
    const planId = `plan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // Travel / Absence management scenario
    if (text.includes('travelling') || text.includes('traveling') || text.includes('travel plan')) {
      return {
        planId,
        type: 'TRAVEL_DELEGATION',
        title: 'Travel Delegation Plan',
        description: 'Automated bill payments, family allowance, balance guard, and activity monitoring.',
        steps: [
          {
            stepId: 'step_1',
            type: 'PAY_BILL',
            title: 'Settle Electricity Bill',
            service: 'Ikeja Electric',
            meter: context.meter || '0419283746',
            amount: 15000,
            asset: 'cNGN',
            network: 'Celo',
            status: 'PENDING_APPROVAL'
          },
          {
            stepId: 'step_2',
            type: 'RECURRING_TRANSFER',
            title: "Send Mama's Monthly Allowance",
            recipientTag: '₦MAMA',
            amount: 20000,
            asset: 'cNGN',
            schedule: 'MONTHLY',
            network: 'Celo',
            status: 'PENDING_APPROVAL'
          },
          {
            stepId: 'step_3',
            type: 'BALANCE_GUARD',
            title: 'Maintain Minimum Liquidity Threshold',
            minBalance: 50000,
            asset: 'cNGN',
            actionOnThreshold: 'ALERT_USER',
            status: 'ACTIVE_GUARD'
          },
          {
            stepId: 'step_4',
            type: 'ANOMALY_MONITOR',
            title: 'Security & Anomaly Watch',
            description: 'Monitor wallet activity and alert if unexpected transaction occurs.',
            status: 'ACTIVE_WATCH'
          }
        ]
      };
    }

    // Monthly bill setup scenario
    if (text.includes('monthly bills') || text.includes('bills this month')) {
      return {
        planId,
        type: 'MONTHLY_BILLS',
        title: 'Monthly Utility Delegation Plan',
        description: 'Electricity, internet, and recurring subscriptions.',
        steps: [
          {
            stepId: 'step_1',
            type: 'PAY_BILL',
            title: 'Electricity Token Recharge',
            service: 'Ikeja Electric',
            amount: 25000,
            asset: 'cNGN',
            status: 'PENDING_APPROVAL'
          },
          {
            stepId: 'step_2',
            type: 'PAY_BILL',
            title: 'Broadband Internet',
            service: 'FiberOne',
            amount: 18000,
            asset: 'cNGN',
            status: 'PENDING_APPROVAL'
          }
        ]
      };
    }

    return null;
  }
}

const defaultPlanner = new IntentPlanner();

module.exports = {
  IntentPlanner,
  defaultPlanner
};
