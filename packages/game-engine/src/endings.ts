import type {Ending, EndingCondition, GameState, MysteryDefinition} from '@roomriddle/shared-types';
import {majorClueIds} from './mystery';
import {totalIncorrectAttempts} from './state';

/**
 * Deterministic ending resolution: GameState → ending id. Endings are checked
 * in authored order and the first whose conditions all hold wins. The last
 * ending is the fallback. Narration can be made richer later, but the outcome
 * itself is always decided here.
 */
export function resolveEnding(state: GameState, mystery: MysteryDefinition): Ending {
  const match = mystery.endings.find((ending) =>
    ending.when.every((condition) => isConditionMet(condition, state, mystery)),
  );
  const ending = match ?? mystery.endings[mystery.endings.length - 1];
  if (!ending) throw new Error(`Mystery "${mystery.summary.id}" has no endings.`);
  return ending;
}

export function isConditionMet(
  condition: EndingCondition,
  state: GameState,
  mystery: MysteryDefinition,
): boolean {
  const found = (id: string) => state.discoveredClueIds.includes(id);
  switch (condition.kind) {
    case 'puzzle-solved':
      return state.solvedPuzzleIds.includes(condition.puzzleId);
    case 'puzzle-unsolved':
      return !state.solvedPuzzleIds.includes(condition.puzzleId);
    case 'clues-found':
      return condition.clueIds.every(found);
    case 'clues-missing':
      return !condition.clueIds.every(found);
    case 'major-clues-found':
      return majorClueIds(mystery).every(found);
    case 'major-clue-missing':
      return !majorClueIds(mystery).every(found);
    case 'hints-used-at-most':
      return state.usedHintIds.length <= condition.count;
    case 'incorrect-attempts-at-least':
      return totalIncorrectAttempts(state) >= condition.count;
    case 'completion-reason':
      return state.completionReason !== null && condition.reasons.includes(state.completionReason);
    case 'choice-made':
      return state.choices[condition.choiceId] === condition.optionId;
    case 'score-at-least':
      return state.score >= condition.points;
  }
}
