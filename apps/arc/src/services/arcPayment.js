/**
 * @file arcPayment.js
 * @description Arc USDC Payment Service using Viem.
 * Handles:
 * - Wallet connection via window.ethereum (EIP-1193 / EIP-6963 compatible)
 * - Arc Testnet (5042002) & Mainnet (5042) network detection and switching
 * - Real onchain USDC balance reading using canonical contract 0x3600000000000000000000000000000000000000
 * - Integer base unit conversion (parseUnits / formatUnits) - zero float inaccuracies
 * - Arc transaction execution with sub-second finality receipt confirmation
 */

import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  parseUnits,
  formatUnits,
  isAddress,
  getAddress,
  encodeFunctionData,
} from 'viem';
import {
  arcTestnet,
  arcMainnet,
  ARC_USDC_ADDRESS,
  ARC_USDC_DECIMALS,
  ERC20_ABI,
  isArcMainnet,
} from '../config/arc.js';

// Arc Mainnet (Chain ID 5042) is the canonical execution network
export const activeArcChain = arcMainnet;

/**
 * Public client for read-only calls to Arc Testnet.
 */
export const publicClient = createPublicClient({
  chain: activeArcChain,
  transport: http(),
});

/**
 * Detects available browser wallet (MetaMask, Rabby, Coinbase, Rainbow, etc.).
 */
export function getEthereumProvider() {
  if (typeof window === 'undefined') return null;
  return window.ethereum || null;
}

/**
 * Connects browser wallet and requests active account.
 */
export async function connectWallet() {
  const provider = getEthereumProvider();
  if (!provider) {
    throw new Error('No EVM wallet detected. Please install MetaMask, Rabby, or Coinbase Wallet.');
  }

  const accounts = await provider.request({ method: 'eth_requestAccounts' });
  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts authorized.');
  }

  const address = getAddress(accounts[0]);
  const chainIdHex = await provider.request({ method: 'eth_chainId' });
  const currentChainId = parseInt(chainIdHex, 16);

  return {
    address,
    chainId: currentChainId,
    isArc: currentChainId === activeArcChain.id,
  };
}

/**
 * Switches the wallet to Arc Testnet (or adds it if not registered).
 */
export async function switchOrAddArcNetwork() {
  const provider = getEthereumProvider();
  if (!provider) throw new Error('No EVM wallet found');

  const chainIdHex = `0x${activeArcChain.id.toString(16)}`;

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    });
    return true;
  } catch (switchError) {
    // Error 4902 means the chain has not been added to the wallet
    if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: chainIdHex,
            chainName: activeArcChain.name,
            nativeCurrency: {
              name: 'USD Coin',
              symbol: 'USDC',
              decimals: 18,
            },
            rpcUrls: activeArcChain.rpcUrls.default.http,
            blockExplorerUrls: [activeArcChain.blockExplorers.default.url],
          },
        ],
      });
      return true;
    }
    throw switchError;
  }
}

/**
 * Reads real onchain USDC balance for a wallet address on Arc.
 * Returns formatted string (e.g. "25.50") and raw BigInt.
 */
export async function getUsdcBalance(walletAddress) {
  if (!walletAddress || !isAddress(walletAddress)) {
    return { formatted: '0.00', raw: 0n, symbol: 'USDC' };
  }

  try {
    const rawBalance = await publicClient.readContract({
      address: ARC_USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [getAddress(walletAddress)],
    });

    const formatted = formatUnits(rawBalance, ARC_USDC_DECIMALS);
    return {
      formatted: Number(formatted).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      }),
      rawString: formatted,
      raw: rawBalance,
      symbol: 'USDC',
    };
  } catch (err) {
    console.error('[getUsdcBalance error]', err);
    throw new Error(`Failed to read USDC balance on Arc: ${err.message}`);
  }
}

/**
 * Estimates gas fee in USDC for an Arc USDC transfer.
 * Arc enforces a 20 Gwei maxFeePerGas floor, and gas is paid in USDC.
 */
export async function estimateTransferFee(fromAddress, toAddress, amountUsdc) {
  try {
    if (!fromAddress || !toAddress) return { estimatedUsdc: '~0.001', rawFee: 0n };

    const parsedAmount = parseUnits(String(amountUsdc || '1'), ARC_USDC_DECIMALS);
    const data = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [getAddress(toAddress), parsedAmount],
    });

    const gasEstimate = await publicClient.estimateGas({
      account: getAddress(fromAddress),
      to: ARC_USDC_ADDRESS,
      data,
    });

    // Approximate fee: Arc's standard transfer consumes ~45k-65k gas, sub-cent in USDC
    const estimatedGas = gasEstimate ? gasEstimate : 65000n;
    return {
      gasLimit: estimatedGas.toString(),
      estimatedUsdc: '< $0.001',
      details: 'Sub-second finality on Arc',
    };
  } catch (err) {
    return {
      gasLimit: '65000',
      estimatedUsdc: '< $0.001',
      details: 'Standard Arc Transfer',
    };
  }
}

