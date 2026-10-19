import 'react-native';
import * as React from 'react';
import {act, fireEvent, render} from '@testing-library/react-native';

import {mockBackHandler, pressBack} from './support/backHandler';
import {FakeServer} from './support/fakeServer';
import {App} from '../src/App';
import {applyKey} from '../src/screens/JoinRoom/JoinRoomScreen';
import {mysteries} from '../src/data/mysteries';

// Entrance / focus / ambient animations run on timers; keep them off the real clock.
beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe('Room Riddle TV shell', () => {
  it('starts on Home: Quick Start first, and a first-time TV sees how it works', () => {
    const screen = render(<App />);
    expect(screen.getByText('ROOM RIDDLE')).toBeTruthy();
    expect(screen.getByText('Gather. Investigate. Unravel.')).toBeTruthy();
    expect(screen.getByLabelText(/Quick Start/i)).toBeTruthy();
    for (const id of ['createRoom', 'mysteries', 'joinRoom', 'howToPlay', 'settings']) {
      expect(screen.getByTestId(`home-${id}`)).toBeTruthy();
    }
    expect(screen.getByTestId('home-how-it-works')).toBeTruthy();
  });

  it('How to Play leads straight into a room, and afterwards Home shows tonight\'s case', () => {
    const screen = render(<App />);
    fireEvent.press(screen.getByTestId('home-howToPlay'));
    expect(screen.getByText('Three steps. About a minute.')).toBeTruthy();
    fireEvent.press(screen.getByTestId('howto-back'));
    expect(screen.getByTestId('home-tonight')).toBeTruthy();
    expect(screen.queryByTestId('home-how-it-works')).toBeNull();
  });

  it('the library filters by age group and story type', () => {
    const screen = render(<App />);
    fireEvent.press(screen.getByTestId('home-mysteries'));
    fireEvent.press(screen.getByTestId('filter-age-family'));
    expect(screen.getByTestId('mystery-the-forgotten-temple')).toBeTruthy();
    expect(screen.getByTestId('mystery-the-yakshas-questions')).toBeTruthy();
    expect(screen.queryByTestId('mystery-the-last-train')).toBeNull();
    fireEvent.press(screen.getByTestId('filter-type-tech'));
    expect(screen.getByTestId('mysteries-empty')).toBeTruthy();
    fireEvent.press(screen.getByTestId('filter-age-any'));
    expect(screen.getByTestId('mystery-signal-lost')).toBeTruthy();
  });

  it('opens Create Room: the server room code, live players, and asks before closing', () => {
    const server = new FakeServer(Date.now);
    const screen = render(<App createSocket={server.createSocket} serverUrl="ws://test/ws" />);
    fireEvent.press(screen.getByTestId('home-createRoom'));
    act(() => {
      jest.advanceTimersByTime(10);
    });
    expect(server.socket!.sent[0].type).toBe('CREATE_ROOM');
    expect(screen.getByTestId('room-code').props.children).toBe('4827');
    expect(screen.getByTestId('room-qr')).toBeTruthy();
    expect(screen.getByText('0 PLAYERS')).toBeTruthy();

    // Starting too early: the server says no, the TV shows why.
    fireEvent.press(screen.getByTestId('room-start'));
    expect(screen.getByText('Waiting for more players to join.')).toBeTruthy();

    act(() => server.phoneJoins('Aksh'));
    expect(screen.getByText('1 PLAYER')).toBeTruthy();
    expect(screen.getByTestId('room-player-Aksh')).toBeTruthy();

    fireEvent.press(screen.getByTestId('room-back'));
    expect(screen.getByText('Close this room?')).toBeTruthy();
    fireEvent.press(screen.getByTestId('room-keep'));
    expect(screen.getByTestId('room-start')).toBeTruthy();

    fireEvent.press(screen.getByTestId('room-back'));
    fireEvent.press(screen.getByTestId('room-close'));
    expect(server.socket!.sent.some((m: {type: string}) => m.type === 'LEAVE_ROOM')).toBe(true);
    expect(screen.getByTestId('home-createRoom')).toBeTruthy();
  });

  it('Join Room accepts keypad digits and returns Home on Back', () => {
    const screen = render(<App />);
    fireEvent.press(screen.getByTestId('home-joinRoom'));
    for (const digit of ['4', '8', '2', '7']) {
      fireEvent.press(screen.getByTestId(`key-${digit}`));
    }
    fireEvent.press(screen.getByTestId('join-submit'));
    expect(
      screen.getByText('Room 4827: joining arrives in the multiplayer phase.'),
    ).toBeTruthy();

    fireEvent.press(screen.getByTestId('join-back'));
    expect(screen.getByTestId('home-joinRoom')).toBeTruthy();
  });

  it('lists all mysteries and opens The Last Train details', () => {
    const screen = render(<App />);
    fireEvent.press(screen.getByTestId('home-mysteries'));
    expect(screen.getByText('CHOOSE A CASE')).toBeTruthy();
    for (const mystery of mysteries) {
      expect(screen.getByTestId(`mystery-${mystery.id}`)).toBeTruthy();
    }

    fireEvent.press(screen.getByTestId('mystery-the-last-train'));
    expect(screen.getByText('THE LAST TRAIN')).toBeTruthy();
    expect(screen.getByText('Something happened at 11:47 PM.')).toBeTruthy();
    expect(screen.getByText('2–6')).toBeTruthy();

    fireEvent.press(screen.getByTestId('details-back'));
    expect(screen.getByText('CHOOSE A CASE')).toBeTruthy();
    fireEvent.press(screen.getByTestId('mysteries-back'));
    expect(screen.getByTestId('home-mysteries')).toBeTruthy();
  });

  it('every case in the library can be selected and opens at its own intro', () => {
    const screen = render(<App />);
    fireEvent.press(screen.getByTestId('home-mysteries'));
    fireEvent.press(screen.getByTestId('mystery-signal-lost'));
    expect(screen.getByText('SIGNAL LOST')).toBeTruthy();
    expect(screen.queryByText('Coming soon. This mystery is not playable yet.')).toBeNull();
    fireEvent.press(screen.getByTestId('details-select'));
    expect(screen.getByTestId('intro-begin')).toBeTruthy();
    expect(screen.getByText('The operator, Nikhil Rao, is not here.')).toBeTruthy();
  });

  it('Select Mystery starts The Last Train at its intro', () => {
    const screen = render(<App />);
    fireEvent.press(screen.getByTestId('home-mysteries'));
    fireEvent.press(screen.getByTestId('mystery-the-last-train'));
    fireEvent.press(screen.getByTestId('details-select'));
    expect(screen.getByTestId('intro-begin')).toBeTruthy();
    expect(screen.getByText('Its conductor, Elias Caldwell, has vanished.')).toBeTruthy();
    // Back from the intro returns to the details, where the mystery is now selected.
    fireEvent.press(screen.getByTestId('intro-back'));
    expect(
      screen.getByText('✓ Selected for tonight. Play here on the TV, or create a room so phones can join.'),
    ).toBeTruthy();
  });

  it('Settings lists the settings and Back', () => {
    const screen = render(<App />);
    fireEvent.press(screen.getByTestId('home-settings'));
    for (const id of ['motion', 'world', 'sound', 'master', 'music', 'sfx', 'voice', 'subtitles', 'display', 'controls', 'back']) {
      expect(screen.getByTestId(`settings-${id}`)).toBeTruthy();
    }
    fireEvent.press(screen.getByTestId('settings-sound'));
    expect(screen.getAllByText('Off').length).toBeGreaterThan(0);
    fireEvent.press(screen.getByTestId('settings-back'));
    expect(screen.getByTestId('home-settings')).toBeTruthy();
  });
});

