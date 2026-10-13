/**
 * The TV half of questioning: thinking state, the reply bubble, the voice
 * played on the voice channel when it arrives (or the subtitle alone).
 */
import React from 'react';
import {act, render} from '@testing-library/react-native';
import {CharacterSpeech, holdMsFor, initials, VOICE_WAIT_MS} from '../src/game/CharacterSpeech';
import {httpBase} from '../src/config/server';

const mockSpeakUrl = jest.fn();
let mockSession: Record<string, unknown> = {};
jest.mock('../src/game/GameContext', () => ({useGame: () => mockSession}));
jest.mock('../src/audio/AudioContext', () => ({useAudio: () => ({speakUrl: mockSpeakUrl})}));

const mystery = {
  truth: {characters: [{id: 'voss', name: 'Inspector R. Voss'}]},
  clues: [{id: 'platform-clock', title: 'The Platform Clock'}],
};
const reply = (over: Record<string, unknown> = {}) => ({
  id: 'r1', characterId: 'voss', characterName: 'Inspector R. Voss', question: 'Where were you?', askedBy: 'Aksh',
  text: 'Reading. Company business.', source: 'ai', questionsLeft: 29, at: 0, ...over,
});
const roomWith = (conversation: unknown[], thinking: unknown = null) => ({
  mode: 'room', mystery, serverBase: 'http://10.0.2.2:4000', room: {conversation, thinking},
});

beforeEach(() => {
  jest.useFakeTimers();
  mockSpeakUrl.mockClear();
});
afterEach(() => jest.useRealTimers());

test('helpers: initials drop titles, hold time scales with the line, http base from the socket URL', () => {
  expect(initials('Inspector R. Voss')).toBe('RV');
  expect(initials('The Yaksha')).toBe('Y');
  expect(holdMsFor('short')).toBe(7000);
  expect(holdMsFor('x'.repeat(1000))).toBe(18000);
  expect(httpBase('ws://10.0.2.2:4000/ws')).toBe('http://10.0.2.2:4000');
  expect(httpBase('wss://rr.example/ws')).toBe('https://rr.example');
});

test('shows who is thinking, then the reply with its voice; nothing outside a room', () => {
  mockSession = {...roomWith([]), mode: 'local'};
  const screen = render(<CharacterSpeech />);
  expect(screen.toJSON()).toBeNull();

  mockSession = roomWith([], {characterId: 'voss', askedBy: 'Aksh'});
  screen.rerender(<CharacterSpeech />);
  expect(screen.getByTestId('speech-thinking')).toBeTruthy();
  expect(screen.getByText('Aksh asks…')).toBeTruthy();

  mockSession = roomWith([reply({audioUrl: '/voice/abc.mp3'})]);
  screen.rerender(<CharacterSpeech />);
  expect(screen.getByTestId('speech-text').props.children).toBe('Reading. Company business.');
  expect(mockSpeakUrl).toHaveBeenCalledWith('reply.r1', 'http://10.0.2.2:4000/voice/abc.mp3');
});

test('waits briefly for the voice, then shows the subtitle alone; a late voice still plays', () => {
  mockSession = roomWith([reply()]);
  const screen = render(<CharacterSpeech />);
  expect(screen.queryByTestId('speech-bubble')).toBeNull();
  act(() => jest.advanceTimersByTime(VOICE_WAIT_MS + 200));
  expect(screen.getByTestId('speech-bubble')).toBeTruthy();
  expect(mockSpeakUrl).not.toHaveBeenCalled();

  mockSession = roomWith([reply({audioUrl: '/voice/late.mp3'})]);
  screen.rerender(<CharacterSpeech />);
  expect(mockSpeakUrl).toHaveBeenCalledWith('reply.r1', 'http://10.0.2.2:4000/voice/late.mp3');
});

test('replies queue: the second waits for the first to leave', () => {
  mockSession = roomWith([reply({audioUrl: '/voice/a.mp3'}), reply({id: 'r2', text: 'Second answer.', audioUrl: '/voice/b.mp3'})]);
  const screen = render(<CharacterSpeech />);
  expect(screen.getByTestId('speech-text').props.children).toBe('Reading. Company business.');
  act(() => jest.advanceTimersByTime(holdMsFor('Reading. Company business.') + 1000));
  expect(screen.getByTestId('speech-text').props.children).toBe('Second answer.');
  expect(mockSpeakUrl).toHaveBeenCalledTimes(2);
});
