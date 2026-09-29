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