describe('remote Back button', () => {
  const back = () => {
    let consumed = false;
    act(() => {
      consumed = pressBack();
    });
    return consumed;
  };

  it('walks back Details → Mysteries → Home', () => {
    const screen = render(<App />);
    fireEvent.press(screen.getByTestId('home-mysteries'));
    fireEvent.press(screen.getByTestId('mystery-the-last-train'));
    expect(back()).toBe(true);
    expect(screen.getByText('CHOOSE A CASE')).toBeTruthy();
    expect(back()).toBe(true);
    expect(screen.getByTestId('home-mysteries')).toBeTruthy();
  });

  it('never closes a room without confirmation', () => {
    const server = new FakeServer(Date.now);
    const screen = render(<App createSocket={server.createSocket} serverUrl="ws://test/ws" />);
    fireEvent.press(screen.getByTestId('home-createRoom'));
    act(() => {
      jest.advanceTimersByTime(10);
    });
    expect(back()).toBe(true);
    expect(screen.getByText('Close this room?')).toBeTruthy();
    expect(screen.getByText('4827')).toBeTruthy();
    // A second Back cancels the prompt rather than leaving.
    expect(back()).toBe(true);
    expect(screen.queryByText('Close this room?')).toBeNull();
    expect(screen.getByTestId('room-start')).toBeTruthy();
  });

  it('asks before exiting the app from Home', () => {
    mockBackHandler.exitApp.mockClear();
    const screen = render(<App />);
    expect(back()).toBe(true);
    expect(screen.getByText('Leave Room Riddle?')).toBeTruthy();
    expect(mockBackHandler.exitApp).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('home-exit-stay'));
    expect(screen.getByTestId('home-createRoom')).toBeTruthy();
    fireEvent.press(screen.getByTestId('home-mysteries'));
    back();
    back();
    fireEvent.press(screen.getByTestId('home-exit-confirm'));
    expect(mockBackHandler.exitApp).toHaveBeenCalledTimes(1);
  });
});

