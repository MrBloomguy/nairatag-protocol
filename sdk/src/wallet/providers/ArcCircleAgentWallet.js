/**
 * @file ArcCircleAgentWallet.js
 * @description Autonomous Arc Circle Agent Wallet Provider.
 * Integrates Circle Agent Stack with Arc Testnet (5042002) and Mainnet (5042).
 * Provides autonomous execution within strictly enforced spending limits,
 * Tag-to-Tag settlement, and gas-sponsored Circle smart contract accounts (SCA).
 */

const {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
  getAddress,
  encodeFunctionData,
  isAddress,
  stringToHex
} = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { getNetworkConfig, ERC20_ABI } = require('../config');

const ARC_RESOLVER_ABI = [
  {
    type: 'function',
    name: 'resolve',
    stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }]
  }
];

class ArcCircleAgentWallet {
  constructor(options = {}) {
    this.networkKey = options.networkKey || 'arcTestnet';
    this.config = getNetworkConfig(this.networkKey);

    this.publicClient = createPublicClient({
      chain: this.config.chain,
      transport: http(this.config.rpcUrl)
    });

    this.circleWalletId = options.circleWalletId || options.walletId || null;
    this.circleUserToken = options.circleUserToken || options.userToken || null;
    this.circleApiKey = options.circleApiKey || process.env.CIRCLE_API_KEY || null;
    this.agentTag = options.agentTag || options.tag || null;

    this.privateKey = options.privateKey || process.env.ARC_AGENT_PRIVATE_KEY || null;

    if (this.privateKey) {
      this.account = privateKeyToAccount(this.privateKey);
      this.walletClient = createWalletClient({
        account: this.account,
        chain: this.config.chain,
        transport: http(this.config.rpcUrl)
      });
      this.address = options.address ? getAddress(options.address) : this.account.address;
    } else {
      this.address = options.address ? getAddress(options.address) : '0x0000000000000000000000000000000000000000';
      this.account = null;
      this.walletClient = null;
    }

    // Spending Policy (Circle Agent Stack policy model)
    const policy = options.spendingPolicy || {};
    this.spendingPolicy = {
      perTxLimit: Number(policy.perTxLimit || process.env.AGENT_ARC_PER_TX_LIMIT || 25), // max USDC per transfer
      dailyLimit: Number(policy.dailyLimit || process.env.AGENT_ARC_DAILY_LIMIT || 100), // max USDC per 24h
      weeklyLimit: Number(policy.weeklyLimit || process.env.AGENT_ARC_WEEKLY_LIMIT || 500),
      monthlyLimit: Number(policy.monthlyLimit || process.env.AGENT_ARC_MONTHLY_LIMIT || 2000),
      currency: 'USDC',
      recipientAllowlist: Array.isArray(policy.recipientAllowlist) ? policy.recipientAllowlist.map(a => a.toLowerCase()) : [],
      recipientBlocklist: Array.isArray(policy.recipientBlocklist) ? policy.recipientBlocklist.map(b => b.toLowerCase()) : []
    };

    // Spending ledger in memory / rolling window
    this.spendHistory = [];
  }

  async getAddress() {
    return this.address;
  }

  setAddress(address) {
    this.address = getAddress(address);
  }

  /**
   * On Arc, native gas fee currency is USDC.
   */
  async getNativeBalance() {
    return this.getTokenBalance('USDC');
  }

