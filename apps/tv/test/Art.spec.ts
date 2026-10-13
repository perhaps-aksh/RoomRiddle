/**
 * Final art wiring: every manifest entry marked final has a bundled file,
 * and every bundled file belongs to a final entry. A typo here would show a
 * placeholder (or nothing) on the TV without any error.
 */
import {lastTrainWorld} from '@roomriddle/mystery-data';
import {validateManifest} from '@roomriddle/scene';
import {getMysteryDefinition} from '@roomriddle/mystery-data';
import {bundledArt, closeupFor, portraitFor} from '../src/world/art';

describe('final art', () => {
  const finals = lastTrainWorld.manifest.assets.filter(a => a.status === 'final');

  it('The Last Train has painted art for its sets, objects and detective', () => {
    expect(finals.length).toBeGreaterThanOrEqual(28);
  });

  it('every final asset has a bundled file and every bundled file is used', () => {
    expect(finals.map(a => a.id).sort()).toEqual(Object.keys(bundledArt).sort());
  });

  it('the manifest stays valid with art and overlays', () => {
    expect(validateManifest(lastTrainWorld.manifest)).toEqual([]);
  });

  it('every clue object in the world has a painted close-up, and every character a portrait', () => {
    const mystery = getMysteryDefinition('the-last-train')!;
    const clueIds = lastTrainWorld.scenes.flatMap(s => s.sets.flatMap(set => set.objects.map(o => o.clueId))).filter((id): id is string => id !== undefined);
    expect(clueIds.length).toBe(12);
    for (const id of clueIds) {
      expect(closeupFor(id)).toBeDefined();
    }
    for (const c of mystery.truth!.characters) {
      expect(portraitFor(c.id, false)).toBeDefined();
      expect(portraitFor(c.id, true)).toBeDefined();
    }
  });

  it('clue clocks keep procedural hands over the painted dials', () => {
    for (const id of ['last-train.clock', 'last-train.waiting-room-clock', 'last-train.pocket-watch']) {
      const roles = (lastTrainWorld.manifest.assets.find(a => a.id === id)?.overlay ?? []).map(s => s.role);
      expect(roles).toEqual(expect.arrayContaining(['hand-hour', 'hand-minute']));
    }
  });
});
