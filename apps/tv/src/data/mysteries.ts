/**
 * The Mystery Library as the TV shows it: a thin adapter over the catalog in
 * `packages/mystery-data`. Listing information only. Clues, puzzles and answers
 * stay in the mystery data and reach screens only through the game engine.
 */
import {getMysteryDefinition, mysteryCatalog} from '@roomriddle/mystery-data';
import type {AgeGroup, MysterySummary, StoryType} from '@roomriddle/shared-types';

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
  ageGroup: AgeGroup;
  storyType: StoryType;
  synopsis: string;
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
    ageGroup: summary.ageGroup,
    storyType: summary.storyType,
    synopsis: summary.synopsis,
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

// ── Library filters ────────────────────────────────────────────────────

export type AgeFilter = 'any' | AgeGroup;
export type TypeFilter = 'any' | StoryType;

export const AGE_LABEL: Readonly<Record<AgeGroup, string>> = {all: 'All ages', family: 'Family 8+', teens: 'Teens & adults'};
export const TYPE_LABEL: Readonly<Record<StoryType, string>> = {thriller: 'Thriller', gothic: 'Gothic', tech: 'Tech', adventure: 'Adventure', riddle: 'Riddles'};

/** Age chips in a fixed order, only for groups the library actually has. */
export function ageFilters(list: readonly TVMystery[] = mysteries): AgeFilter[] {
  return ['any', ...(['all', 'family', 'teens'] as const).filter(g => list.some(m => m.ageGroup === g))];
}

export function typeFilters(list: readonly TVMystery[] = mysteries): TypeFilter[] {
  return ['any', ...(['thriller', 'gothic', 'tech', 'adventure', 'riddle'] as const).filter(t => list.some(m => m.storyType === t))];
}

/**
 * The cases a group can play. An age filter means "suitable for": choosing
 * Family 8+ also shows all-ages cases, and Teens & adults shows everything.
 */
export function filterMysteries(list: readonly TVMystery[], age: AgeFilter, type: TypeFilter): TVMystery[] {
  const suits = (g: AgeGroup): boolean => age === 'any' || age === 'teens' || g === age || (age === 'family' && g === 'all');
  return list.filter(m => suits(m.ageGroup) && (type === 'any' || m.storyType === type));
}
