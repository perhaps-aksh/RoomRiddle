/**
 * The 2.5D train: a layered object that moves between named states.
 *
 *   far → approaching → arriving → stopped → doors-opening → boarding → departing
 *
 * Position is a pure function of (state it left, state it entered, time since
 * entering), so any client can compute exactly where the train is.
 */
import type {TrainDefinition, TrainState} from '@roomriddle/shared-types';
import {ease} from './camera';

export const TRAIN_SEQUENCE: readonly TrainState[] = ['far', 'approaching', 'arriving', 'stopped', 'doors-opening', 'boarding', 'departing'];

/** Legal next states (the train never reverses). */
export function canTransition(from: TrainState, to: TrainState): boolean {
  if (from === to) {
    return true;
  }
  const i = TRAIN_SEQUENCE.indexOf(from);
  const j = TRAIN_SEQUENCE.indexOf(to);
  // Forward only; a train that has departed can come round again as 'far'.
  return j > i || (from === 'departing' && to === 'far');
}

export interface TrainMotion {
  from: TrainState;
  to: TrainState;
  startedAt: number;
}

/** Train left-edge x (midground space) at `now`. */
export function trainX(def: TrainDefinition, motion: TrainMotion, now: number): number {
  const a = def.positions[motion.from];
  const b = def.positions[motion.to];
  const duration = def.durations[motion.to];
  if (duration <= 0 || a === b) {
    return b;
  }
  const t = Math.min(1, Math.max(0, (now - motion.startedAt) / duration));
  return a + (b - a) * ease(def.easing[motion.to] ?? 'standard', t);
}

/** 0 = doors shut, 1 = fully open. */
export function doorsOpen(def: TrainDefinition, motion: TrainMotion, now: number): number {
  if (motion.to === 'boarding') {
    return 1;
  }
  if (motion.to !== 'doors-opening') {
    return 0;
  }
  const d = def.durations['doors-opening'];
  return d <= 0 ? 1 : Math.min(1, Math.max(0, (now - motion.startedAt) / d));
}

/** Headlights are on while the train is running (not parked with doors open). */
export function headlightsOn(state: TrainState): boolean {
  return state === 'far' || state === 'approaching' || state === 'arriving' || state === 'departing';
}

/** The train makes steam when it brakes, stands, or pulls away. */
export function steaming(state: TrainState): boolean {
  return state === 'arriving' || state === 'stopped' || state === 'doors-opening' || state === 'departing';
}
