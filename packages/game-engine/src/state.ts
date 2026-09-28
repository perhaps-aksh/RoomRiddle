import type {GameState, MysteryId} from '@roomriddle/shared-types';

export const GAME_STATE_SCHEMA_VERSION = 1;

/** The state every playthrough starts from, before the mystery is started. */
export function createInitialGameState(mysteryId: MysteryId): GameState {
  return {
    schemaVersion: GAME_STATE_SCHEMA_VERSION,
    mysteryId,
    status: 'not-started',
    currentSceneId: null,
    currentPuzzleId: null,
    visitedSceneIds: [],
    discoveredClueIds: [],
    unlockedPuzzleIds: [],
    solvedPuzzleIds: [],
    usedHintIds: [],
    incorrectAttempts: {},
    puzzlePoints: {},
    choices: {},
    score: 0,
    startedAt: null,
    deadline: null,
    pausedAt: null,
    completedAt: null,
    completionReason: null,
    endingId: null,
  };
}

/** GameState is plain JSON, so it can be saved or sent as-is. */
export function serializeGameState(state: GameState): string {
  return JSON.stringify(state);
}

/** Restores a serialized GameState, rejecting anything that isn't one. */
export function deserializeGameState(json: string): GameState {
  const value: unknown = JSON.parse(json);
  if (!isGameState(value)) {
    throw new Error('Not a RoomRiddle GameState (or an unsupported schema version).');
  }
  return value;
}

const ARRAY_KEYS = [
  'visitedSceneIds',
  'discoveredClueIds',
  'unlockedPuzzleIds',
  'solvedPuzzleIds',
  'usedHintIds',
] as const;
const RECORD_KEYS = ['incorrectAttempts', 'puzzlePoints', 'choices'] as const;
const STATUSES: readonly string[] = ['not-started', 'intro', 'playing', 'paused', 'completed'];

function isGameState(value: unknown): value is GameState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.schemaVersion === GAME_STATE_SCHEMA_VERSION &&
    typeof v.mysteryId === 'string' &&
    typeof v.status === 'string' &&
    STATUSES.includes(v.status) &&
    typeof v.score === 'number' &&
    ARRAY_KEYS.every((key) => Array.isArray(v[key])) &&
    RECORD_KEYS.every((key) => typeof v[key] === 'object' && v[key] !== null)
  );
}

/** Total wrong answers across every puzzle. */
export function totalIncorrectAttempts(state: GameState): number {
  return Object.values(state.incorrectAttempts).reduce((sum, n) => sum + n, 0);
}
