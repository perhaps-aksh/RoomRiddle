/**
 * Cross-checks a MysteryWorld against its MysteryDefinition and manifest, so
 * broken references fail in tests, not on the TV: every node's asset exists,
 * every object's node exists, every clue an object reveals belongs to that
 * scene, every clue of a scene has an object somewhere in its world, every
 * timeline reference resolves, every dialogue trigger points at real content.
 */
import type {MysteryDefinition, MysteryWorld} from '@roomriddle/shared-types';
import {validateManifest} from './assets';

/** Share of an interactive object's box its art must span on each axis. */
const MIN_FILL = 0.8;

export function validateWorld(world: MysteryWorld, mystery: MysteryDefinition): string[] {
  const errors = [...validateManifest(world.manifest)];
  const assets = new Set(world.manifest.assets.map(a => a.id));
  const lineIds = new Set(world.dialogue.map(l => l.id));
  const characters = new Set(world.characters.map(c => c.id));
  const clueIds = new Set(mystery.clues.map(c => c.id));
  const puzzleIds = new Set(mystery.puzzles.map(p => p.id));
  const sceneIds = new Set(mystery.scenes.map(s => s.id));

  if (world.mysteryId !== mystery.summary.id || world.manifest.mysteryId !== mystery.summary.id) {
    errors.push(`world is for ${world.mysteryId}, mystery is ${mystery.summary.id}`);
  }
  if (world.train) {
    for (const id of [world.train.assetId, ...Object.values(world.train.parts)]) {
      if (!assets.has(id)) {
        errors.push(`train uses missing asset ${id}`);
      }
    }
  }
  for (const c of world.characters) {
    if (!assets.has(c.assetId)) {
      errors.push(`character ${c.id} uses missing asset ${c.assetId}`);
    }
  }
  for (const l of world.dialogue) {
    if (!characters.has(l.characterId)) {
      errors.push(`dialogue ${l.id}: unknown character ${l.characterId}`);
    }
    const t = l.trigger;
    if (t.type === 'clue-discovered' && !clueIds.has(t.clueId)) {
      errors.push(`dialogue ${l.id}: unknown clue ${t.clueId}`);
    }
    if ((t.type === 'puzzle-unlocked' || t.type === 'puzzle-solved') && !puzzleIds.has(t.puzzleId)) {
      errors.push(`dialogue ${l.id}: unknown puzzle ${t.puzzleId}`);
    }
    if (t.type === 'scene-entered' && !sceneIds.has(t.sceneId)) {
      errors.push(`dialogue ${l.id}: unknown scene ${t.sceneId}`);
    }
  }

  for (const sw of world.scenes) {
    const scene = mystery.scenes.find(s => s.id === sw.sceneId);
    if (!scene) {
      errors.push(`world scene ${sw.sceneId} has no engine scene`);
      continue;
    }
    const setIds = new Set(sw.sets.map(s => s.id));
    if (!setIds.has(sw.initialSetId)) {
      errors.push(`${sw.sceneId}: initial set ${sw.initialSetId} missing`);
    }
    const covered = new Set<string>();
    const nodesBySet = new Map(sw.sets.map(s => [s.id, new Set(s.nodes.map(n => n.id))]));
    for (const set of sw.sets) {
      const nodeIds = nodesBySet.get(set.id)!;
      for (const n of set.nodes) {
        if (!assets.has(n.assetId)) {
          errors.push(`${sw.sceneId}/${set.id}: node ${n.id} uses missing asset ${n.assetId}`);
        }
      }
      const objIds = new Set<string>();
      for (const o of set.objects) {
        if (objIds.has(o.id)) {
          errors.push(`${sw.sceneId}/${set.id}: duplicate object ${o.id}`);
        }
        objIds.add(o.id);
        if (!nodeIds.has(o.nodeId)) {
          errors.push(`${sw.sceneId}/${set.id}: object ${o.id} uses missing node ${o.nodeId}`);
        }
        // Focus frame, camera target and inspection all use the object's box:
        // its placeholder art must actually fill that box, or focus floats beside the drawing.
        const node = set.nodes.find(n => n.id === o.nodeId);
        const art = node && !o.bounds ? world.manifest.assets.find(a => a.id === node.assetId) : undefined;
        if (art?.placeholder && art.placeholder.length > 0) {
          const ink = art.placeholder.filter(s => (s.opacity ?? 1) > 0.3);
          const w = Math.max(...ink.map(s => s.x + s.w)) - Math.min(...ink.map(s => s.x));
          const h = Math.max(...ink.map(s => s.y + s.h)) - Math.min(...ink.map(s => s.y));
          if (w < art.size.width * MIN_FILL || h < art.size.height * MIN_FILL) {
            errors.push(`${sw.sceneId}/${set.id}: object ${o.id}'s art fills only ${Math.round((100 * w) / art.size.width)}%×${Math.round((100 * h) / art.size.height)}% of its box`);
          }
        }
        if (o.clueId !== undefined) {
          if (!scene.clueIds.includes(o.clueId)) {
            errors.push(`${sw.sceneId}/${set.id}: object ${o.id} reveals ${o.clueId}, which is not a clue of this scene`);
          }
          covered.add(o.clueId);
        } else if (!o.flavor || o.flavor.length === 0) {
          errors.push(`${sw.sceneId}/${set.id}: scenery object ${o.id} needs flavour text`);
        }
      }
    }
    for (const id of scene.clueIds) {
      if (!covered.has(id)) {
        errors.push(`${sw.sceneId}: clue ${id} has no object in the world`);
      }
    }
    const tlIds = new Set(sw.timelines.map(t => t.id));
    if (sw.entryTimelineId !== undefined && !tlIds.has(sw.entryTimelineId)) {
      errors.push(`${sw.sceneId}: entry timeline ${sw.entryTimelineId} missing`);
    }
    for (const tl of sw.timelines) {
      let setId = sw.initialSetId;
      let last = -1;
      for (const ev of [...tl.events].sort((a, b) => a.at - b.at)) {
        if (ev.at < last) {
          errors.push(`${tl.id}: events out of order`);
        }
        last = ev.at;
        if (ev.type === 'set') {
          if (!setIds.has(ev.setId)) {
            errors.push(`${tl.id}: unknown set ${ev.setId}`);
          } else {
            setId = ev.setId;
          }
        }
        if ((ev.type === 'camera.focus' || ev.type === 'node.visible') && !nodesBySet.get(setId)?.has(ev.nodeId)) {
          errors.push(`${tl.id} @${ev.at}: node ${ev.nodeId} is not in set ${setId}`);
        }
        if (ev.type === 'dialogue') {
          for (const id of ev.lineIds) {
            if (!lineIds.has(id)) {
              errors.push(`${tl.id}: unknown dialogue line ${id}`);
            }
          }
        }
        if (ev.type === 'character' && !characters.has(ev.characterId)) {
          errors.push(`${tl.id}: unknown character ${ev.characterId}`);
        }
        if (ev.type === 'character' && ev.nodeId !== undefined && !nodesBySet.get(setId)?.has(ev.nodeId)) {
          errors.push(`${tl.id} @${ev.at}: character node ${ev.nodeId} is not in set ${setId}`);
        }
      }
    }
  }
  return errors;
}
