/**
 * Scene modes: who is in control right now, and which remote input counts.
 *
 *   cinematic      the director runs the camera; OK/Back only skip
 *   exploration    players look around; the camera can pan; objects are visible but not examinable
 *   investigation  objects can be focused and examined
 *   inspection     the camera is on one object; OK acts, Back returns
 *   dialogue       OK advances the line; nothing else
 *   transition     no input at all (a set is changing)
 */
import type {SceneMode} from '@roomriddle/shared-types';

export type SceneInput = 'direction' | 'select' | 'back' | 'skip' | 'advance';

export interface ModePolicy {
  /** Players steer: focus moves between objects. */
  focusObjects: boolean;
  /** OK examines the focused object. */
  examine: boolean;
  /** OK advances dialogue. */
  advanceDialogue: boolean;
  /** OK/Back can skip the running cinematic. */
  skippable: boolean;
  /** The P5 game UI (header, action bar) is shown over the world. */
  showHud: boolean;
}

export const MODE_POLICY: Record<SceneMode, ModePolicy> = {
  cinematic: {focusObjects: false, examine: false, advanceDialogue: false, skippable: true, showHud: false},
  exploration: {focusObjects: true, examine: false, advanceDialogue: false, skippable: false, showHud: true},
  investigation: {focusObjects: true, examine: true, advanceDialogue: false, skippable: false, showHud: true},
  inspection: {focusObjects: false, examine: true, advanceDialogue: false, skippable: false, showHud: true},
  dialogue: {focusObjects: false, examine: false, advanceDialogue: true, skippable: false, showHud: false},
  transition: {focusObjects: false, examine: false, advanceDialogue: false, skippable: false, showHud: false},
};

/** Whether an input is accepted in a mode. */
export function accepts(mode: SceneMode, input: SceneInput): boolean {
  const p = MODE_POLICY[mode];
  switch (input) {
    case 'direction':
      return p.focusObjects;
    case 'select':
      return p.examine;
    case 'advance':
      return p.advanceDialogue;
    case 'skip':
      return p.skippable;
    case 'back':
      return mode !== 'transition';
  }
}
