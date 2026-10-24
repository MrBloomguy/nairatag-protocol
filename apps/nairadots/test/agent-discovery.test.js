import test from 'node:test';
import assert from 'node:assert/strict';
import {
  discoverAgentsByCapability,
  isAgentDiscoveryRequest,
  resolveAgentMention,
} from '../src/services/agentDiscovery.js';
import { mapArcAgentRecord } from '../src/services/arcAgents.js';

const agents = [
  {
    id: 'agent-food',
    tag: 'chowdeck',
    name: 'Chowdeck Food Guide',
    aliases: ['food guide'],
    voiceAliases: ['Chow Deck'],
    status: 'published',
    callableTools: [{ key: 'find_restaurants', name: 'Find restaurants', description: 'Search menus and food delivery options', availability: 'enabled' }],
  },
  {
    id: 'agent-dev',
    tag: 'dev',
    name: 'Developer Agent',
    status: 'published',
    callableTools: [{ key: 'audit_contract', name: 'Contract audit', description: 'Review Solidity contracts for vulnerabilities', enabled: true }],
  },
  {
    id: 'agent-disabled',
    tag: 'oldfood',
    name: 'Retired Food Agent',
    status: 'retired',
    callableTools: [{ name: 'Food delivery', description: 'Order food' }],
  },
];

test('resolves a canonical NairaTag and registered voice aliases', () => {
  assert.equal(resolveAgentMention('₦CHOWDECK find lunch', agents).agent.id, 'agent-food');
  assert.equal(resolveAgentMention('NairaTag Chowdeck, find lunch', agents).agent.id, 'agent-food');
  assert.equal(resolveAgentMention('Call Chow Deck for lunch', agents).agent.id, 'agent-food');
});

test('does not route a missing or retired identity to another integration', () => {
  assert.deepEqual(resolveAgentMention('₦UNKNOWN do this', agents), { kind: 'unavailable', tag: 'unknown' });
  assert.deepEqual(resolveAgentMention('₦OLDFOOD do this', agents), { kind: 'unavailable', tag: 'oldfood' });
  assert.deepEqual(resolveAgentMention('₦NOSTATUS do this', [{ tag: 'nostatus', name: 'No status' }]), { kind: 'unavailable', tag: 'nostatus' });
});

test('asks for clarification when an alias is shared by published agents', () => {
  const ambiguous = [...agents, { id: 'agent-food-2', tag: 'lunchbot', name: 'Lunch Bot', aliases: ['food guide'], status: 'active' }];
  const result = resolveAgentMention('Ask food guide to find lunch', ambiguous);
  assert.equal(result.kind, 'ambiguous');
  assert.deepEqual(result.agents.map((agent) => agent.tag), ['chowdeck', 'lunchbot']);
});

test('does not confuse a currency amount with a NairaTag mention', () => {
  assert.deepEqual(resolveAgentMention('I need to send ₦5,000', agents), { kind: 'none' });
});

test('discovers only declared callable capabilities on available integrations', () => {
  const result = discoverAgentsByCapability('Find an agent that can search food delivery menus', agents);
  assert.equal(result.length, 1);
  assert.equal(result[0].agent.id, 'agent-food');
  assert.ok(result[0].matchedTerms.includes('food'));
  assert.ok(result[0].matchedTerms.includes('delivery'));
});

test('does not infer a capability from marketing text or a disabled tool', () => {
  const directory = [{
    id: 'agent-marketing',
    tag: 'superchef',
    name: 'Super Chef',
    role: 'The best food agent',
    status: 'published',
    callableTools: [{ name: 'Order food', description: 'Place food orders', availability: 'disabled' }],
  }];
  assert.deepEqual(discoverAgentsByCapability('find food delivery', directory), []);
});

test('recognizes explicit capability-discovery requests', () => {
  assert.equal(isAgentDiscoveryRequest('Find an agent that can audit a contract'), true);
  assert.equal(isAgentDiscoveryRequest('Please show tools for food ordering'), true);
  assert.equal(isAgentDiscoveryRequest('Can you find an agent to book flights?'), true);
});

test('maps public registry identity, aliases, capability and lifecycle fields without exposing runtime config', () => {
  const mapped = mapArcAgentRecord({
    id: 42,
    tag: '₦ChowDeck',
    displayName: 'Food Guide',
    entityType: 'autonomous_agent',
    status: 'published',
    aliases: ['food guide'],
    voice_aliases: ['chow deck'],
    invocation_methods: ['text', 'voice'],
    capabilities: [{ key: 'restaurant_search' }],
    callable_tools: [{ name: 'Search restaurants' }],
    runtime: { endpoint: 'https://private.example' },
  });
  assert.equal(mapped.id, '42');
  assert.equal(mapped.tag, 'chowdeck');
  assert.equal(mapped.canonicalTag, '₦CHOWDECK');
  assert.deepEqual(mapped.voiceAliases, ['chow deck']);
  assert.deepEqual(mapped.invocationMethods, ['text', 'voice']);
  assert.deepEqual(mapped.callableTools, [{ name: 'Search restaurants' }]);
  assert.equal('runtime' in mapped, false);
  assert.equal(mapArcAgentRecord({ tag: 'bad tag with spaces' }), null);
});
