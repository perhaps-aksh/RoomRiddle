import type { MysterySummary } from '@roomriddle/shared-types';

/**
 * Library listing for The Last Train. Spoiler-free.
 * Scenes, clues, puzzles, hints, choices and endings are authored in Phase 3
 * as sibling files in this folder (scenes.ts, clues.ts, puzzles.ts, hints.ts, endings.ts).
 */
export const theLastTrain: MysterySummary = {
  id: 'the-last-train',
  title: 'The Last Train',
  tagline: 'Can you uncover the truth before midnight?',
  genre: 'Thriller',
  synopsis:
    'A stormy night. The conductor has vanished, the emergency brake is locked, ' +
    'and something happened at 11:47 PM. Investigate the train before it reaches midnight.',
  estimatedMinutes: 13,
  minPlayers: 2,
  maxPlayers: 6,
  availability: 'in-development',
};
