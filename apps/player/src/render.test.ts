import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialRoomView, type RoomView} from '@roomriddle/client';
import {createInitialGameState} from '@roomriddle/game-engine';
import type {CharacterReply, PublicMystery, Room} from '@roomriddle/shared-types';
import {errorState, initialUi, loadingState, renderScreen, screenName} from './render';

const room = (over: Partial<Room> = {}): Room => ({
  id: 'r',
  code: '4827',
  hostId: 'h',
  mysteryId: 'the-last-train',
  status: 'lobby',
  players: [
    {id: 'h', name: 'TV', role: 'host', connected: true, ready: false, joinedAt: 0},
    {id: 'p1', name: 'Aksh', role: 'player', connected: true, ready: false, joinedAt: 0},
    {id: 'p2', name: 'Grace', role: 'player', connected: false, ready: false, joinedAt: 0},
  ],
  minPlayers: 2,
  maxPlayers: 6,
  joinUrl: 'http://x/join/4827',
  gameState: null,
  reveals: null,
  createdAt: 0,
  ...over,
});

const inLobby = (): RoomView => ({
  ...initialRoomView,
  connection: 'open',
  session: {roomId: 'r', roomCode: '4827', playerId: 'p1', role: 'player', sessionToken: 't'},
  room: room(),
});

test('screen flow: join → joining → lobby, and a stored session shows reconnecting', () => {
  const ui = initialUi('', '');
  assert.equal(screenName(initialRoomView, ui), 'join');
  assert.equal(screenName(initialRoomView, {...ui, joining: true}), 'joining');
  assert.equal(screenName(inLobby(), ui), 'lobby');
  assert.equal(screenName({...inLobby(), room: null}, ui), 'reconnecting');
  assert.equal(screenName({...inLobby(), ended: 'host-left'}, ui), 'ended');
});

test('lobby shows the investigator identity, seat and offline players', () => {
  const html = renderScreen(inLobby(), initialUi('4827', 'Aksh'));
  assert.match(html, /Investigator #01/);
  assert.match(html, /AKSH/);
  assert.match(html, /Grace[\s\S]*Offline/);
  assert.match(html, /Waiting for 1 more investigator…/);
  assert.match(html, /RM 4827/);
});

test('join form explains a refused code in plain words, never the raw code', () => {
  const html = renderScreen(initialRoomView, {...initialUi('9999', 'Aksh'), formError: 'ROOM_NOT_FOUND'});
  assert.match(html, /ROOM NOT FOUND/);
  assert.match(html, /Check the code on the TV/);
  assert.doesNotMatch(html, /ROOM_NOT_FOUND/);
  assert.match(html, /aria-invalid="true"/);
});

test('error states always offer a way forward', () => {
  for (const code of ['ROOM_FULL', 'PLAYER_NOT_FOUND', 'SERVER_ERROR', 'NOT_IN_ROOM'] as const) {
    assert.match(errorState(code), /data-recover="/, code);
  }
});

test('loading states use the shared investigation vocabulary', () => {
  assert.match(loadingState('joining'), /JOINING INVESTIGATION/);
  assert.match(loadingState('reconnecting'), /Your progress is safe/);
});

test('a mid-game connection drop shows the reconnecting strip without leaving the screen', () => {
  const html = renderScreen({...inLobby(), connection: 'reconnecting'}, initialUi('', ''));
  assert.match(html, /data-screen="lobby"/);
  assert.match(html, /class="strip"/);
});

test('player names are escaped', () => {
  const v = inLobby();
  v.room!.players[1]!.name = '<img src=x onerror=alert(1)>';
  const html = renderScreen(v, initialUi('', ''));
  assert.doesNotMatch(html, /<img src=x/);
});

// ─── Questioning ──────────────────────────────────────────────────────

const mystery = {
  summary: {id: 'the-last-train', title: 'The Last Train'},
  scenes: [{id: 'station', title: 'Platform Two', clueIds: ['platform-clock'], puzzleIds: []}],
  clues: [{id: 'platform-clock', sceneId: 'station', prompt: 'Look', title: 'The Platform Clock', description: []}],
  puzzles: [],
  endings: [],
  cast: [
    {id: 'detective', name: 'Detective Grace', role: 'Detective', interviewable: false},
    {id: 'voss', name: 'Inspector R. Voss', role: 'Company inspector', interviewable: true},
  ],
} as unknown as PublicMystery;

const reply = (over: Partial<CharacterReply> = {}): CharacterReply => ({
  id: 'r1', characterId: 'voss', characterName: 'Inspector R. Voss', question: 'Where were you?', askedBy: 'Aksh',
  text: 'Reading. Company business.', source: 'ai', questionsLeft: 29, at: 0, ...over,
});

const playing = (over: Partial<RoomView> = {}): RoomView => ({
  ...inLobby(),
  mystery,
  room: room({status: 'playing', gameState: {...createInitialGameState('the-last-train'), status: 'playing', currentSceneId: 'station', discoveredClueIds: ['platform-clock']}}),
  ...over,
});

test('the Question tab lists only people who can be questioned', () => {
  const html = renderScreen(playing(), {...initialUi('4827', 'Aksh'), tab: 'suspects'});
  assert.match(html, /id="tab-suspects"/);
  assert.match(html, /data-suspect="voss"/);
  assert.doesNotMatch(html, /data-suspect="detective"/);
  assert.match(html, /RV<\/span>/, 'initials drop the title');
});

test('an open interview shows the thread, a thinking state, found evidence and the group budget', () => {
  const ui = {...initialUi('4827', 'Aksh'), tab: 'suspects' as const, suspectId: 'voss'};
  const html = renderScreen(playing({conversation: [reply()], thinking: {characterId: 'voss', askedBy: 'Grace'}}), ui);
  assert.match(html, /Where were you\?/);
  assert.match(html, /Reading\. Company business\./);
  assert.match(html, /is thinking/);
  assert.match(html, /<option value="platform-clock"/);
  assert.match(html, /29 questions left/);
  assert.match(html, /id="ask"[^>]*disabled/, 'no second question while one is being answered');
});

test('with no questions left the form is closed', () => {
  const ui = {...initialUi('4827', 'Aksh'), tab: 'suspects' as const, suspectId: 'voss'};
  const html = renderScreen(playing({conversation: [reply({questionsLeft: 0})]}), ui);
  assert.match(html, /No questions left/);
  assert.match(html, /<textarea[^>]*disabled/);
});
