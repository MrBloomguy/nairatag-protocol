import { keccak256, stringToHex } from 'viem';
import { getEthereumProvider } from './arcPayment.js';

const API = import.meta.env.VITE_ARC_ADMIN_API || '/api/arc-admin';

async function sign(walletAddress, action, payload) {
  const provider = getEthereumProvider();
  if (!provider) throw new Error('Connect an authorized admin wallet to manage platform operations.');
  const accounts = await provider.request({ method: 'eth_accounts' });
  if (!Array.isArray(accounts) || !accounts.some((account) => account.toLowerCase() === walletAddress.toLowerCase())) throw new Error('Reconnect the authorized admin wallet and try again.');
  const timestamp = Date.now();
  const payloadHash = keccak256(stringToHex(JSON.stringify(payload)));
  const message = ['NairaTag Platform Agent Admin', `Action: ${action}`, `Wallet: ${walletAddress.toLowerCase()}`, `Timestamp: ${timestamp}`, `Payload hash: ${payloadHash}`].join('\n');
  const signature = await provider.request({ method: 'personal_sign', params: [message, walletAddress] });
  return { walletAddress, timestamp, signature };
}

async function read(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(data.error || `Admin service returned ${response.status}.`);
  return data;
}

export async function getArcAdminDashboard(walletAddress) {
  const auth = await sign(walletAddress, 'dashboard', { action: 'dashboard' });
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://arc.nairatag.ng';
  const url = new URL(API, base);
  Object.entries(auth).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  return (await read(await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' }))).dashboard;
}

export async function submitArcAdminAction(walletAddress, action, fields = {}) {
  const payload = { action, ...fields };
  const auth = await sign(walletAddress, action, payload);
  return (await read(await fetch(API, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ ...payload, ...auth }),
  }))).result;
}
