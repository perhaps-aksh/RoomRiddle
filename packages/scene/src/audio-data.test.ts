import {test} from 'node:test';
import assert from 'node:assert/strict';
import {audioManifests, coreAudioManifest, coreCueSounds, coreMusic, getMysteryAudio, lastTrainWorld} from '@roomriddle/mystery-data';
import {AudioRegistry, validateAudio} from './audio';

const lt = getMysteryAudio('the-last-train')!;

test('The Last Train audio is valid: ids, loops, files, and every reference exists', () => {
  const dialogueAudioIds = lastTrainWorld.dialogue.flatMap(l => (l.audioId ? [l.audioId] : []));
  const r = validateAudio(lt.manifest, lt.direction, {dialogueAudioIds, otherManifests: [coreAudioManifest]});
  assert.deepEqual(r.errors, []);
  const core = validateAudio(coreAudioManifest, {music: coreMusic, ambientBySet: {}, ambientByScene: {}, moments: {}});
  assert.deepEqual(core.errors, []);
});

test('every detective line has a voice, and every UI cue a sound', () => {
  const reg = new AudioRegistry(audioManifests);
  for (const line of lastTrainWorld.dialogue) {
    assert.ok(line.audioId && reg.playable(line.audioId), `${line.id} has a playable voice line`);
  }
  for (const [cue, id] of Object.entries(coreCueSounds)) {
    assert.ok(reg.playable(id), `cue ${cue} -> ${id}`);
  }
});

test('ambience covers every world set and scene; indoor sets hear muffled rain, never open rain', () => {
  for (const scene of lastTrainWorld.scenes) {
    assert.ok(lt.direction.ambientByScene[scene.sceneId], `scene ${scene.sceneId}`);
    for (const set of scene.sets) {
      const layers = lt.direction.ambientBySet[set.id];
      assert.ok(layers && layers.length > 0, `set ${set.id} has ambience`);
      const rains = set.effects.includes('rain');
      assert.equal(layers.includes('last-train.ambient.rain'), rains, `${set.id}: open rain iff it rains in the picture`);
    }
  }
});

test('every timeline audio cue and inspectable object has sound', () => {
  const cues = lastTrainWorld.scenes.flatMap(s => s.timelines.flatMap(t => t.events)).flatMap(e => (e.type === 'custom' && e.name === 'audio.cue' ? [String(e.payload?.cue)] : []));
  assert.ok(cues.length >= 7);
  for (const c of cues) {
    assert.ok(lt.direction.moments[`cue:${c}`], `cue ${c}`);
  }
  const objects = lastTrainWorld.scenes.flatMap(s => s.sets.flatMap(set => set.objects.map(o => o.id)));
  for (const id of objects) {
    assert.ok(lt.direction.moments[`inspect:${id}`], `object ${id}`);
  }
});

test('the arrival cinematic sounds in order: rain, approach, brake, stop, steam, doors (P7B brief)', () => {
  const arrival = lastTrainWorld.scenes[0]!.timelines.find(t => t.id === 'train-arrival')!;
  const order = arrival.events.flatMap(e => (e.type === 'custom' && e.name === 'audio.cue' ? [String(e.payload?.cue)] : []));
  assert.deepEqual(order, ['rain-start', 'train-approach', 'train-brake', 'train-stop', 'steam', 'doors-open']);
});