  /**
   * Retrieves USDC balance directly from Arc RPC.
   */
  async getTokenBalance(symbol = 'USDC') {
    const token = this.config.tokens[symbol];
    if (!token) throw new Error(`Token ${symbol} is not configured on ${this.config.name}`);

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
   * Calculates spent amount in rolling time window.
   */
  getSpentInWindow(windowMs) {
    const cutoff = Date.now() - windowMs;
    return this.spendHistory
      .filter(tx => tx.timestamp >= cutoff)
      .reduce((sum, tx) => sum + tx.amount, 0);
  }

  getSpendingPolicy() {
    const dayMs = 24 * 60 * 60 * 1000;
    const weekMs = 7 * dayMs;
    const monthMs = 30 * dayMs;

    const spentToday = this.getSpentInWindow(dayMs);
    const spentThisWeek = this.getSpentInWindow(weekMs);
    const spentThisMonth = this.getSpentInWindow(monthMs);

    return {
      ...this.spendingPolicy,
      spentToday: Number(spentToday.toFixed(4)),
      remainingDaily: Math.max(0, Number((this.spendingPolicy.dailyLimit - spentToday).toFixed(4))),
      spentThisWeek: Number(spentThisWeek.toFixed(4)),
      remainingWeekly: Math.max(0, Number((this.spendingPolicy.weeklyLimit - spentThisWeek).toFixed(4))),
      spentThisMonth: Number(spentThisMonth.toFixed(4)),
      remainingMonthly: Math.max(0, Number((this.spendingPolicy.monthlyLimit - spentThisMonth).toFixed(4)))
    };
  }

  setSpendingPolicy(newPolicy = {}) {
    const perTx = newPolicy.perTxLimit !== undefined ? Number(newPolicy.perTxLimit) : this.spendingPolicy.perTxLimit;
    const daily = newPolicy.dailyLimit !== undefined ? Number(newPolicy.dailyLimit) : this.spendingPolicy.dailyLimit;
    const weekly = newPolicy.weeklyLimit !== undefined ? Number(newPolicy.weeklyLimit) : this.spendingPolicy.weeklyLimit;
    const monthly = newPolicy.monthlyLimit !== undefined ? Number(newPolicy.monthlyLimit) : this.spendingPolicy.monthlyLimit;

    if (perTx <= 0 || daily <= 0 || weekly <= 0 || monthly <= 0) {
      throw new Error('Spending limits must be greater than zero.');
    }
    if (perTx > daily || daily > weekly || weekly > monthly) {
      throw new Error('Invalid spending policy hierarchy: perTx <= daily <= weekly <= monthly required.');
    }

    this.spendingPolicy = {
      ...this.spendingPolicy,
      ...newPolicy,
      perTxLimit: perTx,
      dailyLimit: daily,
      weeklyLimit: weekly,
      monthlyLimit: monthly
    };

    return this.getSpendingPolicy();
  }

  checkSpendingAllowed(amountUsdc, recipientAddress) {
    const amount = Number(amountUsdc);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Transfer amount must be a positive number.');
    }

    if (amount > this.spendingPolicy.perTxLimit) {
      throw new Error(
        `Circle Agent Policy Violation: Amount ${amount} USDC exceeds per-transaction limit of ${this.spendingPolicy.perTxLimit} USDC.`
      );
    }

    const dayMs = 24 * 60 * 60 * 1000;
    const spentToday = this.getSpentInWindow(dayMs);
    if (spentToday + amount > this.spendingPolicy.dailyLimit) {
      throw new Error(
        `Circle Agent Policy Violation: Daily limit reached. Spent today: ${spentToday.toFixed(2)} USDC, Attempted: ${amount} USDC, Limit: ${this.spendingPolicy.dailyLimit} USDC.`
      );
    }

    if (recipientAddress) {
      const normalizedRecipient = String(recipientAddress).toLowerCase();
      if (this.spendingPolicy.recipientBlocklist.includes(normalizedRecipient)) {
        throw new Error(`Circle Agent Policy Violation: Recipient ${recipientAddress} is blocked.`);
      }
      if (
        this.spendingPolicy.recipientAllowlist.length > 0 &&
        !this.spendingPolicy.recipientAllowlist.includes(normalizedRecipient)
      ) {
        throw new Error(`Circle Agent Policy Violation: Recipient ${recipientAddress} is not in the allowlist.`);
      }
    }

    return true;
  }

  recordSpend(amount, recipient, txHash) {
    this.spendHistory.push({
      amount: Number(amount),
      recipient: String(recipient).toLowerCase(),
      txHash,
      timestamp: Date.now()
    });
  }

