/**
 * End-to-end over real WebSockets: a TV and phones connect to a live server
 * (random port), create/join a room, play The Last Train to an ending, drop
 * and resume connections, and send garbage.
 */
import {test, describe, after} from 'node:test';
import assert from 'node:assert/strict';
import type {AddressInfo} from 'node:net';
import {WebSocket} from 'ws';
import type {ClientMessage, ServerMessage, ServerMessageType, SessionInfo} from '@roomriddle/shared-types';
import {createAppServer} from '../app';
import {RoomManager} from '../rooms/RoomManager';
import {attachGameSocket, WEBSOCKET_PATH} from './server';

type Msg<T extends ServerMessageType> = Extract<ServerMessage, {type: T}>;

class Client {
  readonly inbox: ServerMessage[] = [];
  private waiters: {match: (m: ServerMessage) => boolean; resolve: (m: ServerMessage) => void}[] = [];
  private constructor(readonly socket: WebSocket) {
    socket.on('message', data => {
      const message = JSON.parse(data.toString()) as ServerMessage;
      const waiter = this.waiters.find(w => w.match(message));
      if (waiter) {
        this.waiters = this.waiters.filter(w => w !== waiter);
        waiter.resolve(message);
      } else {
        this.inbox.push(message);
      }
    });
  }

  static async connect(url: string): Promise<Client> {
    const socket = new WebSocket(url);
    await new Promise<void>((resolve, reject) => {
      socket.once('open', () => resolve());
      socket.once('error', reject);
    });
    return new Client(socket);
  }

  send(message: ClientMessage | Record<string, unknown>): void {
    this.socket.send(JSON.stringify(message));
  }

  raw(data: string): void {
    this.socket.send(data);
  }

  /** Next message of this type (already received or future). */
  next<T extends ServerMessageType>(type: T, where: (m: Msg<T>) => boolean = () => true, timeoutMs = 3000): Promise<Msg<T>> {
    const match = (m: ServerMessage) => m.type === type && where(m as Msg<T>);
    const index = this.inbox.findIndex(match);
    if (index >= 0) return Promise.resolve(this.inbox.splice(index, 1)[0] as Msg<T>);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`timed out waiting for ${type}`)), timeoutMs);
      this.waiters.push({
        match,
        resolve: m => {
          clearTimeout(timer);
          resolve(m as Msg<T>);
        },
      });
    });
  }

  async request<T extends ServerMessageType>(message: ClientMessage, type: T): Promise<Msg<T>> {
    const requestId = `r${Math.random().toString(36).slice(2)}`;
    this.send({...message, requestId});
    const reply = await Promise.race([
      this.next(type, m => m.requestId === requestId),
      this.next('ERROR', m => m.requestId === requestId).then(e => {
        throw new Error(`ERROR ${e.code}: ${e.message}`);
      }),
    ]);
    return reply as Msg<T>;
  }

  async expectError(message: ClientMessage | Record<string, unknown>, code: string): Promise<Msg<'ERROR'>> {
    const requestId = `e${Math.random().toString(36).slice(2)}`;
    this.send({...message, requestId});
    const error = await this.next('ERROR', m => m.requestId === requestId);
    assert.equal(error.code, code, `expected ${code}, got ${error.code} (${error.message})`);
    return error;
  }

  clear(): void {
    this.inbox.length = 0;
  }

  close(): Promise<void> {
    return new Promise(resolve => {
      if (this.socket.readyState === WebSocket.CLOSED) return resolve();
      this.socket.once('close', () => resolve());
      this.socket.close();
    });
  }
}

async function startServer(overrides: {minPlayers?: number; maxPlayers?: number} = {}) {
  const rooms = new RoomManager({
    publicUrl: 'http://test.local:4000',
    minPlayers: overrides.minPlayers ?? 2,
    maxPlayers: overrides.maxPlayers ?? 3,
    lobbyPlayerGraceMs: 60_000,
    hostGraceMs: 300_000,
    maxRooms: 50,
  });
  const http = createAppServer({playerDir: '/nonexistent'});
  const sockets = attachGameSocket(http, rooms);
  await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve));
  const {port} = http.address() as AddressInfo;
  const url = `ws://127.0.0.1:${port}${WEBSOCKET_PATH}`;
  const clients: Client[] = [];
  const connect = async () => {
    const c = await Client.connect(url);
    clients.push(c);
    return c;
  };
  const stop = async () => {
    await Promise.all(clients.map(c => c.close()));
    await sockets.close();
    await new Promise<void>(resolve => http.close(() => resolve()));
  };
  return {rooms, connect, stop, port};
}

