const { RouteStatus, BridgeSwapStage, NairaTagBridgeAdapter, KNOWN_CHAINS } = require('./bridge');

const NATIVE_TOKEN = '0x0000000000000000000000000000000000000000';
const DEFAULT_CHAIN_IDS = [1, 10, 137, 42220, 11142220, 42161];

function normalizeAddress(value, field) {
  const address = String(value || '').trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) throw new Error(`${field} must be a valid EVM address.`);
  return address;
}

function normalizeAmount(value) {
  const amount = String(value || '').trim();
  if (!/^[0-9]+$/.test(amount) || BigInt(amount) <= 0n) throw new Error('amount must be a positive integer in base units.');
  return amount;
}

function normalizeHash(value, field) {
  const hash = String(value || '').trim();
  if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) throw new Error(`${field} must be a valid transaction hash.`);
  return hash;
}

function chainName(chainId) {
  const names = { 1: 'ethereum', 10: 'optimism', 137: 'polygon', 42220: 'celo', 11142220: 'celo-sepolia', 42161: 'arbitrum' };
  return names[Number(chainId)] || null;
}

class LiFiBridgeAdapter extends NairaTagBridgeAdapter {
  constructor(config = {}) {
    super('LI.FI', 'LIFI');
    this.apiBaseUrl = String(config.apiBaseUrl || 'https://li.quest/v1').replace(/\/$/, '');
    this.fetch = config.fetchImpl || globalThis.fetch;
    this.chainIds = config.chainIds || DEFAULT_CHAIN_IDS;
    if (typeof this.fetch !== 'function') throw new Error('A fetch implementation is required for LI.FI.');
  }

  async getSupportedChains() {
    const known = new Map(KNOWN_CHAINS.map(chain => [chain.chainId, chain]));
    return this.chainIds.map(chainId => known.get(chainId) || ({
      chainId,
      name: chainName(chainId) || `Chain ${chainId}`,
      type: 'EXTERNAL',
      status: RouteStatus.SUPPORTED,
      currency: 'UNKNOWN',
      isNative: false,
    }));
  }

  async getSupportedTokens() {
    return [];
  }

  async quote({ sourceChainId, destinationChainId, fromToken, toToken, amount, fromAddress, toAddress, slippage = 0.005 }) {
    const fromChain = chainName(sourceChainId);
    const toChain = chainName(destinationChainId);
    if (!fromChain || !toChain) throw new Error('LI.FI route uses an unsupported chain identifier.');
    if (!this.chainIds.includes(Number(sourceChainId)) || !this.chainIds.includes(Number(destinationChainId))) {
      throw new Error('The requested LI.FI route is not enabled in this deployment.');
    }
    const params = new URLSearchParams({
      fromChain: String(sourceChainId),
      toChain: String(destinationChainId),
      fromToken: normalizeAddress(fromToken || NATIVE_TOKEN, 'fromToken'),
      toToken: normalizeAddress(toToken || NATIVE_TOKEN, 'toToken'),
      fromAmount: normalizeAmount(amount),
      fromAddress: normalizeAddress(fromAddress, 'fromAddress'),
      toAddress: normalizeAddress(toAddress, 'toAddress'),
      slippage: String(slippage),
    });
    const response = await this.fetch(`${this.apiBaseUrl}/quote?${params}`);
    const body = await response.json();
    if (!response.ok) throw new Error(body?.message || body?.error || `LI.FI quote failed: ${response.status}`);
    const transactionRequest = body.transactionRequest;
    if (!transactionRequest?.to || !transactionRequest?.data) throw new Error('LI.FI returned no executable transaction request.');
    return {
      provider: this.name,
      providerType: this.providerType,
      routeStatus: RouteStatus.SUPPORTED,
      isReady: true,
      sourceChainId: Number(sourceChainId),
      destinationChainId: Number(destinationChainId),
      fromAddress: normalizeAddress(fromAddress, 'fromAddress'),
      toAddress: normalizeAddress(toAddress, 'toAddress'),
      fromToken: fromToken || NATIVE_TOKEN,
      toToken: toToken || NATIVE_TOKEN,
      amount: normalizeAmount(amount),
      estimate: body.estimate || null,
      action: body.action || null,
      transactionRequest: {
        to: normalizeAddress(transactionRequest.to, 'transactionRequest.to'),
        value: transactionRequest.value ? `0x${BigInt(transactionRequest.value).toString(16)}` : '0x0',
        data: transactionRequest.data,
        chainId: Number(sourceChainId),
      },
      raw: body,
    };
  }

  async initiate(params) {
    if (!params?.transactionRequest) throw new Error('A verified LI.FI quote is required before preparing execution.');
    const chain = chainName(params.sourceChainId);
    if (!chain) throw new Error('LI.FI source chain is unsupported.');
    return {
      id: params.raw?.id || null,
      stage: BridgeSwapStage.SOURCE_BRIDGE_TX,
      approvalRequired: true,
      walletCall: {
        chain,
        calls: [{ to: params.transactionRequest.to, value: params.transactionRequest.value || '0x0', data: params.transactionRequest.data }],
      },
      sourceChainId: params.sourceChainId,
      destinationChainId: params.destinationChainId,
      recipient: params.toAddress,
      provider: this.name,
    };
  }

  async getStatus({ transactionHash, bridge, sourceChainId, destinationChainId }) {
    const statusParams = {
      txHash: normalizeHash(transactionHash, 'transactionHash'),
      fromChain: String(sourceChainId),
      toChain: String(destinationChainId),
    };
    if (bridge) statusParams.bridge = String(bridge);
    const params = new URLSearchParams(statusParams);
    const response = await this.fetch(`${this.apiBaseUrl}/status?${params}`);
    const body = await response.json();
    if (!response.ok) throw new Error(body?.message || body?.error || `LI.FI status failed: ${response.status}`);
    return {
      provider: this.name,
      id: transactionHash,
      status: body.status,
      stage: body.status === 'DONE' ? BridgeSwapStage.COMPLETED : BridgeSwapStage.BRIDGE_PROCESSING,
      completed: body.status === 'DONE',
      sourceTransactionHash: body.sending?.txHash || transactionHash,
      destinationTransactionHash: body.receiving?.txHash || null,
      raw: body,
    };
  }
}

module.exports = { LiFiBridgeAdapter, NATIVE_TOKEN, chainName };
