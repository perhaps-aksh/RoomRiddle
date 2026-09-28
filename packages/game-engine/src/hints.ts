import type {GameState, Hint, Puzzle} from '@roomriddle/shared-types';

/**
 * Progressive hints. Hint text is always pre-authored in mystery data
 * (nudge → interpretation → near-solution). This module only decides which
 * one comes next. It never generates text.
 */
export function revealedHints(state: GameState, puzzle: Puzzle): Hint[] {
  return puzzle.hints.filter((hint) => state.usedHintIds.includes(hint.id));
}

export function hintsUsedFor(state: GameState, puzzle: Puzzle): number {
  return revealedHints(state, puzzle).length;
}

export function nextHint(state: GameState, puzzle: Puzzle): Hint | undefined {
  return puzzle.hints.find((hint) => !state.usedHintIds.includes(hint.id));
}
