import 'react-native';
import * as React from 'react';
import {act, fireEvent, render, RenderAPI, within} from '@testing-library/react-native';

import {pressBack} from './support/backHandler';
import {App} from '../src/App';

/**
 * Plays The Last Train end to end through the TV UI, the way a remote would
 * (every press is an OK on a focusable control). The engine decides every
 * outcome; these tests only check that the UI dispatches and renders it.
 */

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

const T0 = 1_700_000_000_000;

function setup() {
  let time = T0;
  const clock = () => time;
  const screen = render(<App clock={clock} cinematicWorld={false} />);
  /** Jump the clock forward, then let one second of timers run (countdown + watchdog). */
  const advance = (ms: number) => {
    time += ms;
    act(() => {
      jest.advanceTimersByTime(1000);
    });
  };
  return {screen, advance};
}

const press = (screen: RenderAPI, testID: string) => fireEvent.press(screen.getByTestId(testID));

function startLastTrain(screen: RenderAPI) {
  press(screen, 'home-mysteries');
  press(screen, 'mystery-the-last-train');
  press(screen, 'details-select');
  press(screen, 'intro-begin');
}

function investigateAll(screen: RenderAPI, clueIds: string[]) {
  press(screen, 'scene-investigate');
  for (const id of clueIds) {
    press(screen, `investigate-${id}`);
  }
  press(screen, 'investigation-back');
}

function enterDigits(screen: RenderAPI, digits: string) {
  for (const d of digits) {
    press(screen, `puzzle-key-${d}`);
  }
}

function solveAndContinue(screen: RenderAPI) {
  press(screen, 'puzzle-submit');
  expect(screen.getByText('SOLVED')).toBeTruthy();
  press(screen, 'puzzle-result-continue');
  press(screen, 'scene-continue');
}

