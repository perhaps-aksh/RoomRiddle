/**
 * The audio director: turns AudioCommands into what each sound should be
 * doing (play / volume / stop), including crossfades, ambient layers, voice
 * ducking and the player's volume settings. Pure and clock-free like the
 * SceneDirector: the caller passes `now`, and a renderer-supplied backend does
 * the actual playback. Unknown or missing sounds are skipped and reported,
 * never thrown, so audio can't break the game.
 */
import type {AudioChannel, AudioCommand, AudioDefinition, AudioDirection, AudioManifest, MusicState} from '@roomriddle/shared-types';

/** What the renderer implements (TV: W3C AudioPlayer). Handles are owned by the director. */
export interface AudioBackend {
  /** Start a sound at a volume. Calls `ended(handle)` (via the director) when a one-shot finishes. */
  play(handle: number, sound: AudioDefinition, volume: number): void;
  setVolume(handle: number, volume: number): void;
  stop(handle: number): void;
}

interface Fade {
  from: number;
  to: number;
  start: number;
  ms: number;
}

interface Voice {
  handle: number;
  sound: AudioDefinition;
  /** Mix level of this instance (0–1), animated by fades; × channel gain at output. */
  level: number;
  fade: Fade | null;
  /** Stop once a fade-out reaches 0. */
  stopAtEnd: boolean;
}

export interface AudioDirectorOptions {
  /** Default crossfade for music and ambience (ms). */
  fadeMs?: number;
  /** Music level while a voice line plays (0–1). */
  duckTo?: number;
  /** Most one-shot effects at once; the oldest is cut. */
  maxSfx?: number;
  /** Called once per id that was asked for but can't play. */
  onMissing?: (id: string, reason: 'unknown' | 'no-file') => void;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export class AudioRegistry {
  private readonly byId = new Map<string, AudioDefinition>();
  constructor(manifests: readonly AudioManifest[]) {
    for (const m of manifests) {
      for (const s of m.sounds) {
        this.byId.set(s.id, s);
      }
    }
  }
  get(id: string): AudioDefinition | undefined {
    return this.byId.get(id);
  }
  /** True when the id exists and has a file (missing/planned sounds are not playable). */
  playable(id: string): boolean {
    const s = this.byId.get(id);
    return !!s && s.status !== 'missing' && !!s.source;
  }
  all(): AudioDefinition[] {
    return [...this.byId.values()];
  }
}

export class AudioDirector {
  private nextHandle = 1;
  private music: Voice | null = null;
  /** Music fading out after a crossfade. */
  private outgoing: Voice[] = [];
  private ambient = new Map<string, Voice>();
  private voice: Voice | null = null;
  private sfx: Voice[] = [];
  private gains: Record<AudioChannel, number> = {music: 1, ambient: 1, sfx: 1, voice: 1};
  private muted = false;
  /** FADE_MUSIC level (1 = normal) and its fade. */
  private musicBed = 1;
  private bedFade: Fade | null = null;
  private readonly missing = new Set<string>();
  /** The handle being started, and whether the backend already ended it (failed at once). */
  private starting: number | null = null;
  private endedWhileStarting = false;
  private readonly opts: Required<Omit<AudioDirectorOptions, 'onMissing'>> & Pick<AudioDirectorOptions, 'onMissing'>;

  constructor(
    private readonly registry: AudioRegistry,
    private readonly backend: AudioBackend,
    options: AudioDirectorOptions = {},
  ) {
    this.opts = {fadeMs: options.fadeMs ?? 1200, duckTo: options.duckTo ?? 0.45, maxSfx: options.maxSfx ?? 4, onMissing: options.onMissing};
  }

  // ── Introspection (tests, debug overlay) ──────────────────────────────
  get currentMusic(): string | null {
    return this.music?.sound.id ?? null;
  }
  get ambientLayers(): string[] {
    return [...this.ambient.values()].filter(v => !v.stopAtEnd).map(v => v.sound.id);
  }
  get currentVoice(): string | null {
    return this.voice?.sound.id ?? null;
  }
  get missingIds(): string[] {
    return [...this.missing];
  }
  /** True while any fade is running (the renderer ticks only then). */
  get fading(): boolean {
    const all = [this.music, this.voice, ...this.outgoing, ...this.ambient.values()];
    return !!this.bedFade || all.some(v => !!v?.fade);
  }

