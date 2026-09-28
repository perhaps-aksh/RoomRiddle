import type {
  ActionResult,
  CompletionReason,
  GameAction,
  GameEvent,
  GameState,
  MysteryDefinition,
  Puzzle,
  RejectionReason,
  ScoringRules,
} from '@roomriddle/shared-types';
import {resolveEnding} from './endings';
import {hintsUsedFor, nextHint} from './hints';
import {findChoice, findClue, findPuzzle, findScene, isRequirementMet} from './mystery';
import {applyScoreDelta, resolveScoringRules, scorePuzzle, timeBonus} from './scoring';
import {createInitialGameState, totalIncorrectAttempts} from './state';
import {isTimeUp, remainingMs} from './timers';
import {isCorrectAnswer, normalizeAnswer} from './validation';

/**
 * RoomRiddle Mystery Engine: a pure reducer.
 *
 *   (mystery, state, action) → { state, events }
 *
 * It works for any mystery, because everything specific is read from the
 * MysteryDefinition. There is no I/O, no randomness and no clock reading
 * (time arrives as `action.at`), so the same inputs always give the same output
 * and a game can be replayed from its action log. The input state is never mutated.
 */
export function applyAction(
  mystery: MysteryDefinition,
  state: GameState,
  action: GameAction,
): ActionResult {
  // A time limit that has run out ends the game before anything else happens.
  const at = 'at' in action ? action.at : undefined;
  if (at !== undefined && isTimeUp(state, at)) {
    const expired = complete(mystery, state, 'time-expired', at);
    if (action.type === 'TICK' || action.type === 'COMPLETE_MYSTERY') return expired;
    return {
      state: expired.state,
      events: [...expired.events, reject(action, 'time-expired')],
    };
  }

  switch (action.type) {
    case 'START_MYSTERY':
      return startMystery(mystery, state, action.mysteryId);
    case 'ADVANCE_SCENE':
      return advanceScene(mystery, state, action.at);
    case 'DISCOVER_CLUE':
      return discoverClue(mystery, state, action.clueId, action);
    case 'OPEN_PUZZLE':
      return openPuzzle(mystery, state, action.puzzleId, action);
    case 'CLOSE_PUZZLE':
      return {state: {...state, currentPuzzleId: null}, events: []};
    case 'SUBMIT_ANSWER':
      return submitAnswer(mystery, state, action);
    case 'REQUEST_HINT':
      return requestHint(mystery, state, action);
    case 'MAKE_CHOICE':
      return makeChoice(mystery, state, action);
    case 'PAUSE':
      if (state.status !== 'playing') return rejected(state, action, 'not-playing');
      return {state: {...state, status: 'paused', pausedAt: action.at}, events: [{type: 'paused'}]};
    case 'RESUME': {
      if (state.status !== 'paused') return rejected(state, action, 'not-active');
      const pausedFor = state.pausedAt === null ? 0 : Math.max(0, action.at - state.pausedAt);
      return {
        state: {
          ...state,
          status: 'playing',
          pausedAt: null,
          deadline: state.deadline === null ? null : state.deadline + pausedFor,
        },
        events: [{type: 'resumed'}],
      };
    }
    case 'TICK':
      return {state, events: []};
    case 'COMPLETE_MYSTERY':
      if (state.status === 'not-started' || state.status === 'completed') {
        return rejected(state, action, 'not-active');
      }
      return complete(mystery, state, action.reason ?? 'abandoned', action.at);
  }
}

/** Convenience for callers that only need the next state. */
export function reduceGame(
  mystery: MysteryDefinition,
  state: GameState,
  action: GameAction,
): GameState {
  return applyAction(mystery, state, action).state;
}

/** Folds a whole action log. Used for replays, restores and tests. */
export function replay(
  mystery: MysteryDefinition,
  actions: readonly GameAction[],
  initial: GameState = createInitialGameState(mystery.summary.id),
): GameState {
  return actions.reduce((state, action) => reduceGame(mystery, state, action), initial);
}

