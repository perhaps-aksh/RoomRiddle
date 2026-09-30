import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyAction, createInitialGameState} from '@roomriddle/game-engine';
import {getMysteryWorld, lastTrainWorld, theLastTrainMystery} from '@roomriddle/mystery-data';
import type {AssetManifest, GameAction, GameState, SceneWorld} from '@roomriddle/shared-types';
import {
  actionFor,
  AssetLoader,
  AssetRegistry,
  accepts,
  CameraController,
  canTransition,
  dialogueFor,
  diffEvents,
  doorsOpen,
  ease,
  focusShot,
  frameShot,
  layerTransform,
  objectViews,
  placeSet,
  projectPoint,
  SceneDirector,
  shakeOffset,
  steaming,
  trainX,
  validateManifest,
  validateWorld,
  VIEW_CENTER,
} from './index';

const mystery = theLastTrainMystery;
const world = lastTrainWorld;

// ── Assets ─────────────────────────────────────────────────────────────

const tinyManifest = (over: Partial<AssetManifest['assets'][number]>[] = []): AssetManifest => ({
  mysteryId: 'm',
  idPrefix: 'm.',
  basePath: 'art/m',
  assets: [
    {id: 'm.a', type: 'object', group: 'object', layer: 'midground', depth: 0.5, format: 'procedural', size: {width: 10, height: 10}, animation: 'none', status: 'placeholder', description: 'a', placeholder: [{x: 0, y: 0, w: 10, h: 10, color: 'iron'}]},
    {id: 'm.b', type: 'object', group: 'object', layer: 'midground', depth: 0.5, format: 'webp', size: {width: 10, height: 10}, animation: 'none', status: 'final', source: 'b.webp', fallback: 'm.a', description: 'b'},
    ...over.map((o, i) => ({id: `m.x${i}`, type: 'object' as const, group: 'object' as const, layer: 'midground' as const, depth: 0.5, format: 'procedural' as const, size: {width: 10, height: 10}, animation: 'none' as const, status: 'placeholder' as const, description: 'x', ...o})),
  ],
});

test('assets: placeholders draw procedurally; final art is used once loaded; failures fall back', async () => {
  const reg = new AssetRegistry([tinyManifest()]);
  assert.equal(reg.resolve('m.a').kind, 'placeholder');
  assert.equal(reg.uriOf('m.b'), 'art/m/b.webp');

  let fail = false;
  const fetched: string[] = [];
  const loader = new AssetLoader(reg, async uri => {
    fetched.push(uri);
    if (fail) throw new Error('404');
  });
  // Not loaded yet → the fallback's placeholder.
  const before = reg.resolve('m.b', loader.isLoaded);
  assert.equal(before.kind, 'placeholder');
  assert.equal(before.kind === 'placeholder' && before.asset.id, 'm.a');

  const progress: string[] = [];
  const res = await loader.preload(['m.b'], (d, t) => progress.push(`${d}/${t}`));
  assert.deepEqual(res.failed, []);
  assert.deepEqual(progress, ['0/2', '1/2', '2/2'], 'the fallback is preloaded too');
  const after = reg.resolve('m.b', loader.isLoaded);
  assert.equal(after.kind, 'image');

  // Cached: a second preload fetches nothing.
  await loader.preload(['m.b']);
  assert.equal(fetched.length, 1);

  // Ref-counted unload: held twice, released twice.
  assert.deepEqual(loader.unload(['m.b']), []);
  assert.deepEqual(loader.unload(['m.b']).sort(), ['m.a', 'm.b']);
  assert.equal(loader.statusOf('m.b'), 'idle');

  fail = true;
  const failed = await loader.preload(['m.b']);
  assert.deepEqual(failed.failed, ['m.b']);
  assert.equal(reg.resolve('m.b', loader.isLoaded).kind, 'placeholder', 'a broken file never blanks the scene');
  assert.equal(reg.resolve('m.nope').kind, 'missing');
});

