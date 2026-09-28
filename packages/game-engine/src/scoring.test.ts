import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {Puzzle} from '@roomriddle/shared-types';
import {applyScoreDelta, DEFAULT_SCORING_RULES, resolveScoringRules, scorePuzzle, timeBonus} from './scoring';

const puzzle = (points?: number): Puzzle => ({
  id: 'p',
  sceneId: 's',
  title: 'P',
  prompt: [],
  question: '?',
  input: {kind: 'text'},
  acceptedAnswers: ['a'],
  hints: [],
  solvedText: [],
  points,
});

test('defaults: 100 → 75 → 50 → 25 as hints are used, never below the floor', () => {
  const rules = resolveScoringRules();
  assert.deepEqual(
    [0, 1, 2, 3, 4].map((n) => scorePuzzle(puzzle(), n, rules).awarded),
    [100, 75, 50, 25, 25],
  );
});

test('per-puzzle points and mystery overrides are respected', () => {
  const rules = resolveScoringRules({hintPenalty: 50, minPuzzlePoints: 0});
  assert.equal(scorePuzzle(puzzle(150), 1, rules).awarded, 100);
  assert.equal(scorePuzzle(puzzle(150), 5, rules).awarded, 0);
  assert.equal(rules.incorrectAttemptPenalty, DEFAULT_SCORING_RULES.incorrectAttemptPenalty);
});

test('the default rules are frozen', () => {
  assert.throws(() => {
    (DEFAULT_SCORING_RULES as {puzzlePoints: number}).puzzlePoints = 1;
  });
});

test('score floor and time bonus', () => {
  const rules = resolveScoringRules({timeBonusPerMinute: 5});
  assert.equal(applyScoreDelta(5, -10, rules), 0);
  assert.equal(applyScoreDelta(5, -10, {...rules, allowNegativeScore: true}), -5);
  assert.equal(timeBonus(3 * 60_000 + 59_000, rules), 15);
  assert.equal(timeBonus(-1, rules), 0);
});
