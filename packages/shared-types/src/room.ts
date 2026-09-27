import type { MysteryId } from './mystery';
import type { Player, PlayerId } from './player';

export type RoomId = string;

export type RoomStatus = 'lobby' | 'playing' | 'finished';

/** A multiplayer room. The server owns this; clients only ever receive snapshots. */
export interface GameRoom {
  id: RoomId;
  /** Short human-friendly join code shown on the TV and encoded in the QR code. */
  code: string;
  hostId: PlayerId | null;
  mysteryId: MysteryId;
  status: RoomStatus;
  players: Player[];
  createdAt: number;
}