describe('saved settings', () => {
  // A store shared across two app launches stands in for the TV's storage.
  const memoryStore = () => {
    let saved: string | null = null;
    return {read: async () => saved, write: async (json: string) => {
        saved = json;
      },
      peek: () => saved};
  };
  const flush = async () => {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
  };

  it('Motion, Scenes and audio levels survive closing and reopening the app', async () => {
    const store = memoryStore();
    const first = render(<App settingsStore={store} />);
    await flush();
    fireEvent.press(first.getByTestId('home-settings'));
    fireEvent.press(first.getByTestId('settings-motion'));
    fireEvent.press(first.getByTestId('settings-world'));
    fireEvent.press(first.getByTestId('settings-music'));
    fireEvent.press(first.getByTestId('settings-subtitles'));
    expect(JSON.parse(store.peek() ?? '{}')).toMatchObject({motion: 'reduced', scenes: 'casefile', music: 50, subtitles: false});
    first.unmount();

    const second = render(<App settingsStore={store} />);
    await flush();
    fireEvent.press(second.getByTestId('home-settings'));
    expect(second.getByText('Reduced')).toBeTruthy();
    expect(second.getByText('Case file')).toBeTruthy();
    expect(second.getByText('50%')).toBeTruthy();
    expect(second.getAllByText('Off').length).toBeGreaterThan(0);
  });

  it('a corrupt saved copy falls back to the defaults', async () => {
    const screen = render(<App settingsStore={{read: async () => '{not json', write: async () => undefined}} />);
    await flush();
    fireEvent.press(screen.getByTestId('home-settings'));
    expect(screen.getByText('Full')).toBeTruthy();
    expect(screen.getByText('Cinematic')).toBeTruthy();
  });
});

describe('room code entry', () => {
  it('appends digits up to four, deletes and clears', () => {
    expect(applyKey('', '4')).toBe('4');
    expect(applyKey('482', '7')).toBe('4827');
    expect(applyKey('4827', '1')).toBe('4827');
    expect(applyKey('4827', 'delete')).toBe('482');
    expect(applyKey('48', 'clear')).toBe('');
    expect(applyKey('', 'delete')).toBe('');
    expect(applyKey('12', 'x')).toBe('12');
  });
});

describe('Phase 5 experience', () => {
  it('Motion setting switches the whole app to reduced motion', () => {
    const screen = render(<App />);
    fireEvent.press(screen.getByTestId('home-settings'));
    expect(screen.getByText('Full')).toBeTruthy();
    fireEvent.press(screen.getByTestId('settings-motion'));
    expect(screen.getByText('Reduced')).toBeTruthy();
    expect(screen.getByText('Saved on this TV')).toBeTruthy();
    // The preference survives navigation (it lives above the navigator).
    fireEvent.press(screen.getByTestId('settings-back'));
    fireEvent.press(screen.getByTestId('home-settings'));
    expect(screen.getByText('Reduced')).toBeTruthy();
  });

  it('the evidence board has a designed empty state', () => {
    const screen = render(<App cinematicWorld={false} />);
    fireEvent.press(screen.getByTestId('home-mysteries'));
    fireEvent.press(screen.getByTestId('mystery-the-last-train'));
    fireEvent.press(screen.getByTestId('details-select'));
    fireEvent.press(screen.getByTestId('intro-begin'));
    fireEvent.press(screen.getByTestId('scene-evidence'));
    expect(screen.getByText('No evidence yet')).toBeTruthy();
  });
});