describe('The Last Train on the TV', () => {
  it('can be played from the library to The Truth', () => {
    const {screen, advance} = setup();
    startLastTrain(screen);

    // Scene 1: The Station
    expect(screen.getByText('THE STATION')).toBeTruthy();
    expect(screen.getByText('Scene 1 of 4')).toBeTruthy();
    investigateAll(screen, ['platform-clock', 'company-notice', 'waiting-room-clock']);
    press(screen, 'scene-puzzle-station-clock');
    expect(screen.getByText('What time did the incident occur?')).toBeTruthy();
    enterDigits(screen, '1147');
    solveAndContinue(screen);

    // Scene 2: The Train
    expect(screen.getByText('THE TRAIN')).toBeTruthy();
    investigateAll(screen, ['torn-ticket', 'departure-board', 'carriage-plan']);
    press(screen, 'scene-puzzle-torn-ticket');
    press(screen, 'puzzle-train-207');
    press(screen, 'puzzle-carriage-c');
    press(screen, 'puzzle-seat-7');
    solveAndContinue(screen);

    // Scene 3: The Carriage
    expect(screen.getByText('THE CARRIAGE')).toBeTruthy();
    investigateAll(screen, ['pocket-watch', 'conductors-ledger', 'seat-eight-card', 'wired-brake']);
    press(screen, 'scene-puzzle-conductors-ledger');
    press(screen, 'puzzle-who-voss');
    press(screen, 'puzzle-where-carriage-c');
    press(screen, 'puzzle-when-1147');
    solveAndContinue(screen);

    // Scene 4: The Signal Box, then the final puzzle ends the mystery.
    expect(screen.getByText('THE SIGNAL BOX')).toBeTruthy();
    investigateAll(screen, ['blackwater-lever', 'lamp-room-door']);
    press(screen, 'scene-puzzle-final-signal');
    press(screen, 'puzzle-option-voss-sabotage');
    advance(5 * 60_000);
    press(screen, 'puzzle-submit');
    expect(screen.getByText('SOLVED')).toBeTruthy();
    press(screen, 'puzzle-result-continue');

    expect(screen.getByTestId('ending-title').props.children).toBe('THE TRUTH');
    // 12 clues × 10 + 450 puzzle points + 15 whole minutes left × 5.
    expect(screen.getByTestId('ending-score').props.children).toBe('645');
  });

  it('a wrong answer is penalised and a hint is revealed with its cost', () => {
    const {screen} = setup();
    startLastTrain(screen);
    investigateAll(screen, ['platform-clock', 'company-notice']);
    press(screen, 'scene-puzzle-station-clock');

    enterDigits(screen, '1159');
    press(screen, 'puzzle-submit');
    expect(screen.getByText('Not quite. −10 points. Look at the evidence again.')).toBeTruthy();
    expect(screen.getByTestId('game-score').props.children).toBe('10');

    press(screen, 'puzzle-hint');
    expect(screen.getByTestId('puzzle-hints')).toBeTruthy();
    expect(
      screen.getByText('Only one clock stopped at the exact moment. Which one?'),
    ).toBeTruthy();

    press(screen, 'puzzle-key-clear');
    enterDigits(screen, '1147');
    press(screen, 'puzzle-submit');
    expect(screen.getByText('−25')).toBeTruthy();
    expect(screen.getByText('+75')).toBeTruthy();
  });

  it('an incomplete code is not counted as a wrong answer', () => {
    const {screen} = setup();
    startLastTrain(screen);
    investigateAll(screen, ['platform-clock', 'company-notice']);
    press(screen, 'scene-puzzle-station-clock');
    enterDigits(screen, '11');
    press(screen, 'puzzle-submit');
    expect(screen.getByText('Enter all 4 digits.')).toBeTruthy();
    expect(screen.getByTestId('game-score').props.children).toBe('20');
  });

  it('a puzzle stays locked until its clues are found', () => {
    const {screen} = setup();
    startLastTrain(screen);
    press(screen, 'scene-puzzle-station-clock');
    expect(
      screen.getByText("Keep investigating. You haven't found what this puzzle needs yet."),
    ).toBeTruthy();
    expect(screen.queryByTestId('puzzle-submit')).toBeNull();
  });

  it('discovering the last missing clue announces the unlocked puzzle', () => {
    const {screen} = setup();
    startLastTrain(screen);
    press(screen, 'scene-investigate');
    press(screen, 'investigate-platform-clock');
    expect(screen.queryByTestId('investigation-unlocked')).toBeNull();
    press(screen, 'investigate-company-notice');
    expect(screen.getByText('New puzzle unlocked: The Station Clock')).toBeTruthy();
    expect(within(screen.getByTestId('investigation-clue')).getByText('The Company Notice')).toBeTruthy();
  });

  it('the evidence board lists every clue found', () => {
    const {screen} = setup();
    startLastTrain(screen);
    investigateAll(screen, ['platform-clock', 'waiting-room-clock']);
    press(screen, 'scene-evidence');
    expect(screen.getByTestId('evidence-platform-clock')).toBeTruthy();
    expect(screen.getByTestId('evidence-waiting-room-clock')).toBeTruthy();
    expect(screen.queryByTestId('evidence-company-notice')).toBeNull();
    press(screen, 'evidence-back');
    expect(screen.getByText('THE STATION')).toBeTruthy();
  });

  it('running out of time ends in Too Late', () => {
    const {screen, advance} = setup();
    startLastTrain(screen);
    advance(20 * 60_000);
    expect(screen.getByTestId('ending-title').props.children).toBe('TOO LATE');
  });

  it('Back in a scene asks before leaving the mystery', () => {
    const {screen} = setup();
    startLastTrain(screen);
    let consumed = false;
    act(() => {
      consumed = pressBack();
    });
    expect(consumed).toBe(true);
    expect(screen.getByText('Leave the mystery?')).toBeTruthy();
    press(screen, 'scene-leave-safe');
    expect(screen.getByText('THE STATION')).toBeTruthy();

    act(() => {
      pressBack();
    });
    press(screen, 'scene-leave-risky');
    expect(screen.getByText('CHOOSE YOUR MYSTERY')).toBeTruthy();
  });

  it('Play Again restarts the mystery from its intro', () => {
    const {screen, advance} = setup();
    startLastTrain(screen);
    advance(20 * 60_000);
    press(screen, 'ending-again');
    expect(screen.getByTestId('intro-begin')).toBeTruthy();
    press(screen, 'intro-begin');
    expect(screen.getByTestId('game-score').props.children).toBe('0');
  });
});
