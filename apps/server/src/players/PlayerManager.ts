import {randomUUID} from 'node:crypto';
import type {Player, PlayerId, PlayerRole} from '@roomriddle/shared-types';

export const MAX_NAME_LENGTH = 16;

interface PlayerRecord extends Player {
  /** When the connection dropped, or null while connected. */
  disconnectedAt: number | null;
}

/** The people in one room: seats, names, connection state. No game rules. */
export class PlayerManager {
  private readonly players = new Map<PlayerId, PlayerRecord>();

  add(name: string, role: PlayerRole, now: number, id: PlayerId = randomUUID()): Player {
    const record: PlayerRecord = {
      id,
      name,
      role,
      connected: true,
      ready: role === 'host',
      joinedAt: now,
      disconnectedAt: null,
    };
    this.players.set(record.id, record);
    return toPlayer(record);
  }

  get(id: PlayerId): Player | undefined {
    const record = this.players.get(id);
    return record ? toPlayer(record) : undefined;
  }

  has(id: PlayerId): boolean {
    return this.players.has(id);
  }

  remove(id: PlayerId): boolean {
    return this.players.delete(id);
  }

  /** Host first, then players in join order. */
  list(): Player[] {
    return [...this.players.values()]
      .sort((a, b) => (a.role === b.role ? a.joinedAt - b.joinedAt : a.role === 'host' ? -1 : 1))
      .map(toPlayer);
  }

  /** Phone players only (the host doesn't take a seat). */
  seated(): Player[] {
    return this.list().filter(p => p.role === 'player');
  }

  connectedPlayers(): Player[] {
    return this.seated().filter(p => p.connected);
  }

  isNameTaken(name: string): boolean {
    const key = name.toLocaleLowerCase();
    return [...this.players.values()].some(p => p.role === 'player' && p.name.toLocaleLowerCase() === key);
  }

  setConnected(id: PlayerId, connected: boolean, now: number): Player | undefined {
    const record = this.players.get(id);
    if (!record) return undefined;
    record.connected = connected;
    record.disconnectedAt = connected ? null : now;
    return toPlayer(record);
  }

  setReady(id: PlayerId, ready: boolean): Player | undefined {
    const record = this.players.get(id);
    if (!record) return undefined;
    record.ready = ready;
    return toPlayer(record);
  }

  /** Disconnected players whose grace period ran out. */
  expired(now: number, graceMs: number): Player[] {
    return [...this.players.values()]
      .filter(p => p.disconnectedAt !== null && now - p.disconnectedAt >= graceMs)
      .map(toPlayer);
  }
}

/** "  Aksh\u0007 " → "Aksh". Null when nothing usable is left. */
export function cleanPlayerName(raw: string): string | null {
  const name = raw
    .replace(/[\p{Cc}\p{Cf}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (name.length === 0 || [...name].length > MAX_NAME_LENGTH) return null;
  return name;
}

function toPlayer({disconnectedAt: _d, ...player}: PlayerRecord): Player {
  return {...player};
}
