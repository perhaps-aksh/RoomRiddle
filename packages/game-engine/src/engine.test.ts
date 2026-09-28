import {test, describe} from 'node:test';
import assert from 'node:assert/strict';
import type {GameAction, GameEvent, GameState} from '@roomriddle/shared-types';
import {applyAction, replay} from './engine';
import {createInitialGameState, serializeGameState, deserializeGameState} from './state';
import {getPuzzleView, getSceneView} from './selectors';
import {validateMysteryDefinition} from './validate-mystery';
import {fixtureMystery as M} from './test-fixtures';

const T0 = 1_000_000;

function run(actions: GameAction[], from?: GameState) {
  let state = from ?? createInitialGameState(M.summary.id);
  const events: GameEvent[] = [];
  for (const action of actions) {
    const result = applyAction(M, state, action);
    state = result.state;
    events.push(...result.events);
  }
  return {state, events};
}

const START: GameAction[] = [
  {type: 'START_MYSTERY', mysteryId: 'test-vault'},
  {type: 'ADVANCE_SCENE', at: T0},
];
const SOLVE_HALL: GameAction[] = [
  ...START,
  {type: 'DISCOVER_CLUE', clueId: 'note', at: T0 + 1},
  {type: 'SUBMIT_ANSWER', puzzleId: 'door-code', answer: '1230', at: T0 + 2},
];

describe('fixture', () => {
  test('is a valid mystery definition', () => {
    assert.deepEqual(validateMysteryDefinition(M), []);
  });
});

describe('starting a mystery', () => {
  test('START_MYSTERY moves to the intro with a clean slate', () => {
    const {state, events} = run([{type: 'START_MYSTERY', mysteryId: 'test-vault'}]);
    assert.equal(state.status, 'intro');
    assert.equal(state.currentSceneId, null);
    assert.deepEqual(events, [{type: 'mystery-started'}]);
  });

  test('rejects a different mystery id', () => {
    const {state, events} = run([{type: 'START_MYSTERY', mysteryId: 'nope'}]);
    assert.equal(state.status, 'not-started');
    assert.deepEqual(events, [{type: 'rejected', action: 'START_MYSTERY', reason: 'mystery-mismatch'}]);
  });

  test('advancing from the intro enters the start scene and starts the clock', () => {
    const {state, events} = run(START);
    assert.equal(state.status, 'playing');
    assert.equal(state.currentSceneId, 'hall');
    assert.deepEqual(state.visitedSceneIds, ['hall']);
    assert.equal(state.startedAt, T0);
    assert.equal(state.deadline, T0 + 10 * 60_000);
    assert.ok(events.some((e) => e.type === 'scene-entered' && e.sceneId === 'hall'));
  });

  test('actions are rejected before the game is playing', () => {
    const {events} = run([{type: 'DISCOVER_CLUE', clueId: 'note'}]);
    assert.deepEqual(events, [{type: 'rejected', action: 'DISCOVER_CLUE', reason: 'not-playing'}]);
  });
});

describe('clues', () => {
  test('discovering a clue records it, scores it and unlocks its puzzle', () => {
    const {state, events} = run([...START, {type: 'DISCOVER_CLUE', clueId: 'note'}]);
    assert.deepEqual(state.discoveredClueIds, ['note']);
    assert.equal(state.score, 10);
    assert.deepEqual(state.unlockedPuzzleIds, ['door-code']);
    assert.ok(events.some((e) => e.type === 'puzzle-unlocked' && e.puzzleId === 'door-code'));
  });

  test('a puzzle stays locked until its clues are found', () => {
    const {state, events} = run([
      ...START,
      {type: 'SUBMIT_ANSWER', puzzleId: 'door-code', answer: '1230'},
    ]);
    assert.deepEqual(state.solvedPuzzleIds, []);
    assert.equal(events.at(-1)?.type, 'rejected');
    assert.deepEqual(events.at(-1), {type: 'rejected', action: 'SUBMIT_ANSWER', reason: 'puzzle-locked'});
  });

  test('duplicate, unknown, out-of-scene and gated clues are rejected', () => {
    const reasons = (clueId: string, pre: GameAction[] = []) =>
      run([...START, ...pre, {type: 'DISCOVER_CLUE', clueId}]).events.at(-1);
    assert.deepEqual(reasons('note', [{type: 'DISCOVER_CLUE', clueId: 'note'}]), {
      type: 'rejected',
      action: 'DISCOVER_CLUE',
      reason: 'already-discovered',
    });
    assert.equal((reasons('ghost') as {reason: string}).reason, 'unknown-clue');
    assert.equal((reasons('ledger') as {reason: string}).reason, 'clue-not-in-scene');
    assert.equal((reasons('secret') as {reason: string}).reason, 'clue-locked');
    assert.equal(reasons('secret', [{type: 'DISCOVER_CLUE', clueId: 'key'}])?.type, 'clue-discovered');
  });

  test('a duplicate discovery never scores twice', () => {
    const {state} = run([
      ...START,
      {type: 'DISCOVER_CLUE', clueId: 'note'},
      {type: 'DISCOVER_CLUE', clueId: 'note'},
    ]);
    assert.equal(state.score, 10);
  });
});

