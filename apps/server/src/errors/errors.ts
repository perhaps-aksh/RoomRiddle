import type {ErrorCode} from '@roomriddle/shared-types';

const DEFAULT_MESSAGES: Record<ErrorCode, string> = {
  ROOM_NOT_FOUND: 'No room with that code. Check the code on the TV.',
  ROOM_FULL: 'This room is full.',
  INVALID_ROOM_CODE: 'Room codes are 4 digits.',
  NAME_REQUIRED: 'Enter a name (1–16 characters).',
  NAME_TAKEN: 'Someone in this room already has that name.',
  ROOM_ALREADY_STARTED: 'This game has already started.',
  NOT_HOST: 'Only the host can do that.',
  NOT_AUTHORIZED: 'You are not allowed to do that.',
  NOT_IN_ROOM: 'Join a room first.',
  ALREADY_IN_ROOM: 'This connection is already in a room.',
  NOT_ENOUGH_PLAYERS: 'Not enough players have joined yet.',
  UNKNOWN_MYSTERY: 'That mystery is not available.',
  GAME_NOT_STARTED: 'The game has not started yet.',
  HOST_DISCONNECTED: 'The game is paused until the TV reconnects.',
  INVALID_ACTION: 'That move is not possible right now.',
  INVALID_MESSAGE: 'The message could not be understood.',
  RATE_LIMITED: 'Too many messages. Slow down.',
  PLAYER_NOT_FOUND: 'That player is no longer in this room.',
  INVALID_SESSION: 'Your session has expired. Join again.',
  QUESTION_LIMIT: 'The room has asked all its questions for this case.',
  CONNECTION_FAILED: 'Could not reach the game server.',
  SERVER_ERROR: 'Something went wrong on the server.',
};

/** A rejection the client should hear about. Anything else thrown is a SERVER_ERROR. */
export class RoomError extends Error {
  readonly code: ErrorCode;
  readonly detail?: string;

  constructor(code: ErrorCode, detail?: string, message?: string) {
    super(message ?? DEFAULT_MESSAGES[code]);
    this.name = 'RoomError';
    this.code = code;
    this.detail = detail;
  }
}

export function defaultMessage(code: ErrorCode): string {
  return DEFAULT_MESSAGES[code];
}
