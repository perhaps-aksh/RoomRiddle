import type { GameState, MysteryId } from '@roomriddle/shared-types';

/** The state every playthrough starts from, before the host starts the mystery. */
export function createInitialGameState(mysteryId: MysteryId): GameState {
  return {
    mysteryId,
    phase: 'lobby',
    currentSceneId: null,
    activePuzzleId: null,
    solvedPuzzleIds: [],
    discoveredClueIds: [],
    revealedHintCounts: {},
    score: 0,
    deadline: null,
    endingId: null,
  };
}
