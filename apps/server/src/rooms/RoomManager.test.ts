import {test, describe} from 'node:test';
import assert from 'node:assert/strict';
import {RoomError} from '../errors/errors';
import {RoomManager, type RoomConfig} from './RoomManager';
import {generateRoomCode, isValidRoomCodeFormat} from './roomCode';

const CONFIG: RoomConfig = {
  publicUrl: 'http://test.local:4000',
  minPlayers: 2,
  maxPlayers: 3,
  lobbyPlayerGraceMs: 60_000,
  hostGraceMs: 300_000,
  maxRooms: 50,
};
const T0 = 1_700_000_000_000;

function throwsCode(fn: () => unknown, code: string): void {
  assert.throws(fn, (err: unknown) => err instanceof RoomError && err.code === code);
}

function roomWithPlayers(names: string[] = ['Aksh', 'Grace']) {
  const rooms = new RoomManager(CONFIG);
  const host = rooms.createRoom(T0);
  const players = names.map(n => rooms.joinRoom(host.room.code, n, T0 + 1));
  return {rooms, host, room: host.room, players};
}

describe('room codes', () => {
  test('are 4 digits and skip taken and patterned codes', () => {
    const taken = new Set(['4827']);
    const seq = [4, 8, 2, 7, 1, 1, 1, 1, 1, 2, 3, 4, 5, 0, 9, 3];
    let i = 0;
    const code = generateRoomCode(c => taken.has(c), () => seq[i++ % seq.length]!);
    assert.equal(code, '5093');
    assert.ok(isValidRoomCodeFormat(code));
  });

  test('100 rooms get 100 unique codes', () => {
    const rooms = new RoomManager({...CONFIG, maxRooms: 200});
    const codes = new Set(Array.from({length: 100}, () => rooms.createRoom(T0).room.code));
    assert.equal(codes.size, 100);
  });
});

