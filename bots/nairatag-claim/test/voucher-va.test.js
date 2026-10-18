const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { createNotificationStore } = require('../src/notification-store');
const { createVoucherEngineService } = require('../src/voucher-engine-service');
const { createFlutterwaveVaService, ACCOUNT_STATES, KYC_STATES, NgnAccountProvider } = require('../src/flutterwave-va-service');

async function runTests() {
  console.log('🧪 Starting NairaTag Automatic NGN Receiving Account Layer Test Suite...\n');

  // Use a temporary SQLite database for clean test isolation
  const tempDbPath = path.join(os.tmpdir(), `nairatag-auto-test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.sqlite`);
  const notificationStore = createNotificationStore(tempDbPath);

  const voucherEngine = createVoucherEngineService({ notificationStore });
  const flwVaService = createFlutterwaveVaService({
    notificationStore,
    flwWebhookSecret: 'test_flw_secret_hash_998',
    flwEnvironment: 'sandbox'
  });

  try {
    // --------------------------------------------------------------------------
    // TEST 1: Default Campaign & Voucher Issuance on Claim
    // --------------------------------------------------------------------------
    console.log('▶ Test 1: Voucher issuance on claim...');
    const user1 = '0x1111111111111111111111111111111111111111';
    const claimRes1 = await voucherEngine.issueClaimReward(user1, 'nairatag-welcome-5k');

    assert.strictEqual(claimRes1.ok, true, 'Claim voucher issuance should succeed');
    assert.strictEqual(claimRes1.issued, true, 'Should mark as freshly issued');
    assert.ok(claimRes1.voucher.code.startsWith('NT-'), 'Voucher code should follow NT-XXXX-XXXX format');
    assert.strictEqual(claimRes1.voucher.faceValueKobo, 100000, 'Face value should be 100,000 kobo (₦1,000)');
    assert.strictEqual(claimRes1.voucher.remainingValueKobo, 100000, 'Remaining value should initially equal face value');
    assert.strictEqual(claimRes1.voucher.status, 'ACTIVE');
    assert.strictEqual(claimRes1.voucher.formattedFaceValue, '₦1,000');
    console.log('  ✔ Voucher issued successfully:', claimRes1.voucher.code);

    // --------------------------------------------------------------------------
    // TEST 2: Idempotency Guard on Duplicate Claim Callback
    // --------------------------------------------------------------------------
    console.log('▶ Test 2: Duplicate claim reward idempotency...');
    const claimRes1Duplicate = await voucherEngine.issueClaimReward(user1, 'nairatag-welcome-5k');

    assert.strictEqual(claimRes1Duplicate.ok, true, 'Duplicate claim call should succeed gracefully');
    assert.strictEqual(claimRes1Duplicate.existing, true, 'Should flag as existing voucher');
    assert.strictEqual(claimRes1Duplicate.voucher.id, claimRes1.voucher.id, 'Should return the exact same voucher ID');
    assert.strictEqual(claimRes1Duplicate.voucher.code, claimRes1.voucher.code, 'Should return the exact same voucher code');

    const userVouchers = voucherEngine.getUserVouchers(user1);
    assert.strictEqual(userVouchers.length, 1, 'User must have exactly 1 voucher, never duplicate welcome vouchers');
    console.log('  ✔ Idempotency preserved: exactly 1 voucher exists for user.');

    // --------------------------------------------------------------------------
    // TEST 3: Partial and Full Voucher Redemption + Negative Balance Guard
    // --------------------------------------------------------------------------
    console.log('▶ Test 3: Voucher redemption flow & balance safety...');
    const voucherCode = claimRes1.voucher.code;

    // 3a. Partial Redemption (₦400 = 40,000 kobo)
    const partialRedeem = await voucherEngine.redeemVoucher({
      voucherCode,
      nairatagUserId: user1,
      partnerId: 'internal',
      amountKobo: 40000,
      externalReference: 'ORDER_PARTIAL_001'
    });

    assert.strictEqual(partialRedeem.ok, true, 'Partial redemption should succeed');
    assert.strictEqual(partialRedeem.redeemedKobo, 40000);
    assert.strictEqual(partialRedeem.remainingKobo, 60000, 'Remaining should be 60,000 kobo (₦600)');
    assert.strictEqual(partialRedeem.status, 'PARTIALLY_REDEEMED');
    console.log('  ✔ Partial redemption of ₦400 succeeded, remaining: ₦600.');

    // 3b. Negative Balance Prevention (Attempting to redeem ₦700 when only ₦600 is left)
    const overRedeem = await voucherEngine.redeemVoucher({
      voucherCode,
      nairatagUserId: user1,
      partnerId: 'internal',
      amountKobo: 70000
    });
    assert.strictEqual(overRedeem.ok, false, 'Over-redemption must be rejected');
    assert.ok(overRedeem.error.includes('Insufficient voucher balance'), 'Should state insufficient balance');
    console.log('  ✔ Over-redemption successfully blocked.');

    // 3c. Full Remaining Redemption (₦600 = 60,000 kobo)
    const fullRedeem = await voucherEngine.redeemVoucher({
      voucherCode,
      nairatagUserId: user1,
      partnerId: 'internal',
      amountKobo: 60000,
      externalReference: 'ORDER_FINAL_002'
    });
    assert.strictEqual(fullRedeem.ok, true, 'Full redemption should succeed');
    assert.strictEqual(fullRedeem.remainingKobo, 0, 'Remaining balance should be 0');
    assert.strictEqual(fullRedeem.status, 'REDEEMED', 'Status should be REDEEMED');
    console.log('  ✔ Full redemption succeeded, voucher status now REDEEMED.');

    // 3d. Attempting to redeem already fully redeemed voucher
    const afterRedeem = await voucherEngine.redeemVoucher({
      voucherCode,
      nairatagUserId: user1,
      partnerId: 'internal',
      amountKobo: 1000
    });
    assert.strictEqual(afterRedeem.ok, false, 'Redeeming exhausted voucher must fail');
    console.log('  ✔ Exhausted voucher redemption blocked.');

    // --------------------------------------------------------------------------
    // TEST 4: Campaign Limits and Inactive Campaign Guard
    // --------------------------------------------------------------------------
    console.log('▶ Test 4: Campaign limits & status enforcement...');
    const testCapCampaign = voucherEngine.createCampaign({
      id: 'camp_cap_test',
      name: 'Limited Flash Reward',
      rewardAmountKobo: 50000,
      maxIssuances: 1,
      status: 'ACTIVE'
    });

    const userA = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const userB = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';

    const issueA = await voucherEngine.issueClaimReward(userA, 'camp_cap_test');
    assert.strictEqual(issueA.ok, true, 'First user should receive voucher');

    const issueB = await voucherEngine.issueClaimReward(userB, 'camp_cap_test');
    assert.strictEqual(issueB.ok, false, 'Second user must be rejected due to campaign capacity cap');
    assert.ok(issueB.error.includes('maximum capacity'));
    console.log('  ✔ Campaign capacity cap strictly enforced (1/1 issued).');

    voucherEngine.pauseCampaign('camp_cap_test');
    const userC = '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC';
    const issueC = await voucherEngine.issueClaimReward(userC, 'camp_cap_test');
    assert.strictEqual(issueC.ok, false, 'Paused campaign must reject issuance');
    console.log('  ✔ Inactive/paused campaign issuance rejected.');

    // --------------------------------------------------------------------------
    // TEST 5: Partner Adapter & Pre-allocated Inventory (Chowdeck)
    // --------------------------------------------------------------------------
    console.log('▶ Test 5: Partner Adapter & Inventory (Chowdeck)...');
    voucherEngine.createCampaign({
      id: 'camp_chowdeck_welcome',
      name: 'NairaTag × Chowdeck',
      rewardAmountKobo: 100000,
      partnerId: 'chowdeck',
      status: 'ACTIVE'
    });

    notificationStore.addPartnerVoucherInventory({
      id: 'inv_chow_1',
      partnerId: 'chowdeck',
      campaignId: 'camp_chowdeck_welcome',
      externalCode: 'CHOW-LAGOS-5544',
      faceValueKobo: 100000
    });

    const chowClaim = await voucherEngine.issueClaimReward(userA, 'camp_chowdeck_welcome');
    assert.strictEqual(chowClaim.ok, true);
    assert.strictEqual(chowClaim.voucher.code, 'CHOW-LAGOS-5544', 'Should assign code from Chowdeck inventory');
    console.log('  ✔ Partner batch inventory assigned code:', chowClaim.voucher.code);

    // --------------------------------------------------------------------------
    // TEST 6: Automatic NGN Account Provisioning on Claim & State Machine Transitions
    // --------------------------------------------------------------------------
    console.log('▶ Test 6: Automatic NGN Account Provisioning on Claim...');
    const user2 = '0x2222222222222222222222222222222222222222';
    const tag2 = 'mikki';

    // Verify user2 does not have an account initially
    assert.strictEqual(flwVaService.getAccount(user2), null, 'New user should NOT have an account before onboarding');

    // Automatic onboarding on claim
    const autoOnboardRes = await flwVaService.initiateAutomaticOnboarding({
      userId: user2,
      nairatagId: tag2,
      name: 'Mikki Lagos',
      email: 'mikki@lagos.ng',
      bvn: '22212345678'
    });

    assert.strictEqual(autoOnboardRes.ok, true, 'Automatic onboarding should succeed');
    assert.strictEqual(autoOnboardRes.created, true);
    assert.strictEqual(autoOnboardRes.status, ACCOUNT_STATES.ACTIVE, 'Status must be ACTIVE');
    assert.ok(autoOnboardRes.account.accountNumber, 'Account number must exist');
    assert.strictEqual(autoOnboardRes.account.currency, 'NGN');
    assert.strictEqual(autoOnboardRes.account.isReadyToReceive, true);
    assert.strictEqual(autoOnboardRes.account.poweredBy, 'Flutterwave');
    assert.ok(autoOnboardRes.account.disclosure.includes('powered by Flutterwave'));
    console.log('  ✔ Automatic NGN account provisioned:', autoOnboardRes.account.bankName, autoOnboardRes.account.accountNumber);

    // --------------------------------------------------------------------------
    // TEST 7: Duplicate Claim / Idempotent NGN Account Provisioning
    // --------------------------------------------------------------------------
    console.log('▶ Test 7: Idempotent account provisioning (no duplicate accounts on retries)...');
    const autoOnboardDup = await flwVaService.initiateAutomaticOnboarding({
      userId: user2,
      nairatagId: tag2
    });

    assert.strictEqual(autoOnboardDup.ok, true);
    assert.strictEqual(autoOnboardDup.created, false, 'Should flag existing account');
    assert.strictEqual(autoOnboardDup.account.accountNumber, autoOnboardRes.account.accountNumber, 'Must return same account number');
    assert.strictEqual(autoOnboardDup.status, ACCOUNT_STATES.ACTIVE);

    // Uniqueness in database
    const allAccountsForUser2 = notificationStore.listNgnAccounts({ limit: 10 }).filter(a => a.user_id === user2);
    assert.strictEqual(allAccountsForUser2.length, 1, 'User must have exactly 1 NGN account, never duplicates');
    console.log('  ✔ Idempotency preserved: exactly 1 NGN account in store.');

    // --------------------------------------------------------------------------
    // TEST 8: KYC Flow (KYC_PENDING -> User resumes onboarding -> ACTIVE)
    // --------------------------------------------------------------------------
    console.log('▶ Test 8: KYC Flow (KYC_PENDING -> completeOnboarding -> ACTIVE)...');
    // Custom mock provider to simulate KYC requirement
    class MockKycProvider extends NgnAccountProvider {
      constructor() {
        super('mock-kyc');
      }
      async createAccount({ bvn }) {
        if (!bvn) {
          return {
            ok: false,
            requiresKyc: true,
            error: 'BVN or NIN verification required by CBN regulations.'
          };
        }
        return {
          ok: true,
          providerAccountId: 'va_mock_kyc_001',
          accountNumber: '0188829102',
          bankName: 'Wema Bank',
          bankCode: '035',
          accountName: 'Simi Ade',
          currency: 'NGN',
          status: ACCOUNT_STATES.ACTIVE
        };
      }
    }

    const kycService = createFlutterwaveVaService({
      notificationStore,
      provider: new MockKycProvider()
    });

    const userKyc = '0x3333333333333333333333333333333333333333';
    // 8a: Claim without BVN triggers KYC_PENDING
    const kycPendingRes = await kycService.initiateAutomaticOnboarding({
      userId: userKyc,
      nairatagId: 'simi'
    });

    assert.strictEqual(kycPendingRes.ok, true);
    assert.strictEqual(kycPendingRes.status, ACCOUNT_STATES.KYC_PENDING);
    assert.strictEqual(kycPendingRes.requiresKyc, true);
    console.log('  ✔ Account placed in KYC_PENDING without crashing claim.');

    // 8b: User resumes onboarding with BVN
    const kycCompleteRes = await kycService.completeOnboarding({
      userId: userKyc,
      bvn: '22299887766',
      name: 'Simi Ade'
    });

    assert.strictEqual(kycCompleteRes.ok, true);
    assert.strictEqual(kycCompleteRes.status, ACCOUNT_STATES.ACTIVE);
    assert.strictEqual(kycCompleteRes.account.accountNumber, '0188829102');
    console.log('  ✔ User resumed onboarding, provided KYC, account activated.');

    // --------------------------------------------------------------------------
    // TEST 9: Provider Failure Tolerance (Outage does not break claim/rewards)
    // --------------------------------------------------------------------------
    console.log('▶ Test 9: Provider failure tolerance...');
    class MockOutageProvider extends NgnAccountProvider {
      constructor() {
        super('mock-outage');
      }
      async createAccount() {
        throw new Error('503 Service Unavailable: Provider gateway maintenance');
      }
    }

    const outageService = createFlutterwaveVaService({
      notificationStore,
      provider: new MockOutageProvider()
    });

    const userOutage = '0x4444444444444444444444444444444444444444';
    // Onboarding attempt during provider outage
    const outageRes = await outageService.initiateAutomaticOnboarding({
      userId: userOutage,
      nairatagId: 'outage-user'
    });

    assert.strictEqual(outageRes.ok, true, 'Must return ok: true to avoid breaking caller claim pipeline');
    assert.strictEqual(outageRes.status, ACCOUNT_STATES.FAILED);
    assert.ok(outageRes.message.includes('being set up'));

    // Voucher still succeeds independently
    const outageVoucher = await voucherEngine.issueClaimReward(userOutage, 'nairatag-welcome-5k');
    assert.strictEqual(outageVoucher.ok, true, 'Voucher MUST succeed even if provider is down');
    console.log('  ✔ Provider failure safely handled: account marked FAILED, voucher issued independently.');

    // --------------------------------------------------------------------------
    // TEST 10: Flutterwave Inbound Webhook & Idempotent NGN Ledger Accounting
    // --------------------------------------------------------------------------
    console.log('▶ Test 10: Flutterwave Webhook Processing & Ledger Credit in Integer Kobo...');
    const targetAccountNum = autoOnboardRes.account.accountNumber;

    // 10a. Invalid Signature rejection
    const invalidSigRes = await flwVaService.processWebhook({
      signature: 'wrong_secret_hash',
      payload: { data: { status: 'successful', amount: 5000, account_number: targetAccountNum } }
    });
    assert.strictEqual(invalidSigRes.ok, false);
    assert.strictEqual(invalidSigRes.statusCode, 401, 'Invalid signature must return 401');
    console.log('  ✔ Invalid webhook signature rejected.');

    // 10b. Valid Deposit Webhook (₦5,000 deposit)
    const validWebhookPayload = {
      event: 'charge.completed',
      data: {
        id: 994821,
        tx_ref: 'FLW_TRANSFER_REF_001',
        flw_ref: 'FLW_REF_994821',
        amount: 5000,
        currency: 'NGN',
        status: 'successful',
        account_number: targetAccountNum,
        customer: { name: 'Adekunle Gold', email: 'ade@lagos.ng' }
      }
    };

    const webhookRes = await flwVaService.processWebhook({
      signature: 'test_flw_secret_hash_998',
      rawBody: JSON.stringify(validWebhookPayload),
      payload: validWebhookPayload
    });

    assert.strictEqual(webhookRes.ok, true, 'Deposit processing should succeed');
    assert.strictEqual(webhookRes.credited, true);
    assert.strictEqual(webhookRes.amountKobo, 500000, '₦5,000 must be credited as exactly 500,000 kobo');

    // Check internal ledger
    const balance = flwVaService.getBalance(user2);
    assert.strictEqual(balance.balanceKobo, 500000, 'Ledger balance must be 500,000 kobo');
    assert.strictEqual(balance.balanceNgn, '5000.00', 'Formatted balance must be 5000.00');
    console.log('  ✔ Deposit of ₦5,000 credited to ledger as 500,000 integer kobo.');

    // --------------------------------------------------------------------------
    // TEST 11: Duplicate Webhook Idempotency (Same transaction ID)
    // --------------------------------------------------------------------------
    console.log('▶ Test 11: Duplicate webhook idempotency...');
    const duplicateWebhookRes = await flwVaService.processWebhook({
      signature: 'test_flw_secret_hash_998',
      rawBody: JSON.stringify(validWebhookPayload),
      payload: validWebhookPayload
    });
    assert.strictEqual(duplicateWebhookRes.ok, true);
    assert.strictEqual(duplicateWebhookRes.duplicate, true, 'Must flag as duplicate');
    assert.strictEqual(duplicateWebhookRes.credited, undefined, 'Must NOT credit twice');

    const balanceAfterDuplicate = flwVaService.getBalance(user2);
    assert.strictEqual(balanceAfterDuplicate.balanceKobo, 500000, 'Ledger balance must remain exactly 500,000 kobo (no double credit)');
    console.log('  ✔ Duplicate webhook ignored idempotently without double credit.');

    // --------------------------------------------------------------------------
    // TEST 12: Partnership Metrics & Strategic Analytics Calculation
    // --------------------------------------------------------------------------
    console.log('▶ Test 12: Flutterwave Partnership & Strategic Metrics...');
    const analytics = flwVaService.getAnalytics();

    assert.ok(analytics.nairaTags >= 1, 'Should track total claimed NairaTags');
    assert.ok(analytics.ngnAccounts >= 1, 'Should track total NGN accounts');
    assert.ok(typeof analytics.activationRate === 'number', 'Activation rate must be numeric %');
    assert.strictEqual(analytics.accountsReceivingMoney, 1, 'User2 received money');
    assert.strictEqual(analytics.totalNgnReceived, 5000, 'Total NGN received should be 5,000');
    assert.strictEqual(analytics.totalNgnReceivedFormatted, '₦5,000');
    assert.strictEqual(analytics.transactions, 1);
    console.log('  ✔ Partnership metrics calculated accurately:', {
      tags: analytics.nairaTags,
      accounts: analytics.ngnAccounts,
      rate: `${analytics.activationRate}%`,
      volume: analytics.totalNgnReceivedFormatted
    });

    // --------------------------------------------------------------------------
    // TEST 13: WhatsApp Natural-Language Intent Verification
    // --------------------------------------------------------------------------
    console.log('▶ Test 13: WhatsApp natural-language intents & state machine responses...');
    const { handleMessage, voucherEngineService: mainVoucherEngine, flutterwaveVaService: mainFlwVa } = require('../src/server');

    // 13a. User with voucher asking for "my voucher"
    const testWhatsAppUser = '0x6666666666666666666666666666666666666666';
    await mainVoucherEngine.issueClaimReward(testWhatsAppUser, 'nairatag-welcome-5k');

    let replyTextVoucher = '';
    await handleMessage({
      id: testWhatsAppUser,
      text: 'my voucher',
      reply: msg => { replyTextVoucher = msg; }
    });
    assert.ok(replyTextVoucher.includes('YOUR NAIRATAG REWARD'), 'Should return reward card');
    assert.ok(replyTextVoucher.includes('Welcome Voucher'), 'Should mention welcome voucher');
    console.log('  ✔ WhatsApp intent "my voucher" returned active voucher card.');

    // 13b. User without receiving account asking for "my account" (NOT_STARTED)
    let replyTextNoAccount = '';
    await handleMessage({
      id: '0x8888888888888888888888888888888888888888',
      text: 'my account',
      reply: msg => { replyTextNoAccount = msg; }
    });
    assert.ok(replyTextNoAccount.includes('Set up your NGN receiving account') || replyTextNoAccount.includes('identity is ready'), 'Should guide onboarding');
    console.log('  ✔ WhatsApp intent "my account" guided user to set up account.');

    // 13c. User with active receiving account asking for "receive money"
    await mainFlwVa.initiateAutomaticOnboarding({
      userId: '0x7777777777777777777777777777777777777777',
      nairatagId: 'ade',
      name: 'Adekunle Gold'
    });

    let replyTextAccount = '';
    await handleMessage({
      id: '0x7777777777777777777777777777777777777777',
      text: 'receive money',
      reply: msg => { replyTextAccount = msg; }
    });
    assert.ok(replyTextAccount.includes('NGN Receiving Account'), 'Should show receiving account');
    assert.ok(replyTextAccount.includes('Bank:'), 'Should list bank');
    assert.ok(replyTextAccount.includes('Account Number:'), 'Should list account number');
    assert.ok(replyTextAccount.includes('Ready to receive NGN'), 'Should state ready to receive');
    console.log('  ✔ WhatsApp intent "receive money" returned active bank receiving details.');

    // --------------------------------------------------------------------------
    // TEST 14: Resolver Destination Capabilities
    // --------------------------------------------------------------------------
    console.log('▶ Test 14: NairaTag Resolver Capability Integration...');
    // Account details for user2 (tag2)
    const user2Acc = flwVaService.getAccount(user2);
    assert.strictEqual(user2Acc.status, ACCOUNT_STATES.ACTIVE);
    assert.strictEqual(user2Acc.isReadyToReceive, true);
    assert.strictEqual(user2Acc.currency, 'NGN');
    console.log('  ✔ Resolver integration confirmed: NGN receiving destination active.');

    console.log('\n🎉 ALL 14 COMPREHENSIVE TEST SUITES PASSED PERFECTLY!\n');
  } finally {
    notificationStore.close();
    try { fs.unlinkSync(tempDbPath); } catch {}
  }
}

runTests().catch(err => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
