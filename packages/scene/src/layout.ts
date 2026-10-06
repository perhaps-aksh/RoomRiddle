/**
 * Scene composition: turns a set's nodes into concrete, drawable boxes using
 * the asset manifest's defaults (layer, depth, size). Pure.
 */
import type {InteractiveObject, LayerId, WorldNode, WorldSet} from '@roomriddle/shared-types';
import type {AssetRegistry} from './assets';

export interface PlacedNode {
  id: string;
  assetId: string;
  layer: LayerId;
  depth: number;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
  visible: boolean;
  opacity: number;
}

export function placeNode(node: WorldNode, registry: AssetRegistry): PlacedNode {
  const asset = registry.get(node.assetId);
  return {
    id: node.id,
    assetId: node.assetId,
    layer: node.layer ?? asset?.layer ?? 'midground',
    depth: node.depth ?? asset?.depth ?? 0.5,
    x: node.x,
    y: node.y,
    width: node.width ?? asset?.size.width ?? 100,
    height: node.height ?? asset?.size.height ?? 100,
    z: node.z ?? 0,
    visible: node.visible ?? true,
    opacity: node.opacity ?? 1,
  };
}

export function placeSet(set: WorldSet, registry: AssetRegistry): Map<string, PlacedNode> {
  return new Map(set.nodes.map(n => [n.id, placeNode(n, registry)]));
}

/** Interaction bounds of an object, in its layer's space. */
export function objectBounds(obj: InteractiveObject, node: PlacedNode): {x: number; y: number; width: number; height: number} {
  return obj.bounds ?? {x: node.x, y: node.y, width: node.width, height: node.height};
}

export function centerOf(box: {x: number; y: number; width: number; height: number}): {x: number; y: number} {
  return {x: box.x + box.width / 2, y: box.y + box.height / 2};
}

/** Every asset id a set needs (for preloading). */
export function assetsForSet(set: WorldSet, extra: readonly string[] = []): string[] {
  return [...new Set([...set.nodes.map(n => n.assetId), ...extra])];
}

type Box = {x: number; y: number; width: number; height: number};

const overlaps = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/**
 * Where a focused object's name tag goes, in screen space. Above by default;
 * below when the space above is under the header (`topLimit`) or would cover
 * another object (the notice's tag hid the clock it hangs under). If both
 * sides collide, the side that covers less wins.
 */
export function tagSide(object: Box, others: readonly Box[], tag: {width: number; height: number; gap: number}, topLimit: number): 'above' | 'below' {
  const cx = object.x + object.width / 2;
  const at = (y: number): Box => ({x: cx - tag.width / 2, y, width: tag.width, height: tag.height});
  const above = at(object.y - tag.gap - tag.height);
  const below = at(object.y + object.height + tag.gap);
  const covered = (t: Box) => others.reduce((sum, o) => (overlaps(t, o) ? sum + 1 : sum), 0);
  const aboveBad = (above.y < topLimit ? 10 : 0) + covered(above);
  const belowBad = covered(below);
  return aboveBad === 0 || aboveBad <= belowBad ? 'above' : 'below';
}

export type FocusDirection = 'up' | 'down' | 'left' | 'right';

/**
 * Remote-control neighbours of on-screen objects: for each object and each
 * direction, the object a press should move to (or none). Objects live on
 * camera-transformed planes, which the native focus engine doesn't see, so
 * the world wires these explicitly instead of trusting spatial search.
 *
 * A candidate must lie in that direction (its centre past our edge on that
 * side). Score = main-axis distance + 2 × cross-axis offset, so a press goes
 * to what is roughly in line rather than merely nearest.
 */
export function focusNeighbors(boxes: ReadonlyMap<string, Box>): Map<string, Partial<Record<FocusDirection, string>>> {
  const centres = [...boxes].map(([id, b]) => ({id, x: b.x + b.width / 2, y: b.y + b.height / 2, b}));
  const out = new Map<string, Partial<Record<FocusDirection, string>>>();
  for (const a of centres) {
    const next: Partial<Record<FocusDirection, string>> = {};
    for (const dir of ['up', 'down', 'left', 'right'] as const) {
      let best: {id: string; score: number} | undefined;
      for (const b of centres) {
        if (b.id === a.id) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const main = dir === 'up' ? -dy : dir === 'down' ? dy : dir === 'left' ? -dx : dx;
        const cross = dir === 'up' || dir === 'down' ? Math.abs(dx) : Math.abs(dy);
        // Its centre must lie past our edge on that side: neighbours on the same row aren't "below".
        const beyond =
          dir === 'up' ? b.y < a.b.y : dir === 'down' ? b.y > a.b.y + a.b.height : dir === 'left' ? b.x < a.b.x : b.x > a.b.x + a.b.width;
        if (main <= 0 || !beyond) continue;
        const score = main + 2 * cross;
        if (!best || score < best.score) best = {id: b.id, score};
      }
      if (best) next[dir] = best.id;
    }
    out.set(a.id, next);
  }
  return out;
}

