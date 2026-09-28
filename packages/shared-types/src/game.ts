import type {CompletionReason, MysteryId} from './mystery';

/** not-started → intro → playing ⇄ paused → completed */
export type GameStatus = 'not-started' | 'intro' | 'playing' | 'paused' | 'completed';

/**
 * One playthrough. Produced only by the game engine (locally for now, on the
 * server in the multiplayer phase). Clients render it and never mutate it.
 * Plain JSON: it can be saved, sent and restored as-is. Answer keys are never part of it.
 */
export interface GameState {
  schemaVersion: 1;
  mysteryId: MysteryId;
  status: GameStatus;
  currentSceneId: string | null;
  /** The puzzle the players have open, if any. */
  currentPuzzleId: string | null;
  visitedSceneIds: string[];
  discoveredClueIds: string[];
  /** Puzzles whose requirements are met. The engine recomputes this after every change. */
  unlockedPuzzleIds: string[];
  solvedPuzzleIds: string[];
  /** Hint ids revealed so far, in reveal order. */
  usedHintIds: string[];
  /** puzzleId → wrong answers submitted. */
  incorrectAttempts: Record<string, number>;
  /** puzzleId → points awarded when it was solved. */
  puzzlePoints: Record<string, number>;
  /** choiceId → chosen option id. */
  choices: Record<string, string>;
  score: number;
  /** Epoch ms supplied by the caller. The engine never reads the clock. */
  startedAt: number | null;
  deadline: number | null;
  pausedAt: number | null;
  completedAt: number | null;
  completionReason: CompletionReason | null;
  endingId: string | null;
}

/**
 * Everything that can happen in a game. Time-dependent actions carry `at`
 * (epoch ms), so every transition is deterministic and replayable.
 */
export type GameAction =
  | {type: 'START_MYSTERY'; mysteryId: MysteryId}
  | {type: 'ADVANCE_SCENE'; at?: number}
  | {type: 'DISCOVER_CLUE'; clueId: string; at?: number}
  | {type: 'OPEN_PUZZLE'; puzzleId: string; at?: number}
  | {type: 'CLOSE_PUZZLE'}
  | {type: 'SUBMIT_ANSWER'; puzzleId: string; answer: string; at?: number}
  | {type: 'REQUEST_HINT'; puzzleId: string; at?: number}
  | {type: 'MAKE_CHOICE'; choiceId: string; optionId: string; at?: number}
  | {type: 'PAUSE'; at: number}
  | {type: 'RESUME'; at: number}
  | {type: 'TICK'; at: number}
  | {type: 'COMPLETE_MYSTERY'; reason?: CompletionReason; at?: number};

export interface ScoreBreakdown {
  base: number;
  hintDeduction: number;
  awarded: number;
}

export type RejectionReason =
  | 'mystery-mismatch'
  | 'not-playing'
  | 'not-active'
  | 'unknown-clue'
  | 'clue-not-in-scene'
  | 'clue-locked'
  | 'already-discovered'
  | 'unknown-puzzle'
  | 'puzzle-not-in-scene'
  | 'puzzle-locked'
  | 'already-solved'
  | 'incomplete-answer'
  | 'no-more-hints'
  | 'scene-incomplete'
  | 'unknown-choice'
  | 'choice-not-in-scene'
  | 'unknown-option'
  | 'already-chosen'
  | 'time-expired';

/** What an action caused, for UI feedback and (later) broadcasting to players. */
export type GameEvent =
  | {type: 'rejected'; action: GameAction['type']; reason: RejectionReason}
  | {type: 'mystery-started'}
  | {type: 'scene-entered'; sceneId: string}
  | {type: 'clue-discovered'; clueId: string; points: number}
  | {type: 'puzzle-unlocked'; puzzleId: string}
  | {type: 'puzzle-opened'; puzzleId: string}
  | {type: 'answer-correct'; puzzleId: string; breakdown: ScoreBreakdown}
  | {type: 'answer-incorrect'; puzzleId: string; penalty: number; attempts: number}
  | {type: 'hint-revealed'; puzzleId: string; hintId: string; hintNumber: number; penalty: number}
  | {type: 'choice-made'; choiceId: string; optionId: string}
  | {type: 'paused'}
  | {type: 'resumed'}
  | {type: 'time-bonus'; points: number}
  | {type: 'mystery-completed'; endingId: string; reason: CompletionReason};

export interface ActionResult {
  state: GameState;
  events: GameEvent[];
}
