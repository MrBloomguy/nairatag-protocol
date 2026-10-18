/**
 * ═══════════════════════════════════════════════════════════════════════
 * NAIRATAG WHATSAPP CLAIM & IDENTITY ENGINE TEST SUITE
 * Verifies the 5 primitives: Discover, Claim, Verify, Success, Share/Refer
 * ═══════════════════════════════════════════════════════════════════════
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const { createNotificationStore } = require('../src/notification-store');
const { createWhatsAppIdentityService } = require('../src/whatsapp-identity-service');
const { createVoucherEngineService } = require('../src/voucher-engine-service');
const { createFlutterwaveVaService } = require('../src/flutterwave-va-service');

const TEST_DB = path.join(__dirname, 'test-whatsapp-identity.sqlite');

function cleanup() {
  try { if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB); } catch {}
}

test('WhatsApp Claim & Identity Engine', async (t) => {
  cleanup();
  const notificationStore = createNotificationStore(TEST_DB);
  const voucherEngineService = createVoucherEngineService({ notificationStore });
  const flutterwaveVaService = createFlutterwaveVaService({ notificationStore });

  // Mock tag service
  const registeredTags = new Set(['asake', 'burna', 'davido']);
  const mockTagService = {
    async checkAvailability(handle) {
      const clean = String(handle).toLowerCase().replace(/^₦/, '');
      return { available: !registeredTags.has(clean), handle: clean };
    },
    async resolveTag(handle) {
      const clean = String(handle).toLowerCase().replace(/^₦/, '');
      if (registeredTags.has(clean)) {
        return {
          exists: true,
          display: `₦${clean.toUpperCase()}`,
          resolvedAddress: '0x8219481948194819481948194819481948194819',
          profile: { role: clean === 'asake' ? 'Afrobeats Artist' : 'Verified Identity' }
        };
      }
      return { exists: false, display: `₦${clean.toUpperCase()}` };
    }
  };

  const sentMessages = [];
  const mockWhatsAppProvider = {
    async send(to, text) {
      sentMessages.push({ to, type: 'text', text });
      return { ok: true };
    },
    async sendButtons(to, text, buttons) {
      sentMessages.push({ to, type: 'buttons', text, buttons });
      return { ok: true };
    }
  };

  const service = createWhatsAppIdentityService({
    tagService: mockTagService,
    celoSepoliaService: mockTagService,
    flutterwaveVaService,
    voucherEngineService,
    notificationStore,
    whatsappProvider: mockWhatsAppProvider,
    publicBaseUrl: 'https://nairatag-network.vercel.app'
  });

  await t.test('1. Intelligent name suggestion generation', async () => {
    const candidates = await service.generateCandidateTags('Chukwudi Okafor');
    assert.ok(candidates.length >= 3, 'Should generate multiple candidate tags');
    const tags = candidates.map(c => c.tag);
    assert.ok(tags.includes('chuks'), 'Should suggest nickname chuks');
    assert.ok(tags.includes('chukwudi'), 'Should suggest full first name chukwudi');
    assert.ok(candidates.every(c => typeof c.available === 'boolean'), 'Each candidate has availability evaluated');
  });

  await t.test('2. Entry / Welcome card on "Hi" or "start"', async () => {
    let captured = null;
    await service.handleIncomingMessage({
      id: '+2348012345678',
      senderName: 'Chukwudi Okafor',
      text: 'Hi',
      isInteractive: false,
      reply: t => { captured = { text: t }; },
      replyWithButtons: (t, b) => { captured = { text: t, buttons: b }; }
    });

    assert.ok(captured, 'Should reply to greeting');
    assert.match(captured.text, /NAIRATAG/, 'Should contain NairaTag title');
    assert.match(captured.text, /Nigerian digital identity/, 'Should describe digital identity layer');
    assert.equal(captured.buttons.length, 3, 'Should offer 3 entry buttons');
    assert.equal(captured.buttons[0].id, 'btn_claim_flow', 'First button is claim flow');
  });

  await t.test('3. Tap [ Claim my ₦Tag ] -> Suggests available tag', async () => {
    let captured = null;
    await service.handleIncomingMessage({
      id: '+2348012345678',
      senderName: 'Chukwudi Okafor',
      text: 'btn_claim_flow',
      isInteractive: true,
      reply: t => { captured = { text: t }; },
      replyWithButtons: (t, b) => { captured = { text: t, buttons: b }; }
    });

    assert.ok(captured, 'Should reply with claim options');
    assert.match(captured.text, /CLAIM YOUR ₦TAG/, 'Header is CLAIM YOUR ₦TAG');
    assert.match(captured.text, /₦CHUKS/, 'Suggests ₦CHUKS based on sender name');
    assert.match(captured.text, /Available/, 'Shows availability');
    assert.equal(captured.buttons[0].id, 'btn_claim_tag_chuks', 'Offers one-tap claim button');
  });

  await t.test('4. Tap [ Claim ₦CHUKS ] -> Connect wallet screen (Screen 3)', async () => {
    let captured = null;
    await service.handleIncomingMessage({
      id: '+2348012345678',
      senderName: 'Chukwudi Okafor',
      text: 'btn_claim_tag_chuks',
      isInteractive: true,
      reply: t => { captured = { text: t }; },
      replyWithButtons: (t, b) => { captured = { text: t, buttons: b }; }
    });

    assert.ok(captured, 'Should reply with connect wallet prompt');
    assert.match(captured.text, /Connect your wallet/i, 'Shows connect wallet header');
    assert.match(captured.text, /To claim \*₦chuks\*, connect your wallet/i, 'Explains claiming steps');
    assert.equal(captured.buttons[0].id, 'btn_confirm_claim_chuks', 'Offers connect wallet button');
    assert.equal(captured.buttons[1].id, 'btn_create_wallet_chuks', 'Offers create new wallet button');
  });

  await t.test('5. Tap [ Connect wallet ] -> Claim Success (Screen 4)', async () => {
    let captured = null;
    await service.handleIncomingMessage({
      id: '+2348012345678',
      senderName: 'Chukwudi Okafor',
      text: 'btn_confirm_claim_chuks',
      isInteractive: true,
      reply: t => { captured = { text: t }; },
      replyWithButtons: (t, b) => { captured = { text: t, buttons: b }; }
    });

    assert.ok(captured, 'Should output claim success card');
    assert.match(captured.text, /₦chuks is yours!/i, 'Celebrates claim success');
    assert.match(captured.text, /#CHUKS/, 'Mentions claimed tag');
    assert.match(captured.text, /Base wallet/, 'Shows Base wallet');
    assert.match(captured.text, /Network: Base/, 'Shows Base network');

    // Verify stored in DB
    const link = notificationStore.getWhatsAppLink('+2348012345678');
    assert.ok(link, 'User is linked in notification store');
    assert.equal(link.tag, '₦chuks', 'Tag stored in database');

    // Verify Welcome voucher was created
    const vouchers = voucherEngineService.getUserVouchers('+2348012345678');
    assert.ok(vouchers.length >= 1, 'Welcome voucher was issued to phone');
  });

  await t.test('6. Tap [ View my ₦Tag ] -> Identity Mini-Dashboard', async () => {
    let captured = null;
    await service.handleIncomingMessage({
      id: '+2348012345678',
      senderName: 'Chukwudi Okafor',
      text: 'btn_view_dashboard',
      isInteractive: true,
      reply: t => { captured = { text: t }; },
      replyWithButtons: (t, b) => { captured = { text: t, buttons: b }; }
    });

    assert.ok(captured, 'Should output dashboard card');
    assert.match(captured.text, /₦CHUKS/, 'Header is ₦CHUKS');
    assert.match(captured.text, /IDENTITY/, 'Displays IDENTITY section');
    assert.match(captured.text, /MONEY/, 'Displays MONEY section');
    assert.match(captured.text, /REWARDS/, 'Displays REWARDS section');
    assert.match(captured.text, /CREDENTIALS/, 'Displays CREDENTIALS section');
    assert.equal(captured.buttons[0].id, 'btn_receive_flow', 'Offers Receive button');
  });

  await t.test('7. Tap [ Share ₦CHUKS ] & [ Invite friends ] -> Viral Loop', async () => {
    let capturedShare = null;
    await service.handleIncomingMessage({
      id: '+2348012345678',
      senderName: 'Chukwudi Okafor',
      text: 'btn_share_chuks',
      isInteractive: true,
      reply: t => { capturedShare = { text: t }; },
      replyWithButtons: (t, b) => { capturedShare = { text: t, buttons: b }; }
    });

    assert.match(capturedShare.text, /SHARE YOUR ₦TAG/, 'Shows share card');
    assert.match(capturedShare.text, /This is my NairaTag/, 'Short personal quote');
    assert.match(capturedShare.text, /ref=CHUKS/, 'Contains viral referral link');

    let capturedRef = null;
    await service.handleIncomingMessage({
      id: '+2348012345678',
      senderName: 'Chukwudi Okafor',
      text: 'btn_referral',
      isInteractive: true,
      reply: t => { capturedRef = { text: t }; },
      replyWithButtons: (t, b) => { capturedRef = { text: t, buttons: b }; }
    });
    assert.match(capturedRef.text, /INVITE YOUR PEOPLE/, 'Psychological framing: Get your circle their ₦Tags');
  });

  await t.test('8. Group chat summon: "@nairatag tag me"', async () => {
    let captured = null;
    await service.handleIncomingMessage({
      id: '+2348012345678',
      senderName: 'Chukwudi Okafor',
      text: '@nairatag tag me',
      isInteractive: false,
      reply: t => { captured = { text: t }; },
      replyWithButtons: (t, b) => { captured = { text: t, buttons: b }; }
    });

    assert.ok(captured, 'Group summon responded');
    assert.match(captured.text, /₦CHUKS/, 'Recognizes claimed user in group');
    assert.match(captured.text, /Verified NairaTag Identity/, 'Displays verification in group');
  });

  await t.test('9. Tag Lookup: "₦ASAKE" (Screen 5)', async () => {
    let captured = null;
    await service.handleIncomingMessage({
      id: '+2348099999999',
      senderName: 'New User',
      text: '₦ASAKE',
      isInteractive: false,
      reply: t => { captured = { text: t }; },
      replyWithButtons: (t, b) => { captured = { text: t, buttons: b }; }
    });

    assert.ok(captured, 'Lookup responded');
    assert.match(captured.text, /₦asake/i, 'Shows tag');
    assert.match(captured.text, /Verified NairaTag/, 'Shows verified badge');
    assert.equal(captured.buttons[0].id, 'btn_send_payment_asake', 'Offers send payment button');
  });

  await t.test('10. Screen 8: Shortcut "Check my ₦Tag" -> Popular names list', async () => {
    let captured = null;
    await service.handleIncomingMessage({
      id: '+2348088888888',
      senderName: 'Visitor',
      text: 'Check my ₦Tag',
      isInteractive: false,
      reply: t => { captured = { text: t }; },
      replyWithButtons: (t, b) => { captured = { text: t, buttons: b }; }
    });

    assert.ok(captured, 'Responds to Check my ₦Tag shortcut');
    assert.match(captured.text, /Popular names:/, 'Displays popular names header');
    assert.match(captured.text, /Michael/, 'Includes Michael in list');
    assert.match(captured.text, /Chioma/, 'Includes Chioma in list');
    assert.equal(captured.buttons.length, 3, 'Offers popular quick name buttons');
    assert.equal(captured.buttons[0].id, 'btn_check_tag_michael', 'First button checks Michael');
  });

  await t.test('11. Screen 2: Check Name Availability -> "Michael"', async () => {
    let captured = null;
    await service.handleIncomingMessage({
      id: '+2348088888888',
      senderName: 'Visitor',
      text: 'btn_check_tag_michael',
      isInteractive: true,
      reply: t => { captured = { text: t }; },
      replyWithButtons: (t, b) => { captured = { text: t, buttons: b }; }
    });

    assert.ok(captured, 'Checks name');
    assert.match(captured.text, /Let me check for you/, 'Contains check intro');
    assert.match(captured.text, /#michael/, 'Shows #michael');
    assert.match(captured.text, /Available/, 'Shows Available badge');
    assert.match(captured.text, /Base wallet \(onchain\)/, 'Outlines perks');
    assert.equal(captured.buttons[0].id, 'btn_claim_tag_michael', 'Offers Claim button');
  });

  await t.test('12. Screen 3: Claim Flow -> "Connect your wallet"', async () => {
    let captured = null;
    await service.handleIncomingMessage({
      id: '+2348088888888',
      senderName: 'Visitor',
      text: 'btn_claim_tag_michael',
      isInteractive: true,
      reply: t => { captured = { text: t }; },
      replyWithButtons: (t, b) => { captured = { text: t, buttons: b }; }
    });

    assert.ok(captured, 'Shows wallet connect screen');
    assert.match(captured.text, /Connect your wallet/, 'Has Connect wallet card');
    assert.match(captured.text, /Web3 wallet or create a new one/, 'Describes wallet options');
    assert.equal(captured.buttons[0].id, 'btn_confirm_claim_michael', 'Verify & claim button');
    assert.equal(captured.buttons[1].id, 'btn_create_wallet_michael', 'Create new wallet button');
  });

  await t.test('13. Screen 6: Send Payment Intent -> "Send ₦25,000 to ₦mikki"', async () => {
    let captured = null;
    await service.handleIncomingMessage({
      id: '+2348077777777',
      senderName: 'Sender User',
      text: 'Send ₦25,000 to ₦mikki',
      isInteractive: false,
      reply: t => { captured = { text: t }; },
      replyWithButtons: (t, b) => { captured = { text: t, buttons: b }; }
    });

    assert.ok(captured, 'Responds to Send Payment intent');
    assert.match(captured.text, /You're about to send \*₦25,000\* to \*₦mikki\*/, 'Confirms amount and recipient');
    assert.match(captured.text, /Amount: \*₦25,000\*/, 'Shows amount card');
    assert.match(captured.text, /Flutterwave/, 'Credits Flutterwave payment rail partner');
    assert.equal(captured.buttons[0].id, 'btn_checkout_pay_mikki_25000', 'Continue to pay button ready');
  });

  cleanup();
});
