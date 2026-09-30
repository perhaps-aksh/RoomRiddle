/**
 * Interaction cues: named moments the UI announces (focus moved, clue found,
 * answer right or wrong). Phase 5 only defines the hook points; the audio
 * system in a later phase registers a handler here. Until then cues are no-ops.
 */
export type Cue =
  | 'focus'
  | 'select'
  | 'back'
  | 'discovery'
  | 'success'
  | 'failure'
  | 'hint'
  | 'player-joined'
  | 'player-left'
  | 'error'
  | 'transition';

type CueHandler = (cue: Cue) => void;

let handler: CueHandler | null = null;

/** Register the cue handler (e.g. the future sound system). Returns an unregister function. */
export function setCueHandler(next: CueHandler | null): () => void {
  handler = next;
  return () => {
    if (handler === next) {
      handler = null;
    }
  };
}

export function cue(name: Cue): void {
  try {
    handler?.(name);
  } catch {
    // A cue must never break interaction.
  }
}

/**
 * World audio hook (Phase 7): named moments from scene timelines, e.g.
 * {name: 'audio.cue', payload: {cue: 'train-brake'}}, and dialogue lines with
 * an audioId. Nothing plays yet; the audio phase registers a handler.
 */
export interface WorldAudioEvent {
  name: string;
  payload?: Record<string, unknown>;
}

let worldHandler: ((event: WorldAudioEvent) => void) | null = null;

export function setWorldAudioHandler(next: ((event: WorldAudioEvent) => void) | null): () => void {
  worldHandler = next;
  return () => {
    if (worldHandler === next) {
      worldHandler = null;
    }
  };
}

export function worldAudio(event: WorldAudioEvent): void {
  try {
    worldHandler?.(event);
  } catch {
    // Audio must never break the game.
  }
}
