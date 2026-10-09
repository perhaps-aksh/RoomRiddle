import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {AudioDefinition, AudioDirection, AudioManifest} from '@roomriddle/shared-types';
import {AudioDirector, AudioRegistry, ambientFor, musicCommand, musicStateFor, validateAudio} from './audio';

const snd = (id: string, channel: AudioDefinition['channel'], extra: Partial<AudioDefinition> = {}): AudioDefinition => ({
  id,
  channel,
  loop: channel === 'music' || channel === 'ambient',
  status: 'placeholder',
  source: `${id}.mp3`,
  description: id,
  ...extra,
});

const manifest: AudioManifest = {
  idPrefix: 't.',
  basePath: 'audio/t',
  sounds: [
    snd('t.music.a', 'music'),
    snd('t.music.b', 'music'),
    snd('t.ambient.rain', 'ambient'),
    snd('t.ambient.wind', 'ambient', {volume: 0.5}),
    snd('t.ambient.hum', 'ambient'),
    snd('t.sfx.brake', 'sfx'),
    snd('t.vo.line', 'voice'),
    snd('t.vo.unrecorded', 'voice', {status: 'missing', source: undefined}),
  ],
};

/** Records what the director asked the renderer to do. */
function fakeBackend() {
  const live = new Map<number, {id: string; volume: number}>();
  const log: string[] = [];
  return {
    live,
    log,
    vol: (id: string) => [...live.values()].find(v => v.id === id)?.volume,
    backend: {
      play: (h: number, s: AudioDefinition, v: number) => {
        live.set(h, {id: s.id, volume: v});
        log.push(`play ${s.id}`);
      },
      setVolume: (h: number, v: number) => {
        const cur = live.get(h);
        if (cur) {
          cur.volume = v;
        }
      },
      stop: (h: number) => {
        log.push(`stop ${live.get(h)?.id}`);
        live.delete(h);
      },
    },
  };
}

const setup = () => {
  const fb = fakeBackend();
  const missing: string[] = [];
  const d = new AudioDirector(new AudioRegistry([manifest]), fb.backend, {fadeMs: 1000, duckTo: 0.5, onMissing: id => missing.push(id)});
  return {fb, d, missing};
};

test('music crossfades: A fades out while B fades in, then A stops', () => {
  const {fb, d} = setup();
  d.run({type: 'PLAY_MUSIC', id: 't.music.a', fadeMs: 0}, 0);
  assert.equal(fb.vol('t.music.a'), 1);
  d.run({type: 'PLAY_MUSIC', id: 't.music.b'}, 1000);
  d.tick(1500);
  assert.equal(fb.vol('t.music.a'), 0.5);
  assert.equal(fb.vol('t.music.b'), 0.5);
  assert.ok(d.fading);
  d.tick(2000);
  assert.equal(fb.vol('t.music.a'), undefined, 'A stopped after its fade');
  assert.equal(fb.vol('t.music.b'), 1);
  assert.equal(d.currentMusic, 't.music.b');
  assert.equal(d.fading, false);
});

test('asking for the music already playing does not restart it', () => {
  const {fb, d} = setup();
  d.run({type: 'PLAY_MUSIC', id: 't.music.a', fadeMs: 0}, 0);
  d.run({type: 'PLAY_MUSIC', id: 't.music.a'}, 10);
  assert.deepEqual(fb.log, ['play t.music.a']);
});

test('ambient layers are independent; PLAY_AMBIENT keeps shared layers and fades the rest', () => {
  const {fb, d} = setup();
  d.run({type: 'PLAY_AMBIENT', ids: ['t.ambient.rain', 't.ambient.wind'], fadeMs: 0}, 0);
  assert.equal(fb.vol('t.ambient.wind'), 0.5, 'per-sound mix level');
  d.run({type: 'PLAY_AMBIENT', ids: ['t.ambient.rain', 't.ambient.hum']}, 0);
  d.tick(1000);
  assert.deepEqual(d.ambientLayers.sort(), ['t.ambient.hum', 't.ambient.rain']);
  assert.equal(fb.log.filter(l => l === 'play t.ambient.rain').length, 1, 'rain kept, not restarted');
  assert.ok(fb.log.includes('stop t.ambient.wind'));
  d.run({type: 'AMBIENT_LAYER', id: 't.ambient.hum', on: false, fadeMs: 0}, 1000);
  assert.deepEqual(d.ambientLayers, ['t.ambient.rain']);
});

