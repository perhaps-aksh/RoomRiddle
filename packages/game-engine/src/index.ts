/**
 * @roomriddle/game-engine: the RoomRiddle Mystery Engine.
 * Deterministic and mystery-agnostic. Feed it any MysteryDefinition.
 */
export {applyAction, reduceGame, replay, isSceneComplete} from './engine';
export {
  createInitialGameState,
  serializeGameState,
  deserializeGameState,
  totalIncorrectAttempts,
  GAME_STATE_SCHEMA_VERSION,
} from './state';
export {normalizeText, normalizeAnswer, isCorrectAnswer, combinationAnswer} from './validation';
export {
  DEFAULT_SCORING_RULES,
  resolveScoringRules,
  scorePuzzle,
  applyScoreDelta,
  timeBonus,
} from './scoring';
export {revealedHints, hintsUsedFor, nextHint} from './hints';
export {remainingMs, isTimeUp, formatClock} from './timers';
export {resolveEnding, isConditionMet} from './endings';
export {
  findScene,
  findClue,
  findPuzzle,
  findChoice,
  majorClueIds,
  isRequirementMet,
  sceneSequence,
} from './mystery';
export {
  getSceneView,
  getPuzzleView,
  getEvidence,
  getGameSummary,
  puzzleStatus,
} from './selectors';
export type {
  SceneView,
  ClueView,
  PuzzleView,
  PuzzleStatusView,
  GameSummary,
} from './selectors';
export {validateMysteryDefinition} from './validate-mystery';
