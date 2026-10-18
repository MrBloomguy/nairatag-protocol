/**
 * @file amm-bridge-sdk.test.js
 * @description Integration test for NairaTag AMM and Bridge SDK classes.
 */

const assert = require('assert');
const {
  NairaTagAMM,
  RouteStatus,
  BridgeSwapStage,
  KNOWN_CHAINS,
  NativeBridgeAdapter,
  OPStackBridgeAdapter,
  HyperlaneWarpAdapter,
  MultiTransactionTracker
} = require('../sdk/src/index');
const addresses = require('../config/v1-addresses.json');

async function run() {
  console.log('==================================================');
  console.log(' NairaTag SDK — AMM & Bridge Abstraction Tests');
  console.log('==================================================\n');

  const amm = new NairaTagAMM({
    rpcUrl: addresses.rpc || 'http://127.0.0.1:9545',
    routerAddress: addresses.contracts.Router
  });

  const cNGN = addresses.contracts.MockCNGN;
  const ASAKE = addresses.tokens.ASAKE.address;
  const deployer = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

  // 1. Balance check
  const bal = await amm.getBalance(cNGN, deployer);
  console.log(`✓ AMM: Checked cNGN balance: ${bal.toString()}`);
  assert(bal > 0n, 'Deployer must have cNGN balance');

  // 2. Allowance check
  const allowance = await amm.getAllowance(cNGN, deployer);
  console.log(`✓ AMM: Checked router allowance: ${allowance.toString()}`);

  // 3. Real AMM Quote (100 cNGN -> ASAKE)
  const amountIn = 100n * 10n ** 18n;
  const quote = await amm.getQuote(amountIn, [cNGN, ASAKE], 0.5);
  console.log(`✓ AMM: Real Quote: 100 cNGN -> ${(Number(quote.amountOut) / 1e18).toFixed(4)} ASAKE`);
  console.log(`  -> Min received (0.5% slippage): ${(Number(quote.minReceived) / 1e18).toFixed(4)} ASAKE`);
  assert(quote.amountOut > 0n, 'Amount out must be greater than 0');
  assert(quote.minReceived < quote.amountOut, 'minReceived must enforce slippage');

  // 4. Swap transaction calldata construction
  const swapTx = amm.buildSwapTransaction({
    amountIn,
    amountOutMin: quote.minReceived,
    path: [cNGN, ASAKE],
    recipient: deployer
  });
  assert.strictEqual(swapTx.to, addresses.contracts.Router);
  assert(swapTx.data.startsWith('0x38ed1739'), 'Must start with swapExactTokensForTokens selector');
  console.log(`✓ AMM: Built valid swap calldata (${swapTx.data.length} chars)`);

  // 5. Bridge Abstraction — Native Adapter
  const nativeBridge = new NativeBridgeAdapter();
  const nativeChains = await nativeBridge.getSupportedChains();
  assert.strictEqual(nativeChains.length, 1);
  assert.strictEqual(nativeChains[0].chainId, 901);
  assert.strictEqual(nativeChains[0].status, RouteStatus.SUPPORTED);

  const nativeQuote = await nativeBridge.quote({
    fromToken: 'cNGN',
    toToken: 'ASAKE',
    amount: amountIn
  });
  assert.strictEqual(nativeQuote.isNative, true);
  assert.strictEqual(nativeQuote.routeStatus, RouteStatus.SUPPORTED);
  console.log('✓ Bridge: NativeAdapter reports Chain 901 as SUPPORTED');

  // 6. Bridge Abstraction — Hyperlane Warp Route Adapter (Live & Verified)
  const warpBridge = new HyperlaneWarpAdapter();
  const warpChains = await warpBridge.getSupportedChains();
  assert(warpChains.some(c => c.chainId === 902), 'Chain 902 must be supported in Hyperlane Warp Adapter');
  const chain902 = warpChains.find(c => c.chainId === 902);
  assert.strictEqual(chain902.status, RouteStatus.SUPPORTED);

  const warpQuote = await warpBridge.quote({
    sourceChainId: 902,
    destinationChainId: 901,
    amount: amountIn
  });
  assert.strictEqual(warpQuote.routeStatus, RouteStatus.SUPPORTED);
  assert.strictEqual(warpQuote.isReady, true);
  assert(warpQuote.warpCollateral, 'Must provide live warpCollateral address');
  assert(warpQuote.syntheticToken, 'Must provide live syntheticToken address');
  console.log('✓ Bridge: HyperlaneWarpAdapter reports Chain 902 as live & SUPPORTED');

  // 6. Bridge Abstraction — OP Stack External Adapter (Truthful Status)
  const opBridge = new OPStackBridgeAdapter();
  const opChains = await opBridge.getSupportedChains();
  assert(opChains.some(c => c.name === 'Base Sepolia'));
  const baseSepolia = opChains.find(c => c.chainId === 84532);
  assert.strictEqual(baseSepolia.status, RouteStatus.COMING_SOON);

  const opQuote = await opBridge.quote({
    sourceChainId: 84532,
    fromToken: 'USDC',
    toToken: 'ASAKE',
    amount: 100n * 10n ** 6n
  });
  assert.strictEqual(opQuote.routeStatus, RouteStatus.COMING_SOON);
  assert.strictEqual(opQuote.estimatedReceived, null); // NEVER fake quote
  assert.strictEqual(opQuote.isReady, false);
  console.log('✓ Bridge: OPStackAdapter truthfully reports Base Sepolia as COMING_SOON / Testnet Evaluation');

  // 7. Multi-Transaction Tracker
  const tracker = new MultiTransactionTracker('bs_001', {
    recipientTag: '₦asake',
    resolvedRecipient: ASAKE,
    fromToken: 'cNGN',
    toToken: 'ASAKE',
    amountIn: '100'
  });
  tracker.updateStage(1, 'COMPLETED', '0xabc...1');
  tracker.updateStage(5, 'COMPLETED', '0xabc...5');
  const trackingData = tracker.toJSON();
  assert.strictEqual(trackingData.stages[0].status, 'COMPLETED');
  assert.strictEqual(trackingData.stages[4].status, 'COMPLETED');
  assert.strictEqual(trackingData.stages[1].status, 'PENDING');
  console.log('✓ Bridge: MultiTransactionTracker accurately tracks 6-stage lifecycle');

  console.log('\n==================================================');
  console.log('ALL AMM & BRIDGE SDK TESTS PASSED!');
  console.log('==================================================');
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
