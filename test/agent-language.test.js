import test from 'node:test';
import assert from 'node:assert/strict';
import {
  agentLanguageName,
  buildAgentLanguageInstruction,
  isGeminiLiveLanguageSupported,
  normalizeAgentLanguage,
} from '../lib/arc/language.js';

test('saved language values normalize old labels and only accept configured languages', () => {
  assert.equal(normalizeAgentLanguage('Yoruba'), 'yo');
  assert.equal(normalizeAgentLanguage('Nigerian Pidgin'), 'pcm');
  assert.equal(normalizeAgentLanguage('ig'), 'ig');
  assert.equal(normalizeAgentLanguage('Klingon'), 'auto');
});

test('agent language instruction names the selected language and preserves agent capabilities', () => {
  const instruction = buildAgentLanguageInstruction('ha');
  assert.match(instruction, /Hausa/);
  assert.match(instruction, /Do not change this agent's identity, role, instructions, permissions, tools/);
  assert.match(buildAgentLanguageInstruction('auto'), /language the user used most recently/);
  assert.equal(agentLanguageName('pcm'), 'Nigerian Pidgin');
});

test('live voice is only enabled for languages supported by the current Gemini Live path', () => {
  assert.equal(isGeminiLiveLanguageSupported('yo'), true);
  assert.equal(isGeminiLiveLanguageSupported('ha'), true);
  assert.equal(isGeminiLiveLanguageSupported('ig'), false);
  assert.equal(isGeminiLiveLanguageSupported('pcm'), false);
});