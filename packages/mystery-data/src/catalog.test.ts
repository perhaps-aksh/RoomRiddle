import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findMystery, mysteryCatalog } from './index';

test('catalog lists The Last Train first, then the three planned mysteries', () => {
  assert.deepEqual(
    mysteryCatalog.map((m) => m.id),
    ['the-last-train', 'the-hollow-manor', 'signal-lost', 'the-forgotten-temple'],
  );
});

test('mystery ids are unique kebab-case', () => {
  const ids = mysteryCatalog.map((m) => m.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[a-z0-9]+(-[a-z0-9]+)*$/);
});

test('every summary is complete and has a sane player range', () => {
  for (const m of mysteryCatalog) {
    assert.ok(m.title && m.tagline && m.genre && m.synopsis, `${m.id} has empty text`);
    assert.ok(m.estimatedMinutes > 0, `${m.id} duration`);
    assert.ok(m.minPlayers >= 1 && m.minPlayers <= m.maxPlayers, `${m.id} player range`);
  }
});

test('findMystery returns the summary or undefined', () => {
  assert.equal(findMystery('the-last-train')?.title, 'The Last Train');
  assert.equal(findMystery('does-not-exist'), undefined);
});
