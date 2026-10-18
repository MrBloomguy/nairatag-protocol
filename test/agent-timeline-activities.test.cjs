/**
 * Test Suite: Agent Timeline & Public Activities Layer
 * Verifies:
 * - Activity event generation & data modeling
 * - Privacy filtering & sanitization ("Public Activity != Public Data")
 * - Filter views (All, Following, Jobs, Offers, Tag2Tag, Reputation)
 * - Agent following & relationships
 * - Machine-readable discovery queries for AI agents
 */

const assert = require('assert');
const { AgentTimelineEngine, ActivityType, Visibility } = require('../sdk/src/wallet/timeline');
const { ActionEngine } = require('../sdk/src/wallet/action-engine');

async function runTimelineTests() {
  console.log('--- 📡 STARTING NAIRATAG AGENT TIMELINE & ACTIVITIES TEST SUITE ---\n');

  const timeline = new AgentTimelineEngine();

  // -----------------------------------------------------------------
  // [1/6] Test Seed Activities & Schema Integrity
  // -----------------------------------------------------------------
  console.log('[1/6] Testing Seed Activities & Schema...');
  const allActivities = timeline.getActivities({ filter: 'all' });
  assert.ok(allActivities.length >= 8, `Expected at least 8 activities, got ${allActivities.length}`);
  
  const sample = allActivities[0];
  assert.ok(sample.id, 'Activity must have an id');
  assert.ok(sample.agentTag, 'Activity must have agentTag');
  assert.ok(sample.type, 'Activity must have type');
  assert.ok(sample.title, 'Activity must have title');
  console.log(`✓ Verified ${allActivities.length} structured activity records loaded.`);

  // -----------------------------------------------------------------
  // [2/6] Test Privacy Engine ("Public Activity != Public Data")
  // -----------------------------------------------------------------
  console.log('\n[2/6] Testing Privacy Engine & Sanitization...');
  const privateActivity = timeline.recordActivity({
    agentTag: '₦SEGUN',
    type: ActivityType.PAYMENT,
    visibility: Visibility.PUBLIC,
    title: 'Settled payment to ₦SHOP',
    description: 'Instant settlement confirmed on Celo',
    targetAgentTag: '₦SHOP',
    sensitiveFields: ['amountWei', 'privateKey', 'instructions'],
    amountWei: '100000000000000000000',
    privateKey: '0xabc123...',
    instructions: 'Secret automated agent rules',
    metadata: {
      network: 'Celo',
      amount: '85,000 cNGN',
      amountPublic: false
    }
  });

  const publicFeed = timeline.getActivities({ filter: 'all' });
  const fetched = publicFeed.find(a => a.id === privateActivity.id);

  assert.ok(fetched, 'Activity should be present in public feed');
  assert.strictEqual(fetched.amountWei, undefined, 'Sensitive field amountWei must be stripped');
  assert.strictEqual(fetched.privateKey, undefined, 'Sensitive field privateKey must be stripped');
  assert.strictEqual(fetched.instructions, undefined, 'Sensitive field instructions must be stripped');
  assert.strictEqual(fetched.metadata.amount, undefined, 'Private amount must be sanitized when amountPublic is false');
  console.log('✓ Privacy Invariant Verified: Public Activity != Public Data (sensitive data stripped).');

  // -----------------------------------------------------------------
  // [3/6] Test Timeline Filtering (Jobs, Offers, Tag2Tag, Reputation)
  // -----------------------------------------------------------------
  console.log('\n[3/6] Testing Timeline Categorical Filters...');
  const jobs = timeline.getActivities({ filter: 'jobs' });
  assert.ok(jobs.every(a => a.type === ActivityType.JOB_COMPLETED || a.type === ActivityType.REQUEST), 'Jobs filter only contains jobs/requests');

  const offers = timeline.getActivities({ filter: 'offers' });
  assert.ok(offers.every(a => a.type === ActivityType.OFFER), 'Offers filter only contains offers');

  const tag2tag = timeline.getActivities({ filter: 'tag2tag' });
  assert.ok(tag2tag.every(a => a.type === ActivityType.TAG2TAG), 'Tag2Tag filter only contains tag2tag interactions');

  const rep = timeline.getActivities({ filter: 'reputation' });
  assert.ok(rep.every(a => a.type === ActivityType.REPUTATION || a.type === ActivityType.VERIFICATION), 'Reputation filter only contains rep/verification');
  console.log('✓ Categorical filters validated (Jobs, Offers, Tag2Tag, Reputation).');

  // -----------------------------------------------------------------
  // [4/6] Test Agent Following & Personalized Feed
  // -----------------------------------------------------------------
  console.log('\n[4/6] Testing Agent Follows & Following Feed...');
  timeline.followAgent('₦SEGUN', '₦DEV');
  timeline.followAgent('₦SEGUN', '₦DESIGNER');

  assert.strictEqual(timeline.isFollowing('₦SEGUN', '₦DEV'), true);
  assert.strictEqual(timeline.isFollowing('₦SEGUN', '₦SHOP'), false);

  const followingFeed = timeline.getActivities({ filter: 'following', viewerTag: '₦SEGUN' });
  assert.ok(followingFeed.length > 0, 'Following feed should return activities from followed agents');
  assert.ok(followingFeed.every(a => a.agentTag === '₦DEV' || a.agentTag === '₦DESIGNER' || a.targetAgentTag === '₦DEV' || a.targetAgentTag === '₦DESIGNER'), 'Following feed strictly filters to followed tags');

  timeline.unfollowAgent('₦SEGUN', '₦DEV');
  assert.strictEqual(timeline.isFollowing('₦SEGUN', '₦DEV'), false);
  console.log('✓ Agent follow/unfollow and personalized timeline verified.');

  // -----------------------------------------------------------------
  // [5/6] Test Live Tag2Tag Activity Stream Integration
  // -----------------------------------------------------------------
  console.log('\n[5/6] Testing Tag2Tag Chat -> Timeline Activity Stream...');
  const actionEngine = new ActionEngine({ timeline });

  // Simulate user negotiating with ₦DEV in chat
  await actionEngine.processPrompt('@₦DEV Can you build a landing page for ₦100k?', { tag: '₦SEGUN' });

  const updatedFeed = timeline.getActivities({ filter: 'all' });
  const latestTag2Tag = updatedFeed.find(a => a.agentTag === '₦SEGUN' && a.targetAgentTag === '₦DEV');
  assert.ok(latestTag2Tag, 'Tag2Tag chat interaction must produce an observable activity record');
  assert.strictEqual(latestTag2Tag.type, ActivityType.TAG2TAG);
  assert.ok(latestTag2Tag.title.includes('Negotiation'), 'Title indicates negotiation');
  console.log('✓ In-chat Tag2Tag negotiation seamlessly published to real-time activity layer.');

  // -----------------------------------------------------------------
  // [6/6] Test Programmatic Machine-Readable Discovery
  // -----------------------------------------------------------------
  console.log('\n[6/6] Testing Machine-Readable Agent Discovery Queries...');
  const devProfile = timeline.getAgentProfile('₦DEV');
  assert.ok(devProfile, 'Profile exists for ₦DEV');
  assert.strictEqual(devProfile.tag, '₦DEV');
  assert.ok(devProfile.capabilities.length > 0, 'Has capabilities');
  assert.ok(devProfile.recentJobs.length > 0, 'Has recent jobs');

  const searchResults = timeline.getActivities({ query: 'designer' });
  assert.ok(searchResults.length > 0, 'Search for "designer" returns matches');
  console.log('✓ Machine-readable profile & programmatic discovery operational.');

  console.log('\n============================================================');
  console.log('🎉 ALL 6 AGENT TIMELINE & ACTIVITIES TESTS PASSED CLEANLY!');
  console.log('============================================================\n');
}

runTimelineTests().catch(err => {
  console.error('❌ Timeline Test Suite Failed:', err);
  process.exit(1);
});
