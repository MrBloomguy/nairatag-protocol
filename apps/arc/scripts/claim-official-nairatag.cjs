/**
 * @file claim-official-nairatag.cjs
 * @description Claims and sets up the official in-house platform agent "nairatag" (₦NAIRATAG) on Arc Mainnet.
 */

const fs = require('fs');
const path = require('path');
const { createWalletClient, createPublicClient, http, defineChain, keccak256, toHex, stringToHex } = require('viem');
const { mnemonicToAccount } = require('viem/accounts');

const arcMainnet = defineChain({
  id: 5042,
  name: 'Arc',
  nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.mainnet.arc.io'] },
    public: { http: ['https://rpc.mainnet.arc.io'] }
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: 'https://explorer.arc.io' }
  }
});

const ARC_MAINNET_REGISTRY_ADDRESS = '0xb3a2d06ead0a889485a844a63be309c4df4b17b3';
const ARC_MAINNET_RESOLVER_ADDRESS = '0xf46dc708be8391090b83fb9a5d54c4a568bd64f3';

const REGISTRY_ABI = [
  {
    type: 'function',
    name: 'claim',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tag', type: 'string' },
      { name: 'targetResolver', type: 'address' }
    ],
    outputs: [{ name: 'node', type: 'bytes32' }]
  },
  {
    type: 'function',
    name: 'owner',
    stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }]
  }
];

const RESOLVER_ABI = [
  {
    type: 'function',
    name: 'setAddr',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'a', type: 'address' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'setText',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'key', type: 'string' },
      { name: 'value', type: 'string' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'addr',
    stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }]
  }
];

async function main() {
  console.log('====================================================');
  console.log('   CLAIM OFFICIAL IN-HOUSE PLATFORM AGENT ₦NAIRATAG   ');
  console.log('   Target: Arc Mainnet (Chain ID 5042)             ');
  console.log('====================================================\n');

  const envPath = path.resolve(__dirname, '../../nairadots/.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/PASSPHRASE\s*-\s*([a-z\s]+)/);
  if (!match) throw new Error('Could not find mnemonic passphrase in .env');

  const phrase = match[1].trim();
  const account = mnemonicToAccount(phrase);
  console.log('Official Protocol Deployer Wallet:', account.address);

  const publicClient = createPublicClient({ chain: arcMainnet, transport: http() });
  const walletClient = createWalletClient({ account, chain: arcMainnet, transport: http() });

  const initialBalance = await publicClient.getBalance({ address: account.address });
  console.log('Current Native Balance:', (Number(initialBalance) / 1e18).toFixed(6), 'USDC');

  const cleanTag = 'nairatag';
  const node = keccak256(toHex(cleanTag));
  console.log('Node hash for ₦nairatag:', node);

  // Check if already claimed on-chain
  const currentOwner = await publicClient.readContract({
    address: ARC_MAINNET_REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: 'owner',
    args: [node]
  });

  if (currentOwner !== '0x0000000000000000000000000000000000000000') {
    console.log('Tag ₦nairatag is already claimed by:', currentOwner);
  } else {
    console.log('\n[1/3] Claiming ₦nairatag on NairaTagRegistry...');
    const claimTx = await walletClient.writeContract({
      address: ARC_MAINNET_REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: 'claim',
      args: [cleanTag, ARC_MAINNET_RESOLVER_ADDRESS]
    });
    console.log('Claim Tx Hash:', claimTx);
    console.log('Waiting for confirmation on Arc Mainnet...');
    const claimReceipt = await publicClient.waitForTransactionReceipt({ hash: claimTx });
    console.log('Confirmed in block:', claimReceipt.blockNumber.toString());
  }

  // Set EVM address on Resolver
  console.log('\n[2/3] Setting EVM address on NairaTagResolver...');
  const addrTx = await walletClient.writeContract({
    address: ARC_MAINNET_RESOLVER_ADDRESS,
    abi: RESOLVER_ABI,
    functionName: 'setAddr',
    args: [node, account.address]
  });
  console.log('Resolver setAddr Tx Hash:', addrTx);
  const addrReceipt = await publicClient.waitForTransactionReceipt({ hash: addrTx });
  console.log('Confirmed in block:', addrReceipt.blockNumber.toString());

  // Set Metadata on Resolver
  console.log('\n[3/3] Setting Agent Metadata on NairaTagResolver...');
  const textTx = await walletClient.writeContract({
    address: ARC_MAINNET_RESOLVER_ADDRESS,
    abi: RESOLVER_ABI,
    functionName: 'setText',
    args: [node, 'agent.role', 'Official Sovereign Platform Agent for NairaTag on Arc']
  });
  console.log('Resolver setText Tx Hash:', textTx);
  await publicClient.waitForTransactionReceipt({ hash: textTx });

  // Verification
  console.log('\n=== VERIFICATION ===');
  const verifiedOwner = await publicClient.readContract({
    address: ARC_MAINNET_REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: 'owner',
    args: [node]
  });
  const resolvedAddr = await publicClient.readContract({
    address: ARC_MAINNET_RESOLVER_ADDRESS,
    abi: RESOLVER_ABI,
    functionName: 'addr',
    args: [node]
  });

  console.log('₦NAIRATAG Registry Owner:', verifiedOwner);
  console.log('₦NAIRATAG Resolved Address:', resolvedAddr);
  console.log('ArcScan Explorer:', `https://explorer.arc.io/address/${resolvedAddr}`);
  console.log('\nSUCCESS! Official in-house platform agent ₦nairatag is officially active on Arc Mainnet!');
}

main().catch(err => {
  console.error('Execution error:', err);
  process.exit(1);
});
