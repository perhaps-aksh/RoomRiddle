import {randomUUID} from 'node:crypto';
import {getMysteryDefinition} from '@roomriddle/mystery-data';
import type {
  ActionResult,
  GameActionMessage,
  MysteryId,
  Player,
  PlayerId,
  RoomId,
} from '@roomriddle/shared-types';
import type {ServerConfig} from '../config';
import {RoomError} from '../errors/errors';
import {GameSession} from '../game/GameSession';
import {cleanPlayerName} from '../players/PlayerManager';
import {SessionManager} from '../sessions/SessionManager';
import {Room} from './Room';
import {generateRoomCode, isValidRoomCodeFormat, normalizeRoomCode} from './roomCode';

export const DEFAULT_MYSTERY_ID = 'the-last-train';

export type RoomConfig = Pick<
  ServerConfig,
  'publicUrl' | 'minPlayers' | 'maxPlayers' | 'lobbyPlayerGraceMs' | 'hostGraceMs' | 'maxRooms'
>;

export interface Seat {
  room: Room;
  player: Player;
  sessionToken: string;
}

/** What `tick()` changed, for the transport layer to announce. */
export interface TickResult {
  /** Rooms whose game the clock ended. */
  timedOut: {room: Room; result: ActionResult}[];
  /** Lobby players whose reconnect grace ran out. */
  expiredPlayers: {room: Room; playerId: PlayerId}[];
  /** Rooms closed because the host never came back. */
  closedRooms: Room[];
}

/**
 * All rooms and every rule about who may be in them. Knows nothing about
 * sockets: methods either return the new state or throw a RoomError. Game
 * rules stay in the engine (via GameSession).
 */
export class RoomManager {
  private readonly rooms = new Map<RoomId, Room>();
  private readonly byCode = new Map<string, RoomId>();
  readonly sessions = new SessionManager();

  constructor(private readonly config: RoomConfig) {}

  // ─── Lookup ─────────────────────────────────────────────────────────

  get(roomId: RoomId): Room | undefined {
    return this.rooms.get(roomId);
  }

  findByCode(rawCode: string): Room {
    const code = normalizeRoomCode(rawCode);
    if (!isValidRoomCodeFormat(code)) throw new RoomError('INVALID_ROOM_CODE');
    const id = this.byCode.get(code);
    const room = id === undefined ? undefined : this.rooms.get(id);
    if (!room) throw new RoomError('ROOM_NOT_FOUND');
    return room;
  }

  get size(): number {
    return this.rooms.size;
  }

  // ─── Room lifecycle ─────────────────────────────────────────────────

  /** The TV opens a room and becomes its host. */
  createRoom(now: number, mysteryId: MysteryId = DEFAULT_MYSTERY_ID): Seat {
    if (!getMysteryDefinition(mysteryId)) throw new RoomError('UNKNOWN_MYSTERY', mysteryId);
    if (this.rooms.size >= this.config.maxRooms) throw new RoomError('SERVER_ERROR', 'room limit reached');
    const code = generateRoomCode(c => this.byCode.has(c));
    const id = randomUUID();
    const hostId = randomUUID();
    const room = new Room(
      id,
      code,
      hostId,
      mysteryId,
      {minPlayers: this.config.minPlayers, maxPlayers: this.config.maxPlayers},
      `${this.config.publicUrl}/join/${code}`,
      now,
    );
    const host = room.players.add('TV', 'host', now, hostId);
    this.rooms.set(id, room);
    this.byCode.set(code, id);
    return {room, player: host, sessionToken: this.sessions.issue(id, host.id)};
  }

