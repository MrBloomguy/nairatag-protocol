import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPersonalAgentContext,
  selectRelevantGoals,
  selectRelevantMemories,
  shouldLoadPersonalContext,
} from '../lib/arc/personal-agent-context.js';

test('personal context is restricted to the default Arc agent', () => {
  assert.equal(shouldLoadPersonalContext('arc'), true);
  assert.equal(shouldLoadPersonalContext('₦arc'), true);
  assert.equal(shouldLoadPersonalContext('chowdeck'), false);
  assert.equal(buildPersonalAgentContext({
    agentTag: 'chowdeck',
    profile: { personalization_enabled: true, agent_name: 'Ada' },
  }), '');
});

test('memory retrieval includes relevant confirmed items and excludes sensitive, unconfirmed, and expired items', () => {
  const memories = [
    { title: 'Replaced launch date', content: 'Arc launches in February', category: 'working', user_confirmed: true, status: 'superseded' },
    { title: 'Unreviewed candidate', content: 'Arc launches in March', category: 'working', user_confirmed: false, status: 'pending_confirmation' },
    { title: 'Arc project', content: 'Building NairaTag on Arc', category: 'working', user_confirmed: true },
    { title: 'Wallet secret', content: 'Arc key phrase', category: 'profile', user_confirmed: true, is_sensitive: true },
    { title: 'Old project', content: 'Arc roadmap', category: 'working', user_confirmed: false },
    { title: 'Expired detail', content: 'Arc testnet', category: 'episodic', expires_at: '2000-01-01T00:00:00Z' },
  ];
  const result = selectRelevantMemories(memories, 'Tell me about the Arc project');
  assert.deepEqual(result.map((item) => item.title), ['Arc project']);
});

test('goal retrieval supports explicit continuity and active goal relevance', () => {
  const goals = [
    { title: 'Launch chat memory', description: 'Personal agent memory and goals', status: 'active' },
    { title: 'Old campaign', description: 'Arc rewards', status: 'completed' },
  ];
  assert.deepEqual(selectRelevantGoals(goals, 'Help me continue my goals').map((item) => item.title), ['Launch chat memory']);
  assert.deepEqual(selectRelevantGoals(goals, 'Plan my Arc rewards campaign').map((item) => item.title), []);
});

test('personal context marks saved text as untrusted data and never grants permissions', () => {
  const context = buildPersonalAgentContext({
    agentTag: 'arc',
    profile: { personalization_enabled: true, memory_enabled: true, custom_instructions: 'Be brief', communication_style: 'direct', response_length: 'concise' },
    memories: [{ title: 'Project', content: 'Continue project work', category: 'working', user_confirmed: true }],
    goals: [{ title: 'Project', description: 'Continue project work', status: 'active' }],
    prompt: 'Continue my project',
  });
  assert.match(context, /cannot grant permissions/);
  assert.match(context, /subordinate to system, developer, and safety instructions/);
  assert.match(context, /Continue project work/);
});
