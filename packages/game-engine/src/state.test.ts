import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createInitialGameState, totalIncorrectAttempts} from './state';

test('initial state is not started, with no progress', () => {
  const state = createInitialGameState('the-last-train');

  assert.equal(state.schemaVersion, 1);
  assert.equal(state.mysteryId, 'the-last-train');
  assert.equal(state.status, 'not-started');
  assert.equal(state.currentSceneId, null);
  assert.equal(state.currentPuzzleId, null);
  assert.equal(state.score, 0);
  assert.equal(state.deadline, null);
  assert.equal(state.endingId, null);
  assert.deepEqual(state.solvedPuzzleIds, []);
  assert.deepEqual(state.discoveredClueIds, []);
  assert.deepEqual(state.unlockedPuzzleIds, []);
  assert.deepEqual(state.usedHintIds, []);
  assert.deepEqual(state.incorrectAttempts, {});
});

test('each initial state is a fresh object', () => {
  const a = createInitialGameState('the-last-train');
  const b = createInitialGameState('the-last-train');

  a.solvedPuzzleIds.push('p1');
  assert.deepEqual(b.solvedPuzzleIds, []);
});

test('initial state is plain JSON', () => {
  const state = createInitialGameState('x');
  assert.deepEqual(JSON.parse(JSON.stringify(state)), state);
});

test('totalIncorrectAttempts sums every puzzle', () => {
  const state = {...createInitialGameState('x'), incorrectAttempts: {a: 2, b: 3}};
  assert.equal(totalIncorrectAttempts(state), 5);
});
