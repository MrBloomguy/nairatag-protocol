/**
 * @file CeloAgentWallet.js
 * @description Autonomous Celo Agent Wallet Provider implementing the AgentWallet abstraction.
 * Uses Viem with native Celo CIP-64 fee-currency formatting.
 */

const { createPublicClient, createWalletClient, http, parseUnits, formatUnits, getAddress } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { getNetworkConfig, ERC20_ABI } = require('../config');
const { FeeService } = require('../fee-service');
const { SelfAgentClient } = require('../../identity/self-agent-id');
const { ERC8004Client } = require('../../identity/erc-8004');

class CeloAgentWallet {
  constructor(options = {}) {
    this.networkKey = options.networkKey || 'celo';
    this.config = getNetworkConfig(this.networkKey);
    this.feeService = new FeeService(this.networkKey);

    // Read-only public client
    this.publicClient = createPublicClient({
      chain: this.config.chain,
      transport: http(this.config.rpcUrl)
    });

    this.privateKey = options.privateKey || process.env.CELO_AGENT_PRIVATE_KEY || null;

    if (this.privateKey) {
      this.account = privateKeyToAccount(this.privateKey);
      this.walletClient = createWalletClient({
        account: this.account,
        chain: this.config.chain,
        transport: http(this.config.rpcUrl)
      });
      this.address = this.account.address;
    } else {
      // In read-only or simulated client mode
      this.address = options.address ? getAddress(options.address) : '0x0000000000000000000000000000000000000000';
      this.account = null;
      this.walletClient = null;
    }

    // Bind Self Protocol Agent ID & ERC-8004 Clients
    const isTestnet = this.networkKey.toLowerCase().includes('sepolia');
    this.selfAgent = new SelfAgentClient({
      privateKey: this.privateKey,
      address: this.address,
      network: isTestnet ? 'testnet' : 'mainnet',
      rpcUrl: this.config.rpcUrl
    });
    this.erc8004 = new ERC8004Client({
      privateKey: this.privateKey,
      network: isTestnet ? 'testnet' : 'mainnet',
      rpcUrl: this.config.rpcUrl
    });
  }

  async getAddress() {
    return this.address;
  }

  async getNativeBalance() {
    try {
      const raw = await this.publicClient.getBalance({ address: this.address });
      return {
        symbol: this.config.nativeCurrency.symbol,
        decimals: 18,
        raw: raw.toString(),
        formatted: formatUnits(raw, 18)
      };
    } catch (err) {
      return { symbol: 'CELO', decimals: 18, raw: '0', formatted: '0.0000' };
    }
  }

  async getTokenBalance(symbol = 'cNGN') {
    const token = this.config.tokens[symbol];
    if (!token) throw new Error(`Token ${symbol} not supported on ${this.config.name}`);

    if (token.type === 'native') {
      return this.getNativeBalance();
    }

    try {
      const raw = await this.publicClient.readContract({
        address: token.address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [this.address]
      });

      return {
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        raw: raw.toString(),
        formatted: formatUnits(raw, token.decimals)
      };
    } catch (err) {
      return {
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        raw: '0',
        formatted: '0.00'
      };
    }
  }

  /**
   * Return comprehensive balance sheet with cNGN prioritized as default Nigerian currency
   */
  async getAllBalances() {
    const [cNGN, usdc, usdt, celo] = await Promise.all([
      this.getTokenBalance('cNGN'),
      this.getTokenBalance('USDC'),
      this.getTokenBalance('USDT').catch(() => ({ symbol: 'USDT', formatted: '0.00' })),
      this.getNativeBalance()
    ]);

    return {
      primaryDisplay: 'cNGN',
      cNGN,
      USDC: usdc,
      USDT: usdt,
      CELO: celo
    };
  }

  /**
   * Send ERC-20 token (cNGN / USDC / USDT) on Celo with fee abstraction
   */
  async sendToken({ token = 'cNGN', to, amount, feeCurrencySymbol = 'cNGN' }) {
    const tokenConfig = this.config.tokens[token];
    if (!tokenConfig) throw new Error(`Token ${token} not supported on ${this.config.name}`);

    const recipient = getAddress(to);
    const amountBig = parseUnits(String(amount), tokenConfig.decimals);

    if (!this.walletClient || !this.account) {
      throw new Error('Wallet private key is not configured for autonomous signing.');
    }

    // Select fee currency adapter if available
    const feeOption = this.feeService.selectFeeCurrency(feeCurrencySymbol);

    const txParams = {
      address: tokenConfig.address,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [recipient, amountBig]
    };

    if (feeOption && feeOption.feeCurrency) {
      txParams.feeCurrency = feeOption.feeCurrency;
    }

    let txHash;
    try {
      txHash = await this.walletClient.writeContract(txParams);
    } catch (err) {
      const isRevert = err.message.includes('revert') || err.message.includes('exceeds balance');
      const error = new Error(`Celo transfer failed: ${err.message}`);
      error.isRevert = isRevert;
      error.status = isRevert ? 'FAILED' : 'PENDING_RETRY';
      throw error;
    }

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash });

    const isSuccess = receipt.status === 'success';
    return {
      success: isSuccess,
      status: isSuccess ? 'CONFIRMED' : 'FAILED',
      txHash,
      blockNumber: Number(receipt.blockNumber),
      gasUsed: receipt.gasUsed.toString(),
      recipient,
      token,
      amount: String(amount),
      explorerUrl: `${this.config.explorerUrl}/tx/${txHash}`
    };
  }

  /**
   * Simulate token transfer without broadcasting (for pre-flight validation & fee quoting)
   */
  async simulateTransfer({ token = 'cNGN', to, amount }) {
    const tokenConfig = this.config.tokens[token];
    if (!tokenConfig) throw new Error(`Token ${token} not supported`);
    const recipient = getAddress(to);
    const amountBig = parseUnits(String(amount), tokenConfig.decimals);

    const balance = await this.getTokenBalance(token);
    const hasSufficient = BigInt(balance.raw) >= amountBig;

    return {
      valid: true,
      hasSufficientBalance: hasSufficient,
      currentBalance: balance.formatted,
      requiredAmount: String(amount),
      token,
      recipient,
      estimatedFee: this.feeService.formatEstimatedFee(65000n, 'cNGN')
    };
  }

  /**
   * Retrieves the agent's Self Protocol Proof-of-Human Identity credentials.
   */
  async getSelfIdentity() {
    return this.selfAgent.getCredentials();
  }

  /**
   * Retrieves the agent's ERC-8004 on-chain reputation score.
   */
  async getERC8004Reputation(agentId = 1, tag = 'starred') {
    return this.erc8004.getAgentReputation(agentId, tag);
  }

  /**
   * Cryptographically signs outbound agent-to-agent request headers (x-self-agent-*).
   */
  async signAgentRequest(params) {
    return this.selfAgent.signRequest(params);
  }

  /**
   * Performs an authenticated agent-to-agent HTTP fetch with signed Proof-of-Human headers.
   */
  async fetchAsAgent(url, options) {
    return this.selfAgent.fetch(url, options);
  }
}

module.exports = {
  CeloAgentWallet
};
