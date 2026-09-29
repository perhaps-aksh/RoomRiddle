/**
 * A scripted RoomRiddle server for TV tests: a fake WebSocket that answers the
 * TV's messages with real protocol messages. Game rules still come from the
 * real engine (applyAction), exactly as on the server; this only stands in for
 * the network. `phoneJoins` / `phoneActs` simulate other players.
 */
import {applyAction, createInitialGameState} from '@roomriddle/game-engine';
import {getMysteryDefinition} from '@roomriddle/mystery-data';
import type {SocketLike} from '@roomriddle/client';
import type {GameAction, GameState, Player, Room, ServerMessage} from '@roomriddle/shared-types';

export class FakeServer {
  socket: (SocketLike & {sent: any[]; readyState: number}) | null = null;
  room: Room | null = null;
  /** While true, new connections fail (the network is down). */
  unreachable = false;
  private seq = 0;
  constructor(private readonly clock: () => number) {}

  createSocket = (): SocketLike => {
    const socket = {
      readyState: 0,
      sent: [] as any[],
      onopen: null as SocketLike['onopen'],
      onclose: null as SocketLike['onclose'],
      onmessage: null as SocketLike['onmessage'],
      onerror: null as SocketLike['onerror'],
      send: (data: string) => {
        const message = JSON.parse(data);
        socket.sent.push(message);
        this.handle(message);
      },
      close: () => {
        socket.readyState = 3;
      },
    };
    this.socket = socket;
    // Open (or fail) on the next tick, like a real socket.
    setTimeout(() => {
      if (this.unreachable) {
        socket.readyState = 3;
        socket.onclose?.({code: 1006});
        return;
      }
      socket.readyState = 1;
      socket.onopen?.({});
    }, 0);
    return socket;
  };

  private emit(body: Record<string, unknown>) {
    const message = {...body, serverTime: this.clock()} as ServerMessage;
    this.socket?.onmessage?.({data: JSON.stringify(message)});
  }

  private player(name: string, role: Player['role']): Player {
    return {id: `${role}-${++this.seq}`, name, role, connected: true, ready: false, joinedAt: this.clock()};
  }

  private snapshot(): Room {
    return JSON.parse(JSON.stringify(this.room));
  }

  private handle(message: any) {
    const requestId = message.requestId;
    switch (message.type) {
      case 'CREATE_ROOM': {
        const host = this.player('TV', 'host');
        this.room = {
          id: 'room-1',
          code: '4827',
          hostId: host.id,
          mysteryId: message.mysteryId ?? 'the-last-train',
          status: 'lobby',
          players: [host],
          minPlayers: 2,
          maxPlayers: 6,
          joinUrl: 'http://192.168.1.20:4000/join/4827',
          gameState: null,
          reveals: null,
          createdAt: this.clock(),
        };
        this.emit({
          type: 'ROOM_CREATED',
          requestId,
          room: this.snapshot(),
          qr: ['1110111', '1010101', '1110111', '0001000', '1110111', '1010101', '1110111'],
          session: {roomId: 'room-1', roomCode: '4827', playerId: host.id, role: 'host', sessionToken: 't'.repeat(32)},
        });
        return;
      }
      case 'START_GAME': {
        const room = this.room!;
        const online = room.players.filter(p => p.role === 'player' && p.connected).length;
        if (online < room.minPlayers) {
          this.emit({type: 'ERROR', requestId, code: 'NOT_ENOUGH_PLAYERS', message: 'Not enough players', detail: `${online}/${room.minPlayers}`});
          return;
        }
        const mystery = getMysteryDefinition(room.mysteryId)!;
        const started = applyAction(mystery, createInitialGameState(room.mysteryId), {type: 'START_MYSTERY', mysteryId: room.mysteryId});
        const entered = applyAction(mystery, started.state, {type: 'ADVANCE_SCENE', at: this.clock()});
        room.status = 'playing';
        room.gameState = entered.state;
        this.emit({type: 'GAME_STARTED', requestId, room: this.snapshot(), gameState: entered.state, mystery: {}});
        return;
      }
      case 'RECONNECT':
        this.emit({
          type: 'RECONNECT_SUCCESS',
          requestId,
          room: this.snapshot(),
          session: {roomId: 'room-1', roomCode: '4827', playerId: message.playerId, role: 'host', sessionToken: message.sessionToken},
          mystery: {},
          qr: ['1'],
        });
        return;
      case 'LEAVE_ROOM':
        this.emit({type: 'LEFT_ROOM', requestId});
        return;
      default:
        this.act(message, 'TV', requestId);
    }
  }

  /** Apply an intent with the real engine and broadcast, as the server does. */
  private act(message: any, actorName: string, requestId?: string) {
    const room = this.room!;
    const mystery = getMysteryDefinition(room.mysteryId)!;
    const {requestId: _requestId, ...intent} = message; // eslint-disable-line @typescript-eslint/no-unused-vars
    const action = {...intent, at: this.clock()} as GameAction;
    const before = room.gameState as GameState;
    const result = applyAction(mystery, before, action);
    const rejection = result.events.find(e => e.type === 'rejected');
    if (result.state === before && rejection && rejection.type === 'rejected') {
      this.emit({type: 'ERROR', requestId, code: 'INVALID_ACTION', message: 'no', detail: rejection.reason});
      return;
    }
    room.gameState = result.state;
    if (result.state.status === 'completed') {
      room.status = 'completed';
    }
    this.emit({
      type: 'GAME_STATE_UPDATED',
      requestId,
      room: this.snapshot(),
      gameState: result.state,
      update: {actorId: null, actorName, cause: message.type, at: this.clock(), events: result.events},
    });
  }

  phoneJoins(name: string) {
    const p = this.player(name, 'player');
    this.room!.players.push(p);
    this.emit({type: 'PLAYER_JOINED', room: this.snapshot(), player: p});
  }

  phoneActs(name: string, message: Record<string, unknown>) {
    this.act(message, name);
  }

  /** A phone's connection drops (its seat is held, as on the real server). */
  phoneDrops(name: string) {
    const p = this.room!.players.find(x => x.name === name)!;
    p.connected = false;
    this.emit({type: 'PLAYER_UPDATED', room: this.snapshot(), player: {...p}});
  }

  /** The TV's own connection drops, as if the network went away. */
  dropTV() {
    const socket = this.socket!;
    this.socket = null;
    socket.readyState = 3;
    socket.onclose?.({code: 1006});
  }
}