// ---------------------------------------------------------------------------

function startMystery(
  mystery: MysteryDefinition,
  state: GameState,
  mysteryId: string,
): ActionResult {
  if (mysteryId !== mystery.summary.id) {
    return rejected(state, {type: 'START_MYSTERY'}, 'mystery-mismatch');
  }
  if (state.status !== 'not-started' && state.status !== 'completed') {
    return rejected(state, {type: 'START_MYSTERY'}, 'not-active');
  }
  return {
    state: {...createInitialGameState(mysteryId), status: 'intro'},
    events: [{type: 'mystery-started'}],
  };
}

function advanceScene(
  mystery: MysteryDefinition,
  state: GameState,
  at: number | undefined,
): ActionResult {
  const action = {type: 'ADVANCE_SCENE'} as const;

  if (state.status === 'intro') {
    const limit = mystery.failure?.timeLimitMinutes;
    const started: GameState = {
      ...state,
      status: 'playing',
      startedAt: at ?? null,
      deadline: limit !== undefined && at !== undefined ? at + limit * 60_000 : null,
    };
    return enterScene(mystery, started, mystery.startSceneId);
  }

  if (state.status !== 'playing') return rejected(state, action, 'not-playing');
  const scene = findScene(mystery, state.currentSceneId);
  if (!scene) return rejected(state, action, 'not-playing');
  if (!isSceneComplete(mystery, state, scene.id)) {
    return rejected(state, action, 'scene-incomplete');
  }
  if (!scene.nextSceneId) return complete(mystery, state, 'solved', at);
  return enterScene(mystery, state, scene.nextSceneId);
}

function enterScene(mystery: MysteryDefinition, state: GameState, sceneId: string): ActionResult {
  const entered: GameState = {
    ...state,
    currentSceneId: sceneId,
    currentPuzzleId: null,
    visitedSceneIds: state.visitedSceneIds.includes(sceneId)
      ? state.visitedSceneIds
      : [...state.visitedSceneIds, sceneId],
  };
  const unlocked = withUnlocks(mystery, entered);
  return {
    state: unlocked.state,
    events: [{type: 'scene-entered', sceneId}, ...unlocked.events],
  };
}

function discoverClue(
  mystery: MysteryDefinition,
  state: GameState,
  clueId: string,
  action: GameAction,
): ActionResult {
  if (state.status !== 'playing') return rejected(state, action, 'not-playing');
  const clue = findClue(mystery, clueId);
  if (!clue) return rejected(state, action, 'unknown-clue');
  if (clue.sceneId !== state.currentSceneId) return rejected(state, action, 'clue-not-in-scene');
  if (state.discoveredClueIds.includes(clueId)) {
    return rejected(state, action, 'already-discovered');
  }
  if (!isRequirementMet(clue.requires, state)) return rejected(state, action, 'clue-locked');

  const rules = rulesFor(mystery);
  const points = rules.clueDiscoveryPoints;
  const discovered: GameState = {
    ...state,
    discoveredClueIds: [...state.discoveredClueIds, clueId],
    score: applyScoreDelta(state.score, points, rules),
  };
  const unlocked = withUnlocks(mystery, discovered);
  return {
    state: unlocked.state,
    events: [{type: 'clue-discovered', clueId, points}, ...unlocked.events],
  };
}

/** Checks the common puzzle preconditions shared by open/answer/hint. */
function checkPuzzle(
  mystery: MysteryDefinition,
  state: GameState,
  puzzleId: string,
): Puzzle | RejectionReason {
  if (state.status !== 'playing') return 'not-playing';
  const puzzle = findPuzzle(mystery, puzzleId);
  if (!puzzle) return 'unknown-puzzle';
  if (puzzle.sceneId !== state.currentSceneId) return 'puzzle-not-in-scene';
  if (state.solvedPuzzleIds.includes(puzzleId)) return 'already-solved';
  if (!state.unlockedPuzzleIds.includes(puzzleId)) return 'puzzle-locked';
  return puzzle;
}

