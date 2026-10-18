/**
 * End-to-End Chat Agent Test for Gemini 2.5 Flash-Lite & Multi-Intent Routing
 */

const { createGeminiService } = require('../bots/nairatag-claim/src/gemini-service');
const { createMuseSparkAgent } = require('../bots/nairatag-claim/src/muse-spark');
const { createChowdeckService } = require('../bots/nairatag-claim/src/chowdeck-service');
const { createOjaLMService } = require('../bots/nairatag-claim/src/ojalm-service');
const { createPhoneResolverService } = require('../bots/nairatag-claim/src/phone-resolver-service');
const { createNotificationStore } = require('../bots/nairatag-claim/src/notification-store');

async function runTestSuite() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🧪 NAIRATAG GEMINI 2.5 FLASH-LITE CHAT AGENT TEST SUITE');
  console.log('═══════════════════════════════════════════════════════\n');

  const store = createNotificationStore(':memory:');
  const mockTagService = {
    resolveTag: async (tag) => ({ tag, resolvedAddress: '0x8217316A99D41c6DCE89d46E9A34c1143d1a914c' }),
    getNetworkInfo: () => ({ resolution: { registryAddress: '0x7FA9385bE102ac3EAc297483Dd6233D62b3e1496' } })
  };
  const phoneService = createPhoneResolverService({ notificationStore: store, tagService: mockTagService });
  const chowdeck = createChowdeckService({ notificationStore: store });
  const ojalm = createOjaLMService();
  const gemini = createGeminiService();

  const agent = createMuseSparkAgent({
    tagService: mockTagService,
    phoneResolverService: phoneService,
    pointsService: { getAccountSummary: () => ({ totalPoints: 250, referralCode: 'REF123' }), getLeaderboard: () => ({ leaderboard: [] }) },
    marketplaceService: { getListings: () => [] },
    chowdeckService: chowdeck,
    ojalmService: ojalm,
    geminiService: gemini
  });

  const testCases = [
    {
      name: 'Conversational Knowledge (Gemini 2.5 Flash-Lite)',
      prompt: 'Explain what NairaTag handles are and why Celo was chosen',
      expectedModel: 'Gemini 2.5 Flash-Lite',
      expectedIntent: 'GEMINI_CONVERSATION'
    },
    {
      name: 'Food Delivery Intent (Chowdeck)',
      prompt: 'I want to order jollof rice under ₦6000',
      expectedWidget: 'chowdeck_order',
      expectedIntent: 'CHOWDECK_FOOD_ORDER'
    },
    {
      name: 'Commerce & Price Intelligence (OjaLM)',
      prompt: 'What is the market price of iPhone 15 Pro Max?',
      expectedWidget: 'ojalm_intel',
      expectedIntent: 'OJALM_COMMERCE_INTEL'
    },
    {
      name: 'Tag2Tag Negotiation',
      prompt: 'Negotiate with ₦DEV to build landing page for ₦100k',
      expectedIntent: 'TAG2TAG_NEGOTIATION_AGREED'
    },
    {
      name: 'Conditional Escrow Task',
      prompt: 'Pay ₦DESIGNER ₦50k when the logo is delivered',
      expectedWidget: 'escrow_locked_card',
      expectedIntent: 'TAG2TAG_ESCROW_LOCKED'
    }
  ];

  let passed = 0;
  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    console.log(`[${i + 1}/${testCases.length}] Testing: ${tc.name}...`);
    console.log(`     User Prompt: "${tc.prompt}"`);
    const start = Date.now();
    const res = await agent.processPrompt(tc.prompt, { tag: '₦CHUKS', network: 'celo' });
    const duration = Date.now() - start;

    console.log(`     Intent: ${res.intent}`);
    if (res.model) console.log(`     Model: ${res.model}`);
    if (res.widgetType) console.log(`     Widget: ${res.widgetType}`);
    if (res.thoughtProcess) console.log(`     Reasoning Steps: ${res.thoughtProcess.length}`);
    console.log(`     Response snippet: "${(res.replyText || '').replace(/[\r\n]+/g, ' ').slice(0, 90)}..."`);
    console.log(`     Latency: ${duration}ms`);

    let ok = true;
    if (tc.expectedIntent && res.intent !== tc.expectedIntent) {
      console.error(`     ❌ Intent mismatch: expected ${tc.expectedIntent}, got ${res.intent}`);
      ok = false;
    }
    if (tc.expectedModel && res.model !== tc.expectedModel) {
      console.error(`     ❌ Model mismatch: expected ${tc.expectedModel}, got ${res.model}`);
      ok = false;
    }
    if (tc.expectedWidget && res.widgetType !== tc.expectedWidget) {
      console.error(`     ❌ Widget mismatch: expected ${tc.expectedWidget}, got ${res.widgetType}`);
      ok = false;
    }

    if (ok) {
      console.log(`     ✅ PASS\n`);
      passed++;
    } else {
      console.log(`     ❌ FAIL\n`);
    }
  }

  console.log(`═══════════════════════════════════════════════════════`);
  console.log(`RESULT: ${passed}/${testCases.length} TESTS PASSED CLEANLY`);
  console.log(`═══════════════════════════════════════════════════════`);
}

runTestSuite().catch(console.error);