  // ── Commands ──────────────────────────────────────────────────────────
  run(command: AudioCommand, now: number): void {
    switch (command.type) {
      case 'PLAY_MUSIC':
        return this.playMusic(command.id, command.fadeMs ?? this.opts.fadeMs, now);
      case 'STOP_MUSIC':
        return this.stopMusic(command.fadeMs ?? this.opts.fadeMs, now);
      case 'FADE_MUSIC':
        this.bedFade = {from: this.bedLevel(now), to: clamp01(command.to), start: now, ms: Math.max(0, command.fadeMs)};
        return this.tick(now);
      case 'PLAY_SFX':
        return this.playSfx(command.id);
      case 'PLAY_AMBIENT':
        return this.setAmbient(command.ids, command.fadeMs ?? this.opts.fadeMs, now);
      case 'AMBIENT_LAYER':
        return command.on ? this.addLayer(command.id, command.fadeMs ?? this.opts.fadeMs, now) : this.dropLayer(command.id, command.fadeMs ?? this.opts.fadeMs, now);
      case 'PLAY_VOICE':
        return this.playVoice(command.id, now);
      case 'STOP_VOICE':
        return this.stopVoice(now);
      case 'SET_VOLUME':
        this.gains = {...this.gains, ...command.gains};
        return this.applyAll(now);
      case 'MUTE':
        this.muted = command.muted;
        return this.applyAll(now);
    }
  }

  runAll(commands: readonly AudioCommand[], now: number): void {
    for (const c of commands) {
      this.run(c, now);
    }
  }

  /** Advance fades; call from a timer while `fading`. */
  tick(now: number): void {
    if (this.bedFade && now - this.bedFade.start >= this.bedFade.ms) {
      this.musicBed = this.bedFade.to;
      this.bedFade = null;
    }
    const step = (v: Voice): boolean => {
      if (v.fade) {
        const t = v.fade.ms <= 0 ? 1 : clamp01((now - v.fade.start) / v.fade.ms);
        v.level = v.fade.from + (v.fade.to - v.fade.from) * t;
        if (t >= 1) {
          v.fade = null;
          if (v.stopAtEnd && v.level <= 0) {
            this.backend.stop(v.handle);
            return false;
          }
        }
      }
      this.backend.setVolume(v.handle, this.output(v, now));
      return true;
    };
    if (this.music) {
      step(this.music);
    }
    this.outgoing = this.outgoing.filter(step);
    for (const [id, v] of [...this.ambient]) {
      if (!step(v)) {
        this.ambient.delete(id);
      }
    }
    if (this.voice) {
      step(this.voice);
    }
  }

  /** The backend reports that a one-shot finished. */
  ended(handle: number, now: number): void {
    if (handle === this.starting) {
      // The backend gave up before play() returned (no file, refused): the caller drops it.
      this.endedWhileStarting = true;
      return;
    }
    if (this.voice?.handle === handle) {
      this.voice = null;
      this.applyAll(now); // un-duck
      return;
    }
    this.sfx = this.sfx.filter(v => v.handle !== handle);
  }

  /** Stop everything at once (app backgrounded, unmount). */
  stopAll(): void {
    for (const v of [this.music, this.voice, ...this.outgoing, ...this.ambient.values(), ...this.sfx]) {
      if (v) {
        this.backend.stop(v.handle);
      }
    }
    this.music = null;
    this.voice = null;
    this.outgoing = [];
    this.ambient.clear();
    this.sfx = [];
  }

  // ── Internals ─────────────────────────────────────────────────────────
  private sound(id: string): AudioDefinition | null {
    const s = this.registry.get(id);
    if (!s || !this.registry.playable(id)) {
      if (!this.missing.has(id)) {
        this.missing.add(id);
        this.opts.onMissing?.(id, s ? 'no-file' : 'unknown');
      }
      return null;
    }
    return s;
  }

  /** Start a sound; null when the backend ended it straight away (nothing to track). */
  private start(sound: AudioDefinition, level: number, now: number, fadeMs = 0): Voice | null {
    const v: Voice = {handle: this.nextHandle++, sound, level: fadeMs > 0 ? 0 : level, fade: fadeMs > 0 ? {from: 0, to: level, start: now, ms: fadeMs} : null, stopAtEnd: false};
    this.starting = v.handle;
    this.endedWhileStarting = false;
    try {
      this.backend.play(v.handle, sound, this.output(v, now));
    } finally {
      this.starting = null;
    }
    return this.endedWhileStarting ? null : v;
  }

  private fadeOut(v: Voice, ms: number, now: number): void {
    v.fade = {from: v.level, to: 0, start: now, ms};
    v.stopAtEnd = true;
    if (ms <= 0) {
      this.tick(now);
    }
  }

  private bedLevel(now: number): number {
    const f = this.bedFade;
    if (!f) {
      return this.musicBed;
    }
    const t = f.ms <= 0 ? 1 : clamp01((now - f.start) / f.ms);
    return f.from + (f.to - f.from) * t;
  }

