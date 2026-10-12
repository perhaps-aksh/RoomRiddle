import {getMysteryDefinition} from '@roomriddle/mystery-data';
import type {
  ActionResult,
  ClientMessage,
  GameActionMessage,
  GameUpdate,
  PlayerId,
  ServerMessageBody,
  SessionInfo,
} from '@roomriddle/shared-types';
import {findCharacter} from '@roomriddle/game-engine';
import {CharacterService} from '../ai/CharacterService';
import type {VoiceService} from '../ai/voice';
import {RoomError} from '../errors/errors';
import {toPublicMystery} from '../game/GameSession';
import {qrMatrix} from '../qr/qr';
import type {Room} from '../rooms/Room';
import type {RoomManager, TickResult} from '../rooms/RoomManager';
import type {Connection, ConnectionManager} from './ConnectionManager';
import {isGameActionType, parseClientMessage} from './messages';

type Logger = (line: string) => void;

function extensionFor(mime: string | undefined): string {
  return mime === 'audio/mp4' ? 'm4a' : mime === 'audio/wav' ? 'wav' : 'mp3';
}

/**
 * Routes validated client messages to the RoomManager and turns the results
 * into server messages. Owns no state of its own.
 */
export class MessageRouter {
  constructor(
    private readonly rooms: RoomManager,
    private readonly connections: ConnectionManager,
    private readonly clock: () => number,
    private readonly log: Logger = () => {},
    private readonly characters: CharacterService = new CharacterService({clock}),
    private readonly voices?: VoiceService,
  ) {}

  /** Entry point for every raw frame. Never throws. */
  handleRaw(connection: Connection, raw: string): void {
    if (!this.connections.allow(connection)) {
      this.error(connection, new RoomError('RATE_LIMITED'));
      return;
    }
    const parsed = parseClientMessage(raw);
    if (!parsed.ok) {
      this.error(connection, new RoomError('INVALID_MESSAGE', parsed.detail), parsed.requestId);
      return;
    }
    try {
      this.handle(connection, parsed.message);
    } catch (err) {
      if (err instanceof RoomError) {
        this.error(connection, err, parsed.message.requestId);
      } else {
        this.log(`[router] unexpected error on ${parsed.message.type}: ${(err as Error)?.stack ?? String(err)}`);
        this.error(connection, new RoomError('SERVER_ERROR'), parsed.message.requestId);
      }
    }
  }

  /** The socket closed. Keep the seat; tell the room. */
  handleClose(connection: Connection): void {
    const seat = this.connections.close(connection);
    if (!seat) return;
    const room = this.rooms.get(seat.roomId);
    if (!room) return;
    const player = this.rooms.disconnected(room, seat.playerId, this.clock());
    if (!player) return;
    this.log(`[room ${room.code}] ${player.name} disconnected`);
    this.connections.broadcast(room.id, {type: 'PLAYER_UPDATED', room: room.snapshot(), player});
    if (room.isHost(player.id) && room.game) {
      this.broadcastGame(room, {actorId: null, actorName: null, cause: 'HOST_DISCONNECTED', at: this.clock(), events: []});
    }
  }

  /** Clock-driven changes: timeouts, expired seats, abandoned rooms. */
  handleTick(result: TickResult): void {
    for (const {room, result: outcome} of result.timedOut) {
      this.broadcastGameResult(room, outcome, {actorId: null, actorName: null, cause: 'TIMER'});
    }
    for (const {room, playerId} of result.expiredPlayers) {
      this.connections.broadcast(room.id, {type: 'PLAYER_LEFT', room: room.snapshot(), playerId, reason: 'timed-out'});
    }
    for (const room of result.closedRooms) {
      this.connections.broadcast(room.id, {type: 'ROOM_CLOSED', reason: 'expired'});
      for (const c of this.connections.inRoom(room.id)) this.connections.unbind(c);
    }
  }

  // ─── Dispatch ───────────────────────────────────────────────────────

