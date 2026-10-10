import type {MysterySummary} from '@roomriddle/shared-types';

/**
 * Planned mysteries that appear in the library but have no content yet.
 * Each gets its own folder, built on the same engine, only after The Last Train is stable (Phase 7).
 */
export const comingSoon: readonly MysterySummary[] = [
  {
    id: 'the-forgotten-temple',
    title: 'The Forgotten Temple',
    tagline: 'The expedition never came back.',
    genre: 'Adventure',
    synopsis: "Decode ancient inscriptions and uncover a lost expedition's secret.",
    teaser: ["Decode ancient inscriptions and uncover a lost expedition's secret."],
    atmosphere: ['Ruins', 'Jungle', 'Ancient code'],
    difficulty: 'Explorer',
    estimatedMinutes: 15,
    minPlayers: 2,
    maxPlayers: 6,
    availability: 'coming-soon',
  },
];
