import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeText } from './validation';

test('ignores case and surrounding whitespace', () => {
  assert.equal(normalizeText('  The Conductor  '), 'the conductor');
});

test('collapses inner whitespace, tabs and newlines', () => {
  assert.equal(normalizeText('the \t last\n  train'), 'the last train');
});

test('folds Unicode compatibility forms (full-width digits)', () => {
  assert.equal(normalizeText('１１４７'), '1147');
});

test('does not forgive real differences', () => {
  assert.notEqual(normalizeText('1147'), normalizeText('1174'));
  assert.notEqual(normalizeText('caldwell'), normalizeText('caldwel'));
});