/** TV creates a room, two phones join. */
async function lobby(server: Awaited<ReturnType<typeof startServer>>) {
  const tv = await server.connect();
  const created = await tv.request({type: 'CREATE_ROOM'}, 'ROOM_CREATED');
  const code = created.room.code;
  const phoneA = await server.connect();
  const joinedA = await phoneA.request({type: 'JOIN_ROOM', roomCode: code, playerName: 'Aksh'}, 'ROOM_JOINED');
  const phoneB = await server.connect();
  const joinedB = await phoneB.request({type: 'JOIN_ROOM', roomCode: code, playerName: 'Grace'}, 'ROOM_JOINED');
  return {tv, phoneA, phoneB, code, created, joinedA, joinedB};
}

describe('WebSocket multiplayer', () => {
  const servers: {stop: () => Promise<void>}[] = [];
  after(async () => {
    await Promise.all(servers.map(s => s.stop()));
  });
  const server = async (o?: {minPlayers?: number; maxPlayers?: number}) => {
    const s = await startServer(o);
    servers.push(s);
    return s;
  };

  test('create → join → TV sees both players (PLAYER_JOINED)', async () => {
    const s = await server();
    const tv = await s.connect();
    const created = await tv.request({type: 'CREATE_ROOM'}, 'ROOM_CREATED');
    assert.match(created.room.code, /^\d{4}$/);
    assert.equal(created.session.role, 'host');
    assert.equal(created.room.joinUrl, `http://test.local:4000/join/${created.room.code}`);
    assert.ok(created.qr.length >= 21 && created.qr.every(row => row.length === created.qr.length));

    const phone = await s.connect();
    const joined = await phone.request({type: 'JOIN_ROOM', roomCode: created.room.code, playerName: 'Aksh'}, 'ROOM_JOINED');
    assert.equal(joined.session.role, 'player');
    assert.equal(joined.mystery.summary.title, 'The Last Train');
    const seen = await tv.next('PLAYER_JOINED');
    assert.equal(seen.player.name, 'Aksh');
    assert.deepEqual(seen.room.players.map(p => p.name), ['TV', 'Aksh']);

    const phone2 = await s.connect();
    await phone2.request({type: 'JOIN_ROOM', roomCode: created.room.code, playerName: 'Grace'}, 'ROOM_JOINED');
    const seen2 = await tv.next('PLAYER_JOINED', m => m.player.name === 'Grace');
    assert.equal(seen2.room.players.length, 3);
    assert.equal((await phone.next('PLAYER_JOINED')).player.name, 'Grace');
  });

  test('phones never receive answer keys, hint text or unearned clue text', async () => {
    const s = await server();
    const {joinedA} = await lobby(s);
    const json = JSON.stringify(joinedA);
    assert.ok(!json.includes('acceptedAnswers'));
    assert.ok(!json.includes('"11:47","1147"'));
    assert.ok(!json.includes('voss|carriage-c|1147'));
    assert.ok(!json.includes('Take twelve minutes off'));
    assert.ok(!json.includes('Lightning struck the tower'), 'clue descriptions stay hidden until discovered');
    assert.ok(joinedA.mystery.puzzles.every(p => typeof p.hintCount === 'number'));
  });

  test('a full game: 2 phones + TV play The Last Train to THE TRUTH, in sync', async () => {
    const s = await server();
    const {tv, phoneA, phoneB} = await lobby(s);
    await phoneA.expectError({type: 'START_GAME'}, 'NOT_HOST');

    const started = await tv.request({type: 'START_GAME'}, 'GAME_STARTED');
    assert.equal(started.gameState.currentSceneId, 'station');
    const startA = await phoneA.next('GAME_STARTED');
    const startB = await phoneB.next('GAME_STARTED');
    assert.deepEqual(startA.gameState, started.gameState);
    assert.deepEqual(startB.gameState, started.gameState);
    for (const c of [tv, phoneA, phoneB]) c.clear();

    const phones = [phoneA, phoneB];
    let turn = 0;
    /** Alternate phones; check everyone receives the same new state. */
    const act = async (message: ClientMessage) => {
      const actor = phones[turn++ % 2]!;
      const update = await actor.request(message, 'GAME_STATE_UPDATED');
      const others = [tv, ...phones.filter(p => p !== actor)];
      for (const other of others) {
        const seen = await other.next('GAME_STATE_UPDATED', m => m.update.at === update.update.at && m.update.cause === message.type);
        assert.deepEqual(seen.gameState, update.gameState);
      }
      return update;
    };

    const scenes: {clues: string[]; puzzle: string; answer: string}[] = [
      {clues: ['platform-clock', 'company-notice', 'waiting-room-clock'], puzzle: 'station-clock', answer: '1147'},
      {clues: ['torn-ticket', 'departure-board', 'carriage-plan'], puzzle: 'torn-ticket', answer: '207|c|7'},
      {clues: ['pocket-watch', 'conductors-ledger', 'seat-eight-card', 'wired-brake'], puzzle: 'conductors-ledger', answer: 'voss|carriage-c|1147'},
      {clues: ['blackwater-lever', 'lamp-room-door'], puzzle: 'final-signal', answer: 'voss-sabotage'},
    ];

    // One wrong answer and one hint along the way.
    for (const clueId of scenes[0]!.clues) await act({type: 'DISCOVER_CLUE', clueId});
    const wrong = await act({type: 'SUBMIT_ANSWER', puzzleId: 'station-clock', answer: '1159'});
    assert.ok(wrong.update.events.some(e => e.type === 'answer-incorrect'));
    assert.equal(wrong.update.actorName, 'Grace');
    const hinted = await act({type: 'REQUEST_HINT', puzzleId: 'station-clock'});
    assert.equal(hinted.room.reveals!.hints['station-clock-1'], 'Only one clock stopped at the exact moment. Which one?');

    for (const [i, scene] of scenes.entries()) {
      if (i > 0) for (const clueId of scene.clues) await act({type: 'DISCOVER_CLUE', clueId});
      const solved = await act({type: 'SUBMIT_ANSWER', puzzleId: scene.puzzle, answer: scene.answer});
      assert.ok(solved.update.events.some(e => e.type === 'answer-correct'), `solved ${scene.puzzle}`);
      if (i < 3) {
        const moved = await act({type: 'ADVANCE_SCENE'});
        assert.equal(moved.gameState.currentSceneId, scenes[i + 1] ? ['train', 'carriage', 'signal-box'][i] : null);
      }
    }

    for (const c of [tv, phoneA, phoneB]) {
      const done = await c.next('GAME_COMPLETED');
      assert.equal(done.endingId, 'the-truth');
      assert.equal(done.room.status, 'completed');
      assert.equal(done.room.reveals!.ending!.title, 'The Truth');
    }
    assert.equal(s.rooms.get(started.room.id)!.game!.state.solvedPuzzleIds.length, 4);

    // Host can replay from the ending.
    const again = await tv.request({type: 'START_GAME'}, 'GAME_STARTED');
    assert.equal(again.gameState.score, 0);
  });

  test('a phone reconnects to the same seat and gets the current state', async () => {
    const s = await server();
    const {tv, phoneA, phoneB, code, joinedA} = await lobby(s);
    await tv.request({type: 'START_GAME'}, 'GAME_STARTED');
    await phoneB.request({type: 'DISCOVER_CLUE', clueId: 'platform-clock'}, 'GAME_STATE_UPDATED');

    await phoneA.close();
    const dropped = await tv.next('PLAYER_UPDATED', m => m.player.name === 'Aksh' && !m.player.connected);
    assert.equal(dropped.room.players.length, 3);

    // Meanwhile the game moves on.
    await phoneB.request({type: 'DISCOVER_CLUE', clueId: 'company-notice'}, 'GAME_STATE_UPDATED');

    const session: SessionInfo = joinedA.session;
    const back = await s.connect();
    const resumed = await back.request(
      {type: 'RECONNECT', roomCode: code, playerId: session.playerId, sessionToken: session.sessionToken},
      'RECONNECT_SUCCESS',
    );
    assert.equal(resumed.session.playerId, session.playerId);
    assert.deepEqual(resumed.room.gameState!.discoveredClueIds, ['platform-clock', 'company-notice']);
    assert.equal(resumed.room.players.filter(p => p.name === 'Aksh').length, 1);
    const rejoined = await tv.next('PLAYER_UPDATED', m => m.player.name === 'Aksh' && m.player.connected);
    assert.equal(rejoined.room.players.length, 3);

    // And can play immediately.
    const update = await back.request({type: 'DISCOVER_CLUE', clueId: 'waiting-room-clock'}, 'GAME_STATE_UPDATED');
    assert.equal(update.update.actorName, 'Aksh');
  });

  test('a newer connection for the same seat replaces the older one', async () => {
    const s = await server();
    const {phoneA, code, joinedA} = await lobby(s);
    const second = await s.connect();
    const closed = new Promise<number>(resolve => phoneA.socket.once('close', c => resolve(c)));
    await second.request({type: 'RECONNECT', roomCode: code, playerId: joinedA.session.playerId, sessionToken: joinedA.session.sessionToken}, 'RECONNECT_SUCCESS');
    assert.equal(await closed, 4000);
  });

  test('reconnect with a bad token or unknown player is rejected', async () => {
    const s = await server();
    const {code, joinedA} = await lobby(s);
    const intruder = await s.connect();
    await intruder.expectError({type: 'RECONNECT', roomCode: code, playerId: joinedA.session.playerId, sessionToken: 'x'.repeat(32)}, 'INVALID_SESSION');
    await intruder.expectError({type: 'RECONNECT', roomCode: code, playerId: 'nobody', sessionToken: 'x'.repeat(32)}, 'PLAYER_NOT_FOUND');
    // Still not in any room.
    await intruder.expectError({type: 'DISCOVER_CLUE', clueId: 'platform-clock'}, 'NOT_IN_ROOM');
  });

  test('the TV dropping pauses the game; its reconnect resumes it', async () => {
    const s = await server();
    const {tv, phoneA, code, created} = await lobby(s);
    await tv.request({type: 'START_GAME'}, 'GAME_STARTED');
    phoneA.clear();
    await tv.close();
    const paused = await phoneA.next('GAME_STATE_UPDATED', m => m.update.cause === 'HOST_DISCONNECTED');
    assert.equal(paused.gameState.status, 'paused');
    await phoneA.expectError({type: 'DISCOVER_CLUE', clueId: 'platform-clock'}, 'HOST_DISCONNECTED');

    const tv2 = await s.connect();
    const back = await tv2.request({type: 'RECONNECT', roomCode: code, playerId: created.session.playerId, sessionToken: created.session.sessionToken}, 'RECONNECT_SUCCESS');
    assert.equal(back.room.gameState!.status, 'playing');
    assert.ok(back.qr.length > 0);
    const resumed = await phoneA.next('GAME_STATE_UPDATED', m => m.update.cause === 'HOST_RECONNECTED');
    assert.equal(resumed.gameState.status, 'playing');
  });

  test('the host leaving closes the room for everyone', async () => {
    const s = await server();
    const {tv, phoneA, code} = await lobby(s);
    await tv.request({type: 'LEAVE_ROOM'}, 'LEFT_ROOM');
    assert.equal((await phoneA.next('ROOM_CLOSED')).reason, 'host-left');
    const late = await s.connect();
    await late.expectError({type: 'JOIN_ROOM', roomCode: code, playerName: 'Late'}, 'ROOM_NOT_FOUND');
  });

  test('a player leaving is announced and frees the seat', async () => {
    const s = await server();
    const {tv, phoneB, joinedB} = await lobby(s);
    await phoneB.request({type: 'LEAVE_ROOM'}, 'LEFT_ROOM');
    const left = await tv.next('PLAYER_LEFT');
    assert.equal(left.playerId, joinedB.session.playerId);
    assert.equal(left.room.players.length, 2);
  });

  test('join errors: invalid code, unknown room, name, full room, started game, duplicate join', async () => {
    const s = await server({maxPlayers: 2});
    const {tv, phoneA, code} = await lobby(s);
    const c = await s.connect();
    await c.expectError({type: 'JOIN_ROOM', roomCode: 'ABCD', playerName: 'X'}, 'INVALID_ROOM_CODE');
    await c.expectError({type: 'JOIN_ROOM', roomCode: code === '9090' ? '9191' : '9090', playerName: 'X'}, 'ROOM_NOT_FOUND');
    await c.expectError({type: 'JOIN_ROOM', roomCode: code, playerName: '  '}, 'NAME_REQUIRED');
    await c.expectError({type: 'JOIN_ROOM', roomCode: code, playerName: 'Late'}, 'ROOM_FULL');
    await phoneA.expectError({type: 'JOIN_ROOM', roomCode: code, playerName: 'Again'}, 'ALREADY_IN_ROOM');
    await tv.request({type: 'START_GAME'}, 'GAME_STARTED');
    const s2 = await server({maxPlayers: 6});
    const l2 = await lobby(s2);
    await l2.tv.request({type: 'START_GAME'}, 'GAME_STARTED');
    const late = await s2.connect();
    await late.expectError({type: 'JOIN_ROOM', roomCode: l2.code, playerName: 'Late'}, 'ROOM_ALREADY_STARTED');
  });

  test('not enough players to start', async () => {
    const s = await server();
    const tv = await s.connect();
    const created = await tv.request({type: 'CREATE_ROOM'}, 'ROOM_CREATED');
    const phone = await s.connect();
    await phone.request({type: 'JOIN_ROOM', roomCode: created.room.code, playerName: 'Solo'}, 'ROOM_JOINED');
    const err = await tv.expectError({type: 'START_GAME'}, 'NOT_ENOUGH_PLAYERS');
    assert.equal(err.detail, '1/2');
  });

  test('malformed, unknown and oversized messages get INVALID_MESSAGE; the server keeps running', async () => {
    const s = await server();
    const c = await s.connect();
    c.raw('not json');
    assert.equal((await c.next('ERROR')).code, 'INVALID_MESSAGE');
    c.raw('[1,2,3]');
    assert.equal((await c.next('ERROR')).code, 'INVALID_MESSAGE');
    await c.expectError({type: 'HACK_THE_SCORE', score: 9999}, 'INVALID_MESSAGE');
    await c.expectError({type: 'SUBMIT_ANSWER', puzzleId: 42, answer: '1147'}, 'INVALID_MESSAGE');
    await c.expectError({type: 'JOIN_ROOM', roomCode: '1234'}, 'INVALID_MESSAGE');
    await c.expectError({type: 'SUBMIT_ANSWER', puzzleId: 'p', answer: 'x'.repeat(500)}, 'INVALID_MESSAGE');
    // Game actions before joining.
    await c.expectError({type: 'START_GAME'}, 'NOT_IN_ROOM');
    // Oversized frames are dropped by the socket layer: the connection closes, the server survives.
    const big = await s.connect();
    const closed = new Promise<number>(resolve => big.socket.once('close', code => resolve(code)));
    big.raw('x'.repeat(10_000));
    assert.equal(await closed, 1009);
    const res = await fetch(`http://127.0.0.1:${s.port}/health`);
    assert.equal(res.status, 200);
  });

  test('clients cannot claim results: a forged state/score field is ignored', async () => {
    const s = await server();
    const {tv, phoneA} = await lobby(s);
    await tv.request({type: 'START_GAME'}, 'GAME_STARTED');
    const update = await phoneA.request(
      {type: 'DISCOVER_CLUE', clueId: 'platform-clock', score: 9999, solved: true} as unknown as ClientMessage,
      'GAME_STATE_UPDATED',
    );
    assert.equal(update.gameState.score, 10);
    await phoneA.expectError({type: 'SUBMIT_ANSWER', puzzleId: 'final-signal', answer: 'voss-sabotage'}, 'INVALID_ACTION');
  });

  test('duplicate messages: the same discovery twice counts once', async () => {
    const s = await server();
    const {tv, phoneA, phoneB} = await lobby(s);
    await tv.request({type: 'START_GAME'}, 'GAME_STARTED');
    await phoneA.request({type: 'DISCOVER_CLUE', clueId: 'platform-clock'}, 'GAME_STATE_UPDATED');
    const err = await phoneB.expectError({type: 'DISCOVER_CLUE', clueId: 'platform-clock'}, 'INVALID_ACTION');
    assert.equal(err.detail, 'already-discovered');
  });

  test('a phone questions a suspect: the whole room sees "thinking", then the reply (authored with no AI keys)', async () => {
    const s = await server();
    const {tv, phoneA, phoneB} = await lobby(s);
    const started = await tv.request({type: 'START_GAME'}, 'GAME_STARTED');
    assert.ok(started.mystery.cast.some(c => c.id === 'voss' && c.interviewable));
    assert.ok(!JSON.stringify(started.mystery.cast).includes('compartment'), 'cast carries names, never facts');

    const reply = await phoneA.request({type: 'ASK_CHARACTER', characterId: 'voss', question: 'Were you in your compartment?'}, 'CHARACTER_REPLY');
    assert.equal(reply.reply.source, 'authored');
    assert.equal(reply.reply.askedBy, 'Aksh');
    for (const c of [tv, phoneB]) {
      const thinking = await c.next('CHARACTER_THINKING');
      assert.equal(thinking.characterId, 'voss');
      const seen = await c.next('CHARACTER_REPLY');
      assert.equal(seen.reply.id, reply.reply.id);
    }
    await phoneA.expectError({type: 'ASK_CHARACTER', characterId: 'voss', question: 'again?'}, 'RATE_LIMITED');
    await phoneB.expectError({type: 'ASK_CHARACTER', characterId: 'voss', question: 'x'.repeat(201)}, 'INVALID_MESSAGE');
    await phoneB.expectError({type: 'ASK_CHARACTER', characterId: 'detective', question: 'hi'}, 'INVALID_ACTION');
  });
});
