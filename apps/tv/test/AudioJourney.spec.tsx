import 'react-native';
import * as React from 'react';
import {act, fireEvent, render, RenderAPI} from '@testing-library/react-native';

import {pressBack} from './support/backHandler';
import {FakeServer} from './support/fakeServer';
import {players} from './support/w3cmedia';
import {App} from '../src/App';
import {bundledAudio} from '../src/audio/bundled';
import {traceLines} from '../src/audio/trace';
import {audioStats} from '../src/audio/w3cBackend';

/**
 * Phase 7B: the game's real audio path end to end (screens → AudioProvider →
 * AudioDirector → W3C backend → fake native player). Checks what the platform
 * is asked to do and in which order, plus player lifecycle counts. It cannot
 * say how anything sounds: that needs Fire TV hardware.
 */

beforeEach(() => {
  jest.useFakeTimers();
  players.length = 0;
});
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

const press = (screen: RenderAPI, testID: string) => fireEvent.press(screen.getByTestId(testID));
/** Advance in 100 ms slices so work scheduled by promises (asset loading) also gets its time. */
async function run(ms: number) {
  for (let left = ms; left > 0; left -= 100) {
    await act(async () => {
      jest.advanceTimersByTime(Math.min(100, left));
    });
  }
}

// Every bundled id gets its own asset number and path, as on the device.
const idBySrc = new Map<string, string>();
beforeAll(() => {
  let n = 5000;
  const {Image} = require('react-native');
  const asset = new Map<number, string>();
  for (const id of Object.keys(bundledAudio)) {
    (bundledAudio as Record<string, number>)[id] = ++n;
    asset.set(n, id);
  }
  jest.spyOn(Image, 'resolveAssetSource').mockImplementation(((m: number) => {
    const id = asset.get(m);
    if (id) {
      idBySrc.set(`/pkg/${id}`, id);
      return {uri: `file:///pkg/${id}`, width: 0, height: 0, scale: 1};
    }
    return {uri: '', width: 0, height: 0, scale: 1};
  }) as never);
});
let numbered: Record<string, number> = {};
beforeAll(() => {
  numbered = {...bundledAudio};
});
afterEach(() => {
  // Put back any id a test removed from the bundle (same asset number as before).
  Object.assign(bundledAudio as Record<string, number>, numbered);
});

/** Native players by state. A loop is live until deinitialized. */
const liveIds = () => players.filter(p => p.live && p.src).map(p => idBySrc.get(p.src) ?? p.src);
const count = (id: string) => liveIds().filter(x => x === id).length;
const volOf = (id: string) => players.find(p => p.live && idBySrc.get(p.src) === id)?.volume;
/** Fire the native "ended" for live one-shots matching `id` (what the platform does when a file ends). */
const finish = async (id: string) => {
  for (const p of players.filter(x => x.live && idBySrc.get(x.src) === id)) {
    p.emit('ended');
  }
  await run(10);
};
/** The trace's director commands, in order (just the command list). */
const cmds = () => traceLines.filter(l => l.kind === 'cmd').map(l => l.msg);
const played = () => traceLines.filter(l => l.kind === 'play').map(l => /id=(\S+)/.exec(l.msg)![1]);

async function closeDialogue(screen: RenderAPI) {
  for (let i = 0; i < 10 && screen.queryByTestId('world-dialogue-next'); i++) {
    press(screen, 'world-dialogue-next');
    await run(50);
  }
}
async function inspect(screen: RenderAPI, id: string) {
  press(screen, `world-object-${id}`);
  await run(1000);
  if (screen.queryByTestId('world-examine')) {
    press(screen, 'world-examine');
    await run(100);
  }
  await closeDialogue(screen);
  pressBack();
  await run(800);
}
async function toStation(screen: RenderAPI, skip = true) {
  press(screen, 'home-mysteries');
  press(screen, 'mystery-the-last-train');
  press(screen, 'details-select');
  press(screen, 'intro-begin');
  await run(50);
  if (skip) {
    press(screen, 'world-skip');
    await run(500);
    await closeDialogue(screen);
    await run(2000);
  }
}
async function solve(screen: RenderAPI, puzzle: string, presses: string[]) {
  press(screen, `scene-puzzle-${puzzle}`);
  await run(100);
  for (const k of presses) {
    press(screen, k);
  }
  press(screen, 'puzzle-submit');
  await run(100);
  press(screen, 'puzzle-result-continue');
  await run(100);
}