describe('RoomManager', () => {
  test('create room: the TV becomes host, lobby status, join URL has the code', () => {
    const rooms = new RoomManager(CONFIG);
    const {room, player, sessionToken} = rooms.createRoom(T0);
    assert.equal(room.status, 'lobby');
    assert.equal(room.hostId, player.id);
    assert.equal(player.role, 'host');
    assert.equal(room.joinUrl, `http://test.local:4000/join/${room.code}`);
    assert.ok(sessionToken.length >= 24);
    const snap = room.snapshot();
    assert.equal(snap.players.length, 1);
    assert.equal(snap.gameState, null);
  });

  test('join room: players take seats in order; the host is listed first', () => {
    const {room, players} = roomWithPlayers();
    assert.deepEqual(room.snapshot().players.map(p => p.name), ['TV', 'Aksh', 'Grace']);
    assert.equal(players[0]!.player.role, 'player');
    assert.notEqual(players[0]!.sessionToken, players[1]!.sessionToken);
  });

  test('join accepts spaced codes and trims names', () => {
    const rooms = new RoomManager(CONFIG);
    const {room} = rooms.createRoom(T0);
    const seat = rooms.joinRoom(` ${room.code.slice(0, 2)} ${room.code.slice(2)} `, '  Aksh  ', T0);
    assert.equal(seat.player.name, 'Aksh');
  });

  test('rejects malformed codes, unknown rooms, empty and duplicate names', () => {
    const {rooms, room} = roomWithPlayers(['Aksh']);
    throwsCode(() => rooms.joinRoom('48A7', 'X', T0), 'INVALID_ROOM_CODE');
    throwsCode(() => rooms.joinRoom('123', 'X', T0), 'INVALID_ROOM_CODE');
    const unused = room.code === '9090' ? '9191' : '9090';
    throwsCode(() => rooms.joinRoom(unused, 'X', T0), 'ROOM_NOT_FOUND');
    throwsCode(() => rooms.joinRoom(room.code, '   ', T0), 'NAME_REQUIRED');
    throwsCode(() => rooms.joinRoom(room.code, 'x'.repeat(17), T0), 'NAME_REQUIRED');
    throwsCode(() => rooms.joinRoom(room.code, 'aksh', T0), 'NAME_TAKEN');
  });

  test('rejects a full room (the host does not count)', () => {
    const {rooms, room} = roomWithPlayers(['A', 'B', 'C']);
    throwsCode(() => rooms.joinRoom(room.code, 'D', T0), 'ROOM_FULL');
  });

  test('rejects joining after the game started', () => {
    const {rooms, room, host} = roomWithPlayers();
    rooms.startGame(room, host.player.id, T0 + 10);
    throwsCode(() => rooms.joinRoom(room.code, 'Late', T0), 'ROOM_ALREADY_STARTED');
  });

  test('leave: a player frees their seat and their session is revoked', () => {
    const {rooms, room, players} = roomWithPlayers();
    const aksh = players[0]!;
    assert.deepEqual(rooms.leave(room, aksh.player.id), {closed: false});
    assert.equal(room.players.seated().length, 1);
    throwsCode(() => rooms.reconnect(room.code, aksh.player.id, aksh.sessionToken, T0), 'PLAYER_NOT_FOUND');
  });

  test('leave: the host leaving closes the room', () => {
    const {rooms, room, host} = roomWithPlayers();
    assert.deepEqual(rooms.leave(room, host.player.id), {closed: true});
    throwsCode(() => rooms.findByCode(room.code), 'ROOM_NOT_FOUND');
  });

  test('disconnect keeps the seat; reconnect restores it without a duplicate', () => {
    const {rooms, room, players} = roomWithPlayers();
    const aksh = players[0]!;
    rooms.disconnected(room, aksh.player.id, T0 + 5);
    assert.equal(room.players.get(aksh.player.id)!.connected, false);
    const seat = rooms.reconnect(room.code, aksh.player.id, aksh.sessionToken, T0 + 6);
    assert.equal(seat.player.id, aksh.player.id);
    assert.equal(seat.player.connected, true);
    assert.equal(room.players.seated().length, 2);
  });

  test('reconnect rejects a wrong token, an unknown player and another room\'s token', () => {
    const {rooms, room, players} = roomWithPlayers();
    const aksh = players[0]!;
    throwsCode(() => rooms.reconnect(room.code, aksh.player.id, 'forged-token-xxxxxxxxxxxxxxxxxxxx', T0), 'INVALID_SESSION');
    throwsCode(() => rooms.reconnect(room.code, 'nobody', aksh.sessionToken, T0), 'PLAYER_NOT_FOUND');
    const other = rooms.createRoom(T0);
    const bob = rooms.joinRoom(other.room.code, 'Bob', T0);
    throwsCode(() => rooms.reconnect(room.code, bob.player.id, bob.sessionToken, T0), 'PLAYER_NOT_FOUND');
    throwsCode(() => rooms.reconnect(other.room.code, bob.player.id, aksh.sessionToken, T0), 'INVALID_SESSION');
  });

  test('lobby seats expire after the grace period; in-game seats never do', () => {
    const {rooms, room, players} = roomWithPlayers(['A', 'B', 'C']);
    rooms.disconnected(room, players[0]!.player.id, T0);
    assert.equal(rooms.tick(T0 + 59_000).expiredPlayers.length, 0);
    const result = rooms.tick(T0 + 60_000);
    assert.deepEqual(result.expiredPlayers.map(e => e.playerId), [players[0]!.player.id]);
    assert.equal(room.players.seated().length, 2);

    rooms.startGame(room, room.hostId, T0 + 61_000);
    rooms.disconnected(room, players[1]!.player.id, T0 + 62_000);
    assert.equal(rooms.tick(T0 + 10 * 60_000).expiredPlayers.length, 0);
    assert.equal(room.players.seated().length, 2);
  });

  test('a room whose host never returns is closed', () => {
    const {rooms, room, host} = roomWithPlayers();
    rooms.disconnected(room, host.player.id, T0);
    assert.equal(rooms.tick(T0 + 299_000).closedRooms.length, 0);
    assert.equal(rooms.tick(T0 + 300_000).closedRooms[0], room);
    assert.equal(rooms.size, 0);
  });
});

describe('authorization and game start', () => {
  test('only the host can start', () => {
    const {rooms, room, players} = roomWithPlayers();
    throwsCode(() => rooms.startGame(room, players[0]!.player.id, T0), 'NOT_HOST');
  });

  test('start needs the minimum number of connected players', () => {
    const {rooms, room, host, players} = roomWithPlayers();
    rooms.disconnected(room, players[1]!.player.id, T0);
    throwsCode(() => rooms.startGame(room, host.player.id, T0), 'NOT_ENOUGH_PLAYERS');
  });

  test('start runs the Phase 3 engine: playing, first scene, clock set', () => {
    const {rooms, room, host} = roomWithPlayers();
    const result = rooms.startGame(room, host.player.id, T0);
    assert.equal(room.status, 'playing');
    assert.equal(result.state.status, 'playing');
    assert.equal(result.state.currentSceneId, 'station');
    assert.equal(result.state.startedAt, T0);
    assert.equal(result.state.deadline, T0 + 20 * 60_000);
    throwsCode(() => rooms.startGame(room, host.player.id, T0), 'ROOM_ALREADY_STARTED');
  });

  test('game actions need a started game and a seated player', () => {
    const {rooms, room, players} = roomWithPlayers();
    throwsCode(() => rooms.gameAction(room, players[0]!.player.id, {type: 'ADVANCE_SCENE'}, T0), 'GAME_NOT_STARTED');
    rooms.startGame(room, room.hostId, T0);
    throwsCode(() => rooms.gameAction(room, 'ghost', {type: 'DISCOVER_CLUE', clueId: 'platform-clock'}, T0), 'PLAYER_NOT_FOUND');
  });
});

