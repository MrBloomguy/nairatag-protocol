import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createSocialAdapter } from '../src/index.js';

test('NairaTagSocialAdapter: parses, enhances content, and derives actions', async () => {
  const adapter = createSocialAdapter({ platformName: 'mastodon' });

  const rawPost = 'Just listened to ₦ASAKE new track! Sending ₦5k support.';
  const entities = adapter.parse(rawPost);

  assert.equal(entities.length, 1);
  assert.equal(entities[0].tag, 'ASAKE');

  const enhanced = adapter.enhanceContent(rawPost);
  assert.ok(enhanced.includes('data-nairatag="ASAKE"'));
  assert.ok(enhanced.includes('₦5k')); // currency untouched

  // Actions for claimed entity
  const claimedActions = adapter.getActions({
    tag: 'ASAKE',
    display: '₦ASAKE',
    available: false,
    profileUrl: 'https://nairatag.ng/ASAKE'
  });
  assert.equal(claimedActions.some(a => a.id === 'send'), true);
  assert.equal(claimedActions.some(a => a.id === 'tip'), true);

  // Actions for available entity
  const availableActions = adapter.getActions({
    tag: 'NEWTAG',
    display: '₦NEWTAG',
    available: true
  });
  assert.equal(availableActions.length, 1);
  assert.equal(availableActions[0].id, 'claim');
});