  private output(v: Voice, now: number): number {
    if (this.muted) {
      return 0;
    }
    const ch = v.sound.channel;
    let gain = this.gains[ch] * (v.sound.volume ?? 1) * v.level;
    if (ch === 'music') {
      gain *= this.bedLevel(now) * (this.voice ? this.opts.duckTo : 1);
    }
    return clamp01(gain);
  }

  private applyAll(now: number): void {
    for (const v of [this.music, this.voice, ...this.outgoing, ...this.ambient.values(), ...this.sfx]) {
      if (v) {
        this.backend.setVolume(v.handle, this.output(v, now));
      }
    }
  }

  private playMusic(id: string, fadeMs: number, now: number): void {
    if (this.music?.sound.id === id && !this.music.stopAtEnd) {
      return;
    }
    const sound = this.sound(id);
    if (this.music) {
      this.fadeOut(this.music, fadeMs, now);
      this.outgoing.push(this.music);
      this.music = null;
    }
    if (sound) {
      this.music = this.start(sound, 1, now, fadeMs);
    }
    this.tick(now);
  }

  private stopMusic(fadeMs: number, now: number): void {
    if (this.music) {
      this.fadeOut(this.music, fadeMs, now);
      this.outgoing.push(this.music);
      this.music = null;
      this.tick(now);
    }
  }

  private setAmbient(ids: readonly string[], fadeMs: number, now: number): void {
    const want = new Set(ids);
    for (const [id, v] of this.ambient) {
      if (!want.has(id) && !v.stopAtEnd) {
        this.fadeOut(v, fadeMs, now);
      }
    }
    for (const id of want) {
      this.addLayer(id, fadeMs, now);
    }
    this.tick(now);
  }

  private addLayer(id: string, fadeMs: number, now: number): void {
    const cur = this.ambient.get(id);
    if (cur && !cur.stopAtEnd) {
      return;
    }
    if (cur) {
      // Fading out: bring it back rather than starting a second copy.
      cur.stopAtEnd = false;
      cur.fade = {from: cur.level, to: 1, start: now, ms: fadeMs};
      return;
    }
    const sound = this.sound(id);
    const v = sound ? this.start(sound, 1, now, fadeMs) : null;
    if (v) {
      this.ambient.set(id, v);
    }
  }

  private dropLayer(id: string, fadeMs: number, now: number): void {
    const v = this.ambient.get(id);
    if (v && !v.stopAtEnd) {
      this.fadeOut(v, fadeMs, now);
    }
  }

  private playSfx(id: string): void {
    const sound = this.sound(id);
    if (!sound) {
      return;
    }
    while (this.sfx.length >= this.opts.maxSfx) {
      const old = this.sfx.shift();
      if (old) {
        this.backend.stop(old.handle);
      }
    }
    const v = this.start(sound, 1, 0);
    if (v) {
      this.sfx.push(v);
    }
  }

  private playVoice(id: string, now: number): void {
    this.stopVoice(now);
    const sound = this.sound(id);
    if (!sound) {
      return;
    }
    this.voice = this.start(sound, 1, now);
    this.applyAll(now); // duck the music (only if the line really started)
  }