test('assets: swapping a placeholder for final art is a manifest-only change', () => {
  const m = structuredClone(world.manifest);
  const train = m.assets.find(a => a.id === 'last-train.train')!;
  Object.assign(train, {status: 'final', format: 'webp', source: 'train.webp'});
  assert.deepEqual(validateManifest(m), []);
  const reg = new AssetRegistry([m]);
  const r = reg.resolve('last-train.train');
  assert.equal(r.kind, 'image');
  assert.equal(r.kind === 'image' && r.uri, 'mysteries/the-last-train/train.webp');
  // The world still validates: nothing referenced the art itself.
  assert.deepEqual(validateWorld({...world, manifest: m}, mystery), []);
});

test('assets: the manifest rejects broken entries', () => {
  const errors = validateManifest(tinyManifest([{status: 'final'}, {placeholder: [{x: 0, y: 0, w: 99, h: 5, color: 'iron'}]}, {fallback: 'm.zzz', placeholder: []}]));
  assert.ok(errors.some(e => e.includes('final assets need a source')));
  assert.ok(errors.some(e => e.includes('outside')));
  assert.ok(errors.some(e => e.includes('fallback m.zzz')));
});

// ── Camera + parallax ──────────────────────────────────────────────────

test('parallax: one camera, movement scales with depth', () => {
  const shot = {x: 100, y: 20, zoom: 1.5};
  assert.deepEqual(layerTransform(shot, 0), {translateX: -0, translateY: -0, scale: 1});
  const mid = layerTransform(shot, 0.5);
  const near = layerTransform(shot, 1);
  assert.equal(mid.translateX, -50);
  assert.equal(near.translateX, -100);
  assert.equal(mid.scale, 1.25);
  assert.equal(near.scale, 1.5);
  // Near layers move more than far ones for the same camera move.
  const far = projectPoint({x: 500, y: 500}, 0.1, shot);
  const fore = projectPoint({x: 500, y: 500}, 0.9, shot);
  const home = {x: 500, y: 500};
  assert.ok(Math.abs(fore.x - home.x) > Math.abs(far.x - home.x));
});

test('camera: focus centres a point of any plane', () => {
  for (const depth of [0.3, 0.6, 1]) {
    const target = {x: 320, y: 300};
    const shot = focusShot(target, depth, 1.8);
    const p = projectPoint(target, depth, shot);
    assert.ok(Math.abs(p.x - VIEW_CENTER.x) < 1e-6 && Math.abs(p.y - VIEW_CENTER.y) < 1e-6, `depth ${depth}`);
  }
});

test('camera: frameShot parks a point anywhere on screen', () => {
  const target = {x: 320, y: 300};
  const shot = frameShot(target, 0.3, 1.9, {x: 600, y: 520});
  const p = projectPoint(target, 0.3, shot);
  assert.ok(Math.abs(p.x - 600) < 1e-6 && Math.abs(p.y - 520) < 1e-6);
});

test('camera: moves ease, interrupt smoothly, follow and shake settle', () => {
  assert.ok(Math.abs(ease('linear', 0.25) - 0.25) < 1e-4);
  assert.ok(ease('cinematic', 0.5) > 0.8, 'cinematic front-loads motion');
  const cam = new CameraController();
  cam.moveTo({x: 400, y: 0, zoom: 2}, 1000, 'linear', 0);
  const half = cam.sample(500);
  assert.ok(Math.abs(half.x - 200) < 1 && Math.abs(half.zoom - 1.5) < 0.01);
  cam.moveTo({x: 0, y: 0, zoom: 1}, 1000, 'linear', 500); // interrupt mid-move
  assert.ok(Math.abs(cam.sample(500).x - 200) < 1, 'no jump when interrupted');
  assert.deepEqual(cam.sample(1500), {x: 0, y: 0, zoom: 1});

  let tx = 960;
  cam.startFollow(() => ({x: tx, y: 540}), 0.5, 2000, 0);
  tx = 1460;
  assert.equal(cam.sample(2100).x, 1000, 'follow tracks the target (500 px at depth .5 = 1000 camera px)');
  cam.release(2200);
  assert.equal(cam.isMoving, false);

  assert.deepEqual(shakeOffset(500, 400, 10), {x: 0, y: 0});
  assert.notEqual(shakeOffset(30, 400, 10).x, 0);
  cam.startShake(10, 300, 3000);
  assert.notDeepEqual(cam.sample(3020), cam.sample(3020, false));
  assert.deepEqual(cam.sample(3400), cam.sample(3400, false));
});

