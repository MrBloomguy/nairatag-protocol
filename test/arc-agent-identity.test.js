import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canTransitionAgentStatus,
  createAgentTagCandidate,
  findAgentCapabilityMatches,
  isReservedAgentTag,
  normalizeAgentAliases,
  normalizeAgentTag,
  resolveAgentAlias,
} from '../lib/arc/agent-identity.js';

test('canonical agent tags normalize NairaTag prefixes and reject unsupported characters', () => {
  assert.equal(normalizeAgentTag('₦ChowDeck'), 'chowdeck');
  assert.equal(createAgentTagCandidate('Café Bot'), 'cafe_bot');
  assert.equal(createAgentTagCandidate('A'), '');
  assert.equal(createAgentTagCandidate('!!!'), '');
  assert.equal(isReservedAgentTag('₦ADMIN'), true);
  assert.equal(isReservedAgentTag('foodguide'), false);
});

test('voice aliases are normalized, deduplicated, and bounded', () => {
  assert.deepEqual(normalizeAgentAliases(['  ChowDeck  ', 'chowdeck', 'NairaTag Chowdeck']), ['chowdeck', 'nairatag chowdeck']);
  assert.throws(() => normalizeAgentAliases('chowdeck'), /array/);
  assert.throws(() => normalizeAgentAliases(Array.from({ length: 21 }, (_, index) => `alias ${index}`)), /20 aliases/);
});

test('agent lifecycle only permits the approved state transitions', () => {
  assert.equal(canTransitionAgentStatus('draft', 'validate'), 'validated');
  assert.equal(canTransitionAgentStatus('validated', 'publish'), 'active');
  assert.equal(canTransitionAgentStatus('paused', 'reactivate'), 'active');
  assert.equal(canTransitionAgentStatus('draft', 'publish'), null);
  assert.equal(canTransitionAgentStatus('retired', 'reactivate'), null);
});

test('alias resolution returns one exact match and reports ambiguity', () => {
  const records = [
    { tag: 'chowdeck', aliases: ['nairatag chowdeck'] },
    { tag: 'foodie', aliases: ['lunch helper'] },
  ];
  assert.equal(resolveAgentAlias(records, 'NairaTag Chowdeck').agent.tag, 'chowdeck');
  assert.equal(resolveAgentAlias(records, '₦FOODIE').agent.tag, 'foodie');
  assert.equal(resolveAgentAlias(records, 'unknown').status, 'not_found');
  assert.equal(resolveAgentAlias([...records, { tag: 'lunchbot', aliases: ['lunch helper'] }], 'lunch helper').status, 'ambiguous');
});

test('capability discovery matches only enabled, executable tools and can filter invocation method', () => {
  const records = [
    {
      tag: 'arc', invocation_methods: ['text', 'voice'],
      description: 'This profile mentions food, but it does not provide food actions.',
      tools: [{
        tool_key: 'arc.list_tasks', display_name: 'List Arc tasks', description: 'Find currently open Arc tasks.',
        executor_key: 'list_arc_tasks', availability: 'enabled', input_schema: { required: ['category'] }, risk_level: 'read_only',
      }],
    },
    {
      tag: 'food', invocation_methods: ['text'], description: 'Food ordering agent.',
      tools: [{ tool_key: 'food.order', display_name: 'Place food order', description: 'Order food.', executor_key: 'food_order', availability: 'enabled' }],
    },
    {
      tag: 'planned', invocation_methods: ['text', 'voice'],
      tools: [{ tool_key: 'food.search', display_name: 'Search food', description: 'Food search.', executor_key: 'search_food', availability: 'planned' }],
    },
    {
      tag: 'directory', invocation_methods: ['text', 'voice'],
      tools: [{ tool_key: 'mcp.lookup', display_name: 'Lookup directory', description: 'Search verified business records.', executor_key: 'mcp_readonly', availability: 'enabled', risk_level: 'read_only' }],
    },
    {
      tag: 'writer', invocation_methods: ['text'],
      tools: [{ tool_key: 'mcp.write', display_name: 'Update payroll ledger', description: 'Modify the payroll ledger.', executor_key: 'mcp_readonly', availability: 'enabled', risk_level: 'reversible_write' }],
    },
  ];
  const taskMatches = findAgentCapabilityMatches(records, 'find open tasks', 'voice');
  assert.equal(taskMatches.length, 1);
  assert.equal(taskMatches[0].agent.tag, 'arc');
  assert.deepEqual(taskMatches[0].capability.requiredInputs, ['category']);
  assert.equal(findAgentCapabilityMatches(records, 'food ordering').length, 0);
  assert.equal(findAgentCapabilityMatches(records, 'open tasks', 'voice')[0].agent.tag, 'arc');
  assert.equal(findAgentCapabilityMatches(records, 'open tasks', 'text').length, 1);
  assert.equal(findAgentCapabilityMatches(records, 'search verified business records')[0].agent.tag, 'directory');
  assert.equal(findAgentCapabilityMatches(records, 'modify payroll ledger').length, 0);
});