describe('game audio: menu and selection (A, B)', () => {
  it('menu music once; navigating never adds a second track; selection keeps it; the world replaces it', async () => {
    const screen = render(<App />);
    await run(200);
    expect(count('core.music.menu')).toBe(1);
    // Repeated navigation in and out of the library and Settings.
    for (let i = 0; i < 3; i++) {
      press(screen, 'home-mysteries');
      await run(100);
      pressBack();
      await run(100);
      press(screen, 'home-settings');
      await run(100);
      pressBack();
      await run(100);
    }
    expect(count('core.music.menu')).toBe(1);
    expect(played().filter(id => id === 'core.music.menu')).toHaveLength(1);
    expect(played().filter(id => id === 'core.ui.select').length).toBeGreaterThanOrEqual(6);

    press(screen, 'home-mysteries');
    press(screen, 'mystery-the-last-train');
    press(screen, 'details-select');
    expect(count('core.music.menu')).toBe(1);
    press(screen, 'intro-begin');
    await run(3000);
    // Into the arrival: the menu bed fades out and is released; no investigation music under the cinematic.
    expect(count('core.music.menu')).toBe(0);
    expect(count('last-train.music.investigation')).toBe(0);
    expect(liveIds()).toEqual(expect.arrayContaining(['last-train.ambient.rain', 'last-train.ambient.wind', 'last-train.ambient.railway']));
  }, 60_000);

  it('loading the world does not flash investigation music before the arrival', async () => {
    const screen = render(<App />);
    await run(100);
    await toStation(screen, false);
    await run(3000);
    expect(played()).not.toContain('last-train.music.investigation');
  }, 60_000);
});

describe('train arrival cinematic (D)', () => {
  it('fires its cues in the intended order, then music, then the detective, then control', async () => {
    const screen = render(<App />);
    await run(100);
    await toStation(screen, false);
    for (let i = 0; i < 60 && !screen.queryByTestId('world-dialogue'); i++) {
      await run(500);
    }
    const c = cmds();
    const at = (needle: string) => c.findIndex(m => m.includes(needle));
    const order = ['place:game/scene/arrival', 'cue:rain-start', 'cue:train-approach', 'cue:train-brake', 'cue:train-stop', 'cue:steam', 'cue:doors-open', 'dialogue:arrival-1'];
    const idx = order.map(at);
    expect(idx.every(i => i >= 0)).toBe(true);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
    // Each cue once.
    for (const cue of ['cue:train-approach', 'cue:train-brake', 'cue:train-stop', 'cue:doors-open']) {
      expect(c.filter(m => m.startsWith(cue)).length).toBe(1);
    }
    // Under the arrival there is no music bed; the detective speaks over the vestibule ambience.
    expect(count('last-train.music.investigation')).toBe(0);
    expect(count('last-train.vo.arrival-1')).toBe(1);
    await closeDialogue(screen);
    await run(4000);
    // Control returns: investigation music starts after the dialogue, on the platform.
    expect(screen.getByTestId('scene-investigate')).toBeTruthy();
    expect(at('dialogue:arrival-2')).toBeLessThan(cmds().findIndex(m => m.includes('PLAY_MUSIC:last-train.music.investigation')));
    expect(count('last-train.music.investigation')).toBe(1);
  }, 60_000);
});

