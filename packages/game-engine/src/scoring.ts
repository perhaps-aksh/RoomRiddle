import type {Puzzle, ScoreBreakdown, ScoringRules} from '@roomriddle/shared-types';

/**
 * The single home for score arithmetic. With the defaults, a puzzle is worth
 * 100 with no hints, 75 with one, 50 with two and 25 with three.
 * Each wrong answer costs 10. Duplicate submissions never score twice
 * (the engine rejects answers to solved puzzles).
 */
export const DEFAULT_SCORING_RULES: Readonly<ScoringRules> = Object.freeze({
  puzzlePoints: 100,
  hintPenalty: 25,
  incorrectAttemptPenalty: 10,
  minPuzzlePoints: 25,
  clueDiscoveryPoints: 0,
  timeBonusPerMinute: 0,
  allowNegativeScore: false,
});

export function resolveScoringRules(
  ...overrides: (Partial<ScoringRules> | undefined)[]
): ScoringRules {
  return Object.assign({}, DEFAULT_SCORING_RULES, ...overrides.filter(Boolean));
}

/** What solving `puzzle` is worth after `hintsUsed` hints. */
export function scorePuzzle(
  puzzle: Puzzle,
  hintsUsed: number,
  rules: ScoringRules,
): ScoreBreakdown {
  const base = puzzle.points ?? rules.puzzlePoints;
  const maxDeduction = Math.max(0, base - rules.minPuzzlePoints);
  const hintDeduction = Math.min(hintsUsed * rules.hintPenalty, maxDeduction);
  return {base, hintDeduction, awarded: base - hintDeduction};
}

export function applyScoreDelta(score: number, delta: number, rules: ScoringRules): number {
  const next = score + delta;
  return rules.allowNegativeScore ? next : Math.max(0, next);
}

export function timeBonus(remainingMs: number, rules: ScoringRules): number {
  return Math.max(0, Math.floor(remainingMs / 60_000)) * rules.timeBonusPerMinute;
}
