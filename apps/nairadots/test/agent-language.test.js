import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AGENT_LANGUAGES,
  getAgentLanguagePreference,
  normalizeAgentLanguage,
  saveAgentLanguagePreference,
} from '../src/services/agentLanguage.js';

test('agent language settings expose the first supported rollout languages', () => {
  assert.deepEqual(AGENT_LANGUAGES.map(({ value }) => value), ['auto', 'en', 'yo', 'pcm', 'ha', 'ig']);
});

test('agent language settings normalize supported values and safely fall back', () => {
  assert.equal(normalizeAgentLanguage(' YO '), 'yo');
  assert.equal(normalizeAgentLanguage('pcm'), 'pcm');
  assert.equal(normalizeAgentLanguage('unsupported-language'), 'auto');
  assert.equal(normalizeAgentLanguage(null), 'auto');
});

test('agent language preference is saved per signed-in account', () => {
  const values = new Map();
  globalThis.window = { localStorage: {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  } };
  try {
    saveAgentLanguagePreference('0xAbC', 'yo');
    assert.equal(getAgentLanguagePreference('0xabc'), 'yo');
    assert.equal(getAgentLanguagePreference('0xdef'), 'auto');
  } finally {
    delete globalThis.window;
  }
});
