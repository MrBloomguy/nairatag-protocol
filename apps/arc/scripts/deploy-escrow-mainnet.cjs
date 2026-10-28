/**
 * @file deploy-escrow-mainnet.cjs
 * @description Deploys NairaTagBountyEscrow to Arc Mainnet (Chain ID 5042).
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

const ARC_MAINNET_REGISTRY_ADDRESS = '0xb3a2d06ead0a889485a844a63be309c4df4b17b3';

async function main() {
  console.log('====================================================');
  console.log('   NAIRATAG BOUNTY ESCROW — ARC MAINNET DEPLOYMENT   ');
  console.log('   Target: Arc Mainnet (Chain ID 5042)             ');
  console.log('====================================================\n');

  const envPath = path.resolve(__dirname, '../../nairadots/.env');
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

  if (initialBalance < 10000000000000000n) { // 0.01 USDC
    throw new Error('Insufficient balance to deploy. Needs at least 0.01 USDC.');
  }

  const artifactPath = path.resolve(__dirname, '../../../contracts/out/NairaTagBountyEscrow.sol/NairaTagBountyEscrow.json');
  const escrowArtifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  console.log('\nBroadcasting NairaTagBountyEscrow deployment transaction...');
  const deployData = encodeDeployData({
    abi: escrowArtifact.abi,
    bytecode: escrowArtifact.bytecode.object,
    args: [ARC_MAINNET_REGISTRY_ADDRESS]
  });

  const txHash = await walletClient.sendTransaction({
    data: deployData
  });
  console.log('NairaTagBountyEscrow Tx Hash:', txHash);
  console.log('Waiting for confirmation on Arc Mainnet...');

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  const escrowAddress = receipt.contractAddress;
  console.log('\n>>> NairaTagBountyEscrow DEPLOYED AT:', escrowAddress);
  console.log('Block Number:', receipt.blockNumber.toString());
  console.log('Gas Used:', receipt.gasUsed.toString());
  console.log('Explorer URL:', `https://explorer.arc.io/address/${escrowAddress}`);

  // Save deployment info
  const deploymentInfoPath = path.resolve(__dirname, '../contracts/arc-mainnet-deployment.json');
  let currentDeployment = {};
  if (fs.existsSync(deploymentInfoPath)) {
    try {
      currentDeployment = JSON.parse(fs.readFileSync(deploymentInfoPath, 'utf8'));
    } catch (e) {}
  }

  currentDeployment.contracts = currentDeployment.contracts || {};
  currentDeployment.contracts.NairaTagBountyEscrow = {
    address: escrowAddress,
    txHash: txHash,
    block: receipt.blockNumber.toString(),
    deployedAt: new Date().toISOString()
  };

  fs.writeFileSync(deploymentInfoPath, JSON.stringify(currentDeployment, null, 2));
  console.log('Updated', deploymentInfoPath);
}

main().catch(err => {
  console.error('Deployment error:', err);
  process.exit(1);
});