  private stopVoice(now: number): void {
    if (this.voice) {
      this.backend.stop(this.voice.handle);
      this.voice = null;
      this.applyAll(now);
    }
  }
}

// ── Music state ─────────────────────────────────────────────────────────

export interface MusicContext {
  /** Where the TV is: a menu, choosing a mystery, or in a game. */
  place: 'menu' | 'selection' | 'game' | 'ending';
  /** In a game: the screen kind. */
  screen?: 'scene' | 'puzzle';
  /** The 2.5D world is playing a cinematic (music waits for the timeline's cue). */
  cinematic?: boolean;
  sceneId?: string | null;
  puzzleId?: string | null;
  /** ms left on the game clock, if running. */
  remainingMs?: number | null;
}

/** Which music state the game is in. Pure; the mystery's direction supplies the thresholds. */
export function musicStateFor(ctx: MusicContext, direction?: Pick<AudioDirection, 'revealSceneIds' | 'revealPuzzleIds' | 'tensionBelowMs'>): MusicState {
  if (ctx.place === 'menu') {
    return 'menu';
  }
  if (ctx.place === 'selection') {
    return 'selection';
  }
  if (ctx.place === 'ending') {
    return 'ending';
  }
  if (ctx.screen === 'puzzle') {
    return ctx.puzzleId && direction?.revealPuzzleIds?.includes(ctx.puzzleId) ? 'reveal' : 'puzzle';
  }
  if (ctx.cinematic) {
    return 'cinematic';
  }
  if (ctx.sceneId && direction?.revealSceneIds?.includes(ctx.sceneId)) {
    return 'reveal';
  }
  const below = direction?.tensionBelowMs;
  if (below !== undefined && ctx.remainingMs !== null && ctx.remainingMs !== undefined && ctx.remainingMs <= below) {
    return 'tension';
  }
  return 'investigation';
}

/**
 * The command for a music state: the mystery's choice, else the shared one.
 * `null` in either means silence; a state nobody lists leaves the music alone.
 */
export function musicCommand(state: MusicState, mystery: AudioDirection['music'] | undefined, shared: AudioDirection['music']): AudioCommand | null {
  const pick = mystery && state in mystery ? mystery[state] : shared[state];
  if (pick === undefined) {
    return null;
  }
  return pick === null ? {type: 'STOP_MUSIC'} : {type: 'PLAY_MUSIC', id: pick};
}

/** Ambient layers for where the players are: the set's, else the scene's. */
export function ambientFor(direction: AudioDirection, setId: string | null | undefined, sceneId: string | null | undefined): string[] {
  if (setId && direction.ambientBySet[setId]) {
    return direction.ambientBySet[setId];
  }
  return (sceneId && direction.ambientByScene[sceneId]) || [];
}

/** Commands for a named moment (`cue:…`, `event:…`, `inspect:…`). */
export function momentCommands(direction: AudioDirection | undefined, key: string): readonly AudioCommand[] {
  return direction?.moments[key] ?? [];
}

// ── Validation ──────────────────────────────────────────────────────────

/** Sound ids are `<prefix><kind>.<name>`; the kind says which channel it plays on. */
const ID_KIND_CHANNEL: Readonly<Record<string, AudioChannel>> = {music: 'music', ambient: 'ambient', sfx: 'sfx', ui: 'sfx', vo: 'voice'};

/**
 * Checks an audio manifest and the direction that uses it. Errors break the
 * contract (bad ids, a looping one-shot channel, unknown references); warnings
 * are planned sounds without a file (they're skipped at runtime).
 */
export function validateAudio(
  manifest: AudioManifest,
  direction: AudioDirection | null,
  known: {dialogueAudioIds?: string[]; otherManifests?: AudioManifest[]} = {},
): {errors: string[]; warnings: string[]} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ids = new Set<string>();
  for (const s of manifest.sounds) {
    if (ids.has(s.id)) {
      errors.push(`${s.id}: duplicate id`);
    }
    ids.add(s.id);
    if (!s.id.startsWith(manifest.idPrefix)) {
      errors.push(`${s.id}: id must start with ${manifest.idPrefix}`);
    }
    const kind = s.id.slice(manifest.idPrefix.length).split('.')[0] ?? '';
    if (ID_KIND_CHANNEL[kind] !== s.channel) {
      errors.push(`${s.id}: id kind '${kind}' doesn't match channel ${s.channel} (music, ambient, sfx|ui, vo)`);
    }
    if ((s.channel === 'music' || s.channel === 'ambient') !== s.loop) {
      errors.push(`${s.id}: ${s.channel} ${s.loop ? 'must not' : 'must'} loop`);
    }
    if (s.status === 'missing') {
      warnings.push(`${s.id}: no file yet (skipped at runtime)`);
    } else if (!s.source) {
      errors.push(`${s.id}: status ${s.status} needs a source file`);
    }
    if (s.volume !== undefined && (s.volume < 0 || s.volume > 1)) {
      errors.push(`${s.id}: volume must be 0–1`);
    }
  }
  const all = new Set([...ids, ...(known.otherManifests ?? []).flatMap(m => m.sounds.map(s => s.id))]);
  const need = (id: string, where: string) => {
    if (!all.has(id)) {
      errors.push(`${where}: unknown sound ${id}`);
    }
  };
  if (direction) {
    for (const [state, id] of Object.entries(direction.music)) {
      if (id) {
        need(id, `music.${state}`);
      }
    }
    for (const [where, list] of [...Object.entries(direction.ambientBySet), ...Object.entries(direction.ambientByScene)]) {
      for (const id of list) {
        need(id, `ambient ${where}`);
      }
    }
    for (const [key, cmds] of Object.entries(direction.moments)) {
      if (!/^(cue|event|inspect):/.test(key)) {
        errors.push(`moment ${key}: key must start with cue:, event: or inspect:`);
      }
      for (const c of cmds) {
        if ('id' in c) {
          need(c.id, `moment ${key}`);
        }
        if (c.type === 'PLAY_AMBIENT') {
          c.ids.forEach(id => need(id, `moment ${key}`));
        }
      }
    }
  }
  for (const id of known.dialogueAudioIds ?? []) {
    if (!all.has(id)) {
      errors.push(`dialogue: unknown voice line ${id}`);
    }
  }
  return {errors, warnings};
}