describe('answers', () => {
  test('a correct answer solves the puzzle and awards full points', () => {
    const {state, events} = run(SOLVE_HALL);
    assert.deepEqual(state.solvedPuzzleIds, ['door-code']);
    assert.equal(state.puzzlePoints['door-code'], 100);
    assert.equal(state.score, 10 + 100);
    assert.ok(
      events.some(
        (e) => e.type === 'answer-correct' && e.breakdown.awarded === 100 && e.breakdown.hintDeduction === 0,
      ),
    );
  });

  test('formatting differences are forgiven: 12:30, 12 30 and 1230', () => {
    for (const answer of ['12:30', '12 30', ' 1230 ', '12.30']) {
      const {state} = run([
        ...START,
        {type: 'DISCOVER_CLUE', clueId: 'note'},
        {type: 'SUBMIT_ANSWER', puzzleId: 'door-code', answer},
      ]);
      assert.deepEqual(state.solvedPuzzleIds, ['door-code'], answer);
    }
  });

  test('a wrong answer costs 10 points and is counted', () => {
    const {state, events} = run([
      ...START,
      {type: 'DISCOVER_CLUE', clueId: 'note'},
      {type: 'SUBMIT_ANSWER', puzzleId: 'door-code', answer: '1203'},
    ]);
    assert.deepEqual(state.solvedPuzzleIds, []);
    assert.equal(state.incorrectAttempts['door-code'], 1);
    assert.equal(state.score, 0);
    assert.deepEqual(events.at(-1), {type: 'answer-incorrect', puzzleId: 'door-code', penalty: 10, attempts: 1});
  });

  test('score never drops below zero by default', () => {
    const {state} = run([
      ...START,
      {type: 'DISCOVER_CLUE', clueId: 'note'},
      {type: 'SUBMIT_ANSWER', puzzleId: 'door-code', answer: '0000'},
      {type: 'SUBMIT_ANSWER', puzzleId: 'door-code', answer: '0001'},
    ]);
    assert.equal(state.score, 0);
    assert.equal(state.incorrectAttempts['door-code'], 2);
  });

  test('an empty, malformed or incomplete entry is rejected without a penalty', () => {
    const {state, events} = run([
      ...START,
      {type: 'DISCOVER_CLUE', clueId: 'note'},
      {type: 'SUBMIT_ANSWER', puzzleId: 'door-code', answer: '   '},
      {type: 'SUBMIT_ANSWER', puzzleId: 'door-code', answer: 'half past twelve'},
      {type: 'SUBMIT_ANSWER', puzzleId: 'door-code', answer: '12'},
    ]);
    assert.equal(state.score, 10);
    assert.equal(state.incorrectAttempts['door-code'], undefined);
    assert.equal((events.at(-1) as {reason: string}).reason, 'incomplete-answer');
  });

  test('answering a solved puzzle again never scores twice', () => {
    const {state, events} = run([...SOLVE_HALL, {type: 'SUBMIT_ANSWER', puzzleId: 'door-code', answer: '1230'}]);
    assert.equal(state.score, 110);
    assert.equal((events.at(-1) as {reason: string}).reason, 'already-solved');
  });

  test('too many wrong answers ends the mystery in failure', () => {
    const wrong: GameAction = {type: 'SUBMIT_ANSWER', puzzleId: 'door-code', answer: '9999', at: T0 + 5};
    const {state, events} = run([...START, {type: 'DISCOVER_CLUE', clueId: 'note'}, wrong, wrong, wrong]);
    assert.equal(state.status, 'completed');
    assert.equal(state.completionReason, 'too-many-attempts');
    assert.equal(state.endingId, 'fail');
    assert.ok(events.some((e) => e.type === 'mystery-completed' && e.endingId === 'fail'));
  });
});

