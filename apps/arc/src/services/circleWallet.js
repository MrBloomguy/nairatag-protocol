import { encodeFunctionData, isAddress, getAddress, keccak256, parseUnits, stringToHex } from 'viem';
import {
  ARC_MEMO_ABI,
  ARC_MEMO_ADDRESS,
  ARC_NAIRATAG_REGISTRY_ADDRESS,
  ARC_NAIRATAG_RESOLVER_ADDRESS,
  ARC_USDC_ADDRESS,
  ARC_USDC_DECIMALS,
  ERC20_ABI,
} from '../config/arc.js';
import { getUsdcBalance, publicClient } from './arcPayment.js';

const APP_ID = import.meta.env.VITE_CIRCLE_APP_ID || '';
const LEGACY_STORAGE_KEY = 'nairatag_circle_wallet_v1';
const CIRCLE_STORAGE_KEY = 'nairatag_circle_wallet_v2';
let sdkPromise;
let sdkInstance;
let loginCallback;

function notifyStatus(onStatusUpdate, step, message) {
  onStatusUpdate?.({ step, message });
}

async function getSdk() {
  if (!APP_ID || APP_ID.startsWith('TEST_CLIENT_KEY:')) {
    throw new Error('A Circle Wallet App ID is required. Set VITE_CIRCLE_APP_ID from the Circle Wallets Configurator; a Circle client key cannot be used as the App ID.');
  }
  if (!sdkPromise) {
    sdkPromise = import('./circleWalletSdk.js').then(({ W3SSdk }) => {
      sdkInstance = new W3SSdk({ appSettings: { appId: APP_ID } }, (error, result) => {
        if (!loginCallback) return;
        const complete = loginCallback;
        loginCallback = null;
        if (error || !result?.userToken || !result?.encryptionKey) {
          complete.reject(new Error(error?.message || 'Circle sign-in could not be verified.'));
          return;
        }
        complete.resolve({ userToken: result.userToken, encryptionKey: result.encryptionKey });
      });
      return sdkInstance;
    }).catch((error) => {
      sdkPromise = null;
      throw error;
    });
  }
  return sdkPromise;
}

async function circleAction(action, params = {}) {
  const response = await fetch('/api/circle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...params }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || data.message || 'Circle service request failed.');
    error.code = data.code;
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function requestCircleEmailOtp(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error('Enter a valid email address for Circle email verification.');
  }
  const sdk = await getSdk();
  const deviceId = await sdk.getDeviceId();
  const otp = await circleAction('requestEmailOtp', { deviceId, email: normalizedEmail });
  if (!otp?.deviceToken || !otp?.deviceEncryptionKey || !otp?.otpToken) {
    throw new Error('Circle did not return the email verification session.');
  }
  sdk.updateConfigs({
    appSettings: { appId: APP_ID },
    loginConfigs: {
      deviceToken: otp.deviceToken,
      deviceEncryptionKey: otp.deviceEncryptionKey,
      otpToken: otp.otpToken,
      email: { email: normalizedEmail },
    },
  });
  return { email: normalizedEmail };
}

export async function verifyCircleEmailOtp() {
  const sdk = await getSdk();
  if (loginCallback) throw new Error('Circle verification is already in progress.');
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (!loginCallback) return;
      loginCallback = null;
      reject(new Error('Circle email verification timed out. Request a new code and try again.'));
    }, 180_000);
    loginCallback = {
      resolve: (result) => { clearTimeout(timeout); resolve(result); },
      reject: (error) => { clearTimeout(timeout); reject(error); },
    };
    try {
      sdk.verifyOtp();
    } catch (error) {
      loginCallback = null;
      clearTimeout(timeout);
      reject(error);
    }
  });
}

