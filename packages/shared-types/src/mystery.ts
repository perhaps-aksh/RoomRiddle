/**
 * Mystery content schema. The engine never cares which mystery it runs:
 * everything mystery-specific is data described by these types, authored in
 * `packages/mystery-data`. All content is deterministic and pre-authored (no AI).
 */

/** Stable kebab-case identifier, e.g. "the-last-train". */
export type MysteryId = string;

export type MysteryAvailability = 'playable' | 'in-development' | 'coming-soon';

/** What the Mystery Library needs to list a mystery. Contains no spoilers. */
export interface MysterySummary {
  id: MysteryId;
  title: string;
  tagline: string;
  genre: string;
  synopsis: string;
  /** Detail-screen teaser lines. An empty string marks a paragraph break. */
  teaser: string[];
  /** Mood words shown on library cards. */
  atmosphere: string[];
  difficulty: string;
  estimatedMinutes: number;
  minPlayers: number;
  maxPlayers: number;
  /** Optional large background motif, e.g. "11:47". */
  motif?: string;
  availability: MysteryAvailability;
}

/** Something that must be true before a clue or puzzle becomes available. */
export interface Requirement {
  /** Every one of these clues must have been discovered. */
  clueIds?: string[];
  /** Every one of these puzzles must have been solved. */
  puzzleIds?: string[];
}

export interface Scene {
  id: string;
  title: string;
  /** Short place line, e.g. "Harrow Cross halt". */
  subtitle?: string;
  /** An empty string marks a paragraph break. */
  narration: string[];
  /** Clues that can be discovered here, in display order (each Clue.sceneId matches). */
  clueIds: string[];
  /** Puzzles that must be solved before the story can move on. */
  puzzleIds: string[];
  /** Choices that must be made before the story can move on. */
  choiceIds?: string[];
  /** Absent on the final scene. */
  nextSceneId?: string;
}

export interface Clue {
  id: string;
  sceneId: string;
  /** The investigation action shown before discovery, e.g. "Climb up to the signal box". */
  prompt: string;
  title: string;
  description: string[];
  /** Major clues feed ending conditions ("found all the important evidence"). */
  major?: boolean;
  requires?: Requirement;
}

export interface AnswerOption {
  id: string;
  label: string;
}

export interface AnswerField {
  id: string;
  label: string;
  options: AnswerOption[];
}

/**
 * How an answer is entered and normalised. Every kind can be entered with a TV remote.
 * - digits: a fixed-length code on a keypad. "11:47", "11 47" and "1147" are equal.
 * - choice: pick one option. The answer is the option id.
 * - combination: pick one option per field. The answer is the option ids joined by "|".
 * - text: free text, compared after case, punctuation and whitespace normalisation.
 */
export type AnswerInput =
  | {kind: 'digits'; length: number}
  | {kind: 'choice'; options: AnswerOption[]}
  | {kind: 'combination'; fields: AnswerField[]}
  | {kind: 'text'};

export interface Hint {
  /** Unique across the whole mystery. */
  id: string;
  text: string;
}

export interface Puzzle {
  id: string;
  sceneId: string;
  title: string;
  prompt: string[];
  question: string;
  input: AnswerInput;
  /** Explicitly authored accepted answers, in the input's answer format. */
  acceptedAnswers: string[];
  /** Progressive hints: nudge → interpretation → near-solution. */
  hints: Hint[];
  /** Overrides ScoringRules.puzzlePoints for this puzzle. */
  points?: number;
  requires?: Requirement;
  /** Narration shown once the puzzle is solved. */
  solvedText: string[];
  /** Solving this puzzle completes the mystery. */
  completesMystery?: boolean;
}

export interface ChoiceOption {
  id: string;
  label: string;
  /** Move to this scene once chosen. */
  nextSceneId?: string;
  /** Choosing this option completes the mystery. */
  completesMystery?: boolean;
}

export interface Choice {
  id: string;
  sceneId: string;
  prompt: string;
  options: ChoiceOption[];
}

export type CompletionReason =
  | 'solved'
  | 'choice'
  | 'time-expired'
  | 'too-many-attempts'
  | 'abandoned';

/** Declarative, deterministic ending conditions. An ending needs all of its conditions. */
export type EndingCondition =
  | {kind: 'puzzle-solved'; puzzleId: string}
  | {kind: 'puzzle-unsolved'; puzzleId: string}
  | {kind: 'clues-found'; clueIds: string[]}
  /** At least one of these clues was not found. */
  | {kind: 'clues-missing'; clueIds: string[]}
  | {kind: 'major-clues-found'}
  | {kind: 'major-clue-missing'}
  | {kind: 'hints-used-at-most'; count: number}
  | {kind: 'incorrect-attempts-at-least'; count: number}
  | {kind: 'completion-reason'; reasons: CompletionReason[]}
  | {kind: 'choice-made'; choiceId: string; optionId: string}
  | {kind: 'score-at-least'; points: number};

export type EndingTone = 'triumph' | 'bittersweet' | 'defeat';

export interface Ending {
  id: string;
  title: string;
  tone: EndingTone;
  narration: string[];
  /** All must hold. Empty = always matches; the last ending must be such a fallback. */
  when: EndingCondition[];
}

/** Centralised scoring values. A mystery may override any of them. */
export interface ScoringRules {
  /** Points for solving a puzzle with no hints (Puzzle.points overrides). */
  puzzlePoints: number;
  /** Deducted from a puzzle's points for each hint revealed on it. */
  hintPenalty: number;
  /** Deducted from the total score for each wrong answer. */
  incorrectAttemptPenalty: number;
  /** Floor for what one solved puzzle can award after hint deductions. */
  minPuzzlePoints: number;
  /** Points for each clue discovered. */
  clueDiscoveryPoints: number;
  /** Bonus per full minute left on the clock when the mystery is solved. */
  timeBonusPerMinute: number;
  /** When false, the total score never drops below zero. */
  allowNegativeScore: boolean;
}

export interface FailureRules {
  /** Total wrong answers before the mystery ends in failure. */
  maxIncorrectAttempts?: number;
  /** Time limit, counted from the start of the first scene. */
  timeLimitMinutes?: number;
}

/** A complete, playable mystery: everything the engine needs, as data. */
export interface MysteryDefinition {
  summary: MysterySummary;
  intro: {title: string; narration: string[]};
  startSceneId: string;
  scenes: Scene[];
  clues: Clue[];
  puzzles: Puzzle[];
  choices?: Choice[];
  /** Evaluated in order; the first whose conditions all hold wins. */
  endings: Ending[];
  scoring?: Partial<ScoringRules>;
  failure?: FailureRules;
}
