import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {ErrorCode} from '@roomriddle/shared-types';
import {LOADING_COPY, RECOVERY_LABEL, errorExperience} from './experience';

const ALL: ErrorCode[] = [
  'ROOM_NOT_FOUND', 'ROOM_FULL', 'INVALID_ROOM_CODE', 'NAME_REQUIRED', 'NAME_TAKEN',
  'ROOM_ALREADY_STARTED', 'NOT_HOST', 'NOT_AUTHORIZED', 'NOT_IN_ROOM', 'ALREADY_IN_ROOM',
  'NOT_ENOUGH_PLAYERS', 'UNKNOWN_MYSTERY', 'GAME_NOT_STARTED', 'HOST_DISCONNECTED',
  'INVALID_ACTION', 'INVALID_MESSAGE', 'RATE_LIMITED', 'PLAYER_NOT_FOUND', 'INVALID_SESSION',
  'CONNECTION_FAILED', 'SERVER_ERROR',
];

test('every error code has a designed experience with a way forward', () => {
  for (const code of ALL) {
    const x = errorExperience(code);
    assert.equal(x.code, code);
    assert.match(x.title, /^[A-Z ]+$/, `${code} title is short uppercase words`);
    assert.ok(x.message.length > 10, `${code} has a message`);
    assert.ok(x.actions.length > 0, `${code} is not a dead end`);
    for (const action of x.actions) assert.ok(RECOVERY_LABEL[action]);
  }
});

test('messages never leak technical wording', () => {
  for (const code of ALL) {
    const {message, title} = errorExperience(code);
    assert.doesNotMatch(`${title} ${message}`, /\b(websocket|ECONN\w*|socket|exception|stack|undefined|null)\b|_/i, code);
  }
});

test('connection loss reads as an interruption with retry first', () => {
  const x = errorExperience('CONNECTION_FAILED');
  assert.equal(x.title, 'CONNECTION INTERRUPTED');
  assert.equal(x.actions[0], 'retry');
  assert.equal(x.blocking, true);
});

test('loading states have titles', () => {
  assert.equal(LOADING_COPY.preparing.title, 'PREPARING INVESTIGATION');
  assert.equal(LOADING_COPY.reconnecting.title, 'RECONNECTING');
});