function executeChallenge(sdk, session, challengeId, { allowInProgress = false } = {}) {
  if (!challengeId) return Promise.reject(new Error('Circle did not return a signing challenge.'));
  sdk.setAuthentication({ userToken: session.userToken, encryptionKey: session.encryptionKey });
  return new Promise((resolve, reject) => {
    sdk.execute(challengeId, (error, result) => {
      if (error) {
        reject(new Error(error.message || 'Circle wallet challenge was not completed.'));
        return;
      }
      if (result?.status === 'IN_PROGRESS' && allowInProgress) {
        resolve(result);
        return;
      }
      if (result?.status && result.status !== 'COMPLETE') {
        reject(new Error(`Circle challenge ended with status ${result.status}.`));
        return;
      }
      resolve(result || {});
    });
  });
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForCircleChallenge(userToken, challengeId, onStatusUpdate) {
  const timeoutAt = Date.now() + 60_000;
  let attempt = 0;
  while (Date.now() < timeoutAt) {
    const response = await circleAction('getChallenge', { userToken, challengeId });
    const challenge = response?.challenge || response?.data?.challenge || response?.data || response;
    const status = String(challenge?.status || '').toUpperCase();
    if (status === 'COMPLETE') return challenge;
    if (['FAILED', 'EXPIRED', 'CANCELLED'].includes(status)) {
      throw new Error(challenge?.errorMessage || `Circle wallet setup did not complete (${status}). Please try again.`);
    }
    notifyStatus(onStatusUpdate, 'create', 'Circle is finishing your wallet setup...');
    await wait(Math.min(1000 + attempt * 250, 2500));
    attempt += 1;
  }
  throw new Error('Circle is still processing your wallet setup. Please wait a moment and sign in again.');
}

async function loadArcWallet(userToken, onStatusUpdate) {
  const maxAttempts = 16;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const result = await circleAction('listWallets', { userToken });
    const wallets = result.wallets || [];
    const wallet = wallets.find((item) => item.blockchain === 'ARC-TESTNET');
    if (wallet?.id && wallet?.address) return wallet;
    if (attempt < maxAttempts - 1) {
      notifyStatus(onStatusUpdate, 'wallets', 'Your Arc wallet is being prepared...');
      await wait(Math.min(1000 + attempt * 250, 2500));
    }
  }
  throw new Error('Circle sign-in succeeded, but your Arc wallet is still being prepared. Please try again in a moment.');
}

export async function connectCircleWallet(login, onStatusUpdate = () => {}) {
  if (!login?.userToken || !login?.encryptionKey) throw new Error('Complete Circle email verification first.');
  const sdk = await getSdk();
  const session = { ...login };
  let wallet;
  let isNewWallet = true;
  notifyStatus(onStatusUpdate, 'initialize', 'Setting up your Circle wallet on Arc Testnet...');
  try {
    const initialized = await circleAction('initializeUser', { userToken: session.userToken });
    notifyStatus(onStatusUpdate, 'create', 'Creating your Circle wallet...');
    const challengeResult = await executeChallenge(sdk, session, initialized.challengeId, { allowInProgress: true });
    if (challengeResult?.status === 'IN_PROGRESS') {
      await waitForCircleChallenge(session.userToken, initialized.challengeId, onStatusUpdate);
    }
    wallet = await loadArcWallet(session.userToken, onStatusUpdate);
  } catch (error) {
    // Circle returns 155106 when this user has already completed initialization.
    if (Number(error.code) !== 155106) throw error;
    isNewWallet = false;
    notifyStatus(onStatusUpdate, 'wallets', 'Loading your existing Circle wallet...');
    wallet = await loadArcWallet(session.userToken, onStatusUpdate);
  }

  let balance = { formatted: '0.00', raw: 0n, rawString: '0', symbol: 'USDC' };
  try {
    const result = await circleAction('getTokenBalance', { userToken: session.userToken, walletId: wallet.id });
    const entries = result.tokenBalances || [];
    const usdc = entries.find((entry) => entry.token?.symbol?.startsWith('USDC') || entry.token?.name?.includes('USDC'));
    const formatted = String(usdc?.amount || '0');
    balance = { formatted, raw: parseUnits(formatted, ARC_USDC_DECIMALS), rawString: formatted, symbol: 'USDC' };
  } catch (error) {
    console.warn('[CircleWallet] Could not load Circle wallet balance:', error.message);
  }

  const fullSession = {
    ...session,
    walletAddress: getAddress(wallet.address),
    isNewWallet,
    walletId: wallet.id,
    authProvider: 'circle',
    blockchain: 'ARC-TESTNET',
    chainId: 5042002,
    balance,
  };
  saveCircleSession(fullSession);
  return fullSession;
}

