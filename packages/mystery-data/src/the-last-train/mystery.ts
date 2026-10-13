import type {MysterySummary} from '@roomriddle/shared-types';

/**
 * Library listing for The Last Train. Spoiler-free.
 * The playable content lives in the sibling files and is assembled in ./index.ts.
 */
export const theLastTrain: MysterySummary = {
  id: 'the-last-train',
  title: 'The Last Train',
  tagline: 'Can you uncover the truth before midnight?',
  genre: 'Thriller',
  ageGroup: 'teens',
  storyType: 'thriller',
  synopsis:
    'A stormy night. The conductor has vanished, the last train north is held at the ' +
    'platform, and something happened at 11:47 PM. Find out what before it leaves at midnight.',
  teaser: [
    'A storm.',
    'A missing conductor.',
    'A train approaching midnight.',
    '',
    'Something happened at 11:47 PM.',
  ],
  atmosphere: ['Storm', 'Night train', 'Midnight'],
  difficulty: 'Mystery',
  estimatedMinutes: 15,
  minPlayers: 2,
  maxPlayers: 6,
  motif: '11:47',
  availability: 'playable',
};

export const intro = {
  title: 'Harrow Cross · Sunday · 11:52 PM',
  narration: [
    'Rain hammers the glass roof of Harrow Cross station.',
    'The Northern Star, the last train north, should have left at 11:50.',
    'It is still standing at platform two.',
    '',
    'Its conductor, Elias Caldwell, has vanished.',
    'At midnight the train leaves, with or without him.',
    '',
    'Something happened at 11:47 PM. Find out what.',
  ],
};