describe('game integration (authoritative engine)', () => {
  function started() {
    const ctx = roomWithPlayers();
    ctx.rooms.startGame(ctx.room, ctx.host.player.id, T0);
    const act = (who: number, message: Parameters<RoomManager['gameAction']>[2], at = T0 + 1000) =>
      ctx.rooms.gameAction(ctx.room, ctx.players[who]!.player.id, message, at);
    return {...ctx, act};
  }

  test('clue discovery scores and unlocks through the engine', () => {
    const {act, room} = started();
    act(0, {type: 'DISCOVER_CLUE', clueId: 'platform-clock'});
    const result = act(1, {type: 'DISCOVER_CLUE', clueId: 'company-notice'});
    assert.ok(result.events.some(e => e.type === 'puzzle-unlocked'));
    assert.equal(room.game!.state.score, 20);
    assert.deepEqual(room.snapshot().reveals!.clues['platform-clock']!.length > 0, true);
  });

  test('an incorrect answer is penalised; a correct one is accepted from another phone', () => {
    const {act, room} = started();
    act(0, {type: 'DISCOVER_CLUE', clueId: 'platform-clock'});
    act(0, {type: 'DISCOVER_CLUE', clueId: 'company-notice'});
    const wrong = act(1, {type: 'SUBMIT_ANSWER', puzzleId: 'station-clock', answer: '1159'});
    assert.ok(wrong.events.some(e => e.type === 'answer-incorrect'));
    assert.equal(room.game!.state.score, 10);
    const right = act(0, {type: 'SUBMIT_ANSWER', puzzleId: 'station-clock', answer: '11:47'});
    assert.ok(right.events.some(e => e.type === 'answer-correct'));
    assert.deepEqual(room.game!.state.solvedPuzzleIds, ['station-clock']);
    assert.ok(room.snapshot().reveals!.solvedText['station-clock']);
  });

  test('a hint is revealed in the snapshot only after it is requested', () => {
    const {act, room} = started();
    act(0, {type: 'DISCOVER_CLUE', clueId: 'platform-clock'});
    act(0, {type: 'DISCOVER_CLUE', clueId: 'company-notice'});
    assert.deepEqual(room.snapshot().reveals!.hints, {});
    act(1, {type: 'REQUEST_HINT', puzzleId: 'station-clock'});
    assert.deepEqual(Object.keys(room.snapshot().reveals!.hints), ['station-clock-1']);
  });

  test('a rejected move changes nothing and is reported as INVALID_ACTION', () => {
    const {act, room} = started();
    const before = room.game!.state;
    throwsCode(() => act(0, {type: 'SUBMIT_ANSWER', puzzleId: 'station-clock', answer: '1147'}), 'INVALID_ACTION');
    throwsCode(() => act(0, {type: 'DISCOVER_CLUE', clueId: 'no-such-clue'}), 'INVALID_ACTION');
    throwsCode(() => act(0, {type: 'ADVANCE_SCENE'}), 'INVALID_ACTION');
    assert.equal(room.game!.state, before);
    assert.equal(room.actionLog.filter(a => !a.accepted).length, 3);
  });

  test('a duplicate discovery is rejected; the first one counts once', () => {
    const {act, room} = started();
    act(0, {type: 'DISCOVER_CLUE', clueId: 'platform-clock'});
    throwsCode(() => act(1, {type: 'DISCOVER_CLUE', clueId: 'platform-clock'}), 'INVALID_ACTION');
    assert.equal(room.game!.state.score, 10);
  });

  test('the action log records who did what', () => {
    const {act, room, players} = started();
    act(1, {type: 'DISCOVER_CLUE', clueId: 'platform-clock'}, T0 + 42);
    assert.deepEqual(room.actionLog.at(-1), {
      playerId: players[1]!.player.id,
      type: 'DISCOVER_CLUE',
      at: T0 + 42,
      accepted: true,
    });
  });

  test('host disconnect pauses the clock, reconnect resumes with no time lost', () => {
    const {rooms, room, host, act} = started();
    rooms.disconnected(room, host.player.id, T0 + 60_000);
    assert.equal(room.game!.state.status, 'paused');
    throwsCode(() => act(0, {type: 'DISCOVER_CLUE', clueId: 'platform-clock'}), 'HOST_DISCONNECTED');
    rooms.reconnect(room.code, host.player.id, host.sessionToken, T0 + 180_000);
    assert.equal(room.game!.state.status, 'playing');
    assert.equal(room.game!.state.deadline, T0 + 20 * 60_000 + 120_000);
  });

  test('the server clock ends the game when time runs out', () => {
    const {rooms, room} = started();
    const result = rooms.tick(T0 + 20 * 60_000);
    assert.equal(result.timedOut.length, 1);
    assert.equal(room.status, 'completed');
    assert.equal(room.game!.state.endingId, 'too-late');
  });
});