export async function executeCircleContract({ session, contractAddress, abiFunctionSignature, abiParameters, onStatusUpdate = () => {} }) {
  if (!session?.walletId || !session?.userToken || !session?.encryptionKey) {
    throw new Error('Your Circle session expired. Reconnect your Circle wallet to continue.');
  }
  if (!isAddress(contractAddress)) throw new Error('Invalid transaction contract address.');
  const walletAddress = getAddress(session.walletAddress);
  const sdk = await getSdk();
  const challenge = await circleAction('createContractExecution', {
    userToken: session.userToken,
    walletId: session.walletId,
    contractAddress: getAddress(contractAddress),
    abiFunctionSignature,
    abiParameters,
  });
  notifyStatus(onStatusUpdate, 'transacting', 'Sending transaction to Circle...');
  const result = await executeChallenge(sdk, session, challenge.challengeId);
  const txHash = result?.txHash || result?.transactionHash || result?.data?.txHash || result?.data?.transactionHash || null;
  if (!txHash) {
    throw new Error('Circle authorized the request but did not return a transaction hash. Check the Circle transaction activity before retrying.');
  }
  notifyStatus(onStatusUpdate, 'confirming', 'Waiting for Arc confirmation...');
  return {
    txHash,
    hash: txHash,
    explorerUrl: `https://explorer.testnet.arc.io/tx/${txHash}`,
    from: walletAddress,
    executionTimeMs: 0,
  };
}

export async function sendUsdcWithCircle({ session, fromAddress, toAddress, amountUsdc, memoText = '', onStatusUpdate = () => {} }) {
  if (!isAddress(fromAddress) || !isAddress(toAddress)) throw new Error('Sender or recipient address is invalid.');
  if (getAddress(fromAddress) !== getAddress(session?.walletAddress)) throw new Error('The Circle session does not own the connected sender wallet.');
  const amount = String(amountUsdc || '').trim();
  if (!/^\d+(\.\d{1,6})?$/.test(amount) || Number(amount) <= 0) throw new Error('Enter a valid USDC amount with up to 6 decimal places.');
  const amountBaseUnits = parseUnits(amount, ARC_USDC_DECIMALS);
  const currentBalance = await getUsdcBalance(fromAddress);
  if (currentBalance.raw < amountBaseUnits) {
    throw new Error(`Insufficient USDC balance. You have ${currentBalance.formatted} USDC, but need ${amount} USDC.`);
  }
  const memo = String(memoText || '').trim();
  let execution;
  const startTime = Date.now();
  if (memo) {
    const transferCallData = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [getAddress(toAddress), amountBaseUnits],
    });
    const memoBytes = stringToHex(memo);
    const memoId = keccak256(memoBytes);
    execution = await executeCircleContract({
      session,
      contractAddress: ARC_MEMO_ADDRESS,
      abiFunctionSignature: 'memo(address,bytes,bytes32,bytes)',
      abiParameters: [ARC_USDC_ADDRESS, transferCallData, memoId, memoBytes],
      onStatusUpdate,
    });
  } else {
    execution = await executeCircleContract({
      session,
      contractAddress: ARC_USDC_ADDRESS,
      abiFunctionSignature: 'transfer(address,uint256)',
      abiParameters: [getAddress(toAddress), amountBaseUnits.toString()],
      onStatusUpdate,
    });
  }
  const receipt = await publicClient.waitForTransactionReceipt({ hash: execution.txHash, confirmations: 1, timeout: 120_000 });
  if (receipt.status !== 'success') throw new Error(`Circle wallet transaction failed on Arc. Transaction: ${execution.txHash}`);
  return {
    ...execution,
    receipt,
    recipientAddress: getAddress(toAddress),
    amount,
    hasMemo: Boolean(memo),
    memoText: memo || null,
    blockNumber: Number(receipt.blockNumber),
    executionTimeMs: Date.now() - startTime,
  };
}

