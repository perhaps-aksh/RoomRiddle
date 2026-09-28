import type {AnswerInput, Puzzle} from '@roomriddle/shared-types';

/**
 * Deterministic answer validation (Master Brief §11).
 * Normalisation forgives only harmless formatting differences: case,
 * whitespace, punctuation and time separators. The result is compared for
 * equality with explicitly authored accepted answers. There is no fuzzy or
 * partial matching, so "probably the conductor did it" never matches "caldwell".
 */

/** Unicode compatibility folding (e.g. full-width digits), if the runtime supports it. */
function foldUnicode(raw: string): string {
  try {
    return raw.normalize('NFKC');
  } catch {
    return raw;
  }
}

/** Case, surrounding/inner whitespace and Unicode compatibility forms. */
export function normalizeText(raw: string): string {
  return foldUnicode(raw).trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Separators allowed between digits in a code: "11:47", "11 47", "11.47", "11-47". */
const DIGIT_CODE = /^[0-9\s:.\-/]+$/;
const PUNCTUATION = /[.,!?;:'"`’‘“”()[\]{}\-–—_/\\]+/g;

/**
 * Normalises an answer for the given input kind, or returns null when the
 * answer is malformed for that kind (a malformed answer is never correct).
 */
export function normalizeAnswer(raw: string, input: AnswerInput): string | null {
  switch (input.kind) {
    case 'digits': {
      const text = foldUnicode(raw).trim();
      if (!DIGIT_CODE.test(text)) return null;
      const digits = text.replace(/\D/g, '');
      // A partly entered code is incomplete, not wrong.
      return digits.length === input.length ? digits : null;
    }
    case 'choice': {
      const id = normalizeText(raw);
      return id.length > 0 ? id : null;
    }
    case 'combination': {
      const parts = raw.split('|').map(normalizeText);
      if (parts.length !== input.fields.length || parts.some((part) => part.length === 0)) {
        return null;
      }
      return parts.join('|');
    }
    case 'text': {
      const text = normalizeText(foldUnicode(raw).replace(PUNCTUATION, ' '));
      return text.length > 0 ? text : null;
    }
  }
}

export function isCorrectAnswer(puzzle: Puzzle, answer: string): boolean {
  const given = normalizeAnswer(answer, puzzle.input);
  if (given === null) return false;
  return puzzle.acceptedAnswers.some(
    (accepted) => normalizeAnswer(accepted, puzzle.input) === given,
  );
}

/** Builds a combination answer ("207|c|14") from per-field option ids. */
export function combinationAnswer(optionIds: readonly string[]): string {
  return optionIds.join('|');
}
