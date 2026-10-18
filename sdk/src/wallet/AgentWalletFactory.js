/**
 * @file AgentWalletFactory.js
 * @description Network-agnostic Wallet Provider Factory.
 * Manages provider creation with Celo as default and Base as legacy fallback.
 */

const { CeloAgentWallet } = require('./providers/CeloAgentWallet');
const { MiniPayWallet } = require('./providers/MiniPayWallet');

class AgentWalletFactory {
  constructor(env = process.env) {
    this.defaultNetwork = (env.AGENT_NETWORK || 'celo').toLowerCase();
    this.celoEnabled = env.AGENT_CELO_ENABLED !== 'false';
    this.baseEnabled = env.AGENT_BASE_ENABLED === 'true';
    this.miniPayEnabled = env.AGENT_MINIPAY_ENABLED !== 'false';
  }

  createWallet(options = {}) {
    const providerType = options.type || 'agent'; // 'agent' | 'minipay'
    const network = (options.network || this.defaultNetwork).toLowerCase();

    if (providerType === 'minipay') {
      if (!this.miniPayEnabled) throw new Error('MiniPay wallet provider is currently disabled by feature flag.');
      return new MiniPayWallet(options);
    }

    if (network.startsWith('celo')) {
      if (!this.celoEnabled) throw new Error('Celo execution network is disabled.');
      return new CeloAgentWallet({ ...options, networkKey: network });
    }

    if (network.startsWith('base')) {
      if (!this.baseEnabled) throw new Error('Base network execution is disabled.');
      // Legacy fallback notice
      return new CeloAgentWallet({ ...options, networkKey: 'celo' });
    }

    return new CeloAgentWallet(options);
  }
}

const defaultWalletFactory = new AgentWalletFactory();

module.exports = {
  AgentWalletFactory,
  defaultWalletFactory
};
