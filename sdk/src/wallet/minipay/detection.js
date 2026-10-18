/**
 * @file detection.js
 * @description Official MiniPay environment detection & provider discovery for Celo.
 * Follows Celo & Opera MiniPay developer standards:
 * - Injected window.ethereum.isMiniPay === true
 * - window.isMiniPay === true
 * - Target Chain ID 42220 (Celo Mainnet)
 */

function isMiniPay(win = (typeof window !== 'undefined' ? window : null)) {
  if (!win) return false;
  try {
    return Boolean(
      win.ethereum?.isMiniPay ||
      win.isMiniPay ||
      (win.navigator?.userAgent && win.navigator.userAgent.includes('MiniPay'))
    );
  } catch {
    return false;
  }
}

function getMiniPayProvider(win = (typeof window !== 'undefined' ? window : null)) {
  if (!isMiniPay(win)) return null;
  return win?.ethereum || null;
}

async function connectMiniPay(win = (typeof window !== 'undefined' ? window : null)) {
  const provider = getMiniPayProvider(win);
  if (!provider) {
    throw new Error('MiniPay provider not detected.');
  }

  const accounts = await provider.request({ method: 'eth_requestAccounts' });
  const address = accounts?.[0] || null;
  if (!address) throw new Error('No address returned from MiniPay wallet.');

  // Verify or switch to Celo Mainnet (42220 / 0xa4ec)
  try {
    const chainIdHex = await provider.request({ method: 'eth_chainId' });
    const chainId = parseInt(chainIdHex, 16);
    if (chainId !== 42220) {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xa4ec' }]
      });
    }
  } catch (err) {
    console.warn('[MiniPay] Chain verification notice:', err.message);
  }

  return {
    provider,
    address,
    network: 'celo',
    chainId: 42220
  };
}

module.exports = {
  isMiniPay,
  getMiniPayProvider,
  connectMiniPay
};