describe('hints', () => {
  const OPEN: GameAction[] = [...START, {type: 'DISCOVER_CLUE', clueId: 'note'}];
  const HINT: GameAction = {type: 'REQUEST_HINT', puzzleId: 'door-code'};

  test('hints are revealed in authored order and tracked', () => {
    const {state, events} = run([...OPEN, HINT, HINT]);
    assert.deepEqual(state.usedHintIds, ['door-1', 'door-2']);
    const revealed = events.filter((e) => e.type === 'hint-revealed');
    assert.deepEqual(
      revealed.map((e) => e.type === 'hint-revealed' && [e.hintNumber, e.penalty]),
      [
        [1, 25],
        [2, 25],
      ],
    );
  });

  test('hint penalties: 0 → 100, 1 → 75, 2 → 50, 3 → 25 points', () => {
    for (const [count, expected] of [
      [0, 100],
      [1, 75],
      [2, 50],
      [3, 25],
    ] as const) {
      const {state} = run([
        ...OPEN,
        ...Array.from({length: count}, () => HINT),
        {type: 'SUBMIT_ANSWER', puzzleId: 'door-code', answer: '1230'},
      ]);
      assert.equal(state.puzzlePoints['door-code'], expected, `${count} hints`);
    }
  });

  test('requesting a hint after the last one is rejected', () => {
    const {state, events} = run([...OPEN, HINT, HINT, HINT, HINT]);
    assert.equal(state.usedHintIds.length, 3);
    assert.equal((events.at(-1) as {reason: string}).reason, 'no-more-hints');
  });

  test('the puzzle view reports hints and current value', () => {
    const {state} = run([...OPEN, HINT]);
    const view = getPuzzleView(M, state, 'door-code');
    assert.equal(view?.revealedHints.length, 1);
    assert.equal(view?.hintsRemaining, 2);
    assert.equal(view?.nextHintCost, 25);
    assert.equal(view?.currentValue.awarded, 75);
  });
});

describe('scenes', () => {
  test('cannot advance until the scene puzzle is solved', () => {
    const {state, events} = run([...START, {type: 'ADVANCE_SCENE'}]);
    assert.equal(state.currentSceneId, 'hall');
    assert.equal((events.at(-1) as {reason: string}).reason, 'scene-incomplete');
  });

  test('advancing after solving enters the next scene', () => {
    const {state} = run([...SOLVE_HALL, {type: 'ADVANCE_SCENE'}]);
    assert.equal(state.currentSceneId, 'vault');
    assert.deepEqual(state.visitedSceneIds, ['hall', 'vault']);
  });

  test('puzzles in a later scene need their own prerequisites (clues and puzzles)', () => {
    const {state} = run([...SOLVE_HALL, {type: 'ADVANCE_SCENE'}]);
    // The solved hall puzzle stays unlocked; "culprit" still needs the ledger and the combo.
    assert.deepEqual([...state.unlockedPuzzleIds].sort(), ['combo', 'door-code']);
    const next = run(
      [
        {type: 'DISCOVER_CLUE', clueId: 'ledger'},
        {type: 'SUBMIT_ANSWER', puzzleId: 'combo', answer: 'bo|cellar'},
      ],
      state,
    ).state;
    assert.ok(next.unlockedPuzzleIds.includes('culprit'));
  });

  test('scene view lists investigable clues and puzzle status', () => {
    const {state} = run([...START, {type: 'DISCOVER_CLUE', clueId: 'note'}]);
    const view = getSceneView(M, state);
    assert.equal(view?.number, 1);
    assert.equal(view?.total, 2);
    // "secret" is hidden until "key" is found.
    assert.deepEqual(view?.clues.map((c) => [c.clue.id, c.discovered]), [
      ['note', true],
      ['key', false],
    ]);
    assert.deepEqual(view?.puzzles.map((p) => p.status), ['unlocked']);
    assert.equal(view?.complete, false);
  });

  test('puzzles from another scene cannot be opened', () => {
    const {events} = run([...START, {type: 'OPEN_PUZZLE', puzzleId: 'combo'}]);
    assert.equal((events.at(-1) as {reason: string}).reason, 'puzzle-not-in-scene');
  });
});