test('voice ducks the music and releases it when the line ends', () => {
  const {fb, d} = setup();
  d.run({type: 'PLAY_MUSIC', id: 't.music.a', fadeMs: 0}, 0);
  d.run({type: 'PLAY_VOICE', id: 't.vo.line'}, 0);
  assert.equal(fb.vol('t.music.a'), 0.5);
  const handle = [...fb.live.entries()].find(([, v]) => v.id === 't.vo.line')![0];
  d.ended(handle, 100);
  assert.equal(d.currentVoice, null);
  assert.equal(fb.vol('t.music.a'), 1);
});

test('a missing voice line is skipped quietly and reported once (text carries on)', () => {
  const {fb, d, missing} = setup();
  d.run({type: 'PLAY_VOICE', id: 't.vo.unrecorded'}, 0);
  d.run({type: 'PLAY_VOICE', id: 't.vo.unrecorded'}, 0);
  d.run({type: 'PLAY_SFX', id: 't.sfx.nope'}, 0);
  assert.deepEqual(fb.log, []);
  assert.deepEqual(missing, ['t.vo.unrecorded', 't.sfx.nope']);
});

test('settings: channel gains and mute apply to what is playing', () => {
  const {fb, d} = setup();
  d.run({type: 'PLAY_MUSIC', id: 't.music.a', fadeMs: 0}, 0);
  d.run({type: 'PLAY_AMBIENT', ids: ['t.ambient.rain'], fadeMs: 0}, 0);
  d.run({type: 'SET_VOLUME', gains: {music: 0.25, ambient: 0.5}}, 0);
  assert.equal(fb.vol('t.music.a'), 0.25);
  assert.equal(fb.vol('t.ambient.rain'), 0.5);
  d.run({type: 'MUTE', muted: true}, 0);
  assert.equal(fb.vol('t.music.a'), 0);
  d.run({type: 'MUTE', muted: false}, 0);
  assert.equal(fb.vol('t.music.a'), 0.25);
});

test('FADE_MUSIC lowers the bed smoothly', () => {
  const {fb, d} = setup();
  d.run({type: 'PLAY_MUSIC', id: 't.music.a', fadeMs: 0}, 0);
  d.run({type: 'FADE_MUSIC', to: 0.2, fadeMs: 1000}, 0);
  d.tick(500);
  assert.equal(fb.vol('t.music.a'), 0.6);
  d.tick(1000);
  assert.ok(Math.abs((fb.vol('t.music.a') ?? 0) - 0.2) < 1e-9);
});

test('effects are capped; the oldest is cut', () => {
  const {fb, d} = setup();
  for (let i = 0; i < 6; i++) {
    d.run({type: 'PLAY_SFX', id: 't.sfx.brake'}, 0);
  }
  assert.equal([...fb.live.values()].filter(v => v.id === 't.sfx.brake').length, 4);
});

test('music state follows the game', () => {
  const dir = {revealSceneIds: ['signal-box'], revealPuzzleIds: ['final'], tensionBelowMs: 120_000};
  assert.equal(musicStateFor({place: 'menu'}, dir), 'menu');
  assert.equal(musicStateFor({place: 'selection'}, dir), 'selection');
  assert.equal(musicStateFor({place: 'game', screen: 'scene', cinematic: true, sceneId: 'station'}, dir), 'cinematic');
  assert.equal(musicStateFor({place: 'game', screen: 'scene', sceneId: 'station', remainingMs: 600_000}, dir), 'investigation');
  assert.equal(musicStateFor({place: 'game', screen: 'scene', sceneId: 'station', remainingMs: 90_000}, dir), 'tension');
  assert.equal(musicStateFor({place: 'game', screen: 'puzzle', puzzleId: 'p1'}, dir), 'puzzle');
  assert.equal(musicStateFor({place: 'game', screen: 'puzzle', puzzleId: 'final'}, dir), 'reveal');
  assert.equal(musicStateFor({place: 'game', screen: 'scene', sceneId: 'signal-box'}, dir), 'reveal');
  assert.equal(musicStateFor({place: 'ending'}, dir), 'ending');
});

test('music command: mystery overrides shared; null is silence; unlisted leaves it alone', () => {
  const shared = {menu: 'core.music.menu', puzzle: 'core.music.puzzle'};
  assert.deepEqual(musicCommand('puzzle', {puzzle: 't.music.b'}, shared), {type: 'PLAY_MUSIC', id: 't.music.b'});
  assert.deepEqual(musicCommand('menu', {}, shared), {type: 'PLAY_MUSIC', id: 'core.music.menu'});
  assert.deepEqual(musicCommand('cinematic', {cinematic: null}, shared), {type: 'STOP_MUSIC'});
  assert.equal(musicCommand('reveal', {}, shared), null);
});

