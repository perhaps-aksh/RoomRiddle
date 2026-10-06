/**
 * Clock faces built from a time, for any mystery's world.
 *
 * The hands are real hands: each starts at the face's centre and is rotated
 * about that centre (`pivot`) to the angle for the time, so what you see is
 * the time the clue says. Roles `hand-hour` / `hand-minute` / `hand-second`
 * let a renderer animate a ticking clock.
 */
import type {PlaceholderShape, WorldColor} from '@roomriddle/shared-types';

export interface ClockTime {
  hours: number;
  minutes: number;
  seconds?: number;
}

export interface ClockFaceOptions {
  /** Top-left of the face in the asset box. */
  x?: number;
  y?: number;
  /** Face diameter. */
  size: number;
  time: ClockTime;
  rim?: WorldColor;
  face?: WorldColor;
  hands?: WorldColor;
  /** Width of the rim, as a fraction of the diameter. */
  rimRatio?: number;
  /** Draw a second hand (for clocks still running). */
  secondHand?: boolean;
  secondColor?: WorldColor;
  /** Hour marks around the dial. */
  marks?: boolean;
}

/** Clockwise degrees from 12 o'clock. The hour hand moves with the minutes. */
export function handAngles(t: ClockTime): {hour: number; minute: number; second: number} {
  const s = t.seconds ?? 0;
  return {
    hour: ((t.hours % 12) + t.minutes / 60 + s / 3600) * 30,
    minute: (t.minutes + s / 60) * 6,
    second: s * 6,
  };
}

/** A hand of `length` from the pivot towards 12, rotated by `deg` about the pivot. */
function hand(cx: number, cy: number, length: number, width: number, deg: number, color: WorldColor, role: string, tail = 0): PlaceholderShape {
  return {x: cx - width / 2, y: cy - length, w: width, h: length + tail, color, radius: width / 2, rotate: deg, pivot: {x: cx, y: cy}, role};
}

export function clockFace(o: ClockFaceOptions): PlaceholderShape[] {
  const x = o.x ?? 0;
  const y = o.y ?? 0;
  const d = o.size;
  const r = d / 2;
  const cx = x + r;
  const cy = y + r;
  const rim = Math.max(2, d * (o.rimRatio ?? 0.06));
  const faceR = r - rim;
  const ink = o.hands ?? 'ink';
  const a = handAngles(o.time);
  const shapes: PlaceholderShape[] = [
    {x, y, w: d, h: d, color: o.rim ?? 'brass', radius: r},
    {x: cx - faceR, y: cy - faceR, w: faceR * 2, h: faceR * 2, color: o.face ?? 'paper', radius: faceR},
  ];
  if (o.marks ?? true) {
    const len = Math.max(2, faceR * 0.14);
    const w = Math.max(1.5, d * 0.018);
    for (let i = 0; i < 12; i++) {
      const markLen = i % 3 === 0 ? len * 1.5 : len;
      // A mark from the rim inwards: a hand whose visible part is only the outer end.
      shapes.push({x: cx - w / 2, y: cy - faceR + w, w, h: markLen, color: ink, opacity: 0.75, rotate: i * 30, pivot: {x: cx, y: cy}, role: 'mark'});
    }
  }
  shapes.push(hand(cx, cy, faceR * 0.5, Math.max(3, d * 0.035), a.hour, ink, 'hand-hour', faceR * 0.08));
  shapes.push(hand(cx, cy, faceR * 0.78, Math.max(2, d * 0.024), a.minute, ink, 'hand-minute', faceR * 0.1));
  if (o.secondHand) {
    shapes.push(hand(cx, cy, faceR * 0.86, Math.max(1, d * 0.01), a.second, o.secondColor ?? 'danger', 'hand-second', faceR * 0.16));
  }
  const cap = Math.max(4, d * 0.06);
  shapes.push({x: cx - cap / 2, y: cy - cap / 2, w: cap, h: cap, color: o.rim ?? 'brass', radius: cap / 2, role: 'hub'});
  return shapes;
}