describe('completion and endings', () => {
  const VAULT: GameAction[] = [
    ...SOLVE_HALL,
    {type: 'ADVANCE_SCENE', at: T0 + 3},
    {type: 'DISCOVER_CLUE', clueId: 'ledger', at: T0 + 4},
    {type: 'SUBMIT_ANSWER', puzzleId: 'combo', answer: 'BO | Cellar', at: T0 + 5},
  ];
  const FINAL: GameAction = {type: 'SUBMIT_ANSWER', puzzleId: 'culprit', answer: 'theft', at: T0 + 60_000};

  test('solving the final puzzle completes the game with the best ending', () => {
    const {state, events} = run([...VAULT, FINAL]);
    assert.equal(state.status, 'completed');
    assert.equal(state.completionReason, 'solved');
    assert.equal(state.endingId, 'best');
    assert.equal(state.completedAt, T0 + 60_000);
    assert.ok(events.some((e) => e.type === 'mystery-completed' && e.endingId === 'best'));
  });

  test('too many hints downgrades to the second ending', () => {
    const {state} = run([
      ...VAULT,
      {type: 'REQUEST_HINT', puzzleId: 'culprit'},
      {type: 'REQUEST_HINT', puzzleId: 'door-code'},
      FINAL,
    ]);
    // door-code is solved, so its hint is rejected: only 1 hint used → still best.
    assert.equal(state.endingId, 'best');
    const withHints = run([
      ...START,
      {type: 'DISCOVER_CLUE', clueId: 'note'},
      {type: 'REQUEST_HINT', puzzleId: 'door-code'},
      {type: 'REQUEST_HINT', puzzleId: 'door-code'},
      {type: 'SUBMIT_ANSWER', puzzleId: 'door-code', answer: '1230'},
      {type: 'ADVANCE_SCENE'},
      {type: 'DISCOVER_CLUE', clueId: 'ledger'},
      {type: 'SUBMIT_ANSWER', puzzleId: 'combo', answer: 'bo|cellar'},
      FINAL,
    ]).state;
    assert.equal(withHints.endingId, 'good');
  });

  test('running out of time ends the game with the failure ending', () => {
    const {state, events} = run([...START, {type: 'TICK', at: T0 + 10 * 60_000}]);
    assert.equal(state.status, 'completed');
    assert.equal(state.completionReason, 'time-expired');
    assert.equal(state.endingId, 'fail');
    assert.ok(events.some((e) => e.type === 'mystery-completed'));
  });

  test('an action after the deadline is rejected and ends the game', () => {
    const {state, events} = run([
      ...START,
      {type: 'DISCOVER_CLUE', clueId: 'note', at: T0 + 11 * 60_000},
    ]);
    assert.equal(state.endingId, 'fail');
    assert.deepEqual(state.discoveredClueIds, []);
    assert.equal((events.at(-1) as {reason: string}).reason, 'time-expired');
  });

  test('pausing stops the clock and resuming extends the deadline', () => {
    const {state} = run([
      ...START,
      {type: 'PAUSE', at: T0 + 60_000},
      {type: 'RESUME', at: T0 + 5 * 60_000},
    ]);
    assert.equal(state.status, 'playing');
    assert.equal(state.deadline, T0 + 14 * 60_000);
  });

  test('COMPLETE_MYSTERY ends the game early with the fallback ending', () => {
    const {state} = run([...START, {type: 'COMPLETE_MYSTERY', at: T0 + 10}]);
    assert.equal(state.status, 'completed');
    assert.equal(state.completionReason, 'abandoned');
    assert.equal(state.endingId, 'fail');
  });

  test('a completed game accepts no more moves but can be restarted', () => {
    const done = run([...VAULT, FINAL]).state;
    const after = applyAction(M, done, {type: 'DISCOVER_CLUE', clueId: 'note'});
    assert.equal(after.state, done);
    const again = applyAction(M, done, {type: 'START_MYSTERY', mysteryId: 'test-vault'}).state;
    assert.equal(again.status, 'intro');
    assert.equal(again.score, 0);
  });
});

describe('determinism', () => {
  const LOG: GameAction[] = [
    ...SOLVE_HALL,
    {type: 'REQUEST_HINT', puzzleId: 'door-code'},
    {type: 'ADVANCE_SCENE'},
    {type: 'DISCOVER_CLUE', clueId: 'ledger'},
    {type: 'SUBMIT_ANSWER', puzzleId: 'combo', answer: 'ada|attic'},
    {type: 'SUBMIT_ANSWER', puzzleId: 'combo', answer: 'bo|cellar'},
  ];

  test('replaying the same actions always gives the same state', () => {
    assert.deepEqual(replay(M, LOG), replay(M, LOG));
  });

  test('the engine never mutates the input state', () => {
    const before = run(START).state;
    const frozen = JSON.stringify(before);
    applyAction(M, before, {type: 'DISCOVER_CLUE', clueId: 'note'});
    assert.equal(JSON.stringify(before), frozen);
  });

  test('state survives a JSON round trip and play continues identically', () => {
    const mid = replay(M, LOG.slice(0, 4));
    const restored = deserializeGameState(serializeGameState(mid));
    assert.deepEqual(restored, mid);
    assert.deepEqual(replay(M, LOG.slice(4), restored), replay(M, LOG));
  });

  test('deserialize rejects things that are not a GameState', () => {
    assert.throws(() => deserializeGameState('{"hello":1}'));
    assert.throws(() => deserializeGameState('[]'));
  });
});
