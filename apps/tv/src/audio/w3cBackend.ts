import {AppState, Image} from 'react-native';
import {AudioContentType, AudioPlayer, AudioUsageType} from '@amazon-devices/react-native-w3cmedia';
import type {AudioDefinition} from '@roomriddle/shared-types';
import type {AudioBackend} from '@roomriddle/scene';
import {bundledAudio} from './bundled';

/**
 * Plays sounds on Vega with the W3C AudioPlayer (one player per playing sound).
 * Sources are the bundled files only; Vega's media player rejects `http://`
 * and the `file://` form of bundled asset URIs, so the scheme is stripped
 * (friction log FL-012). Every call is guarded: audio never breaks the game.
 */
export function bundledPath(id: string): string | null {
  const mod = bundledAudio[id];
  if (mod === undefined) {
    return null;
  }
  const uri = Image.resolveAssetSource(mod)?.uri ?? '';
  return uri ? uri.replace(/^file:\/\//, '') : null;
}

const contentType = (s: AudioDefinition) =>
  s.channel === 'music' ? AudioContentType.CONTENT_TYPE_MUSIC : s.channel === 'voice' ? AudioContentType.CONTENT_TYPE_SPEECH : AudioContentType.CONTENT_TYPE_SONIFICATION;

const devLog = (msg: string) => {
  if (__DEV__) {
    console.log(`[audio] ${msg}`);
  }
};

interface Slot {
  player: AudioPlayer | null;
  volume: number;
  stopped: boolean;
  /** A warm effect player: returned to the pool instead of torn down. */
  pooled?: string;
}

/**
 * Effects reuse one warm player per sound: creating a W3C player takes ~2 s on
 * the emulator, so a fresh player per press would lag. A warm player replays
 * from the start; if it's still busy, a fresh one plays alongside.
 */
interface Warm {
  player: AudioPlayer;
  busy: boolean;
  onDone: (() => void) | null;
}

export function createW3cBackend(onEnded: (handle: number) => void, log: (msg: string) => void = devLog): AudioBackend {
  const slots = new Map<number, Slot>();
  const warm = new Map<string, Warm | 'loading'>();

  const teardown = (p: AudioPlayer | null) => {
    if (!p) {
      return;
    }
    try {
      p.pause();
    } catch {
      // already gone
    }
    p.deinitialize().catch(() => undefined);
  };

  const release = (handle: number) => {
    const slot = slots.get(handle);
    slots.delete(handle);
    if (!slot) {
      return;
    }
    if (slot.pooled) {
      const w = warm.get(slot.pooled);
      if (w && w !== 'loading') {
        try {
          w.player.pause();
        } catch {
          // ignore
        }
        w.busy = false;
        w.onDone = null;
      }
      return;
    }
    teardown(slot.player);
  };

  /** Load an effect into its warm player (paused at the start). */
  const prepare = (sound: AudioDefinition, src: string) => {
    warm.set(sound.id, 'loading');
    (async () => {
      const p = new AudioPlayer(contentType(sound), AudioUsageType.USAGE_GAME);
      await p.initialize();
      const w: Warm = {player: p, busy: false, onDone: null};
      const done = () => {
        const cb = w.onDone;
        w.busy = false;
        w.onDone = null;
        cb?.();
      };
      p.addEventListener('ended', done);
      p.addEventListener('error', () => {
        log(`${sound.id}: warm player error ${JSON.stringify(p.error)}`);
        done();
      });
      p.loop = false;
      p.autoplay = false;
      p.src = src;
      warm.set(sound.id, w);
    })().catch(e => {
      log(`${sound.id}: warm ${String(e)}`);
      warm.delete(sound.id);
    });
  };

  const fresh = (handle: number, sound: AudioDefinition, src: string, slot: Slot) => {
    (async () => {
      const p = new AudioPlayer(contentType(sound), AudioUsageType.USAGE_GAME);
      await p.initialize();
      if (slot.stopped) {
        await p.deinitialize();
        return;
      }
      slot.player = p;
      p.loop = sound.loop;
      p.volume = slot.volume;
      p.addEventListener('error', () => {
        log(`${sound.id}: media error ${JSON.stringify(p.error)}`);
        release(handle);
        onEnded(handle);
      });
      if (!sound.loop) {
        p.addEventListener('ended', () => {
          release(handle);
          onEnded(handle);
        });
      }
      p.autoplay = true;
      p.src = src;
    })().catch(e => {
      log(`${sound.id}: ${String(e)}`);
      slots.delete(handle);
      onEnded(handle);
    });
  };

  return {
    play(handle, sound, volume) {
      const src = bundledPath(sound.id);
      if (!src) {
        log(`no bundled file for ${sound.id}`);
        onEnded(handle);
        return;
      }
      const slot: Slot = {player: null, volume, stopped: false};
      slots.set(handle, slot);
      if (sound.channel !== 'sfx') {
        fresh(handle, sound, src, slot);
        return;
      }
      const w = warm.get(sound.id);
      if (w && w !== 'loading' && !w.busy) {
        slot.pooled = sound.id;
        slot.player = w.player;
        w.busy = true;
        w.onDone = () => {
          slots.delete(handle);
          onEnded(handle);
        };
        try {
          w.player.volume = volume;
          w.player.currentTime = 0;
          w.player.play().catch(() => w.onDone?.());
        } catch {
          w.onDone?.();
        }
        return;
      }
      if (!w) {
        prepare(sound, src);
      }
      fresh(handle, sound, src, slot);
    },
    setVolume(handle, volume) {
      const slot = slots.get(handle);
      if (!slot) {
        return;
      }
      slot.volume = volume;
      if (slot.player) {
        try {
          slot.player.volume = volume;
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
  };
}

/** True while the app is in the foreground (sound pauses when the TV goes to Home). */
export function onForegroundChange(cb: (active: boolean) => void): () => void {
  const sub = AppState.addEventListener('change', state => cb(state === 'active'));
  return () => sub.remove();
}
