import type {ClientMessage} from '@roomriddle/shared-types';

/**
 * Parses and validates one raw client frame. Anything that isn't exactly a
 * known message shape is rejected; the server never trusts client input.
 */
export type ParseResult = {ok: true; message: ClientMessage} | {ok: false; detail: string; requestId?: string};

export const MAX_MESSAGE_BYTES = 4 * 1024;
const MAX_ID = 64;
const MAX_ANSWER = 200;
const MAX_NAME_INPUT = 64;
export const MAX_QUESTION = 200;

type Validator = (m: Record<string, unknown>) => string | null;

const str = (max: number) => (v: unknown) => typeof v === 'string' && v.length <= max;
const nonEmpty = (max: number) => (v: unknown) => typeof v === 'string' && v.length > 0 && v.length <= max;

function fields(spec: Record<string, (v: unknown) => boolean>, optional: Record<string, (v: unknown) => boolean> = {}): Validator {
  return m => {
    for (const [key, check] of Object.entries(spec)) {
      if (!check(m[key])) return `invalid field "${key}"`;
    }
    for (const [key, check] of Object.entries(optional)) {
      if (m[key] !== undefined && !check(m[key])) return `invalid field "${key}"`;
    }
    return null;
  };
}

/** One validator per client message type. Unknown types are rejected. */
const VALIDATORS: Record<ClientMessage['type'], Validator> = {
  CREATE_ROOM: fields({}, {mysteryId: nonEmpty(MAX_ID)}),
  JOIN_ROOM: fields({roomCode: str(16), playerName: str(MAX_NAME_INPUT)}),
  RECONNECT: fields({roomCode: str(16), playerId: nonEmpty(MAX_ID), sessionToken: nonEmpty(128)}),
  LEAVE_ROOM: fields({}),
  READY: fields({ready: v => typeof v === 'boolean'}),
  START_GAME: fields({}),
  DISCOVER_CLUE: fields({clueId: nonEmpty(MAX_ID)}),
  OPEN_PUZZLE: fields({puzzleId: nonEmpty(MAX_ID)}),
  CLOSE_PUZZLE: fields({}),
  SUBMIT_ANSWER: fields({puzzleId: nonEmpty(MAX_ID), answer: str(MAX_ANSWER)}),
  REQUEST_HINT: fields({puzzleId: nonEmpty(MAX_ID)}),
  ADVANCE_SCENE: fields({}),
  MAKE_CHOICE: fields({choiceId: nonEmpty(MAX_ID), optionId: nonEmpty(MAX_ID)}),
  ASK_CHARACTER: fields({characterId: nonEmpty(MAX_ID), question: v => typeof v === 'string' && v.trim().length > 0 && v.length <= MAX_QUESTION}, {evidenceClueId: nonEmpty(MAX_ID)}),
};

export function parseClientMessage(raw: string): ParseResult {
  if (raw.length > MAX_MESSAGE_BYTES) return {ok: false, detail: 'message too large'};
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return {ok: false, detail: 'not JSON'};
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {ok: false, detail: 'not an object'};
  }
  const m = value as Record<string, unknown>;
  const requestId = typeof m.requestId === 'string' && m.requestId.length <= MAX_ID ? m.requestId : undefined;
  if (m.requestId !== undefined && requestId === undefined) return {ok: false, detail: 'invalid field "requestId"'};
  if (typeof m.type !== 'string' || !Object.hasOwn(VALIDATORS, m.type)) {
    return {ok: false, detail: `unknown message type`, requestId};
  }
  const problem = VALIDATORS[m.type as ClientMessage['type']](m);
  if (problem) return {ok: false, detail: problem, requestId};
  return {ok: true, message: m as unknown as ClientMessage};
}

export function isGameActionType(type: ClientMessage['type']): boolean {
  return (
    type === 'DISCOVER_CLUE' ||
    type === 'OPEN_PUZZLE' ||
    type === 'CLOSE_PUZZLE' ||
    type === 'SUBMIT_ANSWER' ||
    type === 'REQUEST_HINT' ||
    type === 'ADVANCE_SCENE' ||
    type === 'MAKE_CHOICE'
  );
}
