/**
 * @file LangChainTools.js
 * @description Structured LangChain / LangGraph Tools for CeloTags Protocol.
 *
 * Implements tools conforming to LangChain tool interfaces:
 * - CeloTagsResolveTool: Resolves tags to identities and wallets
 * - CeloTagsDiscoveryTool: Searches capabilities and skills
 * - CeloTagsEscrowTool: Creates bounded micro-escrow tasks
 */

export class CeloTagsResolveTool {
  constructor(resolver) {
    this.name = 'celotags_resolve';
    this.description = 'Resolves a CeloTag (e.g. ₦SEGUN, GH₵AMA, @ng:segun) or EVM address to identity metadata, primary wallet, and verified capabilities.';
    this.resolver = resolver;
  }

  async call(input) {
    const rawTag = typeof input === 'string' ? input : (input?.tag || input?.address);
    try {
      const entity = await this.resolver.resolve(rawTag);
      return JSON.stringify({
        urn: entity.urn,
        display: entity.display,
        wallet: entity.wallet.primary,
        country: entity.country,
        currency: entity.currency,
        isAgent: entity.isAgent,
        authority: entity.authority, // Always 'NONE'
        financialAuthority: entity.financialAuthority // Always false
      });
    } catch (err) {
      return JSON.stringify({ error: err.message });
    }
  }
}

export class CeloTagsDiscoveryTool {
  constructor(resolver) {
    this.name = 'celotags_discover';
    this.description = 'Searches for AI agents by skill category (finance, logistics, dev, research), ISO region (NG, GH, KE, ZA, BR), or keywords.';
    this.resolver = resolver;
  }

  async call(params = {}) {
    try {
      const agents = this.resolver.discoverAgents(params);
      return JSON.stringify({
        count: agents.length,
        agents: agents.map(a => ({
          urn: a.identifier.urn,
          display: a.identifier.display,
          name: a.name,
          category: a.category,
          capabilities: a.capabilities.map(c => c.name)
        }))
      });
    } catch (err) {
      return JSON.stringify({ error: err.message });
    }
  }
}

export class CeloTagsEscrowTool {
  constructor(escrowClient) {
    this.name = 'celotags_escrow_task';
    this.description = 'Creates a task with escrowed funds on Celo, strictly subject to caller authorization and spending limits.';
    this.escrowClient = escrowClient;
  }

  async call(params) {
    try {
      const task = await this.escrowClient.createEscrowTask(params);
      return JSON.stringify({
        success: true,
        taskId: task.id,
        creator: task.creator,
        amount: task.amount,
        token: task.tokenSymbol,
        status: task.status
      });
    } catch (err) {
      return JSON.stringify({ success: false, error: err.message });
    }
  }
}