function openPuzzle(
  mystery: MysteryDefinition,
  state: GameState,
  puzzleId: string,
  action: GameAction,
): ActionResult {
  const puzzle = checkPuzzle(mystery, state, puzzleId);
  if (typeof puzzle === 'string') return rejected(state, action, puzzle);
  return {
    state: {...state, currentPuzzleId: puzzle.id},
    events: [{type: 'puzzle-opened', puzzleId: puzzle.id}],
  };
}

function submitAnswer(
  mystery: MysteryDefinition,
  state: GameState,
  action: Extract<GameAction, {type: 'SUBMIT_ANSWER'}>,
): ActionResult {
  const puzzle = checkPuzzle(mystery, state, action.puzzleId);
  if (typeof puzzle === 'string') return rejected(state, action, puzzle);
  // A blank or malformed entry is a slip of the remote, not a wrong guess: no penalty.
  if (normalizeAnswer(action.answer, puzzle.input) === null) {
    return rejected(state, action, 'incomplete-answer');
  }

  const rules = rulesFor(mystery);

  if (!isCorrectAnswer(puzzle, action.answer)) {
    const attempts = (state.incorrectAttempts[puzzle.id] ?? 0) + 1;
    const next: GameState = {
      ...state,
      incorrectAttempts: {...state.incorrectAttempts, [puzzle.id]: attempts},
      score: applyScoreDelta(state.score, -rules.incorrectAttemptPenalty, rules),
    };
    const events: GameEvent[] = [
      {
        type: 'answer-incorrect',
        puzzleId: puzzle.id,
        penalty: rules.incorrectAttemptPenalty,
        attempts,
      },
    ];
    const max = mystery.failure?.maxIncorrectAttempts;
    if (max !== undefined && totalIncorrectAttempts(next) >= max) {
      const failed = complete(mystery, next, 'too-many-attempts', action.at);
      return {state: failed.state, events: [...events, ...failed.events]};
    }
    return {state: next, events};
  }

  const breakdown = scorePuzzle(puzzle, hintsUsedFor(state, puzzle), rules);
  const solved: GameState = {
    ...state,
    currentPuzzleId: null,
    solvedPuzzleIds: [...state.solvedPuzzleIds, puzzle.id],
    puzzlePoints: {...state.puzzlePoints, [puzzle.id]: breakdown.awarded},
    score: applyScoreDelta(state.score, breakdown.awarded, rules),
  };
  const unlocked = withUnlocks(mystery, solved);
  const events: GameEvent[] = [
    {type: 'answer-correct', puzzleId: puzzle.id, breakdown},
    ...unlocked.events,
  ];
  if (puzzle.completesMystery) {
    const done = complete(mystery, unlocked.state, 'solved', action.at);
    return {state: done.state, events: [...events, ...done.events]};
  }
  return {state: unlocked.state, events};
}

function requestHint(
  mystery: MysteryDefinition,
  state: GameState,
  action: Extract<GameAction, {type: 'REQUEST_HINT'}>,
): ActionResult {
  const puzzle = checkPuzzle(mystery, state, action.puzzleId);
  if (typeof puzzle === 'string') return rejected(state, action, puzzle);
  const hint = nextHint(state, puzzle);
  if (!hint) return rejected(state, action, 'no-more-hints');

  const rules = rulesFor(mystery);
  const used = hintsUsedFor(state, puzzle);
  // The cost is what this hint takes off the puzzle's eventual award.
  const penalty =
    scorePuzzle(puzzle, used + 1, rules).hintDeduction -
    scorePuzzle(puzzle, used, rules).hintDeduction;

  return {
    state: {...state, usedHintIds: [...state.usedHintIds, hint.id]},
    events: [
      {type: 'hint-revealed', puzzleId: puzzle.id, hintId: hint.id, hintNumber: used + 1, penalty},
    ],
  };
}

