import {test, describe} from 'node:test';
import assert from 'node:assert/strict';
import type {SessionInfo} from '@roomriddle/shared-types';
import {RoomClient, type SocketLike} from './RoomClient';
import {initialRoomView, reduceRoomView} from './roomView';
import {memorySessionStore} from './stores';

class FakeSocket implements SocketLike {
  readyState = 0;
  sent: Record<string, unknown>[] = [];
  onopen: ((ev: unknown) => void) | null = null;
  onclose: ((ev: {code: number}) => void) | null = null;
  onmessage: ((ev: {data: unknown}) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  send(data: string) {
    this.sent.push(JSON.parse(data));
  }
  close(code = 1000) {
    this.readyState = 3;
    this.onclose?.({code});
  }
  open() {
    this.readyState = 1;
    this.onopen?.({});
  }
  receive(message: Record<string, unknown>) {
    this.onmessage?.({data: JSON.stringify({serverTime: Date.now(), ...message})});
  }
  drop() {
    this.readyState = 3;
    this.onclose?.({code: 1006});
  }
}

const SESSION: SessionInfo = {roomId: 'r1', roomCode: '4827', playerId: 'p1', role: 'player', sessionToken: 't'.repeat(32)};

function setup(initial: SessionInfo | null = null) {
  const sockets: FakeSocket[] = [];
  const timers: (() => void)[] = [];
  const store = memorySessionStore(initial);
  const client = new RoomClient({
    url: 'ws://x/ws',
    store,
    createSocket: () => {
      const s = new FakeSocket();
      sockets.push(s);
      return s;
    },
    setTimer: fn => timers.push(fn),
    clearTimer: () => {},
  });
  return {client, sockets, timers, store};
}

describe('RoomClient', () => {
  test('a message delivered in pieces (Vega WebSocket) is reassembled, not dropped', () => {
    const {client, sockets} = setup();
    const got: string[] = [];
    client.onMessage(m => got.push(m.type));
    client.connect();
    const s = sockets[0]!;
    s.open();
    const text = JSON.stringify({type: 'PLAYER_JOINED', serverTime: 1, room: {code: '4827', note: 'a "quoted" }brace{'}});
    s.onmessage?.({data: text.slice(0, 677 % text.length)});
    assert.deepEqual(got, [], 'half a message is held, not parsed');
    s.onmessage?.({data: text.slice(677 % text.length)});
    assert.deepEqual(got, ['PLAYER_JOINED']);
  });

  test('queues messages until open, then sends them in order', () => {
    const {client, sockets} = setup();
    client.send({type: 'JOIN_ROOM', roomCode: '4827', playerName: 'Aksh'});
    assert.equal(sockets.length, 1);
    assert.equal(sockets[0]!.sent.length, 0);
    sockets[0]!.open();
    assert.equal(sockets[0]!.sent[0]!.type, 'JOIN_ROOM');
    assert.ok(typeof sockets[0]!.sent[0]!.requestId === 'string');
  });

  test('stores the session from ROOM_JOINED and forgets it on LEFT_ROOM', () => {
    const {client, sockets, store} = setup();
    client.connect();
    sockets[0]!.open();
    sockets[0]!.receive({type: 'ROOM_JOINED', session: SESSION});
    assert.deepEqual(store.load(), SESSION);
    sockets[0]!.receive({type: 'LEFT_ROOM'});
    assert.equal(store.load(), null);
  });

  test('after a drop it reconnects and resumes the stored session first', () => {
    const {client, sockets, timers} = setup(SESSION);
    const statuses: string[] = [];
    client.onStatus(s => statuses.push(s));
    client.connect();
    sockets[0]!.open();
    assert.equal(sockets[0]!.sent[0]!.type, 'RECONNECT');
    sockets[0]!.drop();
    assert.equal(client.connectionStatus, 'reconnecting');
    // An action while offline is queued behind the RECONNECT.
    client.send({type: 'DISCOVER_CLUE', clueId: 'platform-clock'});
    timers.shift()!();
    sockets[1]!.open();
    assert.deepEqual(sockets[1]!.sent.map(m => m.type), ['RECONNECT', 'DISCOVER_CLUE']);
    assert.deepEqual(sockets[1]!.sent[0], {
      type: 'RECONNECT',
      roomCode: '4827',
      playerId: 'p1',
      sessionToken: SESSION.sessionToken,
      requestId: sockets[1]!.sent[0]!.requestId,
    });
    assert.deepEqual(statuses, ['connecting', 'open', 'reconnecting', 'open']);
  });

  test('a rejected resume forgets the session; other errors do not', () => {
    const {client, sockets, store} = setup(SESSION);
    client.connect();
    sockets[0]!.open();
    sockets[0]!.receive({type: 'ERROR', code: 'INVALID_ACTION', message: 'x', requestId: 'other'});
    assert.deepEqual(store.load(), SESSION);
    const reconnectId = sockets[0]!.sent[0]!.requestId as string;
    sockets[0]!.receive({type: 'ERROR', code: 'INVALID_SESSION', message: 'x', requestId: reconnectId});
    assert.equal(store.load(), null);
  });

  test('close() stops reconnecting; code 4000 (replaced) does not retry', () => {
    const a = setup(SESSION);
    a.client.connect();
    a.sockets[0]!.open();
    a.client.close();
    assert.equal(a.timers.length, 0);
    assert.equal(a.client.connectionStatus, 'closed');

    const b = setup(SESSION);
    b.client.connect();
    b.sockets[0]!.open();
    b.sockets[0]!.close(4000);
    assert.equal(b.timers.length, 0);
    assert.equal(b.client.connectionStatus, 'closed');
  });
});

describe('reduceRoomView', () => {
  const room = {id: 'r1', code: '4827', players: [], status: 'lobby'} as never;

  test('tracks room, session and errors from server messages', () => {
    let view = reduceRoomView(initialRoomView, {type: 'ROOM_JOINED', room, session: SESSION, mystery: {} as never, serverTime: 2000}, 1000);
    assert.equal(view.room, room);
    assert.equal(view.session, SESSION);
    assert.equal(view.clockOffset, 1000);
    view = reduceRoomView(view, {type: 'ERROR', code: 'INVALID_ACTION', message: 'no', serverTime: 3000}, 3000);
    assert.equal(view.error!.code, 'INVALID_ACTION');
    assert.equal(view.room, room);
  });

  test('being removed or the room closing ends the view', () => {
    const joined = reduceRoomView(initialRoomView, {type: 'ROOM_JOINED', room, session: SESSION, mystery: {} as never, serverTime: 0});
    const removed = reduceRoomView(joined, {type: 'PLAYER_LEFT', room, playerId: 'p1', reason: 'timed-out', serverTime: 0});
    assert.equal(removed.ended, 'removed');
    assert.equal(removed.session, null);
    const closed = reduceRoomView(joined, {type: 'ROOM_CLOSED', reason: 'host-left', serverTime: 0});
    assert.equal(closed.ended, 'host-left');
  });
});

describe('RoomClient.reconnectNow', () => {
  test('skips the backoff wait and resumes the session', () => {
    const {client, sockets, timers} = setup(SESSION);
    client.connect();
    sockets[0]!.open();
    sockets[0]!.drop();
    assert.equal(client.connectionStatus, 'reconnecting');
    assert.equal(timers.length, 1, 'a retry is scheduled');
    client.reconnectNow();
    assert.equal(sockets.length, 2, 'opened immediately');
    sockets[1]!.open();
    assert.equal(sockets[1]!.sent[0]!.type, 'RECONNECT');
    client.reconnectNow();
    assert.equal(sockets.length, 2, 'no-op while connected');
  });
});
