import 'react-native';
import * as React from 'react';
import {act, fireEvent, render, RenderAPI} from '@testing-library/react-native';

import {pressBack} from './support/backHandler';
import {players} from './support/w3cmedia';
import {App} from '../src/App';
import {bundledAudio} from '../src/audio/bundled';
import {audioManifests} from '@roomriddle/mystery-data';

/**
 * Phase 7 audio through the TV: the AudioManager hears the game and the world
 * and asks the (fake) W3C player for the right sounds. Which file is which id
 * comes from the bundle map; tests read ids back from it.
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
/** Advance in 100 ms slices so promise work (asset loading) gets its time, as on a device. */
async function run(ms: number) {
  for (let left = ms; left > 0; left -= 100) {
    await act(async () => {
      jest.advanceTimersByTime(Math.min(100, left));
    });
  }
}

/** The ids of sounds that are playing now (players still alive, by source path). */
const idBySrc = new Map<string, string>();
const live = () => players.filter(p => p.live && p.src).map(p => idBySrc.get(p.src) ?? p.src);
const everStarted = () => players.filter(p => p.src).map(p => idBySrc.get(p.src) ?? p.src);

beforeAll(() => {
  // In tests every bundled file resolves to the same stub, so map by order of request instead:
  // the backend asks for `bundledAudio[id]`; we make each id's asset number unique.
  let n = 1000;
  const {Image} = require('react-native');
  const ids = Object.keys(bundledAudio);
  const asset = new Map<number, string>();
  for (const id of ids) {
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

describe('audio', () => {
  it('every sound in the manifests has a bundled file, and every bundled file is in a manifest', () => {
    const declared = audioManifests.flatMap(m => m.sounds.filter(s => s.status !== 'missing').map(s => s.id)).sort();
    expect(Object.keys(bundledAudio).sort()).toEqual(declared);
  });

  it('menu music on Home; the library keeps it (no restart); the world plays ambience, then investigation music', async () => {
    const screen = render(<App />);
    await run(100);
    expect(live()).toContain('core.music.menu');
    press(screen, 'home-mysteries');
    await run(100);
    expect(everStarted().filter(id => id === 'core.music.menu')).toHaveLength(1);

    press(screen, 'mystery-the-last-train');
    press(screen, 'details-select');
    press(screen, 'intro-begin');
    await run(2000);
    // The arrival: silence under the cinematic (menu music fades out), outdoor ambience.
    expect(live()).not.toContain('core.music.menu');
    expect(live()).toEqual(expect.arrayContaining(['last-train.ambient.rain', 'last-train.ambient.wind', 'last-train.ambient.railway']));
    // Timeline cues sound in order, then the detective speaks over the vestibule's inside ambience.
    for (let i = 0; i < 40 && !screen.queryByTestId('world-dialogue'); i++) {
      await run(500);
    }
    const started = everStarted();
    const at = (id: string) => started.indexOf(id);
    for (const id of ['last-train.sfx.train-approach', 'last-train.sfx.steam', 'last-train.sfx.train-stop', 'last-train.sfx.train-brake', 'last-train.sfx.doors']) {
      expect(at(id)).toBeGreaterThan(-1);
    }
    expect(at('last-train.sfx.train-approach')).toBeLessThan(at('last-train.sfx.train-stop'));
    expect(at('last-train.sfx.train-stop')).toBeLessThan(at('last-train.sfx.doors'));
    expect(live()).toContain('last-train.vo.arrival-1');
    expect(live()).toContain('last-train.ambient.carriage');
    expect(live()).not.toContain('last-train.ambient.rain');
    expect(live()).not.toContain('last-train.music.investigation');
    press(screen, 'world-dialogue-next');
    await run(50);
    expect(live()).not.toContain('last-train.vo.arrival-1');
    expect(live()).toContain('last-train.vo.arrival-2');
    press(screen, 'world-dialogue-next');
    // Control returns on the platform: investigation music.
    await run(4000);
    expect(screen.getByTestId('scene-investigate')).toBeTruthy();
    expect(live()).toContain('last-train.music.investigation');
  }, 60_000);

  it('inspecting the clock ticks; the discovery chimes (engine event); the reaction is voiced', async () => {
    const screen = render(<App />);
    await run(50);
    press(screen, 'home-mysteries');
    press(screen, 'mystery-the-last-train');
    press(screen, 'details-select');
    press(screen, 'intro-begin');
    await run(50);
    press(screen, 'world-skip');
    await run(100);
    press(screen, 'world-object-obj-clock');
    await run(500);
    expect(everStarted()).toContain('last-train.sfx.clock');
    press(screen, 'world-examine');
    await run(100);
    expect(everStarted()).toContain('core.sfx.discovery');
    expect(live()).toContain('last-train.vo.react-clock');
  }, 60_000);

  it('Sound off mutes everything; music and voice volumes follow Settings', async () => {
    const screen = render(<App />);
    await run(100);
    const menu = () => players.find(p => p.live && idBySrc.get(p.src) === 'core.music.menu')!;
    expect(menu().volume).toBeGreaterThan(0);
    press(screen, 'home-settings');
    press(screen, 'settings-sound');
    await run(10);
    expect(menu().volume).toBe(0);
    press(screen, 'settings-sound');
    const before = menu().volume;
    press(screen, 'settings-music'); // 75 → 50
    await run(10);
    expect(menu().volume).toBeCloseTo((before * 50) / 75, 5);
  }, 30_000);

  it('subtitles off: a voiced line shows only the speaker; the text still reaches accessibility', async () => {
    const screen = render(<App />);
    await run(50);
    press(screen, 'home-settings');
    press(screen, 'settings-subtitles');
    pressBack();
    await run(500);
    press(screen, 'home-mysteries');
    press(screen, 'mystery-the-last-train');
    press(screen, 'details-select');
    press(screen, 'intro-begin');
    await run(50);
    press(screen, 'world-skip');
    await run(100);
    press(screen, 'world-object-obj-clock');
    await run(500);
    press(screen, 'world-examine');
    await run(100);
    expect(screen.getByTestId('world-dialogue')).toBeTruthy();
    expect(screen.queryByText(/Eleven fifty-nine/)).toBeNull();
    expect(String(screen.getByTestId('world-dialogue-next').props.accessibilityLabel)).toContain('Eleven fifty-nine');
  }, 30_000);
});