// ── Modes ──────────────────────────────────────────────────────────────

test('modes: cinematic/transition lock the players out; investigation lets them act', () => {
  assert.equal(accepts('cinematic', 'select'), false);
  assert.equal(accepts('cinematic', 'skip'), true);
  assert.equal(accepts('transition', 'back'), false);
  assert.equal(accepts('investigation', 'select'), true);
  assert.equal(accepts('investigation', 'direction'), true);
  assert.equal(accepts('inspection', 'direction'), false);
  assert.equal(accepts('dialogue', 'advance'), true);
  assert.equal(accepts('dialogue', 'select'), false);
});

// ── Train ──────────────────────────────────────────────────────────────

test('train: moves forward through its states and stops at the platform', () => {
  const def = world.train!;
  assert.equal(canTransition('far', 'approaching'), true);
  assert.equal(canTransition('stopped', 'arriving'), false, 'never reverses');
  assert.equal(canTransition('departing', 'far'), true);
  const m = {from: 'arriving' as const, to: 'stopped' as const, startedAt: 0};
  const start = trainX(def, m, 0);
  const mid = trainX(def, m, def.durations.stopped / 2);
  const end = trainX(def, m, def.durations.stopped);
  assert.equal(start, def.positions.arriving);
  assert.ok(mid > start && mid < end);
  assert.equal(end, def.positions.stopped);
  assert.equal(doorsOpen(def, {from: 'stopped', to: 'doors-opening', startedAt: 0}, def.durations['doors-opening'] / 2), 0.5);
  assert.equal(steaming('stopped'), true);
  assert.equal(steaming('far'), false);
});

// ── Director: the train arrival, end to end ────────────────────────────

function directorFor(sw: SceneWorld, now = 0) {
  const sets = new Map(sw.sets.map(s => [s.id, placeSet(s, new AssetRegistry([world.manifest]))]));
  const camera = new CameraController();
  const d = new SceneDirector({world: sw, camera, train: world.train, nodeOf: (set, node) => sets.get(set)?.get(node), now});
  return d;
}

test('director: the train arrival plays as data, pauses for dialogue, hands control to the players', () => {
  const sw = world.scenes.find(s => s.sceneId === 'station')!;
  const d = directorFor(sw);
  const fired: string[] = [];
  d.subscribe(evs => fired.push(...evs.map(e => e.type)));
  d.play('train-arrival', 0);
  assert.equal(d.state.mode, 'cinematic');
  assert.equal(d.state.interactionEnabled, false);
  assert.equal(d.state.setId, 'arrival');
  assert.equal(d.state.fade.to, 1, 'opens on black');

  d.update(600);
  assert.equal(d.state.caption?.text, '11:42 PM');
  d.update(1500);
  assert.equal(d.state.effects.rain, true);

  d.update(6000);
  assert.equal(d.state.train?.to, 'approaching');
  const x1 = d.trainCenter(6000)!.x;
  const x2 = d.trainCenter(8000)!.x;
  assert.ok(x2 > x1, 'the train visibly moves');

  d.update(9000);
  assert.equal(d.state.train?.to, 'arriving');
  assert.equal(d.trainCenter(8000)!.x, world.train!.positions.approaching + 1300, 'legs chain without a pause');
  const camA = d.camera.sample(9500, false).x;
  d.update(10500);
  const camB = d.camera.sample(10500, false).x;
  assert.ok(camB > camA, 'the camera follows the train');
  assert.equal(d.state.effects.steam, true);

  d.update(12000);
  assert.equal(d.state.train?.to, 'stopped');
  d.update(16000);
  assert.equal(d.state.train?.to, 'doors-opening');
  d.update(18300);
  assert.equal(d.state.setId, 'vestibule', 'camera push into the train');
  assert.equal(d.state.setChange?.transition, 'push');

  d.update(20050);
  assert.equal(d.state.mode, 'dialogue');
  assert.equal(d.state.characters.detective?.state, 'talk');
  assert.deepEqual(d.state.dialogue?.lineIds, ['arrival-1', 'arrival-2']);
  // The timeline waits while dialogue is open.
  const held = d.position;
  d.update(40000);
  assert.equal(d.position, held);
  assert.equal(d.state.setId, 'vestibule');

  assert.equal(d.advanceDialogue(40000), true);
  assert.equal(d.advanceDialogue(40100), false);
  d.update(43000);
  assert.equal(d.state.setId, 'platform', 'back out onto the platform');
  assert.equal(d.state.mode, 'investigation');
  assert.equal(d.state.interactionEnabled, true);
  assert.equal(d.playing, null);
  assert.ok(fired.includes('custom'), 'P7 audio hooks fire as custom events');
  assert.ok(d.state.customEvents.some(e => e.payload?.['cue'] === 'train-approach'));
});