describe('station exploration and inspection (C, E, F)', () => {
  it('ambient layers are data-driven, single, and stop on leaving; inspection sounds use their ids; scenery sends no gameplay sound', async () => {
    const screen = render(<App />);
    await run(100);
    await toStation(screen);
    const outside = ['last-train.ambient.rain', 'last-train.ambient.wind', 'last-train.ambient.station', 'last-train.ambient.railway', 'last-train.ambient.hum'];
    for (const id of outside) {
      expect(count(id)).toBe(1);
    }
    // Clock → clock tick, discovery once, voiced reaction.
    traceLines.length = 0;
    await inspect(screen, 'obj-clock');
    expect(played().filter(id => id === 'last-train.sfx.clock')).toHaveLength(1);
    expect(played().filter(id => id === 'core.sfx.discovery')).toHaveLength(1);
    expect(played()).toContain('last-train.vo.react-clock');
    // Re-inspecting an examined clue: the tick again, but no second discovery.
    traceLines.length = 0;
    await inspect(screen, 'obj-clock');
    expect(played()).toContain('last-train.sfx.clock');
    expect(played()).not.toContain('core.sfx.discovery');
    // Scenery (suitcase): its latch, nothing from the engine.
    traceLines.length = 0;
    await inspect(screen, 'obj-suitcase');
    expect(played()).toEqual(expect.arrayContaining(['last-train.sfx.latch']));
    expect(played().filter(id => id === 'core.sfx.discovery' || id === 'core.sfx.unlock')).toHaveLength(0);
    // The notice: paper. Waiting-room clock completes the set: discovery + unlock in one batch.
    await inspect(screen, 'obj-waiting-clock');
    traceLines.length = 0;
    await inspect(screen, 'obj-notice');
    expect(played()).toEqual(expect.arrayContaining(['last-train.sfx.paper', 'core.sfx.discovery', 'core.sfx.unlock']));
    expect(played().filter(id => id === 'core.sfx.discovery')).toHaveLength(1);
    // Ambience never doubled after all those inspections.
    for (const id of outside) {
      expect(count(id)).toBe(1);
    }
    // Every one-shot that ended was released.
    for (const id of ['last-train.sfx.clock', 'last-train.sfx.paper', 'last-train.sfx.latch', 'core.sfx.discovery', 'core.sfx.unlock', 'core.ui.select']) {
      await finish(id);
      expect(count(id)).toBe(0);
    }
    // Puzzle: puzzle music, success cue; back in the world the station layers and investigation return once.
    press(screen, 'scene-puzzle-station-clock');
    await run(2000);
    expect(count('core.music.puzzle')).toBe(1);
    for (const d of '1147') {
      press(screen, `puzzle-key-${d}`);
    }
    traceLines.length = 0;
    press(screen, 'puzzle-submit');
    await run(100);
    expect(played()).toContain('core.ui.success');
    press(screen, 'puzzle-result-continue');
    await run(2000);
    expect(count('last-train.music.investigation')).toBe(1);
    expect(count('core.music.puzzle')).toBe(0);
    for (const id of outside) {
      expect(count(id)).toBe(1);
    }
    // Continue to the train: the station's layers are replaced by the train's (carriage idle added), none doubled.
    press(screen, 'scene-continue');
    await run(3000);
    await closeDialogue(screen);
    await run(3000);
    expect(count('last-train.ambient.carriage')).toBe(1);
    for (const id of outside) {
      expect(count(id)).toBe(1);
    }
  }, 120_000);

  it('a wrong answer sounds failure; a hint sounds the hint cue', async () => {
    const screen = render(<App />);
    await run(100);
    await toStation(screen);
    for (const id of ['obj-clock', 'obj-waiting-clock', 'obj-notice']) {
      await inspect(screen, id);
    }
    press(screen, 'scene-puzzle-station-clock');
    await run(100);
    for (const d of '1159') {
      press(screen, `puzzle-key-${d}`);
    }
    traceLines.length = 0;
    press(screen, 'puzzle-submit');
    await run(100);
    expect(played()).toContain('core.ui.failure');
    expect(played()).not.toContain('core.ui.success');
    traceLines.length = 0;
    press(screen, 'puzzle-hint');
    await run(100);
    expect(screen.getByTestId('puzzle-hints')).toBeTruthy();
    expect(played()).toContain('core.ui.hint');
  }, 60_000);

  it("a phone's discovery sounds the TV's discovery once and voices the reaction", async () => {
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
    await run(500);
    await closeDialogue(screen);
    await run(1000);
    traceLines.length = 0;
    act(() => server.phoneActs('Aksh', {type: 'DISCOVER_CLUE', clueId: 'platform-clock'}));
    await run(200);
    expect(played().filter(id => id === 'core.sfx.discovery')).toHaveLength(1);
    expect(played()).toContain('last-train.vo.react-clock');
  }, 60_000);
});