/**
 * Executes a real on-chain USDC transfer to a resolved recipient address on Arc.
 * Supports optional Arc Predeployed Transaction Memo (0x5294E9927c3306DcBaDb03fe70b92e01cCede505).
 * 
 * @param {Object} params
 * @param {string} params.fromAddress - Connected sender address
 * @param {string} params.toAddress - Resolved recipient address (verified)
 * @param {string|number} params.amountUsdc - Human amount (e.g. "5.00")
 * @param {string} [params.memoText] - Optional transaction memo attached via Arc Memo contract
 * @returns {Promise<{
 *   hash: string,
 *   receipt: any,
 *   explorerUrl: string,
 *   hasMemo: boolean,
 *   memoText?: string
 * }>}
 */
export async function sendUsdcOnArc({
  fromAddress,
  toAddress,
  tagOrAddress,
  amountUsdc,
  memoText = '',
  memo,
  onStatusUpdate = () => {},
}) {
  const startTime = Date.now();
  if (!fromAddress || !isAddress(fromAddress)) {
    throw new Error('Valid sender wallet is not connected.');
  }

  let targetAddress = toAddress;
  if (!targetAddress && tagOrAddress) {
    if (isAddress(tagOrAddress)) {
      targetAddress = tagOrAddress;
    } else {
      const { resolveTag } = await import('./nairatagResolver.js');
      const resolved = await resolveTag(tagOrAddress);
      if (!resolved.success || !resolved.resolvedAddress) {
        throw new Error(resolved.error || `Could not resolve recipient tag ${tagOrAddress}`);
      }
      targetAddress = resolved.resolvedAddress;
    }
  }

  if (!targetAddress || !isAddress(targetAddress)) {
    throw new Error('Resolved recipient address is invalid.');
  }

  // Prevent sending to zero address (Arc reverts address(0) sends)
  if (targetAddress === '0x0000000000000000000000000000000000000000') {
    throw new Error('Sending to zero address is prohibited.');
  }

  const cleanAmount = String(amountUsdc).trim();
  if (!cleanAmount || isNaN(Number(cleanAmount)) || Number(cleanAmount) <= 0) {
    throw new Error('Please enter a valid amount greater than 0.');
  }

  // Integer base unit arithmetic only (no floating point precision loss)
  const baseUnits = parseUnits(cleanAmount, ARC_USDC_DECIMALS);

  // Check sender balance first to avoid useless failed transactions
  const { raw: currentBalance } = await getUsdcBalance(fromAddress);
  if (currentBalance < baseUnits) {
    const required = formatUnits(baseUnits, ARC_USDC_DECIMALS);
    const available = formatUnits(currentBalance, ARC_USDC_DECIMALS);
    throw new Error(`Insufficient USDC balance. You have ${available} USDC, but need ${required} USDC.`);
  }

  const provider = getEthereumProvider();
  if (!provider) throw new Error('EVM wallet provider unavailable.');

  const walletClient = createWalletClient({
    chain: activeArcChain,
    transport: custom(provider),
  });

  const cleanMemo = String(memoText || memo || (tagOrAddress ? `NairaTag: ${tagOrAddress}` : '')).trim();
  let hash;
  onStatusUpdate({ step: 'transacting', message: 'Sending transaction to your wallet...' });

  if (cleanMemo) {
    try {
      // Encode the inner USDC transfer call
      const transferCallData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [getAddress(targetAddress), baseUnits],
      });

      const { stringToHex, keccak256 } = await import('viem');
      const { ARC_MEMO_ADDRESS, ARC_MEMO_ABI } = await import('../config/arc.js');
      const memoBytes = stringToHex(cleanMemo);
      const memoId = keccak256(memoBytes);

      // Call Arc predeployed Memo contract (moves USDC and logs memo event on Arc)
      hash = await walletClient.writeContract({
        account: getAddress(fromAddress),
        address: ARC_MEMO_ADDRESS,
        abi: ARC_MEMO_ABI,
        functionName: 'memo',
        args: [ARC_USDC_ADDRESS, transferCallData, memoId, memoBytes],
      });
    } catch (memoErr) {
      console.warn('[Arc Memo routing fallback to canonical USDC transfer]', memoErr?.message || memoErr);
      hash = await walletClient.writeContract({
        account: getAddress(fromAddress),
        address: ARC_USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [getAddress(targetAddress), baseUnits],
      });
    }
  } else {
    // Direct canonical ERC-20 USDC transfer
    hash = await walletClient.writeContract({
      account: getAddress(fromAddress),
      address: ARC_USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [getAddress(targetAddress), baseUnits],
    });
  }

  if (!hash || !hash.startsWith('0x')) {
    throw new Error('No transaction hash returned from wallet.');
  }

  onStatusUpdate({ step: 'confirming', message: 'Waiting for Arc confirmation...' });
  // Wait for deterministic sub-second receipt on Arc
  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    confirmations: 1,
    timeout: 30000,
  });

  if (receipt.status !== 'success') {
    throw new Error(`Transaction reverted on Arc. Tx Hash: ${hash}`);
  }

  const explorerUrl = `${activeArcChain.blockExplorers.default.url}/tx/${hash}`;
  const executionTimeMs = Date.now() - startTime;

  return {
    hash,
    txHash: hash,
    receipt,
    explorerUrl,
    blockNumber: Number(receipt.blockNumber),
    from: fromAddress,
    to: targetAddress,
    recipientAddress: targetAddress,
    amount: cleanAmount,
    hasMemo: Boolean(cleanMemo),
    memoText: cleanMemo || null,
    executionTimeMs,
  };
}