test('director: a reaction interrupts investigation, then the detective leaves and control returns', () => {
  const sw = world.scenes.find(s => s.sceneId === 'station')!;
  const d = directorFor(sw);
  assert.equal(d.state.mode, 'investigation');
  d.setMode('inspection');
  d.say(['react-clock'], 'detective', 100, {nodeId: 'detective-spot', exitAfter: true});
  assert.equal(d.state.mode, 'dialogue');
  assert.equal(d.state.characters.detective?.state, 'react');
  assert.equal(d.state.characters.detective?.nodeId, 'detective-spot');
  assert.equal(d.advanceDialogue(200), false);
  assert.equal(d.state.mode, 'inspection', 'back to where the players were');
  assert.equal(d.state.characters.detective?.state, 'exit');
});

test('director: skipping lands in the same end state without dialogue', () => {
  const sw = world.scenes.find(s => s.sceneId === 'station')!;
  const d = directorFor(sw);
  d.play('train-arrival', 0);
  d.update(3000);
  d.skip(3000);
  assert.equal(d.state.setId, 'platform');
  assert.equal(d.state.mode, 'investigation');
  assert.equal(d.state.dialogue, null);
  assert.equal(d.state.train?.to, 'boarding');
  assert.equal(d.state.fade.to, 0);
  assert.equal(d.playing, null);
});

test('director: every scene entry timeline runs to player control', () => {
  for (const sw of world.scenes) {
    const d = directorFor(sw);
    d.play(sw.entryTimelineId!, 0);
    let t = 0;
    while (d.playing && t < 60000) {
      t += 100;
      d.update(t);
      if (d.state.dialogue) d.advanceDialogue(t);
    }
    assert.equal(d.playing, null, sw.sceneId);
    assert.equal(d.state.mode, 'investigation', sw.sceneId);
    assert.ok(sw.sets.some(s => s.id === d.state.setId && s.objects.length > 0), `${sw.sceneId} ends in an investigable set`);
  }
});

// ── Interactions ↔ the real engine ─────────────────────────────────────

/** Stamp a world action with a time (DISCOVER_CLUE carries `at`). */
function at(action: GameAction, time: number): GameAction {
  return {...action, at: time} as GameAction;
}

function started(): GameState {
  let s = createInitialGameState(mystery.summary.id);
  for (const a of [{type: 'START_MYSTERY', mysteryId: mystery.summary.id}, {type: 'ADVANCE_SCENE', at: 0}] as const) {
    s = applyAction(mystery, s, a).state;
  }
  return s;
}

