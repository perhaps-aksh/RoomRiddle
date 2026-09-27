import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialGameState } from './state';

test('initial state starts in the lobby with no progress', () => {
  const state = createInitialGameState('the-last-train');

  assert.equal(state.mysteryId, 'the-last-train');
  assert.equal(state.phase, 'lobby');
  assert.equal(state.score, 0);
  assert.equal(state.deadline, null);
  assert.equal(state.endingId, null);
  assert.deepEqual(state.solvedPuzzleIds, []);
  assert.deepEqual(state.discoveredClueIds, []);
  assert.deepEqual(state.revealedHintCounts, {});
});

test('each initial state is a fresh object', () => {
  const a = createInitialGameState('the-last-train');
  const b = createInitialGameState('the-last-train');

  a.solvedPuzzleIds.push('p1');
  assert.deepEqual(b.solvedPuzzleIds, []);
});
