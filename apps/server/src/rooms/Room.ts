import type {
  GameActionMessageType,
  MysteryId,
  Player,
  PlayerId,
  Room as RoomSnapshot,
  RoomId,
  RoomStatus,
} from '@roomriddle/shared-types';
import {GameSession, revealsFor} from '../game/GameSession';
import {PlayerManager} from '../players/PlayerManager';

/** Who did what, when. Multiplayer metadata only: the engine never sees it. */
export interface ActionRecord {
  playerId: PlayerId;
  type: GameActionMessageType | 'START_GAME';
  at: number;
  accepted: boolean;
}

export interface RoomLimits {
  minPlayers: number;
  maxPlayers: number;
}

/**
 * The server's live room. Owns its players and (once started) its GameSession.
 * Clients only ever see `snapshot()`.
 */
export class Room {
  status: RoomStatus = 'lobby';
  game: GameSession | null = null;
  readonly players = new PlayerManager();
  readonly actionLog: ActionRecord[] = [];
  /** When the host (TV) dropped, or null while connected. */
  hostDisconnectedAt: number | null = null;

  constructor(
    readonly id: RoomId,
    readonly code: string,
    readonly hostId: PlayerId,
    public mysteryId: MysteryId,
    readonly limits: RoomLimits,
    readonly joinUrl: string,
    readonly createdAt: number,
  ) {}

  get host(): Player | undefined {
    return this.players.get(this.hostId);
  }

  isHost(playerId: PlayerId): boolean {
    return playerId === this.hostId;
  }

  record(entry: ActionRecord): void {
    this.actionLog.push(entry);
    if (this.actionLog.length > 500) this.actionLog.shift();
  }

  snapshot(): RoomSnapshot {
    const state = this.game?.state ?? null;
    return {
      id: this.id,
      code: this.code,
      hostId: this.hostId,
      mysteryId: this.mysteryId,
      status: this.status,
      players: this.players.list(),
      minPlayers: this.limits.minPlayers,
      maxPlayers: this.limits.maxPlayers,
      joinUrl: this.joinUrl,
      gameState: state,
      reveals: this.game && state ? revealsFor(this.game.mystery, state) : null,
      createdAt: this.createdAt,
    };
  }
}
