/**
 * @file native-swap-to-tag.test.js
 * @description End-to-end test verifying:
 * cNGN.test → AMM Swap → ASAKE → ₦asake
 * Checks real on-chain balances before and after the swap.
 */

const assert = require('assert');
const { createPublicClient, createWalletClient, http, parseAbi, parseEther, formatEther } = require('../packages/viem/node_modules/viem');
const { privateKeyToAccount } = require('../packages/viem/node_modules/viem/accounts');
const addresses = require('../config/v1-addresses.json');

async function main() {
  console.log('================================================================');
  console.log(' NairaTag Native Swap-to-₦Tag End-to-End Verification (Chain 901)');
  console.log(' Target Flow: cNGN.test → Router Swap → ASAKE → ₦asake');
  console.log('================================================================\n');

  const RPC_URL = addresses.rpc;
  const deployer = privateKeyToAccount('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');

  const publicClient = createPublicClient({ transport: http(RPC_URL) });
  const walletClient = createWalletClient({ account: deployer, transport: http(RPC_URL) });

  const REGISTRY_ABI = parseAbi(['function resolve(string tag) view returns (address)']);
  const ERC20_ABI = parseAbi([
    'function balanceOf(address account) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)'
  ]);
  const ROUTER_ABI = parseAbi([
    'function getAmountsOut(uint256 amountIn, address[] path) view returns (uint256[] amounts)',
    'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) returns (uint256[] amounts)'
  ]);

  // Step 1: Resolve ₦asake
  console.log('1. Resolving destination ₦asake...');
  const asakeTarget = await publicClient.readContract({
    address: addresses.contracts.Registry,
    abi: REGISTRY_ABI,
    functionName: 'resolve',
    args: ['₦asake']
  });
  console.log(`✓ Resolved ₦asake -> ${asakeTarget}`);
  assert(asakeTarget && asakeTarget !== '0x0000000000000000000000000000000000000000', '₦asake must resolve to a valid address');

  // Step 2: Record balances before swap
  const cNGNAddr = addresses.contracts.MockCNGN;
  const asakeAddr = addresses.tokens.ASAKE.address;
  const routerAddr = addresses.contracts.Router;

  const targetAsakeBalBefore = await publicClient.readContract({
    address: asakeAddr,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [asakeTarget]
  });
  console.log(`2. ₦asake ASAKE balance before: ${formatEther(targetAsakeBalBefore)} ASAKE`);

  // Step 3: Check allowance & approve Router
  const amountIn = parseEther('50'); // 50 cNGN
  const allowance = await publicClient.readContract({
    address: cNGNAddr,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [deployer.address, routerAddr]
  });

  if (allowance < amountIn) {
    console.log('Approving Router for cNGN...');
    const appTx = await walletClient.writeContract({
      address: cNGNAddr,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [routerAddr, 2n ** 256n - 1n]
    });
    await publicClient.waitForTransactionReceipt({ hash: appTx });
  }

  // Step 4: Get Router Quote
  const path = [cNGNAddr, asakeAddr];
  const amounts = await publicClient.readContract({
    address: routerAddr,
    abi: ROUTER_ABI,
    functionName: 'getAmountsOut',
    args: [amountIn, path]
  });
  const expectedOut = amounts[1];
  const minOut = (expectedOut * 990n) / 1000n; // 1% slippage
  console.log(`3. Router Quote for 50 cNGN: ${formatEther(expectedOut)} ASAKE (Min out: ${formatEther(minOut)})`);

  // Step 5: Execute Swap with recipient = asakeTarget (₦asake)
  console.log('4. Executing swap with recipient set to ₦asake on Chain 901...');
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
  const swapTx = await walletClient.writeContract({
    address: routerAddr,
    abi: ROUTER_ABI,
    functionName: 'swapExactTokensForTokens',
    args: [amountIn, minOut, path, asakeTarget, deadline]
  });
  console.log(`  -> Broadcasted Tx: ${swapTx}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: swapTx });
  console.log(`✓ Swap Mined in Block #${receipt.blockNumber} (Gas Used: ${receipt.gasUsed})`);

  // Step 6: Verify balance after swap
  const targetAsakeBalAfter = await publicClient.readContract({
    address: asakeAddr,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [asakeTarget]
  });
  console.log(`5. ₦asake ASAKE balance after:  ${formatEther(targetAsakeBalAfter)} ASAKE`);

  const balanceIncrease = targetAsakeBalAfter - targetAsakeBalBefore;
  console.log(`✓ Exact Delivered Output:     ${formatEther(balanceIncrease)} ASAKE`);
  assert.strictEqual(balanceIncrease, expectedOut, 'Delivered amount must match router output exactly');

  console.log('\n================================================================');
  console.log(' FULL NATIVE FLOW cNGN.test → ASAKE → ₦ASAKE VERIFIED ON-CHAIN!');
  console.log('================================================================');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
