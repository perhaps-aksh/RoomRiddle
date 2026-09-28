import type {GameState} from './game';
import type {Clue, Ending, EndingTone, MysteryDefinition, MysteryId, Puzzle} from './mystery';
import type {Player, PlayerId} from './player';

export type RoomId = string;

/** lobby → starting → playing → completed (→ starting again for a replay). */
export type RoomStatus = 'lobby' | 'starting' | 'playing' | 'completed';

/**
 * A room as clients see it. The server owns the real room; clients only ever
 * receive these snapshots and never send them back.
 */
export interface Room {
  id: RoomId;
  /** Short join code shown on the TV and encoded in the QR code. */
  code: string;
  hostId: PlayerId;
  mysteryId: MysteryId;
  status: RoomStatus;
  /** Host first, then players in join order. */
  players: Player[];
  /** Phone players needed / allowed (the host is not counted). */
  minPlayers: number;
  maxPlayers: number;
  /** URL phones open to join (also encoded in the QR code). */
  joinUrl: string;
  /** The authoritative game state, once the host has started the mystery. */
  gameState: GameState | null;
  /** Text the players have earned the right to see (hints, solved narration, ending). */
  reveals: GameReveals | null;
  createdAt: number;
}

/**
 * A puzzle without its answer key, hint text or solution narration. Those stay
 * on the server until earned (see GameReveals).
 */
export type PublicPuzzle = Omit<Puzzle, 'acceptedAnswers' | 'hints' | 'solvedText'> & {
  hintCount: number;
};

/** Mystery content safe to send to phones: no answers, no unearned spoilers. */
export interface PublicMystery
  extends Omit<MysteryDefinition, 'puzzles' | 'endings' | 'scoring' | 'clues'> {
  /** Clue descriptions arrive in GameReveals once discovered. */
  clues: Omit<Clue, 'description'>[];
  puzzles: PublicPuzzle[];
  endings: Pick<Ending, 'id' | 'title' | 'tone'>[];
}

/** Earned text, derived by the server from GameState. */
export interface GameReveals {
  /** clueId → description, for clues already discovered. */
  clues: Record<string, string[]>;
  /** hintId → hint text, for hints already revealed. */
  hints: Record<string, string>;
  /** puzzleId → narration, for puzzles already solved. */
  solvedText: Record<string, string[]>;
  /** The resolved ending, once the mystery is complete. */
  ending: {id: string; title: string; tone: EndingTone; narration: string[]} | null;
}
