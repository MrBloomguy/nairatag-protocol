/**
 * @file MiniPayWallet.js
 * @description MiniPay Consumer Wallet Provider for user-signed Celo transactions.
 * Non-custodial: Private keys remain strictly inside the Opera/Celo MiniPay client.
 */

const { encodeFunctionData, parseUnits, getAddress } = require('viem');
const { getNetworkConfig, ERC20_ABI } = require('../config');
const { isMiniPay } = require('../minipay/detection');

class MiniPayWallet {
  constructor(options = {}) {
    this.networkKey = 'celo';
    this.config = getNetworkConfig('celo');
    this.address = options.address ? getAddress(options.address) : null;
  }

  setAddress(address) {
    this.address = getAddress(address);
  }

  async getAddress() {
    return this.address;
  }

  isAvailable(win) {
    return isMiniPay(win);
  }

  /**
   * Prepares unsigned ERC-20 payment payload for MiniPay client signing.
   */
  prepareTokenTransfer({ token = 'cNGN', to, amount }) {
    const tokenConfig = this.config.tokens[token];
    if (!tokenConfig) throw new Error(`Token ${token} not supported on Celo`);

    const recipient = getAddress(to);
    const amountBig = parseUnits(String(amount), tokenConfig.decimals);

    const calldata = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [recipient, amountBig]
    });

    return {
      provider: 'MiniPay',
      chain: 'celo',
      chainId: 42220,
      contract: tokenConfig.address,
      token,
      amount: String(amount),
      recipient,
      txPayload: {
        from: this.address,
        to: tokenConfig.address,
        data: calldata,
        value: '0x0'
      },
      note: 'Signing occurs securely in your MiniPay wallet.'
    };
  }

  /**
   * Executes transaction directly in browser client when window.ethereum is present.
   */
  async executeInClient(win, preparedPayload) {
    if (!win?.ethereum) throw new Error('MiniPay provider is not available in window context.');
    const hash = await win.ethereum.request({
      method: 'eth_sendTransaction',
      params: [preparedPayload.txPayload]
    });
    return {
      txHash: hash,
      status: 'SUBMITTED',
      explorerUrl: `${this.config.explorerUrl}/tx/${hash}`
    };
  }
}

module.exports = {
  MiniPayWallet
};
