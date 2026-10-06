/**
 * The TV's player preferences: one shape, one set of defaults, one parser.
 * Pure (no React, no storage) so the rules are testable and every screen
 * reads the same values. Stored as JSON under SETTINGS_KEY.
 */

export const SETTINGS_KEY = 'roomriddle.settings.v1';

/** Volume steps the remote cycles through (0 = off). */
export const VOLUME_STEPS = [100, 75, 50, 25, 0] as const;
export type Volume = (typeof VOLUME_STEPS)[number];

export type AudioChannel = 'music' | 'sfx' | 'voice' | 'ambient';

export interface Settings {
  /** Reduced removes movement and zoom; fades stay short. */
  motion: 'full' | 'reduced';
  /** Scenes as the 2.5D world or as the P5 case file. */
  scenes: 'cinematic' | 'casefile';
  master: Volume;
  music: Volume;
  /** Sound effects and ambience. */
  sfx: Volume;
  voice: Volume;
  muted: boolean;
  subtitles: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  motion: 'full',
  scenes: 'cinematic',
  master: 100,
  music: 75,
  sfx: 100,
  voice: 100,
  muted: false,
  subtitles: true,
};

const isVolume = (v: unknown): v is Volume => typeof v === 'number' && (VOLUME_STEPS as readonly number[]).includes(v);

/**
 * Reads stored JSON into the fields that are valid. Unknown keys, wrong types
 * and corrupt JSON are dropped, so a bad value can never break the app; the
 * caller layers the result over the defaults.
 */
export function parseSettings(raw: string | null | undefined): Partial<Settings> {
  if (!raw) {
    return {};
  }
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!data || typeof data !== 'object') {
    return {};
  }
  const d = data as Record<string, unknown>;
  const out: Partial<Settings> = {};
  if (d.motion === 'full' || d.motion === 'reduced') {
    out.motion = d.motion;
  }
  if (d.scenes === 'cinematic' || d.scenes === 'casefile') {
    out.scenes = d.scenes;
  }
  for (const key of ['master', 'music', 'sfx', 'voice'] as const) {
    if (isVolume(d[key])) {
      out[key] = d[key] as Volume;
    }
  }
  if (typeof d.muted === 'boolean') {
    out.muted = d.muted;
  }
  if (typeof d.subtitles === 'boolean') {
    out.subtitles = d.subtitles;
  }
  return out;
}

/** The next value when OK is pressed on a volume row (100 → 75 → … → 0 → 100). */
export function nextVolume(v: Volume): Volume {
  const i = VOLUME_STEPS.indexOf(v);
  return VOLUME_STEPS[(i + 1) % VOLUME_STEPS.length] ?? 100;
}

/** Output gain 0..1 for a channel: master × channel, 0 when muted. Ambient follows the effects volume. */
export function channelGain(s: Settings, channel: AudioChannel): number {
  if (s.muted) {
    return 0;
  }
  const level = channel === 'music' ? s.music : channel === 'voice' ? s.voice : s.sfx;
  return (s.master / 100) * (level / 100);
}
