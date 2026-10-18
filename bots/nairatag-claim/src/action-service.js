const { getAddress, isAddress } = require('viem');

const ERC20_ABI = [];
const ROUTER_ABI = [];

const TOKEN_LOOKUP = {
  ETH: { address: null, decimals: 18, symbol: 'ETH' },
};
const MCP_KNOWN_ASSETS = new Set(['ETH', 'USDC', 'POL', 'AVAX', 'BNB']);

function normalizeTokenSymbol(value) {
  const symbol = String(value || '').trim().toUpperCase();
  if (!symbol) throw new Error('A token symbol is required.');
  return symbol;
}

function createActionService({ maxDailySpendUsd = 500, maxPerTxUsd = 200, allowedChains = ['base-sepolia'], allowlistedRouters = [], tokenAddresses = {}, resolveTag } = {}) {
  const policy = { maxDailySpendUsd, maxPerTxUsd, allowedChains, allowlistedRouters };

  function tokenForChain(symbol, chain, decimals) {
    const normalized = normalizeTokenSymbol(symbol);
    if (normalized === 'ETH') return TOKEN_LOOKUP.ETH;
    const configured = tokenAddresses?.[chain]?.[normalized] || tokenAddresses?.[normalized];
    if (!configured || !isAddress(configured.address || configured)) {
      throw new Error(`Token ${normalized} has no verified contract address configured for ${chain}.`);
    }
    return { address: getAddress(configured.address || configured), decimals: Number(configured.decimals || decimals || 18), symbol: normalized };
  }

  function ensurePolicy({ amountUsd, chain, recipient, actionType, token }) {
    if (!allowedChains.includes(String(chain || '').replace('_', '-'))) {
      throw new Error(`Chain ${chain} is not allowed for autonomous execution.`);
    }
    if (typeof amountUsd !== 'undefined') {
      const numeric = Number(amountUsd);
      if (!Number.isFinite(numeric)) throw new Error('amountUsd must be a finite number.');
      if (numeric > maxPerTxUsd) throw new Error(`Requested amount exceeds the per-transaction policy limit of $${maxPerTxUsd}.`);
      if (numeric > maxDailySpendUsd) throw new Error(`Requested amount exceeds the configured daily budget of $${maxDailySpendUsd}.`);
    }
    if (recipient && !/^0x[a-fA-F0-9]{40}$/.test(String(recipient))) {
      throw new Error('Recipient must be a valid EVM address.');
    }
    if (token) normalizeTokenSymbol(token);
  }

  return {
    policy,
    getPolicy() {
      return { ...policy };
    },
    async prepareSend({ walletAddress, to, token = 'ETH', amount, chain = 'base', amountUsd, decimals }) {
      const targetAddress = String(to || '').trim();
      if (!/^0x[a-fA-F0-9]{40}$/.test(targetAddress)) throw new Error('A valid recipient address is required.');
      ensurePolicy({ amountUsd, chain, recipient: targetAddress, actionType: 'send', token });

      const symbol = normalizeTokenSymbol(token);
      const tokenMeta = MCP_KNOWN_ASSETS.has(symbol) ? { address: null, decimals: Number(decimals || 18), symbol } : tokenForChain(symbol, chain, decimals);
      const normalizedWallet = String(walletAddress || '').trim();
      if (!/^0x[a-fA-F0-9]{40}$/.test(normalizedWallet)) throw new Error('A valid walletAddress is required.');

      if (MCP_KNOWN_ASSETS.has(symbol)) {
        return {
          kind: symbol === 'ETH' ? 'native-send' : 'token-send',
          chain,
          from: normalizedWallet,
          to: targetAddress,
          token: symbol,
          amount: String(amount),
          mcp: { tool: 'send', arguments: { recipient: targetAddress, amount: String(amount), asset: symbol, ...(decimals ? { decimals: Number(decimals) } : {}), chain } },
          policyApproved: true,
          type: 'send',
        };
      }
      return {
        kind: 'token-transfer',
        chain,
        from: normalizedWallet,
        to: targetAddress,
        token: symbol,
        amount: String(amount),
        contract: tokenMeta.address,
        policyApproved: true,
        type: 'send',
        mcp: { tool: 'send', arguments: { recipient: targetAddress, amount: String(amount), asset: tokenMeta.address, decimals: tokenMeta.decimals, chain } },
      };
    },
    async prepareSwap({ walletAddress, fromAsset = 'USDC', toAsset = 'ETH', amount, chain = 'base', amountUsd, fromDecimals, toDecimals, routerAddress }) {
      const normalizedWallet = String(walletAddress || '').trim();
      if (!/^0x[a-fA-F0-9]{40}$/.test(normalizedWallet)) throw new Error('A valid walletAddress is required.');
      ensurePolicy({ amountUsd, chain, actionType: 'swap', token: fromAsset });

      if (chain !== 'base') throw new Error('Wallet MCP swaps are supported on mainnet chains, not Base Sepolia.');
      const fromSymbol = normalizeTokenSymbol(fromAsset);
      const toSymbol = normalizeTokenSymbol(toAsset);

      return {
        kind: 'approve-and-swap',
        chain,
        type: 'swap',
        walletAddress: normalizedWallet,
        fromAsset: fromSymbol,
        toAsset: toSymbol,
        amount: String(amount),
        policyApproved: true,
        mcp: { tool: 'swap', arguments: { fromAsset: fromSymbol, toAsset: toSymbol, amount: String(amount), chain } },
      };
    },
    async prepareBridge({ walletAddress, fromChain = 'base', toChain = 'base-sepolia', token = 'USDC', amount, recipient, amountUsd, bridgeProvider = 'across' }) {
      throw new Error(`Bridge execution is unavailable: no verified ${bridgeProvider} bridge contract or wallet call is configured.`);
    },
    async prepareTagPayment({ tag, walletAddress, token = 'USDC', amount, chain = 'base', amountUsd, resolveTagHandler }) {
      const handle = String(tag || '').trim();
      if (!handle) throw new Error('A tag is required.');
      const resolver = typeof resolveTagHandler === 'function' ? resolveTagHandler : resolveTag;
      if (!resolver) throw new Error('No tag resolver is configured.');
      const resolved = await resolver(handle);
      if (!resolved || !resolved.resolvedAddress) throw new Error(`${handle} could not be resolved to a wallet address.`);
      const sendAction = await this.prepareSend({ walletAddress, to: resolved.resolvedAddress, token, amount, chain, amountUsd });
      return {
        kind: 'tag-payment',
        type: 'send',
        tag: handle,
        resolvedAddress: resolved.resolvedAddress,
        chain,
        walletAddress: String(walletAddress || '').trim(),
        token: normalizeTokenSymbol(token),
        amount: String(amount),
        policyApproved: true,
        send: sendAction,
        mcp: sendAction.mcp,
      };
    },
  };
}

module.exports = { createActionService, TOKEN_LOOKUP, ERC20_ABI, ROUTER_ABI };
