import {test, describe} from 'node:test';
import assert from 'node:assert/strict';
import type {GameAction, GameState} from '@roomriddle/shared-types';
import {
  applyAction,
  createInitialGameState,
  getGameSummary,
  replay,
  validateMysteryDefinition,
} from '@roomriddle/game-engine';
import {theLastTrainMystery as LT} from './index';

const T0 = 1_700_000_000_000;

/** A perfect run through The Last Train: every clue, no hints, no mistakes. */
const PERFECT: GameAction[] = [
  {type: 'START_MYSTERY', mysteryId: 'the-last-train'},
  {type: 'ADVANCE_SCENE', at: T0},
  {type: 'DISCOVER_CLUE', clueId: 'platform-clock'},
  {type: 'DISCOVER_CLUE', clueId: 'company-notice'},
  {type: 'DISCOVER_CLUE', clueId: 'waiting-room-clock'},
  {type: 'SUBMIT_ANSWER', puzzleId: 'station-clock', answer: '11:47'},
  {type: 'ADVANCE_SCENE'},
  {type: 'DISCOVER_CLUE', clueId: 'torn-ticket'},
  {type: 'DISCOVER_CLUE', clueId: 'departure-board'},
  {type: 'DISCOVER_CLUE', clueId: 'carriage-plan'},
  {type: 'SUBMIT_ANSWER', puzzleId: 'torn-ticket', answer: '207|c|7'},
  {type: 'ADVANCE_SCENE'},
  {type: 'DISCOVER_CLUE', clueId: 'pocket-watch'},
  {type: 'DISCOVER_CLUE', clueId: 'conductors-ledger'},
  {type: 'DISCOVER_CLUE', clueId: 'seat-eight-card'},
  {type: 'DISCOVER_CLUE', clueId: 'wired-brake'},
  {type: 'SUBMIT_ANSWER', puzzleId: 'conductors-ledger', answer: 'voss|carriage-c|1147'},
  {type: 'ADVANCE_SCENE'},
  {type: 'DISCOVER_CLUE', clueId: 'blackwater-lever'},
  {type: 'DISCOVER_CLUE', clueId: 'lamp-room-door'},
  {type: 'SUBMIT_ANSWER', puzzleId: 'final-signal', answer: 'voss-sabotage', at: T0 + 10 * 60_000},
];

describe('The Last Train', () => {
  test('is a structurally valid mystery', () => {
    assert.deepEqual(validateMysteryDefinition(LT), []);
  });

  test('has four scenes, four puzzles, three authored hints each and three endings', () => {
    assert.deepEqual(
      LT.scenes.map((s) => s.id),
      ['station', 'train', 'carriage', 'signal-box'],
    );
    assert.deepEqual(
      LT.puzzles.map((p) => p.title),
      ['The Station Clock', 'The Torn Ticket', "The Conductor's Ledger", 'The Final Signal'],
    );
    for (const puzzle of LT.puzzles) assert.equal(puzzle.hints.length, 3, puzzle.id);
    assert.deepEqual(
      LT.endings.map((e) => e.title),
      ['The Truth', 'The Unanswered Question', 'Too Late'],
    );
  });

  test('a perfect run reaches The Truth', () => {
    const state = replay(LT, PERFECT);
    assert.equal(state.status, 'completed');
    assert.equal(state.endingId, 'the-truth');
    assert.equal(state.solvedPuzzleIds.length, 4);
    // 12 clues × 10 + 100 + 100 + 100 + 150 + 10 min left × 5
    assert.equal(state.score, 120 + 450 + 50);
    const summary = getGameSummary(LT, state, T0 + 10 * 60_000);
    assert.equal(summary.elapsedMs, 10 * 60_000);
  });

  test('the station clock accepts 11:47, 11 47 and 1147, but not 11:59', () => {
    const upToClock = PERFECT.slice(0, 5);
    const base = replay(LT, upToClock);
    for (const answer of ['11:47', '11 47', '1147']) {
      const {state} = applyAction(LT, base, {type: 'SUBMIT_ANSWER', puzzleId: 'station-clock', answer});
      assert.deepEqual(state.solvedPuzzleIds, ['station-clock'], answer);
    }
    const wrong = applyAction(LT, base, {type: 'SUBMIT_ANSWER', puzzleId: 'station-clock', answer: '11:59'});
    assert.deepEqual(wrong.state.solvedPuzzleIds, []);
  });

  test('skipping optional major clues leads to The Unanswered Question', () => {
    const skipped = PERFECT.filter(
      (a) => !(a.type === 'DISCOVER_CLUE' && (a.clueId === 'wired-brake' || a.clueId === 'lamp-room-door')),
    );
    assert.equal(replay(LT, skipped).endingId, 'the-unanswered-question');
  });

  test('leaning on too many hints also leads to The Unanswered Question', () => {
    const withHints: GameAction[] = [];
    for (const action of PERFECT) {
      if (action.type === 'SUBMIT_ANSWER') {
        withHints.push({type: 'REQUEST_HINT', puzzleId: action.puzzleId});
        withHints.push({type: 'REQUEST_HINT', puzzleId: action.puzzleId});
      }
      withHints.push(action);
    }
    const state = replay(LT, withHints);
    assert.equal(state.usedHintIds.length, 8);
    assert.equal(state.endingId, 'the-unanswered-question');
  });

  test('midnight passing means Too Late', () => {
    const started = replay(LT, PERFECT.slice(0, 2));
    const {state} = applyAction(LT, started, {type: 'TICK', at: T0 + 20 * 60_000});
    assert.equal(state.endingId, 'too-late');
    assert.equal(state.completionReason, 'time-expired');
  });

  test('eight wrong answers means Too Late', () => {
    let state: GameState = replay(LT, PERFECT.slice(0, 5));
    for (let i = 0; i < 8; i++) {
      state = applyAction(LT, state, {type: 'SUBMIT_ANSWER', puzzleId: 'station-clock', answer: '0000'}).state;
    }
    assert.equal(state.status, 'completed');
    assert.equal(state.endingId, 'too-late');
  });

  test('the ledger puzzle only unlocks once the watch, ledger and pencil are found', () => {
    const inCarriage = replay(LT, PERFECT.slice(0, 12));
    assert.equal(inCarriage.currentSceneId, 'carriage');
    assert.ok(!inCarriage.unlockedPuzzleIds.includes('conductors-ledger'));
    const found = replay(LT, PERFECT.slice(12, 15), inCarriage);
    assert.ok(found.unlockedPuzzleIds.includes('conductors-ledger'));
  });

  test('a fresh game state is independent of the mystery', () => {
    assert.equal(createInitialGameState(LT.summary.id).status, 'not-started');
  });
});