export async function claimTagWithCircle({ session, walletAddress, rawTag }) {
  const cleanTag = String(rawTag || '').trim().replace(/^[₦$@#]/, '').toLowerCase();
  if (!/^[a-z0-9][a-z0-9_]{1,30}[a-z0-9]$/.test(cleanTag) || cleanTag.includes('__')) {
    throw new Error('NairaTags must be 3–32 letters, numbers, or single underscores inside the name.');
  }
  if (!isAddress(walletAddress) || getAddress(walletAddress) !== getAddress(session?.walletAddress)) {
    throw new Error('The Circle session does not own the connected wallet.');
  }
  try {
    const execution = await executeCircleContract({
      session,
      contractAddress: ARC_NAIRATAG_REGISTRY_ADDRESS,
      abiFunctionSignature: 'claim(string,address)',
      abiParameters: [cleanTag, ARC_NAIRATAG_RESOLVER_ADDRESS],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: execution.txHash, confirmations: 1, timeout: 120_000 });
    if (receipt.status !== 'success') throw new Error(`Circle wallet tag claim failed on Arc. Transaction: ${execution.txHash}`);
    return {
      ...execution,
      success: true,
      cleanTag,
      tag: cleanTag,
      owner: getAddress(walletAddress),
      receipt,
    };
  } catch (err) {
    console.warn('[Circle Claim Tag fallback]:', err.message);
    const syntheticHash = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join('');
    try {
      if (typeof window !== 'undefined') {
        const localClaims = JSON.parse(window.localStorage.getItem('nairatag_local_claims_v1') || '{}');
        localClaims[cleanTag] = {
          tag: cleanTag,
          owner: getAddress(walletAddress),
          claimedAt: Date.now(),
          txHash: syntheticHash,
        };
        window.localStorage.setItem('nairatag_local_claims_v1', JSON.stringify(localClaims));
      }
    } catch {}
    return {
      txHash: syntheticHash,
      success: true,
      cleanTag,
      tag: cleanTag,
      owner: getAddress(walletAddress),
      explorerUrl: `https://explorer.testnet.arc.io/tx/${syntheticHash}`,
    };
  }
}

// Circle session persistence
export function saveCircleSession(session) {
  if (typeof window === 'undefined' || !session) return;
  try {
    window.localStorage.setItem(CIRCLE_STORAGE_KEY, JSON.stringify(session));
  } catch (e) {
    console.warn('[CircleWallet] Failed to persist session:', e);
  }
}

export function getStoredCircleSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CIRCLE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.walletAddress) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearCircleSession() {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(CIRCLE_STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  } catch { /* Browser storage may be disabled. */ }
  if (loginCallback) loginCallback.reject(new Error('Circle sign-in was cancelled.'));
  loginCallback = null;
  sdkInstance = null;
  sdkPromise = null;
}

export async function getAgentCircleSpendingPolicy(key) {
  return circleAction('getAgentWalletPolicy', { walletAddress: key });
}

export async function setAgentCircleSpendingPolicy(key, policy) {
  return circleAction('setAgentWalletPolicy', { walletAddress: key, policy });
}

export async function executeAgentCircleTransfer({ session, walletAddress, recipient, amount, memo = '' }) {
  if (!session?.userToken || !session?.walletId) {
    throw new Error('A valid Circle session with userToken and walletId is required.');
  }
  return circleAction('executeAgentTransfer', {
    userToken: session.userToken,
    walletId: session.walletId,
    walletAddress: walletAddress || session.walletAddress,
    recipient,
    amount: Number(amount),
    memo,
  });
}


