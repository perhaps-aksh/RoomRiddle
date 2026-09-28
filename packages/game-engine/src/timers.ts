import type {GameState} from '@roomriddle/shared-types';

/**
 * Timer rules. The caller passes `now` (the server in multiplayer, the TV
 * locally). The engine never reads the clock. The clock stops while paused
 * and once the mystery is completed.
 */
export function remainingMs(state: GameState, now: number): number | null {
  if (state.deadline === null) return null;
  const reference = state.pausedAt ?? state.completedAt ?? now;
  return Math.max(0, state.deadline - reference);
}

export function isTimeUp(state: GameState, now: number): boolean {
  return state.status === 'playing' && state.deadline !== null && now >= state.deadline;
}

/** "mm:ss" for display. */
export function formatClock(ms: number): string {
  const totalSeconds = Math.ceil(Math.max(0, ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
