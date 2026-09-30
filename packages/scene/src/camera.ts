/**
 * 2.5D camera + parallax.
 *
 * One camera, many planes. The camera is a shot {x, y, zoom} measured at
 * depth 1. Every layer is transformed by the same rule:
 *
 *   translate = −camera × depth
 *   scale     = 1 + (zoom − 1) × depth
 *
 * so the foreground (depth ≈ 1) moves and grows the most, the sky (≈ 0)
 * barely moves. No layer is ever animated on its own: animate the camera
 * and parallax falls out of the maths. The TV feeds the same numbers to the
 * native animation driver.
 */
import type {CameraEasing, CameraShot} from '@roomriddle/shared-types';

export const VIEW = {width: 1920, height: 1080} as const;
export const VIEW_CENTER = {x: VIEW.width / 2, y: VIEW.height / 2} as const;
export const HOME_SHOT: CameraShot = {x: 0, y: 0, zoom: 1};

/** Same curves as @roomriddle/ui motion easings. */
export const CAMERA_EASINGS: Record<CameraEasing, readonly [number, number, number, number]> = {
  linear: [0, 0, 1, 1],
  standard: [0.2, 0, 0, 1],
  enter: [0, 0, 0.2, 1],
  exit: [0.4, 0, 1, 1],
  cinematic: [0.16, 1, 0.3, 1],
};

export interface LayerTransform {
  translateX: number;
  translateY: number;
  scale: number;
}

/** The transform one depth plane gets for a camera shot. Scale pivots on the screen centre. */
export function layerTransform(shot: CameraShot, depth: number): LayerTransform {
  return {
    translateX: -shot.x * depth,
    translateY: -shot.y * depth,
    scale: 1 + (shot.zoom - 1) * depth,
  };
}

/** Where a point of a depth plane lands on screen for a shot. */
export function projectPoint(p: {x: number; y: number}, depth: number, shot: CameraShot): {x: number; y: number} {
  const t = layerTransform(shot, depth);
  return {
    x: VIEW_CENTER.x + t.scale * (p.x - VIEW_CENTER.x + t.translateX),
    y: VIEW_CENTER.y + t.scale * (p.y - VIEW_CENTER.y + t.translateY),
  };
}

/** Screen-space box of a node box on a depth plane. */
export function projectBox(
  box: {x: number; y: number; width: number; height: number},
  depth: number,
  shot: CameraShot,
): {x: number; y: number; width: number; height: number} {
  const a = projectPoint(box, depth, shot);
  const s = layerTransform(shot, depth).scale;
  return {x: a.x, y: a.y, width: box.width * s, height: box.height * s};
}

/**
 * The shot that puts `point` (on a plane at `depth`) at the centre of the
 * screen, at `zoom`. Depth-0 planes can't be reached by moving the camera,
 * so very far planes are treated as depth 0.05.
 */
export function focusShot(point: {x: number; y: number}, depth: number, zoom = 1.35): CameraShot {
  const d = Math.max(depth, 0.05);
  return {x: (point.x - VIEW_CENTER.x) / d, y: (point.y - VIEW_CENTER.y) / d, zoom};
}

/**
 * The shot that puts `point` (on a plane at `depth`) at `screen` (default:
 * the centre) at `zoom`. Used by inspection to park an object beside the
 * information panel.
 */
export function frameShot(point: {x: number; y: number}, depth: number, zoom: number, screen: {x: number; y: number} = VIEW_CENTER): CameraShot {
  const d = Math.max(depth, 0.05);
  const s = 1 + (zoom - 1) * d;
  return {
    x: (point.x - VIEW_CENTER.x - (screen.x - VIEW_CENTER.x) / s) / d,
    y: (point.y - VIEW_CENTER.y - (screen.y - VIEW_CENTER.y) / s) / d,
    zoom,
  };
}

/** Cubic-bezier easing, solved for x with Newton + bisection (same curve as CSS / RN Easing.bezier). */
export function ease(name: CameraEasing, t: number): number {
  const [x1, y1, x2, y2] = CAMERA_EASINGS[name];
  if (t <= 0) {
    return 0;
  }
  if (t >= 1) {
    return 1;
  }
  const bez = (a: number, b: number, u: number) => 3 * a * u * (1 - u) ** 2 + 3 * b * u ** 2 * (1 - u) + u ** 3;
  let lo = 0;
  let hi = 1;
  let u = t;
  for (let i = 0; i < 20; i++) {
    const x = bez(x1, x2, u);
    if (Math.abs(x - t) < 1e-5) {
      break;
    }
    if (x < t) {
      lo = u;
    } else {
      hi = u;
    }
    u = (lo + hi) / 2;
  }
  return bez(y1, y2, u);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpShot(a: CameraShot, b: CameraShot, t: number): CameraShot {
  return {x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), zoom: lerp(a.zoom, b.zoom, t)};
}

/**
 * Deterministic, decaying shake offset (design px). Two incommensurate
 * sines, so it reads as a jolt rather than a wobble. Zero after `duration`.
 */
