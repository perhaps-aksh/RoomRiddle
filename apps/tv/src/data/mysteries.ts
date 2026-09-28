/**
 * The Mystery Library as the TV shows it: a thin adapter over the catalog in
 * `packages/mystery-data`. Listing information only. Clues, puzzles and answers
 * stay in the mystery data and reach screens only through the game engine.
 */
import {getMysteryDefinition, mysteryCatalog} from '@roomriddle/mystery-data';
import type {MysterySummary} from '@roomriddle/shared-types';

export type MysteryAvailability = 'available' | 'coming-soon';

export interface TVMystery {
  id: string;
  title: string;
  genre: string;
  /** One line for the library card. */
  shortDescription: string;
  /** Detail-screen copy. An empty string marks a paragraph break. */
  description: readonly string[];
  /** Mood words shown on the card. */
  atmosphere: string;
  minPlayers: number;
  maxPlayers: number;
  difficulty: string;
  estimatedMinutes: number;
  /** Optional large background motif on the detail screen. */
  motif?: string;
  availability: MysteryAvailability;
}

function toTVMystery(summary: MysterySummary): TVMystery {
  const playable =
    summary.availability === 'playable' && getMysteryDefinition(summary.id) !== undefined;
  return {
    id: summary.id,
    title: summary.title,
    genre: summary.genre,
    shortDescription: summary.tagline,
    description: summary.teaser,
    atmosphere: summary.atmosphere.join(' · '),
    minPlayers: summary.minPlayers,
    maxPlayers: summary.maxPlayers,
    difficulty: summary.difficulty,
    estimatedMinutes: summary.estimatedMinutes,
    motif: summary.motif,
    availability: playable ? 'available' : 'coming-soon',
  };
}

export const mysteries: readonly TVMystery[] = mysteryCatalog.map(toTVMystery);

export const DEFAULT_MYSTERY_ID = 'the-last-train';

export function findMystery(id: string): TVMystery | undefined {
  return mysteries.find(mystery => mystery.id === id);
}

export function formatPlayers(mystery: TVMystery): string {
  return `${mystery.minPlayers}–${mystery.maxPlayers}`;
}
