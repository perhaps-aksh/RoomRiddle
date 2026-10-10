import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findMystery, mysteryCatalog, playableMysteries } from './index';
import type {GameAction} from '@roomriddle/shared-types';
import {applyAction, createInitialGameState, sceneSequence, validateMysteryDefinition} from '@roomriddle/game-engine';

test('catalog lists the five cases, The Last Train first, all playable', () => {
  assert.deepEqual(
    mysteryCatalog.map((m) => m.id),
    ['the-last-train', 'the-hollow-manor', 'signal-lost', 'the-forgotten-temple', 'the-yakshas-questions'],
  );
  assert.equal(playableMysteries.length, 5);
  assert.ok(mysteryCatalog.every((m) => m.availability === 'playable'));
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

test('every playable mystery is valid, has three hints per puzzle and a truth table', () => {
  assert.ok(playableMysteries.length >= 1);
  for (const m of playableMysteries) {
    assert.deepEqual(validateMysteryDefinition(m), [], `${m.summary.id} has content problems`);
    for (const p of m.puzzles) assert.equal(p.hints.length, 3, `${m.summary.id}/${p.id} needs 3 hints`);
    assert.ok(m.truth, `${m.summary.id} has no truth table`);
    assert.ok(m.audience?.label, `${m.summary.id} has no audience label`);
    assert.ok(findMystery(m.summary.id), `${m.summary.id} is not in the catalog`);
  }
});

test('every playable mystery can be played start to finish to its best ending', () => {
  for (const m of playableMysteries) {
    let state = createInitialGameState(m.summary.id);
    const T0 = 1_700_000_000_000;
    const act = (a: GameAction) => {
      state = applyAction(m, state, a).state;
    };
    act({type: 'START_MYSTERY', mysteryId: m.summary.id});
    act({type: 'ADVANCE_SCENE', at: T0});
    for (const scene of sceneSequence(m)) {
      assert.equal(state.currentSceneId, scene.id, `${m.summary.id}: expected to be in ${scene.id}`);
      // Clues can depend on puzzles (and vice versa): discover whatever is available after each step.
      const discover = () => scene.clueIds.forEach(id => act({type: 'DISCOVER_CLUE', clueId: id, at: T0 + 1000}));
      discover();
      for (const id of scene.puzzleIds) {
        const puzzle = m.puzzles.find(p => p.id === id)!;
        act({type: 'SUBMIT_ANSWER', puzzleId: id, answer: puzzle.acceptedAnswers[0]!, at: T0 + 60_000});
        assert.ok(state.solvedPuzzleIds.includes(id), `${m.summary.id}: ${id} was not solved by its own answer`);
        discover();
      }
      for (const id of scene.clueIds) assert.ok(state.discoveredClueIds.includes(id), `${m.summary.id}: clue ${id} could never be found`);
      for (const id of scene.choiceIds ?? []) {
        const choice = m.choices!.find(c => c.id === id)!;
        const best = choice.options.find(o => o.completesMystery) ?? choice.options[0]!;
        act({type: 'MAKE_CHOICE', choiceId: id, optionId: best.id, at: T0 + 60_000});
      }
      if (state.status !== 'completed' && scene.nextSceneId) act({type: 'ADVANCE_SCENE', at: T0 + 61_000});
    }
    assert.equal(state.status, 'completed', `${m.summary.id} never completes`);
    assert.equal(state.endingId, m.endings[0]!.id, `${m.summary.id}: a perfect run should reach its first (best) ending`);
  }
});
