import type {MysterySummary} from '@roomriddle/shared-types';

/**
 * Planned mysteries that appear in the library but have no content yet.
 * Each gets its own folder, built on the same engine, only after The Last Train is stable (Phase 7).
 */
export const comingSoon: readonly MysterySummary[] = [
  {
    id: 'the-hollow-manor',
    title: 'The Hollow Manor',
    tagline: 'Every guest has a secret.',
    genre: 'Detective',
    synopsis: 'A family gathering turns into a murder investigation. Question the evidence and deduce the culprit.',
    teaser: [
      'A family gathering turns into a murder investigation.',
      '',
      'Question the evidence and deduce the culprit.',
    ],
    atmosphere: ['Candlelight', 'Old house', 'Secrets'],
    difficulty: 'Detective',
    estimatedMinutes: 18,
    minPlayers: 2,
    maxPlayers: 6,
    availability: 'coming-soon',
  },
  {
    id: 'signal-lost',
    title: 'Signal Lost',
    tagline: 'The station went silent.',
    genre: 'Sci-Fi',
    synopsis: 'A space station stops responding. Find out what happened before life support fails.',
    teaser: [
      'A space station stops responding.',
      '',
      'Find out what happened before life support fails.',
    ],
    atmosphere: ['Deep space', 'Static', 'Silence'],
    difficulty: 'Mystery',
    estimatedMinutes: 16,
    minPlayers: 2,
    maxPlayers: 6,
    availability: 'coming-soon',
  },
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
