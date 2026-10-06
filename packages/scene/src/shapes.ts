/**
 * Shape geometry shared by renderers and tests. Pure.
 *
 * Renderers rotate a box about its own centre. A shape with a `pivot` (a clock
 * hand about the clock's centre) is drawn inside a square frame centred on the
 * pivot; rotating that frame rotates the shape about the pivot.
 */
import type {PlaceholderShape} from '@roomriddle/shared-types';

export interface PivotFrame {
  /** The frame, in the asset's box. Its centre is the pivot. */
  frame: {x: number; y: number; size: number};
  /** The shape's box inside the frame. */
  inner: {x: number; y: number; w: number; h: number};
}

/** The rotation frame for a pivoted shape, or null when the shape rotates about its own centre. */
export function pivotFrame(s: PlaceholderShape): PivotFrame | null {
  if (!s.pivot) return null;
  const {x: px, y: py} = s.pivot;
  // Big enough to hold the shape at any angle.
  const half = Math.max(
    Math.hypot(s.x - px, s.y - py),
    Math.hypot(s.x + s.w - px, s.y - py),
    Math.hypot(s.x - px, s.y + s.h - py),
    Math.hypot(s.x + s.w - px, s.y + s.h - py),
  );
  const fx = px - half;
  const fy = py - half;
  return {frame: {x: fx, y: fy, size: half * 2}, inner: {x: s.x - fx, y: s.y - fy, w: s.w, h: s.h}};
}

/** Where a point of the shape ends up after its rotation (about its pivot or its centre). */
export function rotatedPoint(s: PlaceholderShape, p: {x: number; y: number}): {x: number; y: number} {
  const o = s.pivot ?? {x: s.x + s.w / 2, y: s.y + s.h / 2};
  const a = ((s.rotate ?? 0) * Math.PI) / 180;
  const dx = p.x - o.x;
  const dy = p.y - o.y;
  return {x: o.x + dx * Math.cos(a) - dy * Math.sin(a), y: o.y + dx * Math.sin(a) + dy * Math.cos(a)};
}

/** Scales a shape (and its pivot) into a resized box. */
export function scaleShape(s: PlaceholderShape, sx: number, sy: number): PlaceholderShape {
  if (sx === 1 && sy === 1) return s;
  return {
    ...s,
    x: s.x * sx,
    y: s.y * sy,
    w: s.w * sx,
    h: s.h * sy,
    radius: s.radius !== undefined ? s.radius * Math.min(sx, sy) : undefined,
    textSize: s.textSize !== undefined ? s.textSize * Math.min(sx, sy) : undefined,
    pivot: s.pivot ? {x: s.pivot.x * sx, y: s.pivot.y * sy} : undefined,
  };
}
