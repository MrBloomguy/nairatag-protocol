/**
 * @file scripts/deploy-bridge.js
 * @description Deploys Hyperlane Mailbox and Warp Route contracts on Chain 901 and Chain 902.
 * Seeds initial AMM pool on Chain 901 (wcNGN / ASAKE) so swap tests succeed.
 */

const fs = require('fs');
const path = require('path');
const {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  parseEther
} = require('../packages/viem/node_modules/viem');
const { privateKeyToAccount } = require('../packages/viem/node_modules/viem/accounts');

const addresses = require('../config/v1-addresses.json');

const DEPLOYER_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const deployer = privateKeyToAccount(DEPLOYER_KEY);

const client901 = createPublicClient({ transport: http('http://127.0.0.1:9545') });
const wallet901 = createWalletClient({ account: deployer, transport: http('http://127.0.0.1:9545') });

const client902 = createPublicClient({ transport: http('http://127.0.0.1:9546') });
const wallet902 = createWalletClient({ account: deployer, transport: http('http://127.0.0.1:9546') });

function loadArtifact(name) {
  const file = path.join(__dirname, `../contracts/out/${name}.sol/${name}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

async function deployContract(client, wallet, artifact, args = []) {
  const hash = await wallet.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode.object,
    args
  });
  const receipt = await client.waitForTransactionReceipt({ hash });
  return receipt.contractAddress;
}

async function main() {
  console.log('================================================================');
  console.log(' Deploying Hyperlane & Warp Route Infrastructure (Chains 901 & 902)');
  console.log('================================================================\n');

  const mailboxArtifact = loadArtifact('HyperlaneMailbox');
  const collateralArtifact = loadArtifact('HypERC20Collateral');
  const syntheticArtifact = loadArtifact('HypERC20Synthetic');
  const mockCNGNArtifact = loadArtifact('MockCNGN');

  // 1. Deploy on Chain 901 (NairaTag)
  console.log('1. Deploying Mailbox on Chain 901...');
  const mailbox901 = await deployContract(client901, wallet901, mailboxArtifact, [901]);
  console.log(`   ✓ Mailbox 901: ${mailbox901}`);

  console.log('2. Deploying HypERC20Synthetic (wcNGN) on Chain 901...');
  const wcNGN901 = await deployContract(client901, wallet901, syntheticArtifact, [mailbox901]);
  console.log(`   ✓ wcNGN 901: ${wcNGN901}`);

  // 2. Deploy on Chain 902 (External Simulated)
  console.log('\n3. Deploying cNGN on Chain 902 (External Collateral Token)...');
  const cNGN902 = await deployContract(client902, wallet902, mockCNGNArtifact, []);
  console.log(`   ✓ cNGN 902: ${cNGN902}`);

  console.log('4. Deploying Mailbox on Chain 902...');
  const mailbox902 = await deployContract(client902, wallet902, mailboxArtifact, [902]);
  console.log(`   ✓ Mailbox 902: ${mailbox902}`);

  console.log('5. Deploying HypERC20Collateral on Chain 902...');
  const wcNGN902 = await deployContract(client902, wallet902, collateralArtifact, [cNGN902, mailbox902]);
  console.log(`   ✓ HypERC20Collateral 902: ${wcNGN902}`);

  // 3. Link Remote Routers
  console.log('\n6. Linking Cross-Chain Routers...');
  const wcNGN901Bytes32 = `0x${'0'.repeat(24)}${wcNGN901.slice(2).toLowerCase()}`;
  const wcNGN902Bytes32 = `0x${'0'.repeat(24)}${wcNGN902.slice(2).toLowerCase()}`;

  // Link 902 -> 901
  const link902Tx = await wallet902.writeContract({
    address: wcNGN902,
    abi: collateralArtifact.abi,
    functionName: 'enrollRemoteRouter',
    args: [901, wcNGN901Bytes32]
  });
  await client902.waitForTransactionReceipt({ hash: link902Tx });
  console.log(`   ✓ Enrolled Chain 901 router on Chain 902 (Tx: ${link902Tx})`);

  // Link 901 -> 902
  const link901Tx = await wallet901.writeContract({
    address: wcNGN901,
    abi: syntheticArtifact.abi,
    functionName: 'enrollRemoteRouter',
    args: [902, wcNGN902Bytes32]
  });
  await client901.waitForTransactionReceipt({ hash: link901Tx });
  console.log(`   ✓ Enrolled Chain 902 router on Chain 901 (Tx: ${link901Tx})`);

  // 4. Seed Initial Liquidity for wcNGN / ASAKE Pool on Chain 901 AMM
  console.log('\n7. Seeding AMM Pool wcNGN / ASAKE on Chain 901...');
  const asakeAddr = addresses.tokens.ASAKE.address;
  const routerAddr = addresses.contracts.Router;
  const seedAmount = parseEther('100000'); // 100,000 tokens

  // Mint wcNGN to deployer for initial liquidity
  const mintTx = await wallet901.writeContract({
    address: wcNGN901,
    abi: syntheticArtifact.abi,
    functionName: 'mint',
    args: [deployer.address, seedAmount * 2n]
  });
  await client901.waitForTransactionReceipt({ hash: mintTx });

  // Approve router for wcNGN and ASAKE
  const erc20Abi = parseAbi([
    'function approve(address spender, uint256 amount) returns (bool)',
    'function balanceOf(address account) view returns (uint256)'
  ]);

  const app1 = await wallet901.writeContract({
    address: wcNGN901,
    abi: erc20Abi,
    functionName: 'approve',
    args: [routerAddr, 2n ** 256n - 1n]
  });
  await client901.waitForTransactionReceipt({ hash: app1 });

  const app2 = await wallet901.writeContract({
    address: asakeAddr,
    abi: erc20Abi,
    functionName: 'approve',
    args: [routerAddr, 2n ** 256n - 1n]
  });
  await client901.waitForTransactionReceipt({ hash: app2 });

  const routerAbi = parseAbi([
    'function addLiquidity(address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) returns (uint256 amountA, uint256 amountB, uint256 liquidity)'
  ]);

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const addLiqTx = await wallet901.writeContract({
    address: routerAddr,
    abi: routerAbi,
    functionName: 'addLiquidity',
    args: [wcNGN901, asakeAddr, seedAmount, seedAmount, 0n, 0n, deployer.address, deadline]
  });
  await client901.waitForTransactionReceipt({ hash: addLiqTx });
  console.log(`   ✓ Initial Liquidity Seeded (Tx: ${addLiqTx})`);

  // 5. Save deployed addresses to JSON files
  console.log('\n8. Saving deployed addresses...');
  const deploymentsDir = path.join(__dirname, '../bridge/hyperlane/deployments');
  fs.mkdirSync(deploymentsDir, { recursive: true });

  const addressesJson = {
    nairatag901: {
      mailbox: mailbox901
    },
    chain902: {
      mailbox: mailbox902
    }
  };

  const warpAddressesJson = {
    chain902: {
      router: wcNGN902,
      token: cNGN902
    },
    nairatag901: {
      router: wcNGN901
    }
  };

  fs.writeFileSync(
    path.join(deploymentsDir, 'addresses.json'),
    JSON.stringify(addressesJson, null, 2)
  );
  fs.writeFileSync(
    path.join(deploymentsDir, 'warp-addresses.json'),
    JSON.stringify(warpAddressesJson, null, 2)
  );

  console.log('   ✓ Saved bridge/hyperlane/deployments/addresses.json');
  console.log('   ✓ Saved bridge/hyperlane/deployments/warp-addresses.json');
  console.log('\n================================================================');
  console.log(' Hyperlane Bridge Infrastructure Ready!');
  console.log('================================================================');
}

main().catch(err => {
  console.error('Deployment error:', err);
  process.exit(1);
});