describe('voice ducking through the game (Step 3)', () => {
  it('a detective line ducks investigation music to 40%, uses the voice volume, and restores when it ends', async () => {
    const screen = render(<App />);
    await run(100);
    await toStation(screen);
    await run(2000); // investigation music fully faded in
    const full = volOf('last-train.music.investigation')!;
    expect(full).toBeGreaterThan(0);
    press(screen, 'world-object-obj-clock');
    await run(1000);
    press(screen, 'world-examine');
    await run(100);
    expect(count('last-train.vo.react-clock')).toBe(1);
    expect(volOf('last-train.music.investigation')).toBeCloseTo(full * 0.4, 5);
    // Voice at the voice channel's gain (default voice 100% × master 100%).
    expect(volOf('last-train.vo.react-clock')).toBeCloseTo(1, 5);
    // The line ends by itself: music back to full; the trace says so.
    await finish('last-train.vo.react-clock');
    expect(volOf('last-train.music.investigation')).toBeCloseTo(full, 5);
    expect(traceLines.some(l => l.kind === 'state' && l.msg.includes('ducked=true'))).toBe(true);
    expect(traceLines.filter(l => l.kind === 'state').pop()!.msg).toContain('ducked=false');
  }, 60_000);

  it('consecutive lines stay ducked; skipping a line restores; a scene change mid-line leaves nothing ducked or playing', async () => {
    const screen = render(<App />);
    await run(100);
    await toStation(screen);
    await run(2000);
    const full = volOf('last-train.music.investigation')!;
    // The notice's reaction is followed by the station-puzzle line (two lines, one dialogue).
    for (const id of ['obj-clock', 'obj-waiting-clock']) {
      await inspect(screen, id);
    }
    press(screen, 'world-object-obj-notice');
    await run(1000);
    press(screen, 'world-examine');
    await run(100);
    expect(count('last-train.vo.react-notice')).toBe(1);
    expect(volOf('last-train.music.investigation')).toBeCloseTo(full * 0.4, 5);
    press(screen, 'world-dialogue-next');
    await run(50);
    expect(count('last-train.vo.react-notice')).toBe(0);
    expect(count('last-train.vo.react-station-puzzle')).toBe(1);
    expect(volOf('last-train.music.investigation')).toBeCloseTo(full * 0.4, 5);
    // Interrupt: leave for the puzzle while the line is still speaking.
    press(screen, 'world-dialogue-next');
    await run(50);
    pressBack();
    await run(800);
    press(screen, 'scene-puzzle-station-clock');
    await run(3000);
    expect(liveIds().filter(id => id.includes('.vo.'))).toHaveLength(0);
    expect(count('core.music.puzzle')).toBe(1);
    const puzzleVol = volOf('core.music.puzzle')!;
    expect(puzzleVol).toBeGreaterThan(0);
    expect(traceLines.filter(l => l.kind === 'state').pop()!.msg).toContain('voice=-');
  }, 60_000);

  it('a voice line with no file: spoken by TTS (ducked), the subtitle text still shows, the game goes on', async () => {
    delete (bundledAudio as Record<string, number>)['last-train.vo.react-clock'];
    try {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      const screen = render(<App />);
      await run(100);
      // Subtitles off: a voiced line would hide its text; an unvoiced one must not.
      press(screen, 'home-settings');
      press(screen, 'settings-subtitles');
      pressBack();
      await run(300);
      await toStation(screen);
      await run(2000);
      const full = volOf('last-train.music.investigation')!;
      press(screen, 'world-object-obj-clock');
      await run(1000);
      press(screen, 'world-examine');
      await run(100);
      expect(screen.getByTestId('world-dialogue')).toBeTruthy();
      expect(screen.getByText(/Eleven fifty-nine/)).toBeTruthy();
      // No recorded take: the server speaks the subtitle (TTS), so the music ducks under it.
      expect(volOf('last-train.music.investigation')!).toBeLessThan(full);
      await closeDialogue(screen);
      pressBack();
      await run(800);
      expect(screen.getByTestId('world-object-obj-clock').props.accessibilityLabel).toBe('Platform clock. Examined');
      // Let the spoken subtitle's player finish releasing before the next test counts players.
      screen.unmount();
      await run(1000);
      warn.mockRestore();
    } finally {
      // afterEach restores the bundle.
    }
  }, 60_000);
});

describe('missing sounds (Step 5)', () => {
  it('missing ambience and effects are logged with id and scene, and never block progress', async () => {
    const removed = ['last-train.ambient.rain', 'last-train.sfx.clock', 'core.sfx.discovery'];
    for (const id of removed) {
      delete (bundledAudio as Record<string, number>)[id];
    }
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const screen = render(<App />);
      await run(100);
      await toStation(screen);
      await inspect(screen, 'obj-clock');
      expect(screen.getByTestId('world-object-obj-clock').props.accessibilityLabel).toBe('Platform clock. Examined');
      // The rest of the station still sounds.
      expect(count('last-train.ambient.wind')).toBe(1);
      expect(count('last-train.ambient.rain')).toBe(0);
      // Each missing sound is reported with its id, reason and scene.
      const missing = traceLines.filter(l => l.kind === 'missing').map(l => l.msg);
      for (const id of removed) {
        expect(missing.some(m => m.includes(`id=${id} reason=not-bundled`) && m.includes('scene=station'))).toBe(true);
      }
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('[AUDIO_MISSING] id=last-train.sfx.clock reason=not-bundled scene=station'));
      // The game kept going: the next object still works and sounds.
      traceLines.length = 0;
      await inspect(screen, 'obj-notice');
      expect(played()).toContain('last-train.sfx.paper');
    } finally {
      warn.mockRestore();
    }
  }, 60_000);
});

