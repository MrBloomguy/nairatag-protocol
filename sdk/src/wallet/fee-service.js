/**
 * @file fee-service.js
 * @description Celo CIP-64 Fee Currency & Gas Abstraction service.
 * Allows agents and users to pay transaction fees in stablecoins (cNGN, USDC)
 * without requiring a separate CELO balance.
 */

const { getNetworkConfig } = require('./config');

class FeeService {
  constructor(networkKey = 'celo') {
    this.networkKey = networkKey;
    this.config = getNetworkConfig(networkKey);
  }

  /**
   * Return allowlisted fee currencies supported for this network.
   */
  getSupportedFeeCurrencies() {
    if (!this.config.supportsFeeCurrency) {
      return [{ symbol: this.config.nativeCurrency.symbol, isNative: true }];
    }

    const currencies = [
      {
        symbol: 'CELO',
        name: 'Native Celo',
        address: null,
        isNative: true,
        decimals: 18
      }
    ];

    const tokens = this.config.tokens;
    // For 18-decimal tokens like cNGN / NGNm, use token address directly.
    if (tokens.cNGN) {
      currencies.push({
        symbol: 'cNGN',
        name: tokens.cNGN.name,
        address: tokens.cNGN.address,
        isNative: false,
        decimals: tokens.cNGN.decimals
      });
    }

    // For 6-decimal tokens like USDC, use adapter address if available
    if (tokens.USDC && tokens.USDC.feeAdapter) {
      currencies.push({
        symbol: 'USDC',
        name: 'USD Coin (via Fee Adapter)',
        address: tokens.USDC.feeAdapter,
        isNative: false,
        decimals: 6,
        tokenAddress: tokens.USDC.address
      });
    }

    return currencies;
  }

  /**
   * Select best fee currency based on user balances and preference.
   * Defaults to cNGN or USDC so the user/agent never needs manual CELO.
   */
  selectFeeCurrency(preferredSymbol = 'cNGN', balances = {}) {
    if (!this.config.supportsFeeCurrency) return null;

    const supported = this.getSupportedFeeCurrencies();
    const target = supported.find(c => c.symbol.toLowerCase() === preferredSymbol.toLowerCase());

    if (target && target.address) {
      return {
        symbol: target.symbol,
        feeCurrency: target.address
      };
    }

    // Fallback: check if USDC adapter is available
    const usdc = supported.find(c => c.symbol === 'USDC');
    if (usdc && usdc.address) {
      return {
        symbol: 'USDC',
        feeCurrency: usdc.address
      };
    }

    return null; // Native CELO gas fallback
  }

  /**
   * Format human-readable estimated fee display.
   */
  formatEstimatedFee(estimatedGasUnits = 65000n, feeSymbol = 'cNGN') {
    // Celo sub-cent gas pricing: 65,000 gas * ~5 Gwei = ~0.000325 CELO ≈ ₦0.5 cNGN
    if (feeSymbol === 'cNGN') {
      return '≈ ₦0.50 cNGN';
    }
    if (feeSymbol === 'USDC') {
      return '≈ $0.001 USDC';
    }
    return '≈ 0.0005 CELO (< ₦1)';
  }
}

module.exports = {
  FeeService
};
