import type {ErrorCode} from '@roomriddle/shared-types';
import {errorText} from './errorText';

/**
 * Designed error experiences. Every protocol error code maps to a title,
 * a plain-language message and a recovery path, so no client ever shows a
 * raw technical error. Technical detail belongs in logs, not on screen.
 */
export type ErrorKind = 'room' | 'identity' | 'permission' | 'connection' | 'server' | 'action';

/** What the player can do next. Clients decide how each is wired. */
export type RecoveryAction = 'retry' | 'reconnect' | 'edit-code' | 'edit-name' | 'join-another' | 'return-home' | 'return-to-lobby' | 'dismiss' | 'wait';

export interface ErrorExperience {
  code: ErrorCode;
  kind: ErrorKind;
  /** Short uppercase heading, e.g. "ROOM NOT FOUND". */
  title: string;
  /** One or two sentences in plain language. */
  message: string;
  /** Primary recovery first. Never empty: there are no dead ends. */
  actions: readonly RecoveryAction[];
  /**
   * Blocking errors replace the screen (join failures, lost sessions).
   * Non-blocking ones appear inline or as a toast (a refused action).
   */
  blocking: boolean;
}

type Spec = Omit<ErrorExperience, 'code' | 'message'> & {message?: string};

const SPECS: Record<ErrorCode, Spec> = {
  ROOM_NOT_FOUND: {kind: 'room', title: 'ROOM NOT FOUND', message: 'There is no investigation with that code. Check the code on the TV.', actions: ['edit-code'], blocking: true},
  ROOM_FULL: {kind: 'room', title: 'ROOM FULL', message: 'This investigation already has six investigators.', actions: ['join-another'], blocking: true},
  INVALID_ROOM_CODE: {kind: 'room', title: 'CHECK THE CODE', actions: ['edit-code'], blocking: false},
  NAME_REQUIRED: {kind: 'identity', title: 'NAME REQUIRED', actions: ['edit-name'], blocking: false},
  NAME_TAKEN: {kind: 'identity', title: 'NAME TAKEN', actions: ['edit-name'], blocking: false},
  ROOM_ALREADY_STARTED: {kind: 'room', title: 'INVESTIGATION UNDERWAY', message: 'This game has already started without you. Ask the host to start a new room.', actions: ['join-another'], blocking: true},
  NOT_HOST: {kind: 'permission', title: 'HOST ONLY', message: 'Only the TV can do that.', actions: ['dismiss'], blocking: false},
  NOT_AUTHORIZED: {kind: 'permission', title: 'NOT AUTHORIZED', message: 'You are not allowed to do that here.', actions: ['dismiss'], blocking: false},
  NOT_IN_ROOM: {kind: 'room', title: 'NOT IN A ROOM', message: 'You are not part of an investigation right now.', actions: ['join-another'], blocking: true},
  ALREADY_IN_ROOM: {kind: 'room', title: 'ALREADY IN A ROOM', message: 'You are already part of an investigation.', actions: ['dismiss'], blocking: false},
  NOT_ENOUGH_PLAYERS: {kind: 'action', title: 'MORE INVESTIGATORS NEEDED', actions: ['wait'], blocking: false},
  UNKNOWN_MYSTERY: {kind: 'action', title: 'MYSTERY UNAVAILABLE', actions: ['return-home'], blocking: true},
  GAME_NOT_STARTED: {kind: 'action', title: 'NOT STARTED YET', message: 'The investigation has not begun. Wait for the host.', actions: ['wait'], blocking: false},
  HOST_DISCONNECTED: {kind: 'connection', title: 'TV OFFLINE', message: 'The investigation is paused until the TV reconnects.', actions: ['wait'], blocking: false},
  INVALID_ACTION: {kind: 'action', title: 'ACTION UNAVAILABLE', actions: ['dismiss'], blocking: false},
  INVALID_MESSAGE: {kind: 'server', title: 'ACTION UNAVAILABLE', message: 'That request could not be understood. Try again.', actions: ['retry'], blocking: false},
  RATE_LIMITED: {kind: 'action', title: 'EASY THERE', message: 'Too many actions at once. Wait a moment, then try again.', actions: ['dismiss'], blocking: false},
  PLAYER_NOT_FOUND: {kind: 'identity', title: 'SEAT RELEASED', message: 'You were away too long and your place in the room was released.', actions: ['join-another'], blocking: true},
  INVALID_SESSION: {kind: 'identity', title: 'SESSION EXPIRED', message: 'This session is no longer valid. Join the room again.', actions: ['join-another'], blocking: true},
  CONNECTION_FAILED: {kind: 'connection', title: 'CONNECTION INTERRUPTED', message: 'The investigation server could not be reached.', actions: ['retry', 'return-home'], blocking: true},
  SERVER_ERROR: {kind: 'server', title: 'INVESTIGATION UNAVAILABLE', message: 'The investigation server had a problem. Try again in a moment.', actions: ['retry', 'return-home'], blocking: true},
};

export function errorExperience(code: ErrorCode): ErrorExperience {
  const spec = SPECS[code];
  return {code, ...spec, message: spec.message ?? errorText(code)};
}

/** Button labels for recovery actions. */
export const RECOVERY_LABEL: Record<RecoveryAction, string> = {
  retry: 'Retry',
  reconnect: 'Reconnect',
  'edit-code': 'Check the code',
  'edit-name': 'Change name',
  'join-another': 'Join another room',
  'return-home': 'Return home',
  'return-to-lobby': 'Return to lobby',
  dismiss: 'OK',
  wait: 'Keep waiting',
};

/**
 * Loading states. One vocabulary for both clients so the waiting moments read
 * as part of the investigation, not as "Loading…".
 */
export type LoadingKind = 'connecting' | 'joining' | 'loading' | 'preparing' | 'synchronizing' | 'reconnecting';

export const LOADING_COPY: Record<LoadingKind, {title: string; detail: string}> = {
  connecting: {title: 'CONNECTING TO ROOM', detail: 'Opening a line to the investigation server.'},
  joining: {title: 'JOINING INVESTIGATION', detail: 'Checking the room code.'},
  loading: {title: 'OPENING CASE FILE', detail: 'Retrieving the case.'},
  preparing: {title: 'PREPARING INVESTIGATION', detail: 'Setting the scene.'},
  synchronizing: {title: 'SYNCHRONIZING INVESTIGATORS', detail: 'Bringing every device up to date.'},
  reconnecting: {title: 'RECONNECTING', detail: 'The line dropped. Getting you back in. Your progress is safe.'},
};
