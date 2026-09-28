import type {PlayerId, RoomId, ServerMessage, ServerMessageBody} from '@roomriddle/shared-types';

/** What the connection layer needs from a socket (so tests can use fakes). */
export interface Transport {
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

export interface Connection {
  readonly id: number;
  readonly transport: Transport;
  /** Set once the connection has created, joined or reconnected to a room. */
  roomId: RoomId | null;
  playerId: PlayerId | null;
  /** Token bucket for rate limiting. */
  tokens: number;
  lastRefill: number;
}

const BUCKET_SIZE = 20;
const REFILL_PER_SECOND = 10;

/**
 * Tracks live connections and which seat each one holds. One live connection
 * per player: a reconnect replaces (and closes) the old one.
 */
export class ConnectionManager {
  private nextId = 1;
  private readonly connections = new Set<Connection>();
  private readonly byPlayer = new Map<PlayerId, Connection>();

  constructor(private readonly clock: () => number) {}

  open(transport: Transport): Connection {
    const connection: Connection = {
      id: this.nextId++,
      transport,
      roomId: null,
      playerId: null,
      tokens: BUCKET_SIZE,
      lastRefill: this.clock(),
    };
    this.connections.add(connection);
    return connection;
  }

  /** Returns the seat the connection held, if it was still the player's live connection. */
  close(connection: Connection): {roomId: RoomId; playerId: PlayerId} | null {
    this.connections.delete(connection);
    const {roomId, playerId} = connection;
    if (roomId === null || playerId === null) return null;
    if (this.byPlayer.get(playerId) !== connection) return null;
    this.byPlayer.delete(playerId);
    return {roomId, playerId};
  }

  /** Bind a connection to a seat, replacing any older connection for that player. */
  bind(connection: Connection, roomId: RoomId, playerId: PlayerId): void {
    const previous = this.byPlayer.get(playerId);
    connection.roomId = roomId;
    connection.playerId = playerId;
    this.byPlayer.set(playerId, connection);
    if (previous && previous !== connection) {
      previous.roomId = null;
      previous.playerId = null;
      previous.transport.close(4000, 'replaced by a newer connection');
    }
  }

  unbind(connection: Connection): void {
    if (connection.playerId !== null && this.byPlayer.get(connection.playerId) === connection) {
      this.byPlayer.delete(connection.playerId);
    }
    connection.roomId = null;
    connection.playerId = null;
  }

  forPlayer(playerId: PlayerId): Connection | undefined {
    return this.byPlayer.get(playerId);
  }

  inRoom(roomId: RoomId): Connection[] {
    return [...this.byPlayer.values()].filter(c => c.roomId === roomId);
  }

  /** False when the connection is flooding. */
  allow(connection: Connection): boolean {
    const now = this.clock();
    const refill = ((now - connection.lastRefill) / 1000) * REFILL_PER_SECOND;
    connection.tokens = Math.min(BUCKET_SIZE, connection.tokens + refill);
    connection.lastRefill = now;
    if (connection.tokens < 1) return false;
    connection.tokens -= 1;
    return true;
  }

  send(connection: Connection, body: ServerMessageBody, requestId?: string): void {
    const message: ServerMessage = {...body, serverTime: this.clock(), ...(requestId ? {requestId} : {})};
    try {
      connection.transport.send(JSON.stringify(message));
    } catch {
      // A dead socket is cleaned up by its close event.
    }
  }

  /** Send to everyone connected in a room (optionally skipping one connection). */
  broadcast(roomId: RoomId, body: ServerMessageBody, except?: Connection, requestIdFor?: Connection, requestId?: string): void {
    for (const connection of this.inRoom(roomId)) {
      if (connection === except) continue;
      this.send(connection, body, connection === requestIdFor ? requestId : undefined);
    }
  }

  get count(): number {
    return this.connections.size;
  }
}
