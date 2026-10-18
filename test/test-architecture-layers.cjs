const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

// Use scratch temp db for isolated testing
const testDbPath = path.join(__dirname, '../scratch/test_layers.sqlite');
if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

const { createNotificationStore } = require('../bots/nairatag-claim/src/notification-store');
const { createPhoneResolverService, normalizePhoneNumber, hashPhoneNumber } = require('../bots/nairatag-claim/src/phone-resolver-service');
const { createPointsService } = require('../bots/nairatag-claim/src/points-service');
const { createMarketplaceService } = require('../bots/nairatag-claim/src/marketplace-service');
const { createChowdeckService } = require('../bots/nairatag-claim/src/chowdeck-service');
const { createOjaLMService } = require('../bots/nairatag-claim/src/ojalm-service');
const { createMuseSparkAgent } = require('../bots/nairatag-claim/src/muse-spark');

async function runTests() {
  console.log('--- STARTING NAIRATAG ARCHITECTURE LAYERS TESTS ---');

  const store = createNotificationStore(testDbPath);

  // Mock tag service for unit testing
  const mockTagService = {
    getNetworkInfo: () => ({ resolution: { registryAddress: '0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82' } }),
    checkAvailability: async (handle) => {
      const isClaimed = ['michael', 'david', 'asake', 'burnaboy'].includes(handle.toLowerCase());
      return { handle, display: `₦${handle}`, available: !isClaimed };
    },
    getOwner: async (handle) => {
      if (handle.toLowerCase() === 'michael') return { owner: '0x1111111111111111111111111111111111111111' };
      if (handle.toLowerCase() === 'david') return { owner: '0x2222222222222222222222222222222222222222' };
      return { owner: '0x3333333333333333333333333333333333333333' };
    },
    resolveTag: async (tag) => {
      const clean = tag.replace(/^₦/, '').toLowerCase();
      if (clean === 'michael') return { handle: 'michael', display: '₦michael', resolvedAddress: '0x1111111111111111111111111111111111111111' };
      return { handle: clean, display: `₦${clean}`, resolvedAddress: '0x2222222222222222222222222222222222222222' };
    }
  };

  const phoneService = createPhoneResolverService({ notificationStore: store, tagService: mockTagService });
  const points = createPointsService({ notificationStore: store });
  const marketplace = createMarketplaceService({ notificationStore: store, tagService: mockTagService });
  const chowdeck = createChowdeckService({ notificationStore: store });
  const ojalm = createOjaLMService();
  const museSpark = createMuseSparkAgent({
    tagService: mockTagService,
    phoneResolverService: phoneService,
    pointsService: points,
    marketplaceService: marketplace,
    chowdeckService: chowdeck,
    ojalmService: ojalm
  });

  // TEST 1: Phone Resolver
  console.log('\n[1/6] Testing Phone Number Resolver Layer...');
  const norm1 = normalizePhoneNumber('0803 123 4567');
  assert.strictEqual(norm1, '+2348031234567', 'Normalization to +234 failed');
  const hash1 = hashPhoneNumber(norm1);
  assert.ok(hash1.startsWith('0x'), 'Phone hash should be hex format');

  // Link phone to ₦michael via OTP flow
  const otpSend = await phoneService.sendPhoneOtp({ phone: '0803 123 4567' });
  assert.strictEqual(otpSend.ok, true);
  assert.strictEqual(otpSend.status, 'OTP_SENT');
  assert.ok(otpSend.pinId);

  const otpVerify = await phoneService.verifyPhoneOtp({
    phone: '0803 123 4567',
    code: otpSend.devOtp,
    pinId: otpSend.pinId,
    tag: '₦michael',
    walletAddress: '0x1111111111111111111111111111111111111111',
    allowPhoneDiscovery: true
  });
  assert.strictEqual(otpVerify.ok, true);
  assert.strictEqual(otpVerify.phoneVerified, true);
  assert.strictEqual(otpVerify.tag, '₦michael');

  // Perform Mono Identity Verification (Data Minimization)
  const monoInit = await phoneService.initiateIdentityVerification({ tag: 'michael' });
  assert.strictEqual(monoInit.ok, true);
  assert.strictEqual(monoInit.provider, 'mono');
  assert.ok(monoInit.widgetUrl);

  const monoComplete = await phoneService.completeIdentityVerification({
    tag: 'michael',
    walletAddress: '0x1111111111111111111111111111111111111111',
    sessionToken: monoInit.sessionToken,
    consentGiven: true
  });
  assert.strictEqual(monoComplete.ok, true);
  assert.strictEqual(monoComplete.identityVerified, true);
  assert.strictEqual(monoComplete.verificationProvider, 'mono');
  assert.strictEqual(monoComplete.bvn, undefined, 'BVN must NEVER be exposed or stored');
  assert.strictEqual(monoComplete.nin, undefined, 'NIN must NEVER be exposed or stored');

  // Resolve phone with full identity proof
  const resolved = await phoneService.resolvePhone('+234 803 123 4567');
  assert.strictEqual(resolved.resolved, true);
  assert.strictEqual(resolved.tag, '₦michael');
  assert.strictEqual(resolved.phoneVerified, true);
  assert.strictEqual(resolved.identityVerified, true);
  assert.strictEqual(resolved.agent, 'agenttag://michael');
  assert.strictEqual(resolved.walletAddress, '0x1111111111111111111111111111111111111111');
  assert.strictEqual(resolved.bvn, undefined, 'BVN must never leak in resolved payload');

  // Test Payment Account Verification (Separate Primitive)
  const nubanVerify = await phoneService.verifyPaymentAccount({
    accountNumber: '0123456789',
    bankCode: '058'
  });
  assert.strictEqual(nubanVerify.ok, true);
  assert.strictEqual(nubanVerify.verified, true);
  assert.ok(nubanVerify.accountName);
  assert.strictEqual(nubanVerify.bankName, 'Guaranty Trust Bank (GTBank)');

  // Test privacy opt-out
  await phoneService.updatePrivacy('+234 803 123 4567', { allowPhoneDiscovery: false });
  const optOutResolved = await phoneService.resolvePhone('+234 803 123 4567');
  assert.strictEqual(optOutResolved.resolved, false);
  assert.strictEqual(optOutResolved.privacyRestricted, true);
  console.log('✓ Phone Number + Mono Identity Resolver passed: OTP flow, E.164, privacy hash, data minimization, & NUBAN verification verified.');

  // Restore discovery
  await phoneService.updatePrivacy('+234 803 123 4567', { allowPhoneDiscovery: true });

  // TEST 2: Points & Referral Engine
  console.log('\n[2/6] Testing Points & Referral Growth Engine...');
  const aliceWallet = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  const bobWallet = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';

  // Alice claims ₦alice -> earns +100 pts
  const aliceClaim = points.awardClaimPoints({ walletAddress: aliceWallet, tag: 'alice' });
  assert.strictEqual(aliceClaim.pointsEarned, 100);
  assert.strictEqual(aliceClaim.totalPoints, 100);

  // Alice shares her referral link -> earns +50 pts
  const aliceShare = points.awardReferralShare({ walletAddress: aliceWallet });
  assert.strictEqual(aliceShare.pointsEarned, 50);
  assert.strictEqual(aliceShare.totalPoints, 150);

  // Alice completes profile -> earns +25 pts
  const aliceProfile = points.awardProfileCompletion({ walletAddress: aliceWallet, tag: 'alice' });
  assert.strictEqual(aliceProfile.pointsEarned, 25);
  assert.strictEqual(aliceProfile.totalPoints, 175);

  // Bob claims ₦bob using Alice's referral code
  const aliceSummary = points.getAccountSummary(aliceWallet);
  const bobClaim = points.awardClaimPoints({
    walletAddress: bobWallet,
    tag: 'bob',
    referralCode: aliceSummary.referralCode
  });
  assert.strictEqual(bobClaim.pointsEarned, 100);
  assert.ok(bobClaim.referralReward, 'Alice should receive referral bonus');
  assert.strictEqual(bobClaim.referralReward.pointsAwarded, 100);

  // Alice now has 175 + 100 = 275 pts!
  const aliceFinal = points.getAccountSummary(aliceWallet);
  assert.strictEqual(aliceFinal.totalPoints, 275);
  console.log('✓ Points & Referral Growth Engine passed: Claim (+100), Share (+50), Profile (+25), Friend Claims (+100).');

  // TEST 3: Tag Marketplace (Buy / Sell / Swap)
  console.log('\n[3/6] Testing Tag Marketplace (Buy / Sell / Swap)...');
  // Check available tag state
  const availState = await marketplace.getListing('newtag123');
  assert.strictEqual(availState.state, 'AVAILABLE');

  // Check claimed tag state
  const claimedState = await marketplace.getListing('david');
  assert.strictEqual(claimedState.state, 'CLAIMED');

  // List ₦asake for sale
  const listRes = await marketplace.listTag({
    tag: 'asake',
    owner: '0x3333333333333333333333333333333333333333',
    price: '0.5',
    currency: 'ETH',
    listingType: 'sale'
  });
  assert.strictEqual(listRes.ok, true);

  const listedState = await marketplace.getListing('asake');
  assert.strictEqual(listedState.state, 'LISTED');

  // Prepare buy
  const buyPrep = await marketplace.prepareBuy({
    tag: 'asake',
    buyerAddress: bobWallet
  });
  assert.strictEqual(buyPrep.stage, 'READY_FOR_MARKETPLACE_BUY');
  assert.strictEqual(buyPrep.price, '0.5');

  // Prepare Tag Swap proposal: ₦MICHAEL ↔ ₦DAVID
  const swapPrep = await marketplace.prepareSwap({
    myTag: 'michael',
    targetTag: 'david',
    myAddress: aliceWallet,
    extraAmount: '0.1'
  });
  assert.strictEqual(swapPrep.stage, 'READY_FOR_TAG_SWAP_EXECUTION');
  assert.strictEqual(swapPrep.offeredTag, '₦michael');
  assert.strictEqual(swapPrep.requestedTag, '₦david');

  // Prepare direct Registry ownership transfer
  const xferPrep = marketplace.prepareOwnershipTransfer({
    tag: 'michael',
    newOwner: bobWallet
  });
  assert.strictEqual(xferPrep.stage, 'READY_FOR_OWNERSHIP_TRANSFER');
  assert.ok(xferPrep.calldata.startsWith('0x'));
  console.log('✓ Tag Marketplace passed: AVAILABLE -> CLAIMED -> LISTED, Buy Prep, and Swap Proposal verified.');

  // TEST 4: Chowdeck Layer
  console.log('\n[4/6] Testing Chowdeck Agent Service...');
  const restaurants = chowdeck.searchRestaurants();
  assert.ok(restaurants.restaurants.length >= 4, 'Should list restaurants');

  // Search items under ₦7,000
  const itemsUnder7k = chowdeck.searchItems({ maxPrice: 7000 });
  assert.ok(itemsUnder7k.items.length > 0);
  assert.ok(itemsUnder7k.items.every(i => i.priceNgn <= 7000));

  // Delivery quote
  const quote = chowdeck.getDeliveryQuote({ restaurantId: 'res-megachicken' });
  assert.ok(quote.deliveryFeeNgn > 0);

  // Place order
  const order = await chowdeck.createOrder({
    restaurantId: 'res-megachicken',
    items: [{ id: 'item-mc-1', quantity: 1 }],
    deliveryAddress: 'Lekki Phase 1, Lagos',
    paymentTag: '₦michael',
    walletAddress: aliceWallet
  });
  assert.strictEqual(order.stage, 'ORDER_PLACED_AND_CONFIRMED');
  assert.ok(order.orderId.startsWith('CHOW-'));

  // Track order
  const tracking = chowdeck.trackOrder(order.orderId);
  assert.strictEqual(tracking.orderId, order.orderId);
  console.log('✓ Chowdeck Service passed: Restaurant discovery, items < ₦7,000, quote, order & tracking.');

  // TEST 5: OjaLM Nigerian Commerce Intelligence
  console.log('\n[5/6] Testing OjaLM Commerce Intelligence...');
  const ojaSearch = ojalm.searchProducts('rice');
  assert.ok(ojaSearch.results.length > 0);
  assert.strictEqual(ojaSearch.results[0].category, 'Groceries & Provisions');

  const priceComp = ojalm.comparePrices('indomie');
  assert.strictEqual(priceComp.ok, true);
  assert.ok(priceComp.vendors.length >= 3);
  console.log('✓ OjaLM Commerce Intelligence passed: Product indices & multi-vendor comparison.');

  // TEST 6: Muse Spark Agent Brain Reasoning & Tool Chaining
  console.log('\n[6/6] Testing Muse Spark Agent Brain...');

  // Intent A: "I'm hungry. Find me something good under ₦7,000 and order it."
  const foodPrompt = await museSpark.processPrompt("I'm hungry. Find me something good under ₦7,000 and order it.", { wallet: aliceWallet });
  assert.strictEqual(foodPrompt.intent, 'CHOWDECK_FOOD_ORDER');
  assert.strictEqual(foodPrompt.widgetType, 'chowdeck_order');
  assert.ok(foodPrompt.data.items.length > 0);

  // Intent B: "Send ₦5,000 to my brother +2348031234567"
  const phonePrompt = await museSpark.processPrompt('Send ₦5,000 to my brother +2348031234567', { wallet: aliceWallet });
  assert.strictEqual(phonePrompt.intent, 'PHONE_RESOLVED_PAYMENT');
  assert.strictEqual(phonePrompt.data.tag, '₦michael');
  assert.strictEqual(phonePrompt.data.amountToTransfer, '5000');

  // Intent C: "Swap ₦MICHAEL for ₦DAVID"
  const swapPrompt = await museSpark.processPrompt('Swap ₦MICHAEL for ₦DAVID', { wallet: aliceWallet });
  assert.strictEqual(swapPrompt.intent, 'TAG_SWAP_PROPOSAL');
  assert.strictEqual(swapPrompt.data.myTag, '₦michael');
  assert.strictEqual(swapPrompt.data.targetTag, '₦david');

  // Intent D: "Check my points and referral link"
  const pointsPrompt = await museSpark.processPrompt('Check my points and referral link', { wallet: aliceWallet });
  assert.strictEqual(pointsPrompt.intent, 'POINTS_STATUS');
  assert.strictEqual(pointsPrompt.data.summary.totalPoints, 275);

  // Intent E: "Order lunch for 0803 123 4567" (Phone -> Tag -> AgentTag -> Chowdeck)
  const phoneLunchPrompt = await museSpark.processPrompt('Order lunch for 0803 123 4567 under ₦9,000', { wallet: aliceWallet });
  assert.strictEqual(phoneLunchPrompt.intent, 'PHONE_RESOLVED_FOOD_ORDER');
  assert.strictEqual(phoneLunchPrompt.data.recipientTag, '₦michael');
  assert.strictEqual(phoneLunchPrompt.data.identityVerified, true);
  assert.strictEqual(phoneLunchPrompt.widgetType, 'chowdeck_order');

  // Intent F: "Verify account 0123456789 GTBank" (Payment destination verification != BVN verification)
  const nubanPrompt = await museSpark.processPrompt('Verify account 0123456789 GTBank', { wallet: aliceWallet });
  assert.strictEqual(nubanPrompt.intent, 'PAYMENT_ACCOUNT_VERIFIED');
  assert.ok(nubanPrompt.data.accountName);
  assert.strictEqual(nubanPrompt.data.bankCode, '058');

  // Intent G: "Is ₦michael verified?" (Identity verification check)
  const verifyPrompt = await museSpark.processPrompt('Is ₦michael verified?', { wallet: aliceWallet });
  assert.strictEqual(verifyPrompt.intent, 'IDENTITY_VERIFICATION_CHECK');
  assert.strictEqual(verifyPrompt.data.identityVerified, true);

  console.log('✓ Muse Spark Agent Brain passed: All conversational intents, tool chains & widgets verified!');

  console.log('\n========================================');
  console.log('ALL NAIRATAG ARCHITECTURE TESTS PASSED!');
  console.log('========================================');
  store.close();
}

runTests().catch(err => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});
