/**
 * Audio, data-driven like the world (Phase 7). Sounds are listed in a manifest
 * with stable ids; what plays when is described by an AudioDirection. Renderers
 * resolve ids to files; nothing outside the manifest names a file.
 */

/** Mixer channel. Each has its own volume setting (ambient follows effects). */
export type AudioChannel = 'music' | 'ambient' | 'sfx' | 'voice';

export type AudioStatus = 'placeholder' | 'final' | 'missing';

export interface AudioDefinition {
  /** Stable forever: `<prefix><kind>.<name>` with kind music | ambient | sfx | ui | vo, e.g. `last-train.ambient.rain`. */
  id: string;
  channel: AudioChannel;
  /** Loops until stopped (music beds, ambience). One-shots end by themselves. */
  loop: boolean;
  /** Mix level 0–1 before the player's settings. Default 1. */
  volume?: number;
  /** placeholder = generated stand-in; missing = planned, no file yet (skipped quietly). */
  status: AudioStatus;
  /** File, relative to the manifest's basePath. Absent while missing. */
  source?: string;
  /** Approximate length in ms (voice lines: how long the subtitle needs). */
  durationMs?: number;
  description: string;
  /** Origin and licence of the file (generated placeholders say so). */
  license?: string;
}

export interface AudioManifest {
  /** Every id starts with this, e.g. `last-train.` or `core.`. */
  idPrefix: string;
  /** Folder of the files, e.g. `audio/last-train`. */
  basePath: string;
  sounds: AudioDefinition[];
}

/** Music follows the game: one bed per state, crossfaded. */
export type MusicState = 'menu' | 'selection' | 'cinematic' | 'investigation' | 'puzzle' | 'tension' | 'reveal' | 'ending';

/** The audio vocabulary. Everything that makes sound is one of these. */
export type AudioCommand =
  | {type: 'PLAY_MUSIC'; id: string; fadeMs?: number}
  | {type: 'STOP_MUSIC'; fadeMs?: number}
  /** Fade the music bed to a level (0–1 of its normal mix), e.g. under dialogue. */
  | {type: 'FADE_MUSIC'; to: number; fadeMs: number}
  | {type: 'PLAY_SFX'; id: string}
  /** Set the ambient bed: these layers play, every other layer fades out. */
  | {type: 'PLAY_AMBIENT'; ids: string[]; fadeMs?: number}
  /** Start or stop one ambient layer without touching the others. */
  | {type: 'AMBIENT_LAYER'; id: string; on: boolean; fadeMs?: number}
  | {type: 'PLAY_VOICE'; id: string}
  | {type: 'STOP_VOICE'}
  /** Channel gains 0–1 (player settings: master × channel). */
  | {type: 'SET_VOLUME'; gains: Partial<Record<AudioChannel, number>>}
  | {type: 'MUTE'; muted: boolean};

/** How one mystery sounds: which bed for which state, which layers where, what each moment plays. */
export interface AudioDirection {
  /** Music id per state; null = silence (fade out). States not listed keep the shared default. */
  music: Partial<Record<MusicState, string | null>>;
  /** Ambient layers per world set id (2.5D world). */
  ambientBySet: Record<string, string[]>;
  /** Ambient layers per engine scene id (case-file view, and sets not listed). */
  ambientByScene: Record<string, string[]>;
  /**
   * Named moments → commands. Keys:
   *   `cue:<name>`      timeline `audio.cue` events (train-brake, doors-open…)
   *   `event:<type>`    engine events (clue-discovered, answer-correct…)
   *   `inspect:<objectId>` the player opens an object in the world
   */
  moments: Record<string, AudioCommand[]>;
  /** Engine scenes whose music is the reveal (the final confrontation). */
  revealSceneIds?: string[];
  /** Puzzles that play the reveal music instead of the puzzle bed. */
  revealPuzzleIds?: string[];
  /** Remaining time (ms) below which investigation turns to tension. */
  tensionBelowMs?: number;
}
