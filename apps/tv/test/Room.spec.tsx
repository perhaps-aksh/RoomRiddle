import 'react-native';
import * as React from 'react';
import {act, fireEvent, render, RenderAPI} from '@testing-library/react-native';

import './support/backHandler';
import {FakeServer} from './support/fakeServer';
import {App} from '../src/App';

/**
 * The TV as the host of a multiplayer room (Phase 4). The fake server applies
 * every intent with the real engine, like the RoomRiddle server; phones are
 * simulated. Checks that the TV sends intents (never results), renders the
 * server's state, and follows along when phones move the game on.
 */

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

const press = (screen: RenderAPI, testID: string) => fireEvent.press(screen.getByTestId(testID));

function hostWithTwoPhones() {
  const server = new FakeServer(() => 1_700_000_000_000);
  const screen = render(<App createSocket={server.createSocket} serverUrl="ws://test/ws" clock={() => 1_700_000_000_000} />);
  press(screen, 'home-createRoom');
  act(() => {
    jest.advanceTimersByTime(10);
  });
  act(() => server.phoneJoins('Aksh'));
  act(() => server.phoneJoins('Grace'));
  expect(screen.getByText('2 PLAYERS')).toBeTruthy();
  press(screen, 'room-start');
  return {server, screen};
}

describe('TV hosting a room', () => {
  it('Start asks the server; the game begins in the first scene for everyone', () => {
    const {server, screen} = hostWithTwoPhones();
    expect(server.socket!.sent.map((m: {type: string}) => m.type)).toEqual(['CREATE_ROOM', 'START_GAME']);
    expect(screen.getByTestId('intro-begin')).toBeTruthy();
    press(screen, 'intro-begin');
    expect(screen.getByText('THE STATION')).toBeTruthy();
    // Begin did not send ADVANCE_SCENE: the server already entered the scene.
    expect(server.socket!.sent.filter((m: {type: string}) => m.type === 'ADVANCE_SCENE')).toHaveLength(0);
  });

  it('the TV sends intents only, and renders phone actions as they arrive', () => {
    const {server, screen} = hostWithTwoPhones();
    press(screen, 'intro-begin');

    // A phone finds a clue: the TV's scene updates without any TV input.
    act(() => server.phoneActs('Aksh', {type: 'DISCOVER_CLUE', clueId: 'platform-clock'}));
    expect(screen.getByTestId('game-score').props.children).toBe('10');

    // The TV investigates too; what it sends is an intent with no score or result.
    press(screen, 'scene-investigate');
    press(screen, 'investigate-company-notice');
    const sent = server.socket!.sent.at(-1);
    expect(sent).toEqual({type: 'DISCOVER_CLUE', clueId: 'company-notice', requestId: expect.any(String)});
    expect(screen.getByText('New puzzle unlocked: The Station Clock')).toBeTruthy();
    press(screen, 'investigation-back');

    // A phone solves the puzzle; the TV shows it as solved.
    act(() => server.phoneActs('Grace', {type: 'SUBMIT_ANSWER', puzzleId: 'station-clock', answer: '1147'}));
    expect(screen.getByText('✓ THE STATION CLOCK')).toBeTruthy();
    expect(screen.getByTestId('game-score').props.children).toBe('120');

    // The TV moves the story on; the server confirms the new scene.
    press(screen, 'scene-continue');
    expect(screen.getByText('THE TRAIN')).toBeTruthy();
  });

  it('a wrong answer from the TV is judged by the server', () => {
    const {screen} = hostWithTwoPhones();
    press(screen, 'intro-begin');
    press(screen, 'scene-investigate');
    for (const id of ['platform-clock', 'company-notice', 'waiting-room-clock']) {
      press(screen, `investigate-${id}`);
    }
    press(screen, 'investigation-back');
    press(screen, 'scene-puzzle-station-clock');
    for (const d of '1159') {
      press(screen, `puzzle-key-${d}`);
    }
    press(screen, 'puzzle-submit');
    expect(screen.getByText(/Not quite/)).toBeTruthy();
  });

  it('when a phone finishes the mystery, the TV shows the ending', () => {
    const {server, screen} = hostWithTwoPhones();
    press(screen, 'intro-begin');
    const script: [string, Record<string, unknown>][] = [
      ['DISCOVER_CLUE', {clueId: 'platform-clock'}], ['DISCOVER_CLUE', {clueId: 'company-notice'}], ['DISCOVER_CLUE', {clueId: 'waiting-room-clock'}],
      ['SUBMIT_ANSWER', {puzzleId: 'station-clock', answer: '1147'}], ['ADVANCE_SCENE', {}],
      ['DISCOVER_CLUE', {clueId: 'torn-ticket'}], ['DISCOVER_CLUE', {clueId: 'departure-board'}], ['DISCOVER_CLUE', {clueId: 'carriage-plan'}],
      ['SUBMIT_ANSWER', {puzzleId: 'torn-ticket', answer: '207|c|7'}], ['ADVANCE_SCENE', {}],
      ['DISCOVER_CLUE', {clueId: 'pocket-watch'}], ['DISCOVER_CLUE', {clueId: 'conductors-ledger'}], ['DISCOVER_CLUE', {clueId: 'seat-eight-card'}], ['DISCOVER_CLUE', {clueId: 'wired-brake'}],
      ['SUBMIT_ANSWER', {puzzleId: 'conductors-ledger', answer: 'voss|carriage-c|1147'}], ['ADVANCE_SCENE', {}],
      ['DISCOVER_CLUE', {clueId: 'blackwater-lever'}], ['DISCOVER_CLUE', {clueId: 'lamp-room-door'}],
      ['SUBMIT_ANSWER', {puzzleId: 'final-signal', answer: 'voss-sabotage'}],
    ];
    script.forEach(([type, args], i) => act(() => server.phoneActs(i % 2 ? 'Grace' : 'Aksh', {type, ...args})));
    expect(screen.getByTestId('ending-title').props.children).toBe('THE TRUTH');
  });
});
