/**
 * Mock Mystery Library for the Phase 2 TV shell.
 *
 * PLACEHOLDER: this is local, static listing data so the shell can be navigated.
 * It mirrors the catalog in `packages/mystery-data` and will be replaced by that
 * package once the game engine lands. Listing information only: no clues,
 * puzzles or answers live here (and none should).
 */

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

export const mysteries: readonly TVMystery[] = [
  {
    id: 'the-last-train',
    title: 'The Last Train',
    genre: 'Thriller',
    shortDescription: 'Can you uncover the truth before midnight?',
    description: [
      'A storm.',
      'A missing conductor.',
      'A train approaching midnight.',
      '',
      'Something happened at 11:47 PM.',
    ],
    atmosphere: 'Storm · Night train · Midnight',
    minPlayers: 2,
    maxPlayers: 6,
    difficulty: 'Mystery',
    estimatedMinutes: 13,
    motif: '11:47',
    availability: 'available',
  },
  {
    id: 'the-hollow-manor',
    title: 'The Hollow Manor',
    genre: 'Detective',
    shortDescription: 'Every guest has a secret.',
    description: [
      'A family gathering turns into a murder investigation.',
      '',
      'Question the evidence and deduce the culprit.',
    ],
    atmosphere: 'Candlelight · Old house · Secrets',
    minPlayers: 2,
    maxPlayers: 6,
    difficulty: 'Detective',
    estimatedMinutes: 18,
    availability: 'coming-soon',
  },
  {
    id: 'signal-lost',
    title: 'Signal Lost',
    genre: 'Sci-Fi',
    shortDescription: 'The station went silent.',
    description: [
      'A space station stops responding.',
      '',
      'Find out what happened before life support fails.',
    ],
    atmosphere: 'Deep space · Static · Silence',
    minPlayers: 2,
    maxPlayers: 6,
    difficulty: 'Mystery',
    estimatedMinutes: 16,
    availability: 'coming-soon',
  },
  {
    id: 'the-forgotten-temple',
    title: 'The Forgotten Temple',
    genre: 'Adventure',
    shortDescription: 'The expedition never came back.',
    description: [
      "Decode ancient inscriptions and uncover a lost expedition's secret.",
    ],
    atmosphere: 'Ruins · Jungle · Ancient code',
    minPlayers: 2,
    maxPlayers: 6,
    difficulty: 'Explorer',
    estimatedMinutes: 15,
    availability: 'coming-soon',
  },
];

export const DEFAULT_MYSTERY_ID = 'the-last-train';

export function findMystery(id: string): TVMystery | undefined {
  return mysteries.find(mystery => mystery.id === id);
}

export function formatPlayers(mystery: TVMystery): string {
  return `${mystery.minPlayers}–${mystery.maxPlayers}`;
}
