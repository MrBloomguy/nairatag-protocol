import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseNairaTags,
  isNairaTag,
  normalizeNairaTag,
  extractNairaTags,
  replaceNairaTags,
  isCurrencyAmount,
  isValidTagIdentifier
} from '../src/index.js';

test('Currency disambiguation: distinguishes currency amounts from identity tags', () => {
  // Pure currency amounts - MUST NOT be treated as tags
  assert.equal(isCurrencyAmount('5000'), true);
  assert.equal(isCurrencyAmount('5,000'), true);
  assert.equal(isCurrencyAmount('5k'), true);
  assert.equal(isCurrencyAmount('5K'), true);
  assert.equal(isCurrencyAmount('10m'), true);
  assert.equal(isCurrencyAmount('2.5m'), true);
  assert.equal(isCurrencyAmount('100,000.00'), true);

  // Identity tags - MUST NOT be classified as currency
  assert.equal(isCurrencyAmount('MIKKI'), false);
  assert.equal(isCurrencyAmount('ASAKE'), false);
  assert.equal(isCurrencyAmount('segun_01'), false);
  assert.equal(isCurrencyAmount('9jaBoy'), false);
});

test('Tag validation: strict identifier rules', () => {
  assert.equal(isValidTagIdentifier('MIKKI'), true);
  assert.equal(isValidTagIdentifier('asake'), true);
  assert.equal(isValidTagIdentifier('segun_01'), true);
  assert.equal(isValidTagIdentifier('chika-99'), true);
  assert.equal(isValidTagIdentifier('A'), false); // Too short (< 2)
  assert.equal(isValidTagIdentifier('A'.repeat(33)), false); // Too long (> 32)
  assert.equal(isValidTagIdentifier('-leading'), false);
  assert.equal(isValidTagIdentifier('trailing-'), false);
  assert.equal(isValidTagIdentifier('consecutive--sep'), false);
  assert.equal(isValidTagIdentifier('consecutive__sep'), false);
  assert.equal(isValidTagIdentifier('5000'), false); // Currency
  assert.equal(isValidTagIdentifier('5k'), false); // Currency
});

test('isNairaTag: recognizes valid NairaTags with or without symbol', () => {
  assert.equal(isNairaTag('₦MIKKI'), true);
  assert.equal(isNairaTag('₦mikki'), true);
  assert.equal(isNairaTag('MIKKI'), true);
  assert.equal(isNairaTag('₦ASAKE'), true);
  assert.equal(isNairaTag('₦5,000'), false);
  assert.equal(isNairaTag('₦5k'), false);
  assert.equal(isNairaTag('₦ 5000'), false);
  assert.equal(isNairaTag(''), false);
  assert.equal(isNairaTag(null), false);
});

test('normalizeNairaTag: canonicalizes tags to uppercase with ₦ prefix', () => {
  assert.equal(normalizeNairaTag('₦mikki'), '₦MIKKI');
  assert.equal(normalizeNairaTag('mikki'), '₦MIKKI');
  assert.equal(normalizeNairaTag('₦Mikki'), '₦MIKKI');
  assert.equal(normalizeNairaTag('  ₦asake  '), '₦ASAKE');
});

test('parseNairaTags: extracts identity entities while ignoring currency figures', () => {
  const text = 'Send ₦5,000 to ₦MIKKI for the ticket, or ping ₦ASAKE directly.';
  const entities = parseNairaTags(text);

  assert.equal(entities.length, 2);

  // First entity: ₦MIKKI
  assert.equal(entities[0].tag, 'MIKKI');
  assert.equal(entities[0].canonical, '₦MIKKI');
  assert.equal(entities[0].display, '₦MIKKI');
  assert.equal(entities[0].uri, 'nairatag://MIKKI');
  assert.equal(entities[0].url, 'https://nairatag.ng/MIKKI');
  assert.equal(text.slice(entities[0].start, entities[0].end), '₦MIKKI');

  // Second entity: ₦ASAKE
  assert.equal(entities[1].tag, 'ASAKE');
  assert.equal(entities[1].canonical, '₦ASAKE');
  assert.equal(text.slice(entities[1].start, entities[1].end), '₦ASAKE');
});

test('parseNairaTags: handles trailing punctuation cleanly', () => {
  const text = 'Did you pay ₦MIKKI? Yes, ask ₦TEMI! And ₦CHIKA.';
  const entities = parseNairaTags(text);

  assert.equal(entities.length, 3);
  assert.equal(entities[0].tag, 'MIKKI');
  assert.equal(entities[1].tag, 'TEMI');
  assert.equal(entities[2].tag, 'CHIKA');
});

test('extractNairaTags: returns unique canonical list', () => {
  const text = '₦MIKKI told ₦mikki to meet ₦asake for ₦50k.';
  const tags = extractNairaTags(text);

  assert.deepEqual(tags, ['₦MIKKI', '₦ASAKE']);
});

test('replaceNairaTags: replaces tags without modifying surrounding text or currency', () => {
  const text = 'Pay ₦5,000 to ₦MIKKI now.';
  const output = replaceNairaTags(text, (ent) => `[@${ent.tag}]`);

  assert.equal(output, 'Pay ₦5,000 to [@MIKKI] now.');
});