  private handle(connection: Connection, message: ClientMessage): void {
    const now = this.clock();
    const {requestId} = message;
    switch (message.type) {
      case 'CREATE_ROOM': {
        this.requireNoSeat(connection);
        const seat = this.rooms.createRoom(now, message.mysteryId);
        this.connections.bind(connection, seat.room.id, seat.player.id);
        this.log(`[room ${seat.room.code}] created`);
        this.connections.send(
          connection,
          {type: 'ROOM_CREATED', room: seat.room.snapshot(), session: this.sessionInfo(seat.room, seat.player.id, seat.sessionToken), qr: qrMatrix(seat.room.joinUrl)},
          requestId,
        );
        return;
      }
      case 'JOIN_ROOM': {
        this.requireNoSeat(connection);
        const seat = this.rooms.joinRoom(message.roomCode, message.playerName, now);
        this.connections.bind(connection, seat.room.id, seat.player.id);
        this.log(`[room ${seat.room.code}] ${seat.player.name} joined`);
        const snapshot = seat.room.snapshot();
        this.connections.send(
          connection,
          {type: 'ROOM_JOINED', room: snapshot, session: this.sessionInfo(seat.room, seat.player.id, seat.sessionToken), mystery: this.publicMystery(seat.room)},
          requestId,
        );
        this.connections.broadcast(seat.room.id, {type: 'PLAYER_JOINED', room: snapshot, player: seat.player}, connection);
        return;
      }
      case 'RECONNECT': {
        const seat = this.rooms.reconnect(message.roomCode, message.playerId, message.sessionToken, now);
        if (connection.playerId !== null && connection.playerId !== seat.player.id) this.connections.unbind(connection);
        this.connections.bind(connection, seat.room.id, seat.player.id);
        this.log(`[room ${seat.room.code}] ${seat.player.name} reconnected`);
        const snapshot = seat.room.snapshot();
        this.connections.send(
          connection,
          {
            type: 'RECONNECT_SUCCESS',
            room: snapshot,
            session: this.sessionInfo(seat.room, seat.player.id, seat.sessionToken),
            mystery: this.publicMystery(seat.room),
            qr: qrMatrix(seat.room.joinUrl),
          },
          requestId,
        );
        this.connections.broadcast(seat.room.id, {type: 'PLAYER_UPDATED', room: snapshot, player: seat.player}, connection);
        if (seat.room.isHost(seat.player.id) && seat.room.game) {
          this.broadcastGame(seat.room, {actorId: null, actorName: null, cause: 'HOST_RECONNECTED', at: now, events: []}, connection);
        }
        return;
      }
      case 'LEAVE_ROOM': {
        const {room, playerId} = this.seat(connection);
        const name = room.players.get(playerId)?.name ?? '?';
        const {closed} = this.rooms.leave(room, playerId);
        this.connections.unbind(connection);
        this.connections.send(connection, {type: 'LEFT_ROOM'}, requestId);
        if (closed) {
          this.log(`[room ${room.code}] closed by host`);
          this.connections.broadcast(room.id, {type: 'ROOM_CLOSED', reason: 'host-left'});
          for (const c of this.connections.inRoom(room.id)) this.connections.unbind(c);
        } else {
          this.log(`[room ${room.code}] ${name} left`);
          this.connections.broadcast(room.id, {type: 'PLAYER_LEFT', room: room.snapshot(), playerId, reason: 'left'});
        }
        return;
      }
      case 'READY': {
        const {room, playerId} = this.seat(connection);
        const player = this.rooms.setReady(room, playerId, message.ready);
        this.connections.broadcast(room.id, {type: 'PLAYER_UPDATED', room: room.snapshot(), player}, undefined, connection, requestId);
        return;
      }
      case 'START_GAME': {
        const {room, playerId} = this.seat(connection);
        const result = this.rooms.startGame(room, playerId, now);
        this.log(`[room ${room.code}] game started with ${room.players.connectedPlayers().length} players`);
        this.connections.broadcast(
          room.id,
          {type: 'GAME_STARTED', room: room.snapshot(), gameState: result.state, mystery: this.publicMystery(room)},
          undefined,
          connection,
          requestId,
        );
        return;
      }
      case 'ASK_CHARACTER': {
        const {room, playerId} = this.seat(connection);
        const pending = this.characters.accept(room, playerId, message);
        this.connections.broadcast(room.id, {type: 'CHARACTER_THINKING', characterId: pending.characterId, askedBy: pending.askedBy});
        void pending
          .run()
          .then(reply => {
            // Drop replies for a room that closed or restarted while the model was thinking.
            if (this.rooms.get(room.id) !== room || room.game !== pending.session) return;
            this.log(`[room ${room.code}] ${reply.characterName} answered ${reply.askedBy ?? 'the TV'} (${reply.source})`);
            this.connections.broadcast(room.id, {type: 'CHARACTER_REPLY', reply}, undefined, connection, requestId);
            this.voice(room, pending.session, reply.id, reply.characterId, reply.text);
          })
          .catch(err => {
            this.log(`[router] character reply failed: ${(err as Error)?.stack ?? String(err)}`);
            this.error(connection, new RoomError('SERVER_ERROR'), requestId);
          });
        return;
      }
      default: {
        if (!isGameActionType(message.type)) throw new RoomError('INVALID_MESSAGE');
        const {room, playerId} = this.seat(connection);
        const action = message as GameActionMessage;
        const result = this.rooms.gameAction(room, playerId, action, now);
        const actor = room.players.get(playerId);
        this.broadcastGameResult(room, result, {actorId: playerId, actorName: actor?.name ?? null, cause: action.type}, connection, requestId);
      }
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────

  /** Speak a reply once the text is out. Subtitles never wait for audio. */
  private voice(room: Room, session: NonNullable<Room['game']>, replyId: string, characterId: string, text: string): void {
    if (!this.voices?.enabled) return;
    const voice = findCharacter(session.mystery, characterId)?.voice;
    void this.voices.speak(text, voice).then(id => {
      if (!id || this.rooms.get(room.id) !== room || room.game !== session) return;
      this.connections.broadcast(room.id, {type: 'CHARACTER_VOICE', replyId, characterId, audioUrl: `/voice/${id}.${extensionFor(this.voices?.clip(id)?.mime)}`});
    });
  }

  private broadcastGameResult(
    room: Room,
    result: ActionResult,
    who: Pick<GameUpdate, 'actorId' | 'actorName' | 'cause'>,
    origin?: Connection,
    requestId?: string,
  ): void {
    const update: GameUpdate = {...who, at: this.clock(), events: result.events};
    this.broadcastGame(room, update, undefined, origin, requestId);
    if (result.state.status === 'completed' && result.events.some(e => e.type === 'mystery-completed')) {
      this.log(`[room ${room.code}] completed: ${result.state.endingId}`);
      this.connections.broadcast(room.id, {
        type: 'GAME_COMPLETED',
        room: room.snapshot(),
        gameState: result.state,
        endingId: result.state.endingId ?? '',
      });
    }
  }

  private broadcastGame(room: Room, update: GameUpdate, except?: Connection, origin?: Connection, requestId?: string): void {
    const state = room.game?.state;
    if (!state) return;
    const body: ServerMessageBody = {type: 'GAME_STATE_UPDATED', room: room.snapshot(), gameState: state, update};
    this.connections.broadcast(room.id, body, except, origin, requestId);
  }

  private seat(connection: Connection): {room: Room; playerId: PlayerId} {
    if (connection.roomId === null || connection.playerId === null) throw new RoomError('NOT_IN_ROOM');
    const room = this.rooms.get(connection.roomId);
    if (!room) {
      this.connections.unbind(connection);
      throw new RoomError('ROOM_NOT_FOUND');
    }
    if (!room.players.has(connection.playerId)) {
      this.connections.unbind(connection);
      throw new RoomError('PLAYER_NOT_FOUND');
    }
    return {room, playerId: connection.playerId};
  }

  private requireNoSeat(connection: Connection): void {
    if (connection.playerId !== null) throw new RoomError('ALREADY_IN_ROOM');
  }

  private sessionInfo(room: Room, playerId: PlayerId, sessionToken: string): SessionInfo {
    return {roomId: room.id, roomCode: room.code, playerId, role: room.isHost(playerId) ? 'host' : 'player', sessionToken};
  }

  private publicMystery(room: Room) {
    const mystery = room.game?.mystery ?? getMysteryDefinition(room.mysteryId);
    if (!mystery) throw new RoomError('UNKNOWN_MYSTERY', room.mysteryId);
    return toPublicMystery(mystery);
  }

  private error(connection: Connection, err: RoomError, requestId?: string): void {
    this.connections.send(
      connection,
      {type: 'ERROR', code: err.code, message: err.message, ...(err.detail ? {detail: err.detail} : {})},
      requestId,
    );
  }
}