export function shakeOffset(elapsed: number, duration: number, intensity: number): {x: number; y: number} {
  if (elapsed < 0 || elapsed >= duration || duration <= 0) {
    return {x: 0, y: 0};
  }
  const decay = 1 - elapsed / duration;
  const s = elapsed / 1000;
  return {
    x: intensity * decay * Math.sin(s * 2 * Math.PI * 13),
    y: intensity * decay * 0.6 * Math.sin(s * 2 * Math.PI * 17 + 1.3),
  };
}

interface CameraMove {
  from: CameraShot;
  to: CameraShot;
  start: number;
  duration: number;
  easing: CameraEasing;
}

/**
 * Time-driven camera state. `sample(now)` is the single source of where the
 * camera is. Moves interrupt smoothly (a new move starts from wherever the
 * camera is at that moment). Follow keeps the camera locked on a moving
 * target supplied by the caller (the train's position).
 */
export class CameraController {
  private move: CameraMove | null = null;
  private resting: CameraShot;
  private shake: {start: number; duration: number; intensity: number} | null = null;
  private follow: {target: (now: number) => {x: number; y: number}; depth: number; zoom: number; start: number; blend: number} | null = null;

  constructor(initial: CameraShot = HOME_SHOT) {
    this.resting = {...initial};
  }

  /** Jump without animation. */
  cut(shot: CameraShot): void {
    this.move = null;
    this.follow = null;
    this.resting = {...shot};
  }

  /** Smoothly move to `shot`. */
  moveTo(shot: CameraShot, duration: number, easing: CameraEasing, now: number): void {
    const from = this.sample(now, false);
    this.follow = null;
    if (duration <= 0) {
      this.cut(shot);
      return;
    }
    this.move = {from, to: {...shot}, start: now, duration, easing};
    this.resting = {...shot};
  }

  /** Pan only (keeps zoom). */
  pan(x: number, y: number, duration: number, now: number, easing: CameraEasing = 'standard'): void {
    const cur = this.sample(now, false);
    this.moveTo({x, y, zoom: cur.zoom}, duration, easing, now);
  }

  /** Zoom only (keeps position). */
  zoom(zoom: number, duration: number, now: number, easing: CameraEasing = 'standard'): void {
    const cur = this.sample(now, false);
    this.moveTo({x: cur.x, y: cur.y, zoom}, duration, easing, now);
  }

  /** Centre a point of a depth plane. */
  focus(point: {x: number; y: number}, depth: number, zoom: number, duration: number, now: number, easing: CameraEasing = 'cinematic'): CameraShot {
    const shot = focusShot(point, depth, zoom);
    this.moveTo(shot, duration, easing, now);
    return shot;
  }

  /** Track a moving point; `blend` ms eases the camera onto it. */
  startFollow(target: (now: number) => {x: number; y: number}, depth: number, now: number, blend = 600): void {
    const cur = this.sample(now, false);
    this.move = null;
    this.resting = cur;
    this.follow = {target, depth, zoom: cur.zoom, start: now, blend};
  }

  /** Stop following, holding the current framing. */
  release(now: number): void {
    this.resting = this.sample(now, false);
    this.follow = null;
    this.move = null;
  }

  startShake(intensity: number, duration: number, now: number): void {
    this.shake = {start: now, duration, intensity};
  }

  reset(duration: number, now: number): void {
    this.moveTo(HOME_SHOT, duration, 'standard', now);
  }

  get isMoving(): boolean {
    return this.move !== null || this.follow !== null;
  }

  /** Moving, following or shaking at `now`: the renderer needs frames. */
  isActive(now: number): boolean {
    return this.isMoving || (this.shake !== null && now - this.shake.start < this.shake.duration);
  }

  /** The camera at `now` (with shake unless `withShake` is false). */
  sample(now: number, withShake = true): CameraShot {
    let shot: CameraShot;
    if (this.follow) {
      const f = this.follow;
      const p = f.target(now);
      const target = {x: (p.x - VIEW_CENTER.x) / Math.max(f.depth, 0.05), y: this.resting.y, zoom: f.zoom};
      const t = f.blend <= 0 ? 1 : ease('standard', (now - f.start) / f.blend);
      shot = lerpShot(this.resting, target, t);
    } else if (this.move) {
      const m = this.move;
      const t = (now - m.start) / m.duration;
      if (t >= 1) {
        this.move = null;
        shot = {...m.to};
      } else {
        shot = lerpShot(m.from, m.to, ease(m.easing, t));
      }
    } else {
      shot = {...this.resting};
    }
    if (withShake && this.shake) {
      const o = shakeOffset(now - this.shake.start, this.shake.duration, this.shake.intensity);
      if (now - this.shake.start >= this.shake.duration) {
        this.shake = null;
      }
      shot = {...shot, x: shot.x + o.x, y: shot.y + o.y};
    }
    return shot;
  }
}
