import test from 'node:test';
import assert from 'node:assert/strict';
import { createFunctionResponsePart, formatGroundedReply, getThinkingLevel, shouldOfferSpecialistConsult, shouldUseWebSearch } from '../lib/arc/gemini-grounding.js';

test('web grounding is offered for explicit searches and fresh facts, not ordinary chat', () => {
  assert.equal(shouldUseWebSearch('Search the web for current Arc Testnet docs'), true);
  assert.equal(shouldUseWebSearch('What is the latest Gemini Flash model?'), true);
  assert.equal(shouldUseWebSearch('Help me continue the current project'), false);
});

test('specialist consultation is available only after an explicit user request', () => {
  assert.equal(shouldOfferSpecialistConsult('Please ask the food specialist to find options'), true);
  assert.equal(shouldOfferSpecialistConsult('Which agent could help with this?'), false);
  assert.equal(shouldOfferSpecialistConsult('The agent should be more useful'), false);
});

test('reasoning effort increases for complex requests', () => {
  assert.equal(getThinkingLevel('Hi, how are you?'), 'medium');
  assert.equal(getThinkingLevel('Analyze the architecture and compare trade-offs across the proposed system in detail'), 'high');
});

test('grounded citations point to safe HTTPS sources and preserve source attribution', () => {
  const reply = formatGroundedReply('The result is current.', [{
    groundingChunks: [
      { web: { uri: 'https://example.com/report', title: 'Example Report' } },
      { web: { uri: 'javascript:alert(1)', title: 'Unsafe' } },
    ],
    groundingSupports: [{ segment: { endIndex: 22 }, groundingChunkIndices: [0, 1] }],
  }]);
  assert.match(reply, /The result is current\. \[1\]/);
  assert.match(reply, /Sources\n\[1\] Example Report: https:\/\/example\.com\/report/);
  assert.doesNotMatch(reply, /javascript:/);
});

test('duplicate grounding sources are listed once', () => {
  const reply = formatGroundedReply('Claim.', [
    { groundingChunks: [{ web: { uri: 'https://example.com/a', title: 'Source' } }] },
    { groundingChunks: [{ web: { uri: 'https://example.com/a', title: 'Source' } }] },
  ]);
  assert.equal((reply.match(/https:\/\/example\.com\/a/g) || []).length, 1);
});

test('GenerateContent tool replies correlate to calls with call_id', () => {
  assert.deepEqual(createFunctionResponsePart('lookup', 'call-1', { result: 'ok' }), {
    functionResponse: { name: 'lookup', call_id: 'call-1', response: { result: 'ok' } },
  });
});

test('inline citations use final-turn grounding spans and can cite sources gathered earlier', () => {
  const reply = formatGroundedReply('Final answer.', [
    { groundingChunks: [{ web: { uri: 'https://example.com/previous', title: 'Prior' } }], groundingSupports: [{ segment: { endIndex: 5 }, groundingChunkIndices: [0] }] },
    { groundingChunks: [{ web: { uri: 'https://example.com/final', title: 'Final' } }], groundingSupports: [{ segment: { endIndex: 13 }, groundingChunkIndices: [0] }] },
  ]);
  assert.match(reply, /^Final answer\. \[2\]/);
  assert.match(reply, /\[1\] Prior: https:\/\/example\.com\/previous/);
  assert.match(reply, /\[2\] Final: https:\/\/example\.com\/final/);
  assert.doesNotMatch(reply, /Final answer\. \[1\]/);
});
