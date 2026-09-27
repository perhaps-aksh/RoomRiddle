/**
 * Mystery-level types. The engine never cares which mystery it runs;
 * everything mystery-specific is data described by these types.
 * The full content schema (scenes, clues, puzzles, hints, endings) lands in Phase 2.
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
  estimatedMinutes: number;
  minPlayers: number;
  maxPlayers: number;
  availability: MysteryAvailability;
}

/** Deterministic answer kinds the engine will validate (Master Brief §11). No fuzzy/AI matching. */
export type AnswerType =
  | 'exact-text'
  | 'normalized-text'
  | 'numeric'
  | 'code'
  | 'multiple-choice'
  | 'sequence'
  | 'combination'
  | 'evidence';
