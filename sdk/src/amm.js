/**
 * @file amm.js
 * @description Official NairaTag AMM & DEX Client (Chain 901 Native)
 * Provides programmatic quoting, liquidity checks, slippage calculations,
 * and transaction construction for the native Uniswap V2-style NairaTag AMM.
 */


const ROUTER_ABI = [
  'function factory() view returns (address)',
  'function getAmountsOut(uint256 amountIn, address[] memory path) view returns (uint256[] memory amounts)',
  'function getAmountsIn(uint256 amountOut, address[] memory path) view returns (uint256[] memory amounts)',
  'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] memory amounts)',
  'function addLiquidity(address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) returns (uint256 amountA, uint256 amountB, uint256 liquidity)'
];

const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

const PAIR_ABI = [
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)'
];

class NairaTagAMM {
  /**
   * @param {Object} [config]
   * @param {string} [config.rpcUrl]
   * @param {string} [config.routerAddress]
   * @param {string} [config.factoryAddress]
   * @param {Object} [config.tokens] - Pre-configured verified tokens map
   */
  constructor(config = {}) {
    this.rpcUrl = config.rpcUrl || 'http://127.0.0.1:9545';
    this.routerAddress = config.routerAddress || '0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0';
    this.factoryAddress = config.factoryAddress || '0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e';
    this.tokens = config.tokens || {};
  }

  async _rpcCall(method, params = []) {
    const res = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method,
        params,
        id: Math.floor(Math.random() * 1000000)
      })
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error.message || 'RPC Error');
    return json.result;
  }

  /**
   * Reads ERC-20 token balance for an address.
   * @param {string} tokenAddress
   * @param {string} ownerAddress
   * @returns {Promise<bigint>}
   */
  async getBalance(tokenAddress, ownerAddress) {
    // selector: balanceOf(address) = 0x70a08231
    const cleanAddr = ownerAddress.toLowerCase().replace(/^0x/, '').padStart(64, '0');
    const data = '0x70a08231' + cleanAddr;

    const raw = await this._rpcCall('eth_call', [{
      to: tokenAddress,
      data
    }, 'latest']);

    if (!raw || raw === '0x') return 0n;
    return BigInt(raw);
  }

  /**
   * Reads current ERC-20 router allowance.
   * @param {string} tokenAddress
   * @param {string} ownerAddress
   * @param {string} [spenderAddress]
   * @returns {Promise<bigint>}
   */
  async getAllowance(tokenAddress, ownerAddress, spenderAddress = this.routerAddress) {
    // selector: allowance(address,address) = 0xdd62ed3e
    const cleanOwner = ownerAddress.toLowerCase().replace(/^0x/, '').padStart(64, '0');
    const cleanSpender = spenderAddress.toLowerCase().replace(/^0x/, '').padStart(64, '0');
    const data = '0xdd62ed3e' + cleanOwner + cleanSpender;

    const raw = await this._rpcCall('eth_call', [{
      to: tokenAddress,
      data
    }, 'latest']);

    if (!raw || raw === '0x') return 0n;
    return BigInt(raw);
  }

  /**
   * Computes swap quote from router for a path.
   * Calls getAmountsOut(uint256,address[]).
   *
   * @param {bigint|string} amountIn
   * @param {string[]} path - Array of token contract addresses
   * @param {number} [slippagePct=0.5] - Slippage tolerance (e.g. 0.5 for 0.5%)
   * @returns {Promise<{ amountIn: bigint, amountOut: bigint, minReceived: bigint, amounts: bigint[] }>}
   */
  async getQuote(amountIn, path, slippagePct = 0.5) {
    const parsedIn = BigInt(amountIn);
    if (parsedIn <= 0n) throw new Error('Amount in must be positive');
    if (path.length < 2) throw new Error('Path must have at least 2 tokens');

    // Function selector for getAmountsOut(uint256,address[]) = 0xd06ca61f
    const inHex = parsedIn.toString(16).padStart(64, '0');
    const pathOffset = '0000000000000000000000000000000000000000000000000000000000000040';
    const pathLenHex = path.length.toString(16).padStart(64, '0');
    const pathItemsHex = path.map(addr => addr.toLowerCase().replace(/^0x/, '').padStart(64, '0')).join('');

    const data = '0xd06ca61f' + inHex + pathOffset + pathLenHex + pathItemsHex;

    const raw = await this._rpcCall('eth_call', [{
      to: this.routerAddress,
      data
    }, 'latest']);

    if (!raw || raw === '0x' || raw.length < 130) {
      throw new Error('Failed to get quote: insufficient liquidity or invalid path');
    }

    // Decode uint256[] array returned by ABI
    const arrayOffset = parseInt(raw.slice(2, 66), 16);
    const arrayLen = parseInt(raw.slice(66, 130), 16);
    const amounts = [];
    for (let i = 0; i < arrayLen; i++) {
      const chunk = raw.slice(130 + i * 64, 130 + (i + 1) * 64);
      amounts.push(BigInt('0x' + chunk));
    }

    const amountOut = amounts[amounts.length - 1];

    // Calculate minReceived with slippage protection
    // minReceived = amountOut * (1000 - slippageBps) / 1000
    const slippageBps = BigInt(Math.floor(slippagePct * 10));
    const minReceived = (amountOut * (1000n - slippageBps)) / 1000n;

    return {
      amountIn: parsedIn,
      amountOut,
      minReceived,
      amounts,
      path
    };
  }

  /**
   * Builds the calldata for router.swapExactTokensForTokens.
   * @param {Object} params
   * @param {bigint|string} params.amountIn
   * @param {bigint|string} params.amountOutMin
   * @param {string[]} params.path
   * @param {string} params.recipient - Destination address
   * @param {number} [params.deadline] - Unix epoch deadline
   * @returns {{ to: string, data: string, value: string }}
   */
  buildSwapTransaction(params) {
    const { amountIn, amountOutMin, path, recipient, deadline } = params;
    const dl = deadline || (Math.floor(Date.now() / 1000) + 1200);

    // selector: swapExactTokensForTokens(uint256,uint256,address[],address,uint256) = 0x38ed1739
    const inHex = BigInt(amountIn).toString(16).padStart(64, '0');
    const minHex = BigInt(amountOutMin).toString(16).padStart(64, '0');
    const pathOffset = '00000000000000000000000000000000000000000000000000000000000000a0';
    const toHex = recipient.toLowerCase().replace(/^0x/, '').padStart(64, '0');
    const dlHex = BigInt(dl).toString(16).padStart(64, '0');
    const pathLenHex = path.length.toString(16).padStart(64, '0');
    const pathItemsHex = path.map(addr => addr.toLowerCase().replace(/^0x/, '').padStart(64, '0')).join('');

    const data = '0x38ed1739' + inHex + minHex + pathOffset + toHex + dlHex + pathLenHex + pathItemsHex;

    return {
      to: this.routerAddress,
      data,
      value: '0x0'
    };
  }
}

module.exports = {
  NairaTagAMM,
  ROUTER_ABI,
  ERC20_ABI,
  PAIR_ABI
};
