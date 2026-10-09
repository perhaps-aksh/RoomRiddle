import {AppState, Image} from 'react-native';
import {AudioContentType, AudioPlayer, AudioUsageType} from '@amazon-devices/react-native-w3cmedia';
import type {AudioDefinition} from '@roomriddle/shared-types';
import type {AudioBackend} from '@roomriddle/scene';
import {bundledAudio} from './bundled';

/**
 * Plays sounds on Vega with the W3C AudioPlayer.
 *
 * Sources are bundled files only; Vega's media player rejects `http://` and the
 * `file://` form of bundled asset URIs, so the scheme is stripped (FL-012).
 * Every call is guarded: audio never breaks the game.
 *
 * Every player has an id and an explicit state (LOADING → PLAYING → STOPPING →
 * RELEASED, or ERROR; pooled effect players rest in IDLE). Counters live in
 * `audioStats` so leaks show (created must equal released once all is stopped).
 *
 * Effect pooling (`audioConfig.pooling`): an effect reuses its warm player only
 * when that player is IDLE; a LOADING/PLAYING/STOPPING/ERROR player is never
 * handed a sound. Off by default until proven on the device (Phase 7A).
 */

/** The runtime path for a bundled module (what the native player receives). */
export function assetPath(mod: number | undefined): string | null {
  if (mod === undefined) {
    return null;
  }
  const uri = Image.resolveAssetSource(mod)?.uri ?? '';
  return uri ? uri.replace(/^file:\/\//, '') : null;
}

export function bundledPath(id: string): string | null {
  return assetPath(bundledAudio[id]);
}

export type PlayerState = 'LOADING' | 'IDLE' | 'PLAYING' | 'STOPPING' | 'RELEASED' | 'ERROR';

export interface AudioStats {
  created: number;
  released: number;
  errors: number;
  active: number;
  reused: number;
  lastSoundId: string;
  lastPath: string;
  lastPlayerId: number;
  lastError: string;
  /** Player id → state, for players not yet released. */
  states: Record<number, PlayerState>;
}

export const audioConfig = {pooling: false};

export const audioStats: AudioStats = {created: 0, released: 0, errors: 0, active: 0, reused: 0, lastSoundId: '', lastPath: '', lastPlayerId: 0, lastError: '', states: {}};
const statListeners = new Set<() => void>();
export function onAudioStats(cb: () => void): () => void {
  statListeners.add(cb);
  return () => {
    statListeners.delete(cb);
  };
}
const changed = () => {
  audioStats.active = Object.keys(audioStats.states).length;
  for (const cb of statListeners) {
    cb();
  }
};

const devLog = (msg: string) => {
  if (__DEV__) {
    console.log(msg);
  }
};

const contentType = (channel: AudioDefinition['channel']) =>
  channel === 'music' ? AudioContentType.CONTENT_TYPE_MUSIC : channel === 'voice' ? AudioContentType.CONTENT_TYPE_SPEECH : AudioContentType.CONTENT_TYPE_SONIFICATION;

let nextPlayerId = 1;

/** One native player with its id and state. */
class Tracked {
  readonly id = nextPlayerId++;
  readonly player: AudioPlayer;
  state: PlayerState = 'LOADING';
  constructor(channel: AudioDefinition['channel'], readonly soundId: string) {
    this.player = new AudioPlayer(contentType(channel), AudioUsageType.USAGE_GAME);
    audioStats.created++;
    audioStats.states[this.id] = 'LOADING';
    changed();
  }
  set(state: PlayerState) {
    this.state = state;
    if (state === 'RELEASED') {
      delete audioStats.states[this.id];
    } else {
      audioStats.states[this.id] = state;
    }
    changed();
  }
  release() {
    if (this.state === 'RELEASED' || this.state === 'STOPPING') {
      return;
    }
    this.set('STOPPING');
    try {
      this.player.pause();
    } catch {
      // already gone
    }
    this.player
      .deinitialize()
      .catch(() => undefined)
      .finally(() => {
        audioStats.released++;
        this.set('RELEASED');
      });
  }
}

interface Slot {
  tracked: Tracked | null;
  volume: number;
  stopped: boolean;
  /** A warm effect player: returned to the pool instead of torn down. */
  pooled: boolean;
}

export type W3cBackend = AudioBackend & {
  /** `path` overrides the bundled lookup (diagnostic files outside the manifests). */
  play(handle: number, sound: AudioDefinition, volume: number, path?: string | null): void;
  stopAll(): void;
};

export function createW3cBackend(onEnded: (handle: number) => void, log: (msg: string) => void = devLog): W3cBackend {
  const slots = new Map<number, Slot>();
  const warm = new Map<string, Tracked>();

  const fail = (t: Tracked, sound: AudioDefinition, path: string, reused: boolean) => {
    const previousState = t.state;
    const err = JSON.stringify(t.player.error ?? null);
    audioStats.errors++;
    audioStats.lastError = `${sound.id} player ${t.id}: ${err}`;
    t.set('ERROR');
    log(
      `[AUDIO_ERROR] soundId=${sound.id} path=${path} playerId=${t.id} channel=${sound.channel} reused=${reused} previousState=${previousState} ` +
        `active=${audioStats.active} created=${audioStats.created} released=${audioStats.released} error=${err}`,
    );
  };

  const release = (handle: number) => {
    const slot = slots.get(handle);
    slots.delete(handle);
    const t = slot?.tracked;
    if (!t) {
      return;
    }
    if (slot.pooled && t.state === 'PLAYING') {
      try {
        t.player.pause();
      } catch {
        // ignore
      }
      t.set('IDLE');
      return;
    }
    if (!slot.pooled) {
      t.release();
    }
  };

  /** Load an effect into its warm player, paused; it becomes IDLE when ready. */
  const prepare = (sound: AudioDefinition, path: string) => {
    const t = new Tracked(sound.channel, sound.id);
    warm.set(sound.id, t);
    t.player
      .initialize()
      .then(() => {
        t.player.addEventListener('error', () => {
          fail(t, sound, path, true);
          warm.delete(sound.id);
          t.release();
        });
        t.player.addEventListener('canplay', () => {
          if (t.state === 'LOADING') {
            t.set('IDLE');
          }
        });
        t.player.loop = false;
        t.player.autoplay = false;
        t.player.src = path;
      })
      .catch(e => {
        log(`[AUDIO_ERROR] soundId=${sound.id} warm init ${String(e)}`);
        warm.delete(sound.id);
        t.release();
      });
  };

  const fresh = (handle: number, sound: AudioDefinition, path: string, slot: Slot) => {
    const t0 = Date.now();
    const t = new Tracked(sound.channel, sound.id);
    slot.tracked = t;
    audioStats.lastPlayerId = t.id;
    t.player
      .initialize()
      .then(() => {
        if (slot.stopped) {
          t.release();
          return;
        }
        const p = t.player;
        p.loop = sound.loop;
        p.volume = slot.volume;
        p.addEventListener('playing', () => {
          if (t.state === 'LOADING') {
            t.set('PLAYING');
            log(`[AUDIO_TEST] started soundId=${sound.id} playerId=${t.id} volume=${slot.volume.toFixed(3)} latencyMs=${Date.now() - t0} reused=false`);
          }
        });
        p.addEventListener('error', () => {
          fail(t, sound, path, false);
          slots.delete(handle);
          t.release();
          onEnded(handle);
        });
        if (!sound.loop) {
          p.addEventListener('ended', () => {
            log(`[AUDIO_TEST] completed soundId=${sound.id} playerId=${t.id}`);
            release(handle);
            onEnded(handle);
          });
        }
        p.autoplay = true;
        p.src = path;
      })
      .catch(e => {
        log(`[AUDIO_ERROR] soundId=${sound.id} playerId=${t.id} init ${String(e)}`);
        slots.delete(handle);
        t.release();
        onEnded(handle);
      });
  };

  const reuse = (handle: number, w: Tracked, volume: number, slot: Slot) => {
    slot.pooled = true;
    slot.tracked = w;
    audioStats.reused++;
    audioStats.lastPlayerId = w.id;
    w.set('PLAYING');
    const done = () => {
      w.player.removeEventListener('ended', done);
      if (slots.get(handle) === slot) {
        release(handle);
        onEnded(handle);
      }
    };
    w.player.addEventListener('ended', done);
    const t0 = Date.now();
    try {
      w.player.volume = volume;
      w.player.currentTime = 0;
      w.player
        .play()
        .then(() => log(`[AUDIO_TEST] started soundId=${w.soundId} playerId=${w.id} volume=${volume.toFixed(3)} latencyMs=${Date.now() - t0} reused=true`))
        .catch(() => done());
    } catch {
      done();
    }
  };

  return {
    play(handle: number, sound: AudioDefinition, volume: number, explicitPath?: string | null) {
      const path = explicitPath ?? bundledPath(sound.id);
      audioStats.lastSoundId = sound.id;
      audioStats.lastPath = path ?? '(none)';
      log(`[AUDIO_TEST] play soundId=${sound.id} path=${path} channel=${sound.channel} volume=${volume.toFixed(3)} pooling=${audioConfig.pooling}`);
      if (!path) {
        audioStats.lastError = `no bundled file for ${sound.id}`;
        changed();
        onEnded(handle);
        return;
      }
      const slot: Slot = {tracked: null, volume, stopped: false, pooled: false};
      slots.set(handle, slot);
      if (audioConfig.pooling && sound.channel === 'sfx') {
        const w = warm.get(sound.id);
        if (w && w.state === 'IDLE') {
          reuse(handle, w, volume, slot);
          return;
        }
        if (!w) {
          prepare(sound, path);
        }
      }
      fresh(handle, sound, path, slot);
    },
    setVolume(handle, volume) {
      const slot = slots.get(handle);
      if (!slot) {
        return;
      }
      slot.volume = volume;
      if (slot.tracked) {
        try {
          slot.tracked.player.volume = volume;
        } catch {
          // ignore
        }
      }
    },
    stop(handle) {
      const slot = slots.get(handle);
      if (slot) {
        slot.stopped = true;
      }
      release(handle);
    },
    stopAll() {
      for (const [h, slot] of [...slots.entries()]) {
        slot.stopped = true;
        release(h);
        onEnded(h);
      }
      for (const w of warm.values()) {
        w.release();
      }
      warm.clear();
    },
  };
}

/** True while the app is in the foreground (sound pauses when the TV goes to Home). */
export function onForegroundChange(cb: (active: boolean) => void): () => void {
  const sub = AppState.addEventListener('change', state => cb(state === 'active'));
  return () => sub?.remove?.();
}
