export type PlayerId = string;

/**
 * Everyone in a room. The TV that created the room is the `host` (the Game
 * Master); phones are `player`s. Only players count towards the room limit.
 */
export type PlayerRole = 'host' | 'player';

export interface Player {
  id: PlayerId;
  name: string;
  role: PlayerRole;
  /** Live WebSocket connection. A disconnected player keeps their seat and can reconnect. */
  connected: boolean;
  /** Lobby readiness (informational in Phase 4; the host decides when to start). */
  ready: boolean;
  joinedAt: number;
}