test('interactions: the station clock is an engine clue; selecting it sends DISCOVER_CLUE and the engine unlocks the puzzle', () => {
  const sw = world.scenes.find(s => s.sceneId === 'station')!;
  const set = sw.sets.find(s => s.id === 'platform')!;
  let state = started();
  const clock = objectViews(set, mystery, state).find(v => v.object.id === 'obj-clock')!;
  assert.equal(clock.status, 'available');
  assert.equal(clock.prompt, 'Look up at the platform clock');
  const action = actionFor(clock)!;
  assert.deepEqual(action, {type: 'DISCOVER_CLUE', clueId: 'platform-clock'});

  let r = applyAction(mystery, state, at(action, 1000));
  state = r.state;
  assert.ok(r.events.some(e => e.type === 'clue-discovered'));
  assert.equal(objectViews(set, mystery, state).find(v => v.object.id === 'obj-clock')!.status, 'examined');
  assert.equal(actionFor(objectViews(set, mystery, state).find(v => v.object.id === 'obj-clock')!), null, 'nothing to resend');
  assert.deepEqual(dialogueFor(r.events, world.dialogue).map(l => l.id), ['react-clock']);

  const notice = objectViews(set, mystery, state).find(v => v.object.id === 'obj-notice')!;
  r = applyAction(mystery, state, at(actionFor(notice)!, 2000));
  assert.ok(r.events.some(e => e.type === 'puzzle-unlocked' && e.puzzleId === 'station-clock'), 'the ENGINE unlocks the puzzle');
  assert.deepEqual(dialogueFor(r.events, world.dialogue).map(l => l.id), ['react-notice', 'react-station-puzzle']);
  // Scenery never produces an engine action.
  const suitcase = objectViews(set, mystery, r.state).find(v => v.object.id === 'obj-suitcase')!;
  assert.equal(suitcase.status, 'scenery');
  assert.equal(actionFor(suitcase), null);
});

test('interactions: a state from the server (another player acted) produces the same reactions', () => {
  const before = started();
  const after = applyAction(mystery, applyAction(mystery, before, {type: 'DISCOVER_CLUE', clueId: 'platform-clock', at: 1}).state, {type: 'DISCOVER_CLUE', clueId: 'company-notice', at: 2}).state;
  const events = diffEvents(before, after);
  assert.deepEqual(
    events.map(e => e.type),
    ['clue-discovered', 'clue-discovered', 'puzzle-unlocked'],
  );
  assert.deepEqual(dialogueFor(events, world.dialogue, new Set(['react-clock'])).map(l => l.id), ['react-notice', 'react-station-puzzle'], 'lines already played are not repeated');
});

test('interactions: objects follow engine requirements (carriage brake needs nothing; unknown scene clues stay hidden)', () => {
  const sw = world.scenes.find(s => s.sceneId === 'carriage')!;
  const set = sw.sets.find(s => s.id === 'corridor')!;
  const views = objectViews(set, mystery, started()); // still in the station scene
  assert.ok(views.every(v => v.status === 'unavailable'), 'objects of another scene are not interactive');
});

// ── The Last Train world ───────────────────────────────────────────────

test('the Last Train world is complete and consistent with the mystery', () => {
  assert.deepEqual(validateWorld(world, mystery), []);
  assert.equal(getMysteryWorld('the-last-train'), world);
  // Every scene has a world, every clue an object.
  assert.deepEqual(world.scenes.map(s => s.sceneId).sort(), mystery.scenes.map(s => s.id).sort());
  const ids = new Set(world.manifest.assets.map(a => a.id));
  for (const id of ['last-train.station.background', 'last-train.train', 'last-train.detective', 'last-train.clock', 'last-train.ticket', 'last-train.ledger', 'last-train.rain', 'last-train.steam', 'last-train.fog', 'last-train.smoke', 'last-train.suitcase', 'last-train.newspaper', 'last-train.city', 'last-train.tracks', 'last-train.train.interior']) {
    assert.ok(ids.has(id), id);
  }
  // Placeholder-first: nothing claims to be final art yet.
  assert.ok(world.manifest.assets.every(a => a.status === 'placeholder'));
});

test('validateWorld catches broken references', () => {
  const broken = structuredClone(world);
  broken.scenes[0]!.sets[2]!.objects[0]!.clueId = 'torn-ticket';
  broken.scenes[0]!.timelines[0]!.events.push({at: 99999, type: 'dialogue', lineIds: ['nope']});
  const errors = validateWorld(broken, mystery);
  assert.ok(errors.some(e => e.includes('not a clue of this scene')));
  assert.ok(errors.some(e => e.includes('platform-clock has no object')));
  assert.ok(errors.some(e => e.includes('unknown dialogue line nope')));
});
