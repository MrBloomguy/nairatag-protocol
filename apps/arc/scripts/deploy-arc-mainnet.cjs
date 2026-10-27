/**
 * @file deploy-arc-mainnet.cjs
 * @description Deploys NairaTagRegistry and NairaTagResolver to Arc Mainnet (Chain ID 5042).
 */

const fs = require('fs');
const path = require('path');
const { createWalletClient, createPublicClient, http, defineChain, encodeDeployData } = require('viem');
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

async function main() {
  console.log('====================================================');
  console.log('   NAIRATAG PROTOCOL — ARC MAINNET DEPLOYMENT       ');
  console.log('   Target: Arc Mainnet (Chain ID 5042)             ');
  console.log('====================================================\n');

  // Load mnemonic from apps/nairadots/.env
  const envPath = 'c:/Users/olusegun/.gemini/antigravity-ide/scratch/nairatag-network/apps/nairadots/.env';
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/PASSPHRASE\s*-\s*([a-z\s]+)/);
  if (!match) throw new Error('Could not find mnemonic passphrase in .env');

  const phrase = match[1].trim();
  const account = mnemonicToAccount(phrase);
  console.log('Deployer Address:', account.address);

  const publicClient = createPublicClient({ chain: arcMainnet, transport: http() });
  const walletClient = createWalletClient({ account, chain: arcMainnet, transport: http() });

  const initialBalance = await publicClient.getBalance({ address: account.address });
  console.log('Current Native Balance:', (Number(initialBalance) / 1e18).toFixed(6), 'USDC');

  if (initialBalance < 50000000000000000n) { // 0.05 USDC
    throw new Error('Insufficient balance to deploy contracts. Needs at least 0.05 USDC.');
  }

  // Load compiled artifacts
  const regArtifact = require('../contracts/out/NairaTagRegistry.sol/NairaTagRegistry.json');
  const resArtifact = require('../contracts/out/NairaTagResolver.sol/NairaTagResolver.json');

  // -----------------------------------------------------------------
  // 1. Deploy NairaTagRegistry
  // -----------------------------------------------------------------
  console.log('\n[1/2] Broadcasting NairaTagRegistry deployment transaction...');
  const regDeployData = encodeDeployData({
    abi: regArtifact.abi,
    bytecode: regArtifact.bytecode.object,
    args: []
  });

  const regTxHash = await walletClient.sendTransaction({
    data: regDeployData
  });
  console.log('NairaTagRegistry Tx Hash:', regTxHash);
  console.log('Waiting for confirmation on Arc Mainnet...');

  const regReceipt = await publicClient.waitForTransactionReceipt({ hash: regTxHash });
  const registryAddress = regReceipt.contractAddress;
  console.log('>>> NairaTagRegistry DEPLOYED AT:', registryAddress);
  console.log('Block Number:', regReceipt.blockNumber.toString());
  console.log('Gas Used:', regReceipt.gasUsed.toString());

  // -----------------------------------------------------------------
  // 2. Deploy NairaTagResolver (with registryAddress as constructor arg)
  // -----------------------------------------------------------------
  console.log('\n[2/2] Broadcasting NairaTagResolver deployment transaction...');
  const resDeployData = encodeDeployData({
    abi: resArtifact.abi,
    bytecode: resArtifact.bytecode.object,
    args: [registryAddress]
  });

  const resTxHash = await walletClient.sendTransaction({
    data: resDeployData
  });
  console.log('NairaTagResolver Tx Hash:', resTxHash);
  console.log('Waiting for confirmation on Arc Mainnet...');

  const resReceipt = await publicClient.waitForTransactionReceipt({ hash: resTxHash });
  const resolverAddress = resReceipt.contractAddress;
  console.log('>>> NairaTagResolver DEPLOYED AT:', resolverAddress);
  console.log('Block Number:', resReceipt.blockNumber.toString());
  console.log('Gas Used:', resReceipt.gasUsed.toString());

  // -----------------------------------------------------------------
  // 3. Verification & Summary
  // -----------------------------------------------------------------
  const finalBalance = await publicClient.getBalance({ address: account.address });
  const totalCost = initialBalance - finalBalance;
  console.log('\n====================================================');
  console.log('   DEPLOYMENT SUCCESSFUL ON ARC MAINNET             ');
  console.log('====================================================');
  console.log('NairaTagRegistry :', registryAddress);
  console.log('NairaTagResolver :', resolverAddress);
  console.log('Total Gas Cost   :', (Number(totalCost) / 1e18).toFixed(6), 'USDC');
  console.log('Remaining Balance:', (Number(finalBalance) / 1e18).toFixed(6), 'USDC');
  console.log('Explorer Links   :');
  console.log(' - https://explorer.arc.io/address/' + registryAddress);
  console.log(' - https://explorer.arc.io/address/' + resolverAddress);

  // Save deployment receipt to json
  const deploymentRecord = {
    network: 'arc-mainnet',
    chainId: 5042,
    deployedAt: new Date().toISOString(),
    deployer: account.address,
    contracts: {
      NairaTagRegistry: {
        address: registryAddress,
        txHash: regTxHash,
        block: regReceipt.blockNumber.toString()
      },
      NairaTagResolver: {
        address: resolverAddress,
        txHash: resTxHash,
        block: resReceipt.blockNumber.toString()
      }
    }
  };

  fs.writeFileSync('contracts/arc-mainnet-deployment.json', JSON.stringify(deploymentRecord, null, 2), 'utf8');
  console.log('\nSaved deployment record to contracts/arc-mainnet-deployment.json');
}

main().catch((err) => {
  console.error('\nDeployment failed:', err);
  process.exit(1);
});