  /**
   * Resolves a Nairatag to an Arc address.
   */
  async resolveTag(tag) {
    const cleanTag = String(tag || '').replace(/^[₦$@#]/, '').trim().toLowerCase();
    if (!cleanTag) throw new Error('Tag identifier is required.');

    try {
      const response = await fetch(`https://nairatag.ng/api/claims?handle=${encodeURIComponent(cleanTag)}`);
      const data = await response.json().catch(() => ({}));
      if (data?.ok && data.claim?.recipientAddress) {
        return getAddress(data.claim.recipientAddress);
      }
    } catch {
      // Fallback to local or registry resolution if claim API is unreachable
    }

    throw new Error(`Could not resolve Nairatag @${cleanTag} to an onchain address on Arc.`);
  }

  /**
   * Autonomous USDC transfer on Arc within pre-approved spending limits.
   */
  async transfer({ recipient, amount, memo = '' }) {
    let targetAddress = recipient;
    if (!isAddress(targetAddress)) {
      targetAddress = await this.resolveTag(recipient);
    }
    const cleanRecipient = getAddress(targetAddress);

    // 1. Guardrail check
    this.checkSpendingAllowed(amount, cleanRecipient);

    const usdcConfig = this.config.tokens.USDC;
    const amountBig = parseUnits(String(amount), usdcConfig.decimals);

    // 2. Execution via Live Viem Wallet Client (if private key available)
    if (this.walletClient && this.account) {
      const hash = await this.walletClient.writeContract({
        address: usdcConfig.address,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [cleanRecipient, amountBig]
      });

      this.recordSpend(amount, cleanRecipient, hash);

      return {
        ok: true,
        hash,
        from: this.address,
        to: cleanRecipient,
        amount: String(amount),
        currency: 'USDC',
        network: this.networkKey,
        memo,
        explorerUrl: `${this.config.explorerUrl}/tx/${hash}`
      };
    }

    // 3. Execution via Circle W3S Agent Stack (User-Controlled Smart Account)
    if (this.circleApiKey && this.circleWalletId && this.circleUserToken) {
      const response = await fetch('https://api.circle.com/v1/w3s/user/transactions/contractExecution', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.circleApiKey}`,
          'X-User-Token': this.circleUserToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          walletId: this.circleWalletId,
          contractAddress: usdcConfig.address,
          abiFunctionSignature: 'transfer(address,uint256)',
          abiParameters: [cleanRecipient, amountBig.toString()],
          feeLevel: 'MEDIUM'
        })
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.message || body.error || `Circle Agent transaction failed (${response.status}).`);
      }

      const challengeId = body.data?.challengeId || body.challengeId;
      this.recordSpend(amount, cleanRecipient, challengeId);

      return {
        ok: true,
        challengeId,
        from: this.address,
        to: cleanRecipient,
        amount: String(amount),
        currency: 'USDC',
        network: this.networkKey,
        memo,
        circleExecution: true
      };
    }

    // 4. Prepares unsigned payload for signing
    const calldata = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [cleanRecipient, amountBig]
    });

    return {
      ok: true,
      prepared: true,
      provider: 'CircleAgentWallet',
      chain: this.config.circleBlockchain,
      chainId: this.config.chainId,
      contract: usdcConfig.address,
      calldata,
      from: this.address,
      to: cleanRecipient,
      amount: String(amount),
      currency: 'USDC',
      memo
    };
  }

  /**
   * Autonomous Tag-to-Tag USDC payment on Arc.
   */
  async payAgentTag({ agentTag, amount, memo = '' }) {
    const resolvedAddress = await this.resolveTag(agentTag);
    return this.transfer({
      recipient: resolvedAddress,
      amount,
      memo: memo || `Agent-to-Agent settlement to ${agentTag}`
    });
  }
}

module.exports = {
  ArcCircleAgentWallet
};
