import {randomBytes, timingSafeEqual} from 'node:crypto';
import type {PlayerId, RoomId} from '@roomriddle/shared-types';

interface SessionRecord {
  roomId: RoomId;
  playerId: PlayerId;
  token: string;
}

/**
 * Session tokens: the only proof of identity on RECONNECT. One token per
 * player, random, compared in constant time, revoked when the player leaves
 * or the room closes.
 */
export class SessionManager {
  private readonly byPlayer = new Map<PlayerId, SessionRecord>();

  issue(roomId: RoomId, playerId: PlayerId): string {
    const token = randomBytes(24).toString('base64url');
    this.byPlayer.set(playerId, {roomId, playerId, token});
    return token;
  }

  /** True only if this exact token belongs to this player in this room. */
  verify(roomId: RoomId, playerId: PlayerId, token: string): boolean {
    const record = this.byPlayer.get(playerId);
    if (!record || record.roomId !== roomId) return false;
    const a = Buffer.from(record.token);
    const b = Buffer.from(token);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  tokenFor(playerId: PlayerId): string | undefined {
    return this.byPlayer.get(playerId)?.token;
  }

  revoke(playerId: PlayerId): void {
    this.byPlayer.delete(playerId);
  }

  revokeRoom(roomId: RoomId): void {
    for (const [playerId, record] of this.byPlayer) {
      if (record.roomId === roomId) this.byPlayer.delete(playerId);
    }
  }
}
