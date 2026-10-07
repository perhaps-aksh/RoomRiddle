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

interface Slot {
  player: AudioPlayer | null;
  volume: number;
  stopped: boolean;
}

const devLog = (msg: string) => {
  if (__DEV__) {
    console.log(`[audio] ${msg}`);
  }
};

export function createW3cBackend(onEnded: (handle: number) => void, log: (msg: string) => void = devLog): AudioBackend {
  const slots = new Map<number, Slot>();

  const release = (handle: number) => {
    const slot = slots.get(handle);
    slots.delete(handle);
    const p = slot?.player;
    if (p) {
      try {
        p.pause();
      } catch {
        // already gone
      }
      p.deinitialize().catch(() => undefined);
    }
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
          log(`${sound.id}: media error ${JSON.stringify(p.error)} src ${src}`);
          release(handle);
          onEnded(handle);
        });
        if (!sound.loop) {
          p.addEventListener('ended', () => {
            release(handle);
            onEnded(handle);
          });
        }
        p.addEventListener('playing', () => log(`${sound.id}: playing`));
        p.autoplay = true;
        log(`${sound.id}: src ${src}`);
        p.src = src;
      })().catch(e => {
        log(`${sound.id}: ${String(e)}`);
        slots.delete(handle);
        onEnded(handle);
      });
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
