/**
 * Dumps The Last Train's world (sets, placed nodes, manifest) as JSON for the
 * offline preview renderer (apps/tv/scripts/art/preview.py).
 * Usage: npx tsx apps/server/scripts/dump-world.ts > world.json
 */
import {lastTrainWorld} from '@roomriddle/mystery-data';
import {AssetRegistry, placeSet} from '@roomriddle/scene';

const registry = new AssetRegistry([lastTrainWorld.manifest]);
const out = {
  basePath: lastTrainWorld.manifest.basePath,
  train: lastTrainWorld.train,
  assets: Object.fromEntries(lastTrainWorld.manifest.assets.map(a => [a.id, {size: a.size, depth: a.depth, layer: a.layer, source: a.status === 'final' ? a.source : null, light: a.light ?? null, overlay: a.overlay ?? []}])),
  sets: lastTrainWorld.scenes.flatMap(s => s.sets).map(set => ({
    id: set.id,
    camera: set.camera,
    train: set.train ?? null,
    objects: set.objects,
    nodes: [...placeSet(set, registry).values()],
  })),
};
process.stdout.write(JSON.stringify(out));
