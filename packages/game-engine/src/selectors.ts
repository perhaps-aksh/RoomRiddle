import type {
  Clue,
  GameState,
  Hint,
  MysteryDefinition,
  Puzzle,
  Scene,
  ScoreBreakdown,
} from '@roomriddle/shared-types';
import {isSceneComplete} from './engine';
import {hintsUsedFor, nextHint, revealedHints} from './hints';
import {findClue, findPuzzle, findScene, isRequirementMet, majorClueIds} from './mystery';
import {resolveScoringRules, scorePuzzle} from './scoring';
import {totalIncorrectAttempts} from './state';
import {remainingMs} from './timers';

/**
 * Read-only views of GameState for renderers (TV now, phone later).
 * These answer "what should be shown" so UIs never re-implement game rules.
 */

export interface ClueView {
  clue: Clue;
  discovered: boolean;
}

export interface PuzzleStatusView {
  puzzle: Puzzle;
  status: 'locked' | 'unlocked' | 'solved';
}

export interface SceneView {
  scene: Scene;
  /** 1-based position in the story. */
  number: number;
  total: number;
  /** Clues investigable here now (requirements met), discovered or not. */
  clues: ClueView[];
  puzzles: PuzzleStatusView[];
  complete: boolean;
  isFinal: boolean;
  nextScene?: Scene;
}

export function getSceneView(mystery: MysteryDefinition, state: GameState): SceneView | null {
  const scene = findScene(mystery, state.currentSceneId);
  if (!scene) return null;
  const clues = scene.clueIds
    .map((id) => findClue(mystery, id))
    .filter((clue): clue is Clue => clue !== undefined && isRequirementMet(clue.requires, state))
    .map((clue) => ({clue, discovered: state.discoveredClueIds.includes(clue.id)}));
  const puzzles = scene.puzzleIds
    .map((id) => findPuzzle(mystery, id))
    .filter((puzzle): puzzle is Puzzle => puzzle !== undefined)
    .map((puzzle) => ({puzzle, status: puzzleStatus(state, puzzle.id)}));
  const order = sceneOrder(mystery);
  return {
    scene,
    number: order.indexOf(scene.id) + 1,
    total: order.length,
    clues,
    puzzles,
    complete: isSceneComplete(mystery, state, scene.id),
    isFinal: !scene.nextSceneId,
    nextScene: findScene(mystery, scene.nextSceneId ?? null),
  };
}

export function puzzleStatus(state: GameState, puzzleId: string): PuzzleStatusView['status'] {
  if (state.solvedPuzzleIds.includes(puzzleId)) return 'solved';
  if (state.unlockedPuzzleIds.includes(puzzleId)) return 'unlocked';
  return 'locked';
}

export interface PuzzleView {
  puzzle: Puzzle;
  status: PuzzleStatusView['status'];
  revealedHints: Hint[];
  hintsRemaining: number;
  /** What the next hint would take off this puzzle's award (0 if none left). */
  nextHintCost: number;
  /** What solving it now would award. */
  currentValue: ScoreBreakdown;
  incorrectAttempts: number;
}

export function getPuzzleView(
  mystery: MysteryDefinition,
  state: GameState,
  puzzleId: string,
): PuzzleView | null {
  const puzzle = findPuzzle(mystery, puzzleId);
  if (!puzzle) return null;
  const rules = resolveScoringRules(mystery.scoring);
  const used = hintsUsedFor(state, puzzle);
  const current = scorePuzzle(puzzle, used, rules);
  const hasNext = nextHint(state, puzzle) !== undefined;
  return {
    puzzle,
    status: puzzleStatus(state, puzzle.id),
    revealedHints: revealedHints(state, puzzle),
    hintsRemaining: puzzle.hints.length - used,
    nextHintCost: hasNext
      ? scorePuzzle(puzzle, used + 1, rules).hintDeduction - current.hintDeduction
      : 0,
    currentValue: current,
    incorrectAttempts: state.incorrectAttempts[puzzle.id] ?? 0,
  };
}

/** Every discovered clue, in discovery order: the players' evidence board. */
export function getEvidence(mystery: MysteryDefinition, state: GameState): Clue[] {
  return state.discoveredClueIds
    .map((id) => findClue(mystery, id))
    .filter((clue): clue is Clue => clue !== undefined);
}

export interface GameSummary {
  score: number;
  puzzlesSolved: number;
  puzzlesTotal: number;
  cluesFound: number;
  cluesTotal: number;
  majorCluesFound: number;
  majorCluesTotal: number;
  hintsUsed: number;
  incorrectAttempts: number;
  /** Play time in ms, if timestamps were supplied. */
  elapsedMs: number | null;
  remainingMs: number | null;
}

export function getGameSummary(
  mystery: MysteryDefinition,
  state: GameState,
  now: number,
): GameSummary {
  const majors = majorClueIds(mystery);
  const end = state.completedAt ?? state.pausedAt ?? now;
  return {
    score: state.score,
    puzzlesSolved: state.solvedPuzzleIds.length,
    puzzlesTotal: mystery.puzzles.length,
    cluesFound: state.discoveredClueIds.length,
    cluesTotal: mystery.clues.length,
    majorCluesFound: majors.filter((id) => state.discoveredClueIds.includes(id)).length,
    majorCluesTotal: majors.length,
    hintsUsed: state.usedHintIds.length,
    incorrectAttempts: totalIncorrectAttempts(state),
    elapsedMs: state.startedAt === null ? null : Math.max(0, end - state.startedAt),
    remainingMs: remainingMs(state, now),
  };
}

function sceneOrder(mystery: MysteryDefinition): string[] {
  const order: string[] = [];
  let scene = findScene(mystery, mystery.startSceneId);
  while (scene && !order.includes(scene.id)) {
    order.push(scene.id);
    scene = findScene(mystery, scene.nextSceneId ?? null);
  }
  return order;
}
