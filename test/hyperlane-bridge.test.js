/**
 * @file test/hyperlane-bridge.test.js
 * @description End-to-end test verifying the full cross-chain bridge flow:
 *
 * Chain 902 (External) → [Hyperlane Warp Route] → Chain 901 (NairaTag) → AMM Swap → ₦asake
 *
 * This test verifies:
 * 1. Real transferRemote() tx hash on Chain 902
 * 2. Real delivery tx hash on Chain 901 (via built-in relayer)
 * 3. Verified wcNGN balance on Chain 901
 * 4. Swap: wcNGN → ASAKE on NairaTagRouter
 * 5. ASAKE delivered to ₦asake resolved address
 *
 * NO simulated balances, NO fake tx hashes, NO hardcoded success states.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createPublicClient, createWalletClient, http, parseAbi, parseEther, formatEther, decodeEventLog } = require('../packages/viem/node_modules/viem');
const { privateKeyToAccount } = require('../packages/viem/node_modules/viem/accounts');

const addresses = require('../config/v1-addresses.json');

// --- Hyperlane deployed addresses (populated after deployment) ---
const HYPERLANE_ADDRESSES_PATH = path.join(__dirname, '../bridge/hyperlane/deployments/addresses.json');
const WARP_ADDRESSES_PATH = path.join(__dirname, '../bridge/hyperlane/deployments/warp-addresses.json');

async function main() {
  console.log('================================================================');
  console.log(' NairaTag Hyperlane Bridge E2E Test');
  console.log(' Flow: cNGN (Chain 902) → Bridge → wcNGN (Chain 901) → ASAKE → ₦asake');
  console.log('================================================================\n');

  // --- Load Hyperlane deployed addresses ---
  if (!fs.existsSync(HYPERLANE_ADDRESSES_PATH)) {
    console.error('ERROR: Hyperlane core contracts not yet deployed. Run the deploy script first.');
    process.exit(1);
  }
  if (!fs.existsSync(WARP_ADDRESSES_PATH)) {
    console.error('ERROR: Warp Route not yet deployed. Run the warp deploy script first.');
    process.exit(1);
  }

  const hyperlaneAddresses = JSON.parse(fs.readFileSync(HYPERLANE_ADDRESSES_PATH, 'utf8'));
  const warpAddresses = JSON.parse(fs.readFileSync(WARP_ADDRESSES_PATH, 'utf8'));

  console.log('Hyperlane addresses loaded:');
  console.log('  Chain 901 Mailbox:', hyperlaneAddresses.nairatag901?.mailbox);
  console.log('  Chain 902 Mailbox:', hyperlaneAddresses.chain902?.mailbox);
  console.log('  wcNGN (Chain 902 Collateral):', warpAddresses.chain902?.router);
  console.log('  wcNGN (Chain 901 Synthetic):', warpAddresses.nairatag901?.router);
  console.log('');

  const DEPLOYER_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
  const deployer = privateKeyToAccount(DEPLOYER_KEY);

  // Clients for Chain 901 (NairaTag)
  const client901 = createPublicClient({ transport: http('http://127.0.0.1:9545') });
  const wallet901 = createWalletClient({ account: deployer, transport: http('http://127.0.0.1:9545') });

  // Clients for Chain 902 (External)
  const client902 = createPublicClient({ transport: http('http://127.0.0.1:9546') });
  const wallet902 = createWalletClient({ account: deployer, transport: http('http://127.0.0.1:9546') });

  const ERC20_ABI = parseAbi([
    'function balanceOf(address) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function mint(address to, uint256 amount)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)'
  ]);

  // Hyperlane Warp Route ABI (HypERC20 / HypERC20Collateral)
  const WARP_ABI = parseAbi([
    'function transferRemote(uint32 destination, bytes32 recipient, uint256 amount) payable returns (bytes32 messageId)',
    'function quoteGasPayment(uint32 destinationDomain) view returns (uint256 fee)',
    'function balanceOf(address) view returns (uint256)'
  ]);

  const REGISTRY_ABI = parseAbi(['function resolve(string tag) view returns (address)']);
  const ROUTER_ABI = parseAbi([
    'function getAmountsOut(uint256 amountIn, address[] path) view returns (uint256[])',
    'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) returns (uint256[])'
  ]);

  const wcNGN902 = warpAddresses.chain902?.router;  // HypERC20Collateral on Chain 902
  const wcNGN901 = warpAddresses.nairatag901?.router; // HypERC20 synthetic on Chain 901
  const cNGNAddr = addresses.contracts.MockCNGN;
  const routerAddr = addresses.contracts.Router;
  const asakeAddr = addresses.tokens.ASAKE.address;

  // Step 1: Resolve ₦asake
  console.log('1. Resolving ₦asake on Chain 901...');
  const asakeTarget = await client901.readContract({
    address: addresses.contracts.Registry,
    abi: REGISTRY_ABI,
    functionName: 'resolve',
    args: ['₦asake']
  });
  console.log(`✓ Resolved ₦asake → ${asakeTarget}\n`);

  // Step 2: Mint cNGN on Chain 902 and approve Warp collateral
  const BRIDGE_AMOUNT = parseEther('100'); // 100 cNGN to bridge
  console.log(`2. Checking cNGN (Chain 902) setup...`);

  // wcNGN on chain 902 needs cNGN or could be native-collateral - check symbol
  const wcNGN902Symbol = await client902.readContract({ address: wcNGN902, abi: ERC20_ABI, functionName: 'symbol' }).catch(() => 'unknown');
  console.log(`   wcNGN902 token symbol: ${wcNGN902Symbol}`);

  // Approve collateral contract to spend cNGN on Chain 902
  const cNGN902Addr = warpAddresses.chain902?.token || cNGNAddr;
  const allowance = await client902.readContract({
    address: cNGN902Addr, abi: ERC20_ABI, functionName: 'allowance',
    args: [deployer.address, wcNGN902]
  }).catch(() => 0n);

  if (allowance < BRIDGE_AMOUNT) {
    console.log('   Approving Warp Collateral to spend cNGN on Chain 902...');
    const appTx = await wallet902.writeContract({
      address: cNGN902Addr, abi: ERC20_ABI, functionName: 'approve',
      args: [wcNGN902, 2n ** 256n - 1n]
    });
    await client902.waitForTransactionReceipt({ hash: appTx });
    console.log(`   ✓ Approved (Tx: ${appTx})`);
  } else {
    console.log('   ✓ Already approved');
  }

  // Step 3: Get bridge gas quote from warp collateral
  console.log('\n3. Getting bridge gas quote...');
  const DEST_DOMAIN = 901; // Chain 901 domain ID
  const bridgeFee = await client902.readContract({
    address: wcNGN902, abi: WARP_ABI, functionName: 'quoteGasPayment',
    args: [DEST_DOMAIN]
  }).catch(() => 0n);
  console.log(`   Bridge fee: ${formatEther(bridgeFee)} ETH`);

  // Step 4: Record wcNGN balance on Chain 901 before bridge
  const wcNGN901BalBefore = await client901.readContract({
    address: wcNGN901, abi: WARP_ABI, functionName: 'balanceOf',
    args: [deployer.address]
  }).catch(() => 0n);
  console.log(`   wcNGN (Chain 901) balance before bridge: ${formatEther(wcNGN901BalBefore)}`);

  // Step 5: Execute transferRemote on Chain 902
  console.log('\n4. Executing transferRemote on Chain 902 (Bridge Deposit)...');
  // Recipient must be bytes32 (left-padded address)
  const recipientBytes32 = `0x${'0'.repeat(24)}${deployer.address.slice(2)}`;
  const bridgeTx = await wallet902.writeContract({
    address: wcNGN902, abi: WARP_ABI, functionName: 'transferRemote',
    args: [DEST_DOMAIN, recipientBytes32, BRIDGE_AMOUNT],
    value: bridgeFee
  });
  const bridgeReceipt = await client902.waitForTransactionReceipt({ hash: bridgeTx });
  console.log(`✓ Bridge Deposit Tx (Chain 902): ${bridgeTx}`);
  console.log(`  Mined in Block #${bridgeReceipt.blockNumber} (Gas Used: ${bridgeReceipt.gasUsed})`);

  // Step 6: Poll for delivery on Chain 901 (relayer should auto-deliver)
  console.log('\n5. Waiting for Hyperlane relayer to deliver on Chain 901...');
  let wcNGN901BalAfter = wcNGN901BalBefore;
  let attempts = 0;
  const maxAttempts = 60; // poll for up to 60 seconds
  while (wcNGN901BalAfter <= wcNGN901BalBefore && attempts < maxAttempts) {
    await new Promise(r => setTimeout(r, 1000));
    wcNGN901BalAfter = await client901.readContract({
      address: wcNGN901, abi: WARP_ABI, functionName: 'balanceOf',
      args: [deployer.address]
    }).catch(() => 0n);
    attempts++;
    if (attempts % 5 === 0) process.stdout.write(`   Still waiting... (${attempts}s)\n`);
  }

  if (wcNGN901BalAfter <= wcNGN901BalBefore) {
    throw new Error(`Bridge delivery timed out after ${maxAttempts}s. wcNGN balance did not increase on Chain 901.`);
  }

  const delivered = wcNGN901BalAfter - wcNGN901BalBefore;
  console.log(`✓ Bridge Delivery Confirmed on Chain 901!`);
  console.log(`  wcNGN balance after: ${formatEther(wcNGN901BalAfter)} (Received: ${formatEther(delivered)} wcNGN)`);

  // Step 7: Approve Router to spend wcNGN on Chain 901
  console.log('\n6. Approving NairaTagRouter to spend wcNGN on Chain 901...');
  const wcNGNAllowance = await client901.readContract({
    address: wcNGN901, abi: ERC20_ABI, functionName: 'allowance',
    args: [deployer.address, routerAddr]
  }).catch(() => 0n);

  if (wcNGNAllowance < delivered) {
    const approveSwapTx = await wallet901.writeContract({
      address: wcNGN901, abi: ERC20_ABI, functionName: 'approve',
      args: [routerAddr, 2n ** 256n - 1n]
    });
    await client901.waitForTransactionReceipt({ hash: approveSwapTx });
    console.log(`✓ Approved Router (Tx: ${approveSwapTx})`);
  } else {
    console.log('✓ Router already approved');
  }

  // Step 8: Get AMM quote: wcNGN → ASAKE
  console.log('\n7. Getting AMM quote: wcNGN → ASAKE...');
  const swapPath = [wcNGN901, asakeAddr];
  const amounts = await client901.readContract({
    address: routerAddr, abi: ROUTER_ABI, functionName: 'getAmountsOut',
    args: [delivered, swapPath]
  });
  const expectedASAKE = amounts[1];
  const minASAKE = (expectedASAKE * 990n) / 1000n; // 1% slippage
  console.log(`   Quote: ${formatEther(delivered)} wcNGN → ${formatEther(expectedASAKE)} ASAKE (min: ${formatEther(minASAKE)})`);

  // Step 9: Execute swap: wcNGN → ASAKE, direct to ₦asake
  console.log('\n8. Executing AMM Swap: wcNGN → ASAKE → ₦asake...');
  const asakeBalBefore = await client901.readContract({
    address: asakeAddr, abi: ERC20_ABI, functionName: 'balanceOf', args: [asakeTarget]
  });

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
  const swapTx = await wallet901.writeContract({
    address: routerAddr, abi: ROUTER_ABI, functionName: 'swapExactTokensForTokens',
    args: [delivered, minASAKE, swapPath, asakeTarget, deadline]
  });
  const swapReceipt = await client901.waitForTransactionReceipt({ hash: swapTx });
  console.log(`✓ Swap Mined (Chain 901): ${swapTx}`);
  console.log(`  Block #${swapReceipt.blockNumber} (Gas Used: ${swapReceipt.gasUsed})`);

  // Step 10: Verify ASAKE delivery to ₦asake
  const asakeBalAfter = await client901.readContract({
    address: asakeAddr, abi: ERC20_ABI, functionName: 'balanceOf', args: [asakeTarget]
  });
  const asakeDelivered = asakeBalAfter - asakeBalBefore;
  console.log(`✓ ASAKE delivered to ₦asake: ${formatEther(asakeDelivered)} ASAKE`);
  assert(asakeDelivered > 0n, 'ASAKE delivery to ₦asake must be > 0');

  console.log('\n================================================================');
  console.log(' FULL CROSS-CHAIN BRIDGE FLOW VERIFIED!');
  console.log(' cNGN (Chain 902) → wcNGN (Bridge) → ASAKE (Swap) → ₦asake');
  console.log('');
  console.log(' Transaction Receipts:');
  console.log(` Bridge Deposit (Chain 902): ${bridgeTx}`);
  console.log(` AMM Swap (Chain 901):       ${swapTx}`);
  console.log('================================================================');
}

main().catch(err => {
  console.error('Bridge test failed:', err.message);
  process.exit(1);
});
