import 'react-native';
import * as React from 'react';
import {act, fireEvent, render, RenderAPI} from '@testing-library/react-native';

import {pressBack} from './support/backHandler';
import {FakeServer} from './support/fakeServer';
import {App} from '../src/App';

/**
 * Phase 6: the 2.5D world. The Last Train vertical slice through the TV UI:
 * arrival cinematic → dialogue → player control → focus the clock → inspect
 * → clue discovered (engine) → detective reacts → puzzle unlocks. Placeholder
 * art throughout; the engine decides every outcome.
 */

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

const press = (screen: RenderAPI, testID: string) => fireEvent.press(screen.getByTestId(testID));

/** Let the world's frame loop and asset loader run for `ms` (fake timers drive rAF, Date.now and promises). */
async function run(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

async function startLastTrain(screen: RenderAPI) {
  press(screen, 'home-mysteries');
  press(screen, 'mystery-the-last-train');
  press(screen, 'details-select');
  press(screen, 'intro-begin');
  await run(50);
}

/** Every line of the open dialogue, with OK. */
function readDialogue(screen: RenderAPI): string[] {
  const seen: string[] = [];
  for (let i = 0; i < 10 && screen.queryByTestId('world-dialogue-next'); i++) {
    seen.push(String(screen.getByTestId('world-dialogue-next').props.accessibilityLabel));
    press(screen, 'world-dialogue-next');
  }
  return seen;
}

describe('2.5D world: The Last Train', () => {
  it('plays the train arrival: black, 11:42 PM, the train comes in, the detective speaks, control returns', async () => {
    const screen = render(<App />);
    await startLastTrain(screen);

    // A cinematic: no game HUD, only Skip. It opens on black with the time.
    expect(screen.getByTestId('world-station')).toBeTruthy();
    expect(screen.getByTestId('world-skip')).toBeTruthy();
    expect(screen.queryByTestId('scene-investigate')).toBeNull();
    await run(800);
    expect(screen.getByText('11:42 PM')).toBeTruthy();

    // The train goes through its states.
    await run(5000);
    expect(screen.getByTestId('train-approaching')).toBeTruthy();
    await run(3000);
    expect(screen.getByTestId('train-arriving')).toBeTruthy();
    await run(3500);
    expect(screen.getByTestId('train-stopped')).toBeTruthy();
    await run(3500);
    expect(screen.getByTestId('train-doors-opening')).toBeTruthy();

    // Camera pushes through the door into the carriage, where the detective speaks.
    await run(4200);
    expect(screen.getByTestId('world-set-vestibule')).toBeTruthy();
    expect(screen.getByTestId('world-dialogue')).toBeTruthy();
    const lines = readDialogue(screen);
    expect(lines[0]).toContain('The Northern Star. Held at Harrow Cross');
    expect(lines).toHaveLength(2);

    // Back out on the platform: player control.
    await run(3000);
    expect(screen.getByTestId('world-set-platform')).toBeTruthy();
    expect(screen.queryByTestId('world-skip')).toBeNull();
    expect(screen.getByTestId('scene-investigate')).toBeTruthy();
    expect(screen.getByTestId('world-object-obj-clock')).toBeTruthy();
  }, 60_000);

  it('the clock: focus → inspect → clue in the engine → detective reacts → puzzle unlocks (11:47 is deduced in the puzzle)', async () => {
    const screen = render(<App />);
    await startLastTrain(screen);
    press(screen, 'world-skip');
    await run(100);
    expect(screen.queryByTestId('world-skip')).toBeNull();

    // Objects don't glow on their own; focus names them.
    const clock = screen.getByTestId('world-object-obj-clock');
    expect(clock.props.accessibilityLabel).toBe('Platform clock. Inspect');
    fireEvent(clock, 'focus');
    expect(screen.getByText('PLATFORM CLOCK')).toBeTruthy();

    // SELECT: inspection (camera moves in, information appears).
    fireEvent.press(clock);
    await run(1000);
    expect(screen.getByTestId('world-inspection')).toBeTruthy();
    expect(screen.queryByTestId('scene-investigate')).toBeNull();
    press(screen, 'world-examine');
    // The engine's clue, shown as P5 evidence.
    expect(screen.getByTestId('world-clue')).toBeTruthy();
    expect(screen.getByText('IN EVIDENCE')).toBeTruthy();
    // The detective reacts to the discovery (authored dialogue trigger).
    await run(100);
    expect(screen.getByTestId('world-dialogue')).toBeTruthy();
    expect(screen.getByTestId('world-inspection')).toBeTruthy();
    expect(readDialogue(screen)[0]).toContain('Eleven fifty-nine');
    await run(10);

    // BACK leaves inspection; the camera returns.
    pressBack();
    await run(800);
    expect(screen.queryByTestId('world-inspection')).toBeNull();
    expect(screen.getByTestId('world-object-obj-clock').props.accessibilityLabel).toBe('Platform clock. Examined');
    // Focus returns to the object just inspected.
    expect(screen.getByTestId('world-object-obj-clock').props.hasTVPreferredFocus).toBe(true);

    // Two more clues unlock the station puzzle (engine rule), and the puzzle opens as in P5.
    for (const id of ['obj-waiting-clock', 'obj-notice']) {
      press(screen, `world-object-${id}`);
      await run(1000);
      press(screen, 'world-examine');
      await run(100);
      readDialogue(screen);
      await run(10);
      pressBack();
      await run(800);
    }
    // The inspection that unlocked the puzzle hands focus to it, not back to the object.
    expect(screen.getByTestId('world-object-obj-notice').props.hasTVPreferredFocus).toBeFalsy();
    expect(screen.getByTestId('scene-puzzle-station-clock').props.hasTVPreferredFocus).toBe(true);
    press(screen, 'scene-puzzle-station-clock');
    expect(screen.getByText('What time did the incident occur?')).toBeTruthy();

    // Back to the world: no replay of the cinematic.
    press(screen, 'puzzle-back');
    await run(100);
    expect(screen.getByTestId('world-station')).toBeTruthy();
    expect(screen.queryByTestId('world-skip')).toBeNull();

    // Solve it: back in the world, Continue takes focus (not the solved puzzle).
    press(screen, 'scene-puzzle-station-clock');
    for (const d of '1147') {
      press(screen, `puzzle-key-${d}`);
    }
    press(screen, 'puzzle-submit');
    expect(screen.getByText('SOLVED')).toBeTruthy();
    press(screen, 'puzzle-result-continue');
    await run(100);
    expect(screen.getByTestId('scene-continue').props.hasTVPreferredFocus).toBe(true);
    expect(screen.getByTestId('scene-puzzle-station-clock').props.hasTVPreferredFocus).toBeFalsy();
  }, 60_000);

  it('scenery objects have flavour text and send nothing to the engine', async () => {
    const screen = render(<App />);
    await startLastTrain(screen);
    press(screen, 'world-skip');
    await run(100);
    press(screen, 'world-object-obj-suitcase');
    await run(1000);
    expect(screen.getByText('A good leather case, tagged for carriage B.')).toBeTruthy();
    expect(screen.queryByTestId('world-examine')).toBeNull();
    press(screen, 'world-inspect-back');
    await run(800);
    press(screen, 'scene-evidence');
    expect(screen.getByText('No evidence yet')).toBeTruthy();
  }, 30_000);

  it('Back during the cinematic skips it; Back in the world asks before leaving', async () => {
    const screen = render(<App />);
    await startLastTrain(screen);
    pressBack();
    await run(100);
    expect(screen.queryByTestId('world-skip')).toBeNull();
    pressBack();
    await run(10);
    expect(screen.getByText('Leave the mystery?')).toBeTruthy();
    pressBack();
    await run(10);
    expect(screen.queryByText('Leave the mystery?')).toBeNull();
  }, 30_000);

  it('Settings → Scenes: Case file shows the P5 scene instead of the world', async () => {
    const screen = render(<App />);
    press(screen, 'home-settings');
    press(screen, 'settings-world');
    expect(screen.getByText('Case file')).toBeTruthy();
    press(screen, 'settings-back');
    await startLastTrain(screen);
    expect(screen.queryByTestId('world-station')).toBeNull();
    expect(screen.getByText('THE STATION')).toBeTruthy();
  }, 30_000);
});

describe('2.5D world in a room (P4)', () => {
  it("another player's discovery reaches the TV world through the server, and the detective reacts", async () => {
    const server = new FakeServer(() => 1_700_000_000_000);
    const screen = render(<App createSocket={server.createSocket} serverUrl="ws://test/ws" clock={() => 1_700_000_000_000} />);
    press(screen, 'home-createRoom');
    await run(10);
    act(() => server.phoneJoins('Aksh'));
    act(() => server.phoneJoins('Grace'));
    press(screen, 'room-start');
    press(screen, 'intro-begin');
    await run(50);
    press(screen, 'world-skip');
    await run(100);
    expect(screen.getByTestId('world-object-obj-clock').props.accessibilityLabel).toBe('Platform clock. Inspect');

    // A phone examines the clock: the server runs the engine and broadcasts.
    act(() => server.phoneActs('Aksh', {type: 'DISCOVER_CLUE', clueId: 'platform-clock'}));
    await run(100);
    expect(screen.getByTestId('world-dialogue')).toBeTruthy();
    expect(readDialogue(screen)[0]).toContain('Eleven fifty-nine');
    expect(screen.getByTestId('world-object-obj-clock').props.accessibilityLabel).toBe('Platform clock. Examined');
  }, 30_000);

  it("a teammate's discovery during the arrival cinematic waits until the cinematic is over", async () => {
    const server = new FakeServer(() => 1_700_000_000_000);
    const screen = render(<App createSocket={server.createSocket} serverUrl="ws://test/ws" clock={() => 1_700_000_000_000} />);
    press(screen, 'home-createRoom');
    await run(10);
    act(() => server.phoneJoins('Aksh'));
    act(() => server.phoneJoins('Grace'));
    press(screen, 'room-start');
    press(screen, 'intro-begin');
    await run(2_000);
    expect(screen.getByTestId('world-skip')).toBeTruthy();

    act(() => server.phoneActs('Aksh', {type: 'DISCOVER_CLUE', clueId: 'platform-clock'}));
    await run(500);
    // Still the cinematic: no reaction line cut into it.
    expect(screen.getByTestId('world-skip')).toBeTruthy();
    expect(readDialogue(screen).join(' ')).not.toContain('Eleven fifty-nine');

    press(screen, 'world-skip');
    await run(200);
    // Now the stage is free: the queued reaction plays.
    expect(readDialogue(screen)[0]).toContain('Eleven fifty-nine');
  }, 30_000);
});
