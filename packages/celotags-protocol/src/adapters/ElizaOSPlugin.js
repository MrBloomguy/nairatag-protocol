/**
 * @file ElizaOSPlugin.js
 * @description Official ElizaOS Plugin for CeloTags Protocol & Autonomous Settlement.
 *
 * Exposes ElizaOS-compatible actions and evaluators:
 * - RESOLVE_CELOTAG: Resolves sovereign tags (₦SEGUN, GH₵AMA, @ng:segun) to verified profiles
 * - DISCOVER_AGENTS: Finds Agents by skill category and ISO region
 * - REQUEST_PERMISSION: Generates bounded spending grants for human principal approval
 * - CREATE_ESCROW_TASK: Locks micro-escrow for delegated tasks within granted limits
 * - SUBMIT_DELIVERABLE: Delivers task artifacts and cryptographic evidence
 */

export class ElizaOSPlugin {
  /**
   * @param {Object} options
   * @param {Object} options.resolver - CeloTagsResolver instance
   * @param {Object} options.escrowClient - CeloTagsEscrowClient instance
   * @param {Object} options.permissionManager - PermissionManager instance
   */
  constructor({ resolver, escrowClient, permissionManager }) {
    if (!resolver || !escrowClient || !permissionManager) {
      throw new Error('ElizaOSPlugin requires resolver, escrowClient, and permissionManager');
    }
    this.resolver = resolver;
    this.escrowClient = escrowClient;
    this.permissionManager = permissionManager;

    this.name = 'celotags';
    this.description = 'Autonomous Multi-Country Identity, Capability Discovery & Escrow Settlement on Celo';
  }

  getActions() {
    return [
      {
        name: 'RESOLVE_CELOTAG',
        similes: ['LOOKUP_TAG', 'FIND_CELOTAG_WALLET', 'RESOLVE_AGENT_IDENTITY'],
        description: 'Resolves a CeloTag or EVM address to its verified profile, country, and wallet.',
        validate: async (runtime, message) => {
          return Boolean(message.content?.tag || message.content?.address);
        },
        handler: async (runtime, message, state) => {
          const input = message.content?.tag || message.content?.address;
          try {
            const result = await this.resolver.resolve(input);
            return {
              success: true,
              data: result,
              message: `Resolved ${result.display} (${result.urn}) to wallet ${result.wallet.primary}`
            };
          } catch (err) {
            return { success: false, error: err.message };
          }
        }
      },
      {
        name: 'DISCOVER_AGENTS',
        similes: ['FIND_AGENTS_BY_SKILL', 'SEARCH_CAPABILITIES', 'DISCOVER_CELO_SERVICES'],
        description: 'Discovers verified AI Agents across African and international namespaces by task/skill.',
        validate: async (runtime, message) => {
          return true;
        },
        handler: async (runtime, message, state) => {
          const { category, region, query } = message.content || {};
          const agents = this.resolver.discoverAgents({ category, region, query });
          return {
            success: true,
            count: agents.length,
            agents
          };
        }
      },
      {
        name: 'CREATE_ESCROW_TASK',
        similes: ['LOCK_TASK_REWARD', 'DISPATCH_AGENT_TASK', 'DELEGATE_WITH_ESCROW'],
        description: 'Locks reward into CeloTagsEscrow for an agent task, strictly bounded by spending limits.',
        validate: async (runtime, message) => {
          const { creatorAddress, agentAddress, amount, creatorTag } = message.content || {};
          return Boolean(creatorAddress && agentAddress && amount && creatorTag);
        },
        handler: async (runtime, message, state) => {
          try {
            const task = await this.escrowClient.createEscrowTask(message.content);
            return {
              success: true,
              task,
              message: `Escrow task ${task.id} created for ${task.amount} ${task.tokenSymbol}`
            };
          } catch (err) {
            return {
              success: false,
              error: err.message,
              securityNotice: 'Ensure a valid PermissionGrant with sufficient limit is active.'
            };
          }
        }
      },
      {
        name: 'SUBMIT_DELIVERABLE',
        similes: ['DELIVER_TASK_WORK', 'COMPLETE_ESCROW_TASK'],
        description: 'Submits completed deliverable data for escrow task verification.',
        validate: async (runtime, message) => {
          const { taskId, workerAddress, deliverableData } = message.content || {};
          return Boolean(taskId && workerAddress && deliverableData);
        },
        handler: async (runtime, message, state) => {
          try {
            const { taskId, workerAddress, deliverableData } = message.content;
            const updated = this.escrowClient.submitDeliverable(taskId, workerAddress, deliverableData);
            return {
              success: true,
              task: updated,
              deliverableHash: updated.deliverableHash,
              message: `Deliverable submitted for task ${taskId}`
            };
          } catch (err) {
            return { success: false, error: err.message };
          }
        }
      }
    ];
  }
}
