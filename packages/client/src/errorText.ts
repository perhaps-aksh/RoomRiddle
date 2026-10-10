import type {ErrorCode} from '@roomriddle/shared-types';

/**
 * Short, player-facing text for each error code (Phase 4: functional; the
 * designed error experience is Phase 5). The server also sends a message, but
 * clients prefer these so wording stays consistent.
 */
const TEXT: Record<ErrorCode, string> = {
  ROOM_NOT_FOUND: 'No room with that code. Check the code on the TV.',
  ROOM_FULL: 'This room is full.',
  INVALID_ROOM_CODE: 'Room codes are 4 digits.',
  NAME_REQUIRED: 'Enter your name (up to 16 characters).',
  NAME_TAKEN: 'That name is taken in this room. Try another.',
  ROOM_ALREADY_STARTED: 'This game has already started.',
  NOT_HOST: 'Only the TV can do that.',
  NOT_AUTHORIZED: 'You are not allowed to do that.',
  NOT_IN_ROOM: 'You are not in a room.',
  ALREADY_IN_ROOM: 'You are already in a room.',
  NOT_ENOUGH_PLAYERS: 'Waiting for more players to join.',
  UNKNOWN_MYSTERY: 'That mystery is not available.',
  GAME_NOT_STARTED: 'The game has not started yet.',
  HOST_DISCONNECTED: 'Paused: waiting for the TV to reconnect.',
  INVALID_ACTION: 'That is not possible right now.',
  INVALID_MESSAGE: 'Something went wrong. Try again.',
  RATE_LIMITED: 'Slow down a little.',
  PLAYER_NOT_FOUND: 'You are no longer in this room.',
  INVALID_SESSION: 'Your session expired. Join again.',
  QUESTION_LIMIT: 'Your group has asked every question for this case.',
  CONNECTION_FAILED: 'Cannot reach the game server.',
  SERVER_ERROR: 'The server had a problem. Try again.',
};

export function errorText(code: ErrorCode): string {
  return TEXT[code];
}