  closeRoom(roomId: RoomId): Room | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    this.rooms.delete(roomId);
    this.byCode.delete(room.code);
    this.sessions.revokeRoom(roomId);
    return room;
  }

  /** A phone takes a seat. */
  joinRoom(rawCode: string, rawName: string, now: number): Seat {
    const room = this.findByCode(rawCode);
    const name = cleanPlayerName(rawName);
    if (name === null) throw new RoomError('NAME_REQUIRED');
    if (room.status !== 'lobby') throw new RoomError('ROOM_ALREADY_STARTED');
    if (room.players.seated().length >= room.limits.maxPlayers) throw new RoomError('ROOM_FULL');
    if (room.players.isNameTaken(name)) throw new RoomError('NAME_TAKEN');
    const player = room.players.add(name, 'player', now);
    return {room, player, sessionToken: this.sessions.issue(room.id, player.id)};
  }

  /** Resume an existing seat. Never creates a player. */
  reconnect(rawCode: string, playerId: PlayerId, token: string, now: number): Seat {
    const room = this.findByCode(rawCode);
    if (!room.players.has(playerId)) throw new RoomError('PLAYER_NOT_FOUND');
    if (!this.sessions.verify(room.id, playerId, token)) throw new RoomError('INVALID_SESSION');
    const player = room.players.setConnected(playerId, true, now)!;
    if (room.isHost(playerId)) this.hostReconnected(room, now);
    return {room, player, sessionToken: token};
  }

  /**
   * A player leaves for good. Returns true when the room closed as a result
   * (the host left).
   */
  leave(room: Room, playerId: PlayerId): {closed: boolean} {
    if (room.isHost(playerId)) {
      this.closeRoom(room.id);
      return {closed: true};
    }
    room.players.remove(playerId);
    this.sessions.revoke(playerId);
    return {closed: false};
  }

  /** The connection dropped: keep the seat so the player can reconnect. */
  disconnected(room: Room, playerId: PlayerId, now: number): Player | undefined {
    const player = room.players.setConnected(playerId, false, now);
    if (player && room.isHost(playerId)) this.hostDisconnected(room, now);
    return player;
  }

  setReady(room: Room, playerId: PlayerId, ready: boolean): Player {
    if (room.status !== 'lobby') throw new RoomError('ROOM_ALREADY_STARTED');
    const player = room.players.setReady(playerId, ready);
    if (!player) throw new RoomError('PLAYER_NOT_FOUND');
    return player;
  }

  // ─── Game ───────────────────────────────────────────────────────────

  /** Host only. Starts the mystery (or replays it after completion). */
  startGame(room: Room, playerId: PlayerId, now: number): ActionResult {
    if (!room.isHost(playerId)) throw new RoomError('NOT_HOST');
    if (room.status === 'playing' || room.status === 'starting') throw new RoomError('ROOM_ALREADY_STARTED');
    const connected = room.players.connectedPlayers().length;
    if (connected < room.limits.minPlayers) {
      throw new RoomError(
        'NOT_ENOUGH_PLAYERS',
        `${connected}/${room.limits.minPlayers}`,
        `Waiting for players: ${connected} of ${room.limits.minPlayers} needed.`,
      );
    }
    const mystery = getMysteryDefinition(room.mysteryId);
    if (!mystery) throw new RoomError('UNKNOWN_MYSTERY', room.mysteryId);

    room.status = 'starting';
    const session = new GameSession(mystery);
    const result = session.start(now);
    room.game = session;
    room.status = 'playing';
    room.record({playerId, type: 'START_GAME', at: now, accepted: true});
    return result;
  }

  /**
   * A gameplay intent from anyone seated in the room (TV or phone). Rejected
   * moves throw INVALID_ACTION and change nothing.
   */
  gameAction(room: Room, playerId: PlayerId, message: GameActionMessage, now: number): ActionResult {
    if (!room.players.has(playerId)) throw new RoomError('PLAYER_NOT_FOUND');
    if (!room.game || room.status === 'lobby' || room.status === 'starting') {
      throw new RoomError('GAME_NOT_STARTED');
    }
    if (room.hostDisconnectedAt !== null && room.status === 'playing') {
      throw new RoomError('HOST_DISCONNECTED');
    }
    const before = room.game.state;
    const result = room.game.dispatch(message, now);
    const rejection = result.events.find(e => e.type === 'rejected');
    const changed = result.state !== before;
    if (!changed && rejection && rejection.type === 'rejected') {
      room.record({playerId, type: message.type, at: now, accepted: false});
      throw new RoomError('INVALID_ACTION', rejection.reason);
    }
    room.record({playerId, type: message.type, at: now, accepted: true});
    if (result.state.status === 'completed') room.status = 'completed';
    return result;
  }

  // ─── Host presence ──────────────────────────────────────────────────

  /** The TV dropped mid-game: pause the clock so nobody loses time. */
  private hostDisconnected(room: Room, now: number): void {
    room.hostDisconnectedAt = now;
    if (room.game?.state.status === 'playing') room.game.apply({type: 'PAUSE', at: now});
  }

  private hostReconnected(room: Room, now: number): void {
    room.hostDisconnectedAt = null;
    if (room.game?.state.status === 'paused') room.game.apply({type: 'RESUME', at: now});
  }

  // ─── Time ───────────────────────────────────────────────────────────

  /** Called about once a second by the transport layer. */
  tick(now: number): TickResult {
    const result: TickResult = {timedOut: [], expiredPlayers: [], closedRooms: []};
    for (const room of [...this.rooms.values()]) {
      if (room.hostDisconnectedAt !== null && now - room.hostDisconnectedAt >= this.config.hostGraceMs) {
        this.closeRoom(room.id);
        result.closedRooms.push(room);
        continue;
      }
      if (room.game && room.status === 'playing' && room.game.isTimeUp(now)) {
        const outcome = room.game.apply({type: 'TICK', at: now});
        if (outcome.state.status === 'completed') room.status = 'completed';
        result.timedOut.push({room, result: outcome});
      }
      // Lobby seats are freed after the grace period. Once a game has started,
      // a seat is kept for the whole game so the player can always come back.
      if (room.status === 'lobby') {
        for (const player of room.players.expired(now, this.config.lobbyPlayerGraceMs)) {
          if (room.isHost(player.id)) continue;
          room.players.remove(player.id);
          this.sessions.revoke(player.id);
          result.expiredPlayers.push({room, playerId: player.id});
        }
      }
    }
    return result;
  }
}
