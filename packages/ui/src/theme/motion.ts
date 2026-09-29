/**
 * The motion system. Animation communicates something or it doesn't happen:
 * focus, state change, discovery, progression, feedback, transition.
 *
 * Rules:
 * - Focus motion is fast (under 200 ms). The remote must never feel sluggish.
 * - Nothing blocks input: screens are interactive the moment they mount.
 * - No endless loops except the slow ambient background and "working" loaders,
 *   and both stop when reduced motion is on.
 * - Reduced motion: movement and scale are removed, opacity fades stay short.
 */
export const durations = {
  instant: 0,
  fast: 140,
  normal: 260,
  slow: 480,
  cinematic: 900,
  ambient: 16000,
} as const;

/**
 * Cubic-bezier control points. The TV maps them to Easing.bezier,
 * the phone to CSS cubic-bezier().
 */
export const easings = {
  standard: [0.2, 0, 0, 1],
  enter: [0, 0, 0.2, 1],
  exit: [0.4, 0, 1, 1],
  cinematic: [0.16, 1, 0.3, 1],
  linear: [0, 0, 1, 1],
} as const;

export type EasingName = keyof typeof easings;

export interface MotionToken {
  duration: number;
  easing: EasingName;
  /** Optional delay before the motion starts. */
  delay?: number;
}

/** Semantic motions. Components reference these names, not raw numbers. */
export const motion = {
  focusIn: {duration: durations.fast, easing: 'standard'},
  focusOut: {duration: 110, easing: 'exit'},
  press: {duration: 90, easing: 'standard'},
  screenEnter: {duration: 380, easing: 'cinematic'},
  screenExit: {duration: 180, easing: 'exit'},
  modalEnter: {duration: durations.normal, easing: 'cinematic'},
  modalExit: {duration: 160, easing: 'exit'},
  sceneReveal: {duration: durations.cinematic, easing: 'cinematic'},
  discovery: {duration: 620, easing: 'cinematic'},
  success: {duration: durations.slow, easing: 'cinematic'},
  failure: {duration: 360, easing: 'standard'},
  listItemEnter: {duration: 420, easing: 'cinematic'},
  stagger: {duration: 70, easing: 'linear'},
  toast: {duration: durations.normal, easing: 'enter'},
  toastHold: {duration: 3200, easing: 'linear'},
  loaderCycle: {duration: 1400, easing: 'standard'},
  ambient: {duration: durations.ambient, easing: 'linear'},
  breath: {duration: 3600, easing: 'standard'},
} as const satisfies Record<string, MotionToken>;

export type MotionName = keyof typeof motion;

/** Scale and offset amounts used by the motion primitives. */
export const motionAmounts = {
  focusScale: 1.045,
  cardFocusScale: 1.05,
  pressScale: 0.97,
  /** Design pixels. */
  screenEnterOffset: 28,
  listItemOffset: 36,
  shake: 10,
  discoveryScaleFrom: 0.92,
} as const;

/** Reduced motion: movement removed, fades shortened. */
export function reducedMotion(token: MotionToken): MotionToken {
  return {...token, duration: Math.min(token.duration, 120), delay: 0};
}