function makeChoice(
  mystery: MysteryDefinition,
  state: GameState,
  action: Extract<GameAction, {type: 'MAKE_CHOICE'}>,
): ActionResult {
  if (state.status !== 'playing') return rejected(state, action, 'not-playing');
  const choice = findChoice(mystery, action.choiceId);
  if (!choice) return rejected(state, action, 'unknown-choice');
  if (choice.sceneId !== state.currentSceneId) return rejected(state, action, 'choice-not-in-scene');
  if (state.choices[choice.id] !== undefined) return rejected(state, action, 'already-chosen');
  const option = choice.options.find((o) => o.id === action.optionId);
  if (!option) return rejected(state, action, 'unknown-option');

  const chosen: GameState = {...state, choices: {...state.choices, [choice.id]: option.id}};
  const events: GameEvent[] = [{type: 'choice-made', choiceId: choice.id, optionId: option.id}];
  if (option.completesMystery) {
    const done = complete(mystery, chosen, 'choice', action.at);
    return {state: done.state, events: [...events, ...done.events]};
  }
  if (option.nextSceneId) {
    const moved = enterScene(mystery, chosen, option.nextSceneId);
    return {state: moved.state, events: [...events, ...moved.events]};
  }
  return {state: chosen, events};
}

function complete(
  mystery: MysteryDefinition,
  state: GameState,
  reason: CompletionReason,
  at: number | undefined,
): ActionResult {
  const rules = rulesFor(mystery);
  const events: GameEvent[] = [];
  let score = state.score;

  const succeeded = reason === 'solved' || reason === 'choice';
  if (succeeded && at !== undefined && rules.timeBonusPerMinute > 0) {
    const left = remainingMs(state, at);
    const bonus = left === null ? 0 : timeBonus(left, rules);
    if (bonus > 0) {
      score = applyScoreDelta(score, bonus, rules);
      events.push({type: 'time-bonus', points: bonus});
    }
  }

  const finished: GameState = {
    ...state,
    status: 'completed',
    currentPuzzleId: null,
    pausedAt: null,
    score,
    completedAt: at ?? null,
    completionReason: reason,
  };
  const ending = resolveEnding(finished, mystery);
  events.push({type: 'mystery-completed', endingId: ending.id, reason});
  return {state: {...finished, endingId: ending.id}, events};
}

/** Recomputes which puzzles are available and reports newly unlocked ones. */
function withUnlocks(mystery: MysteryDefinition, state: GameState): ActionResult {
  const unlockedPuzzleIds = mystery.puzzles
    .filter(
      (puzzle) =>
        state.visitedSceneIds.includes(puzzle.sceneId) && isRequirementMet(puzzle.requires, state),
    )
    .map((puzzle) => puzzle.id);
  const events: GameEvent[] = unlockedPuzzleIds
    .filter((id) => !state.unlockedPuzzleIds.includes(id))
    .map((puzzleId) => ({type: 'puzzle-unlocked', puzzleId}));
  return {state: {...state, unlockedPuzzleIds}, events};
}

export function isSceneComplete(
  mystery: MysteryDefinition,
  state: GameState,
  sceneId: string,
): boolean {
  const scene = findScene(mystery, sceneId);
  if (!scene) return false;
  return (
    scene.puzzleIds.every((id) => state.solvedPuzzleIds.includes(id)) &&
    (scene.choiceIds ?? []).every((id) => state.choices[id] !== undefined)
  );
}

function rulesFor(mystery: MysteryDefinition): ScoringRules {
  return resolveScoringRules(mystery.scoring);
}

function reject(action: Pick<GameAction, 'type'>, reason: RejectionReason): GameEvent {
  return {type: 'rejected', action: action.type, reason};
}

function rejected(
  state: GameState,
  action: Pick<GameAction, 'type'>,
  reason: RejectionReason,
): ActionResult {
  return {state, events: [reject(action, reason)]};
}
