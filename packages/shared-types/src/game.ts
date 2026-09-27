import type { MysteryId } from './mystery';

/**
 * High-level flow of one playthrough:
 * lobby → intro → investigation ⇄ puzzle → decision → ending → results
 */
export type GamePhase =
  | 'lobby'
  | 'intro'
  | 'investigation'
  | 'puzzle'
  | 'decision'
  | 'ending'
  | 'results';

/**
 * Authoritative game state. It is produced only by the game engine on the server.
 * Clients render it and never mutate it. Answer keys are never part of it.
 */
export interface GameState {
  mysteryId: MysteryId;
  phase: GamePhase;
  currentSceneId: string | null;
  activePuzzleId: string | null;
  solvedPuzzleIds: string[];
  discoveredClueIds: string[];
  /** puzzleId → number of progressive hints revealed so far. */
  revealedHintCounts: Record<string, number>;
  score: number;
  /** Server-owned deadline (epoch ms), or null when no timer is running. */
  deadline: number | null;
  endingId: string | null;
}
