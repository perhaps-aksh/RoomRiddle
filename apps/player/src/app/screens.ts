/**
 * Phone companion screen flow (Master Brief §14–15). Screens are implemented in Phase 5.
 * scan QR / enter code → nickname + avatar → lobby → investigate (clues, evidence, hints)
 * → puzzle answer → vote → results
 */
export const PLAYER_SCREENS = [
  'join',
  'profile',
  'lobby',
  'investigate',
  'puzzle',
  'vote',
  'results',
] as const;

export type PlayerScreen = (typeof PLAYER_SCREENS)[number];
