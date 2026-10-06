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