test('ambient: the set wins over the scene', () => {
  const dir: AudioDirection = {music: {}, ambientBySet: {platform: ['a']}, ambientByScene: {station: ['b']}, moments: {}};
  assert.deepEqual(ambientFor(dir, 'platform', 'station'), ['a']);
  assert.deepEqual(ambientFor(dir, 'other', 'station'), ['b']);
  assert.deepEqual(ambientFor(dir, null, 'nowhere'), []);
});

test('validateAudio catches bad ids, loops, unknown references and lists planned sounds', () => {
  const bad: AudioManifest = {
    idPrefix: 't.',
    basePath: 'x',
    sounds: [snd('t.music.a', 'music', {loop: false}), snd('x.sfx.b', 'sfx'), snd('t.sfx.c', 'sfx', {source: undefined}), snd('t.vo.d', 'voice', {status: 'missing', source: undefined})],
  };
  const dir: AudioDirection = {music: {menu: 't.music.zzz'}, ambientBySet: {}, ambientByScene: {}, moments: {'cue:x': [{type: 'PLAY_SFX', id: 't.sfx.c'}], bogus: []}};
  const r = validateAudio(bad, dir, {dialogueAudioIds: ['t.vo.d', 't.vo.nope']});
  assert.ok(r.errors.some(e => e.includes('t.music.a') && e.includes('must loop')));
  assert.ok(r.errors.some(e => e.includes('x.sfx.b') && e.includes('must start')));
  assert.ok(r.errors.some(e => e.includes('t.sfx.c') && e.includes('needs a source')));
  assert.ok(r.errors.some(e => e.includes('t.music.zzz')));
  assert.ok(r.errors.some(e => e.includes('bogus')));
  assert.ok(r.errors.some(e => e.includes('t.vo.nope')));
  assert.deepEqual(r.warnings, ['t.vo.d: no file yet (skipped at runtime)']);
});

test('a voice the platform rejects at once (no file) does not leave the music ducked', () => {
  const fb = fakeBackend();
  let d: AudioDirector | null = null;
  // This backend fails voice lines synchronously, like the TV backend does when a file can't be resolved.
  const backend = {
    ...fb.backend,
    play: (h: number, s: AudioDefinition, v: number) => {
      if (s.channel === 'voice') {
        d?.ended(h, 0);
        return;
      }
      fb.backend.play(h, s, v);
    },
  };
  d = new AudioDirector(new AudioRegistry([manifest]), backend, {fadeMs: 0, duckTo: 0.5});
  d.run({type: 'PLAY_MUSIC', id: 't.music.a', fadeMs: 0}, 0);
  d.run({type: 'PLAY_VOICE', id: 't.vo.line'}, 10);
  assert.equal(d.currentVoice, null);
  assert.equal(fb.vol('t.music.a'), 1, 'music at full level');
});

test('consecutive lines keep the music ducked; it comes back only after the last line', () => {
  const {fb, d} = setup();
  d.run({type: 'PLAY_MUSIC', id: 't.music.a', fadeMs: 0}, 0);
  d.run({type: 'PLAY_VOICE', id: 't.vo.line'}, 10);
  const first = [...fb.live.entries()].find(([, v]) => v.id === 't.vo.line')![0];
  assert.equal(fb.vol('t.music.a'), 0.5);
  // The next line replaces the first before it ends: still ducked, no gap.
  d.run({type: 'PLAY_VOICE', id: 't.vo.line'}, 20);
  assert.equal(fb.vol('t.music.a'), 0.5);
  assert.ok(!fb.live.has(first), 'first line stopped');
  // A late "ended" from the replaced line must not un-duck the current one.
  d.ended(first, 30);
  assert.equal(fb.vol('t.music.a'), 0.5);
  const second = [...fb.live.entries()].find(([, v]) => v.id === 't.vo.line')![0];
  d.ended(second, 40);
  assert.equal(fb.vol('t.music.a'), 1);
});

test('stopAll during a line clears the voice and the duck', () => {
  const {fb, d} = setup();
  d.run({type: 'PLAY_MUSIC', id: 't.music.a', fadeMs: 0}, 0);
  d.run({type: 'PLAY_VOICE', id: 't.vo.line'}, 10);
  d.stopAll();
  assert.equal(fb.live.size, 0);
  assert.equal(d.currentVoice, null);
  d.run({type: 'PLAY_MUSIC', id: 't.music.a', fadeMs: 0}, 20);
  assert.equal(fb.vol('t.music.a'), 1, 'fresh music is not ducked');
});