describe('settings during play (Step 6)', () => {
  it('each volume moves only its own channel (music, effects, voice); background mutes and foreground restores', async () => {
    const {AppState} = require('react-native');
    const appState: ((s: string) => void)[] = [];
    const spy = jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, cb: (s: string) => void) => {
      appState.push(cb);
      return {remove: () => undefined};
    }) as never);
    try {
      const screen = render(<App />);
      await run(2000); // menu bed fully faded in
      const menu0 = volOf('core.music.menu')!;
      press(screen, 'home-settings');
      press(screen, 'settings-music'); // 75 → 50: music only
      await run(50);
      expect(volOf('core.music.menu')).toBeCloseTo((menu0 * 50) / 75, 5);
      // Effects 100 → 75 is checked on the next one-shot: select is 0.6 × effects.
      traceLines.length = 0;
      press(screen, 'settings-sfx');
      await run(50);
      traceLines.length = 0;
      press(screen, 'settings-voice'); // voice 100 → 75; its click is the first one-shot after effects went to 75
      await run(50);
      const sel = traceLines.filter(l => l.kind === 'play' && l.msg.includes('core.ui.select')).map(l => Number(/vol=([\d.]+)/.exec(l.msg)![1]));
      expect(sel[0]).toBeCloseTo(0.6 * 0.75, 3);
      // Music did not move with effects or voice.
      expect(volOf('core.music.menu')).toBeCloseTo((menu0 * 50) / 75, 5);
      pressBack();
      await run(200);
      await toStation(screen);
      await run(2000);
      const music = volOf('last-train.music.investigation')!;
      const rain = volOf('last-train.ambient.rain')!;
      expect(music).toBeGreaterThan(0);
      expect(rain).toBeGreaterThan(0);
      // Voice line at voice 75% × master 100%.
      press(screen, 'world-object-obj-clock');
      await run(1000);
      press(screen, 'world-examine');
      await run(100);
      expect(volOf('last-train.vo.react-clock')).toBeCloseTo(0.75, 5);
      await finish('last-train.vo.react-clock');
      await closeDialogue(screen);
      // Background: everything to zero; foreground: back to the same levels.
      act(() => appState.forEach(cb => cb('background')));
      await run(50);
      expect(volOf('last-train.music.investigation')).toBe(0);
      expect(volOf('last-train.ambient.rain')).toBe(0);
      act(() => appState.forEach(cb => cb('active')));
      await run(50);
      expect(volOf('last-train.music.investigation')).toBeCloseTo(music, 5);
      expect(volOf('last-train.ambient.rain')).toBeCloseTo(rain, 5);
    } finally {
      spy.mockRestore();
    }
  }, 60_000);
});

describe('lifecycle (Step 4)', () => {
  it('a station run, then leaving the mystery: every one-shot released; only the library\'s menu bed remains', async () => {
    // Earlier tests in this file may still be tearing players down; count only this run.
    const before = audioStats.created - audioStats.released - audioStats.active;
    const errorsBefore = audioStats.errors;
    const screen = render(<App />);
    await run(100);
    await toStation(screen);
    for (const id of ['obj-clock', 'obj-waiting-clock', 'obj-notice', 'obj-suitcase', 'obj-newspaper']) {
      await inspect(screen, id);
    }
    await solve(screen, 'station-clock', ['puzzle-key-1', 'puzzle-key-1', 'puzzle-key-4', 'puzzle-key-7']);
    // Finish every one-shot as the platform would.
    // Leave the mystery: Back asks; confirm → the library (selection plays the menu bed).
    await run(3000);
    act(() => {
      pressBack();
    });
    await run(100);
    press(screen, 'scene-leave-risky');
    await run(3000);
    expect(screen.getByText('CHOOSE A CASE')).toBeTruthy();
    // Every one-shot ends as the platform would (the fake player never ends by itself).
    for (const p of players.filter(x => x.live && x.src && !x.loop)) {
      p.emit('ended');
    }
    await run(50);
    const live = liveIds();
    expect(live).toEqual(['core.music.menu']);
    // Counts: everything created is released except the one live bed.
    expect(audioStats.created - audioStats.released - audioStats.active).toBe(before);
    expect(audioStats.errors).toBe(errorsBefore);
    console.log(`[LIFECYCLE] created=${audioStats.created} released=${audioStats.released} active=${audioStats.active} errors=${audioStats.errors} loops=${live.join(',')}`);
  }, 120_000);
});
