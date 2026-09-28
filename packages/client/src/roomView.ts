import type {
  ErrorCode,
  GameUpdate,
  PublicMystery,
  QrMatrix,
  Room,
  ServerMessage,
  SessionInfo,
} from '@roomriddle/shared-types';
import type {ConnectionStatus} from './RoomClient';

/**
 * What a client knows about its room, folded from server messages. Pure and
 * framework-free: the TV (React Native) and phone (DOM) both render this.
 * Nothing here decides a game rule; it only keeps the latest server snapshot.
 */
export interface RoomView {
  connection: ConnectionStatus;
  session: SessionInfo | null;
  room: Room | null;
  mystery: PublicMystery | null;
  qr: QrMatrix | null;
  /** Latest gameplay update (who did what), for feedback lines. */
  lastUpdate: GameUpdate | null;
  /** Latest error, until cleared or superseded. */
  error: {code: ErrorCode; message: string; requestId?: string} | null;
  /** Set when the room ended for this client (left, closed, removed). */
  ended: 'left' | 'host-left' | 'expired' | 'removed' | null;
  /** Server clock minus local clock. */
  clockOffset: number;
}

export const initialRoomView: RoomView = {
  connection: 'idle',
  session: null,
  room: null,
  mystery: null,
  qr: null,
  lastUpdate: null,
  error: null,
  ended: null,
  clockOffset: 0,
};

export function reduceRoomView(view: RoomView, message: ServerMessage, now: number = Date.now()): RoomView {
  const base: RoomView = {...view, clockOffset: message.serverTime - now};
  switch (message.type) {
    case 'ROOM_CREATED':
      return {...base, room: message.room, session: message.session, qr: message.qr, error: null, ended: null, lastUpdate: null};
    case 'ROOM_JOINED':
      return {...base, room: message.room, session: message.session, mystery: message.mystery, error: null, ended: null, lastUpdate: null};
    case 'RECONNECT_SUCCESS':
      return {...base, room: message.room, session: message.session, mystery: message.mystery, qr: message.qr, error: null, ended: null};
    case 'ROOM_STATE':
    case 'PLAYER_JOINED':
    case 'PLAYER_UPDATED':
      return {...base, room: message.room};
    case 'PLAYER_LEFT':
      if (message.playerId === view.session?.playerId) {
        return {...base, room: null, session: null, ended: 'removed'};
      }
      return {...base, room: message.room};
    case 'GAME_STARTED':
      return {...base, room: message.room, mystery: message.mystery, lastUpdate: null, error: null};
    case 'GAME_STATE_UPDATED':
      return {...base, room: message.room, lastUpdate: message.update};
    case 'GAME_COMPLETED':
      return {...base, room: message.room};
    case 'LEFT_ROOM':
      return {...base, room: null, session: null, lastUpdate: null, ended: 'left'};
    case 'ROOM_CLOSED':
      return {...base, room: null, session: null, lastUpdate: null, ended: message.reason};
    case 'ERROR':
      return {...base, error: {code: message.code, message: message.message, requestId: message.requestId}};
  }
}

export function withConnection(view: RoomView, connection: ConnectionStatus): RoomView {
  return view.connection === connection ? view : {...view, connection};
}

/** Server-corrected "now", for countdowns. */
export function serverNow(view: RoomView, localNow: number = Date.now()): number {
  return localNow + view.clockOffset;
}

export function isHost(view: RoomView): boolean {
  return view.session?.role === 'host';
}

export function me(view: RoomView) {
  return view.room?.players.find(p => p.id === view.session?.playerId) ?? null;
}
