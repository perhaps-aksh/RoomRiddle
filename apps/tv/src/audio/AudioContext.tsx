import React, {createContext, ReactNode, useContext, useEffect, useMemo, useRef} from 'react';
import type {AudioCommand} from '@roomriddle/shared-types';
import {AudioBackend, AudioDirector, AudioRegistry, ambientFor, momentCommands, musicCommand, MusicContext, musicStateFor} from '@roomriddle/scene';
import {audioManifests, coreCueSounds, coreMusic, getMysteryAudio} from '@roomriddle/mystery-data';
import {useGame} from '../game/GameContext';
import {channelGain} from '../settings/settings';
import {useSettings} from '../settings/SettingsContext';
import {setCueHandler, setWorldAudioHandler} from '../ui/cues';
import {bundledPath, createW3cBackend, onForegroundChange} from './w3cBackend';
import {trace} from './trace';

/**
 * The TV's AudioManager. One AudioDirector (packages/scene) does the mixing:
 *   music   – a bed per music state, crossfaded (musicStateFor)
 *   ambient – layers per world set / scene (the mystery's AudioDirection)
 *   sfx     – UI cues, timeline cues, object inspection, engine events
 *   voice   – dialogue lines with an audioId; ducks the music
 * Screens only say where the players are (useAudioPlace); what plays is data.
 * The game state stays the source of truth; audio only listens.
 */

/** Where the players are, as screens report it. */
export interface AudioPlace {
  place: MusicContext['place'];
  screen?: MusicContext['screen'];
  puzzleId?: string | null;
  /** The 2.5D world: its cinematic flag and current set. */
  cinematic?: boolean;
  setId?: string | null;
  /** A screen is still loading what it will report: keep the current sound until it does. */
  holding?: boolean;
}

interface AudioApi {
  /** Report the current place (Shell: route; WorldScreen: set and cinematic). Merged. */
  report: (part: Partial<AudioPlace>) => void;
  /** A named moment from the mystery's direction (e.g. `inspect:obj-clock`). */
  moment: (key: string) => void;
  /** Stop the voice line (dialogue advanced or skipped). */
  stopVoice: () => void;
  /** Whether a recorded line exists for this audio id (subtitle rules). */
  hasVoice: (audioId: string | undefined) => boolean;
  /** Diagnostics: silence the game's audio entirely (and resume it after). */
  suspend: (on: boolean) => void;
  /** Speak a line served from a URL (an AI character's reply): voice channel, music ducked. */
  speakUrl: (id: string, url: string) => void;
}

const noop = () => undefined;
const AudioCtx = createContext<AudioApi>({report: noop, moment: noop, stopVoice: noop, hasVoice: () => false, suspend: noop, speakUrl: noop});
const isRemote = (source: string | undefined) => !!source && /^https?:\/\//.test(source);

const registry = new AudioRegistry(audioManifests);

export const AudioProvider = ({children, backend: injected}: {children: ReactNode; backend?: (onEnded: (handle: number) => void) => AudioBackend}) => {
  const {settings} = useSettings();
  const {mystery, state, lastEvents, now} = useGame();
  const directorRef = useRef<AudioDirector | null>(null);
  const sceneRef = useRef<string | null>(null);
  sceneRef.current = state?.currentSceneId ?? null;
  if (!directorRef.current) {
    let director: AudioDirector | null = null;
    const names = new Map<number, string>();
    const ended = (h: number) => {
      trace('end', `h=${h} id=${names.get(h) ?? '?'}`);
      names.delete(h);
      director?.ended(h, Date.now());
      if (__DEV__ && director) {
        trace('state', `music=${director.currentMusic ?? '-'} voice=${director.currentVoice ?? '-'} ducked=${!!director.currentVoice && !!director.currentMusic} ambient=[${director.ambientLayers.join(',')}]`);
      }
    };
    let raw: AudioBackend;
    try {
      raw = (injected ?? createW3cBackend)(ended);
    } catch {
      raw = {play: (h: number) => ended(h), setVolume: noop, stop: noop};
    }
    // Trace what the director asks of the platform (volume lines only when they move).
    const lastVol = new Map<number, number>();
    const reported = new Set<string>();
    const backend: AudioBackend = {
      play: (h, sound, volume) => {
        if (!injected && !reported.has(sound.id) && !isRemote(sound.source) && !bundledPath(sound.id)) {
          reported.add(sound.id);
          // In the manifest but not in this build: say which, where, and why; the game goes on.
          trace('missing', `id=${sound.id} reason=not-bundled path=- scene=${sceneRef.current ?? '-'}`);
          if (__DEV__) {
            console.warn(`[AUDIO_MISSING] id=${sound.id} reason=not-bundled scene=${sceneRef.current ?? '-'}`);
          }
        }
        names.set(h, sound.id);
        lastVol.set(h, volume);
        trace('play', `h=${h} id=${sound.id} ch=${sound.channel} vol=${volume.toFixed(3)} loop=${sound.loop}`);
        if (isRemote(sound.source)) {
          // Streamed from the game server: hand the platform the URL itself.
          (raw as AudioBackend & {play(h: number, s: typeof sound, v: number, path?: string | null): void}).play(h, sound, volume, sound.source);
        } else {
          raw.play(h, sound, volume);
        }
      },
      setVolume: (h, volume) => {
        const prev = lastVol.get(h);
        if (prev === undefined || Math.abs(prev - volume) >= 0.05 || (volume === 0) !== (prev === 0)) {
          lastVol.set(h, volume);
          trace('vol', `h=${h} id=${names.get(h) ?? '?'} vol=${volume.toFixed(3)}`);
        }
        raw.setVolume(h, volume);
      },
      stop: h => {
        trace('stop', `h=${h} id=${names.get(h) ?? '?'}`);
        names.delete(h);
        lastVol.delete(h);
        raw.stop(h);
      },
    };
    director = new AudioDirector(registry, backend, {
      fadeMs: 1400,
      duckTo: 0.4,
      // A referenced sound with no entry or no file: logged once, never blocks the game.
      onMissing: (id, reason) => {
        trace('missing', `id=${id} reason=${reason} scene=${sceneRef.current ?? '-'}`);
        if (__DEV__) {
          console.warn(`[AUDIO_MISSING] id=${id} reason=${reason} scene=${sceneRef.current ?? '-'}`);
        }
      },
    });
    directorRef.current = director;
  }
  const director = directorRef.current;
  const suspended = useRef(false);
  const run = (cmds: readonly AudioCommand[], cause = '') => {
    if (suspended.current || cmds.length === 0) {
      return;
    }
    if (__DEV__) {
      trace('cmd', `${cause} ${cmds.map(c => c.type + ('id' in c ? `:${c.id}` : 'ids' in c ? `:[${c.ids.join(',')}]` : '')).join(' ')}`);
    }
    try {
      director.runAll(cmds, Date.now());
    } catch {
      // Audio must never break the game.
    }
    if (__DEV__) {
      trace('state', `music=${director.currentMusic ?? '-'} voice=${director.currentVoice ?? '-'} ducked=${!!director.currentVoice && !!director.currentMusic} ambient=[${director.ambientLayers.join(',')}]`);
    }
    kick();
  };

  // Fades advance on a light timer that runs only while something is fading.
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const kick = () => {
    if (timer.current || !director.fading) {
      return;
    }
    timer.current = setInterval(() => {
      director.tick(Date.now());
      if (!director.fading && timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
    }, 80);
  };
  useEffect(
    () => () => {
      if (timer.current) {
        clearInterval(timer.current);
      }
      director.stopAll();
    },
    [director],
  );

  // Settings → mixer.
  const foreground = useRef(true);
  useEffect(() => {
    run(
      [
        {type: 'SET_VOLUME', gains: {music: channelGain(settings, 'music'), ambient: channelGain(settings, 'ambient'), sfx: channelGain(settings, 'sfx'), voice: channelGain(settings, 'voice')}},
        {type: 'MUTE', muted: settings.muted || !foreground.current},
      ],
      'settings',
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.master, settings.music, settings.sfx, settings.voice, settings.muted]);
  const mutedRef = useRef(settings.muted);
  mutedRef.current = settings.muted;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  useEffect(
    () =>
      onForegroundChange(active => {
        foreground.current = active;
        run([{type: 'MUTE', muted: mutedRef.current || !active}], active ? 'foreground' : 'background');
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // The mystery being played decides its own sounds.
  const mysteryAudio = mystery ? getMysteryAudio(mystery.summary.id) : undefined;
  const directionRef = useRef(mysteryAudio?.direction);
  directionRef.current = mysteryAudio?.direction;

  // UI cues and world moments.
  useEffect(() => {
    const offCue = setCueHandler(name => {
      // Discovery is sounded by the engine event (so a phone's discovery is heard too).
      const id = name === 'discovery' ? undefined : coreCueSounds[name];
      if (id) {
        run([{type: 'PLAY_SFX', id}], `ui:${name}`);
      }
    });
    const offWorld = setWorldAudioHandler(ev => {
      if (ev.name === 'audio.cue' && typeof ev.payload?.cue === 'string') {
        run(momentCommands(directionRef.current, `cue:${ev.payload.cue}`), `cue:${ev.payload.cue}`);
      } else if (ev.name === 'dialogue' && typeof ev.payload?.audioId === 'string') {
        run([{type: 'PLAY_VOICE', id: ev.payload.audioId}], `dialogue:${String(ev.payload.lineId ?? '')}`);
      }
    });
    return () => {
      offCue();
      offWorld();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Engine events (anyone's): the mystery's `event:<type>` moments.
  const seenEvents = useRef<readonly unknown[] | null>(null);
  useEffect(() => {
    if (lastEvents === seenEvents.current) {
      return;
    }
    seenEvents.current = lastEvents;
    const types = new Set(lastEvents.map(e => e.type));
    run([...types].flatMap(t => momentCommands(directionRef.current, `event:${t}`)), `events:${[...types].join(',')}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastEvents]);

  // Place → music state and ambient layers.
  const place = useRef<AudioPlace>({place: 'menu'});
  const [version, setVersion] = React.useState(0);
  const sceneId = state?.currentSceneId ?? null;
  const deadline = state?.deadline ?? null;
  const [tensionTick, setTensionTick] = React.useState(0);
  useEffect(() => {
    if (!deadline) {
      return;
    }
    const id = setInterval(() => setTensionTick(n => n + 1), 5000);
    return () => clearInterval(id);
  }, [deadline]);
  useEffect(() => {
    const p = place.current;
    if (p.holding) {
      return;
    }
    const dir = directionRef.current;
    const remainingMs = deadline ? deadline - now() : null;
    const musicState = musicStateFor({...p, sceneId, remainingMs}, dir);
    const music = musicCommand(musicState, dir?.music, coreMusic);
    const layers = p.place === 'game' && dir ? ambientFor(dir, p.screen === 'puzzle' ? null : p.setId, sceneId) : [];
    run([...(music ? [music] : []), {type: 'PLAY_AMBIENT', ids: layers}], `place:${p.place}/${p.screen ?? '-'}/${p.setId ?? '-'}/${sceneId ?? '-'} state=${musicState}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, sceneId, deadline, tensionTick, mysteryAudio]);

  const api = useMemo<AudioApi>(
    () => ({
      report: part => {
        const next = {...place.current, ...part};
        if (JSON.stringify(next) !== JSON.stringify(place.current)) {
          place.current = next;
          setVersion(v => v + 1);
        }
      },
      moment: key => run(momentCommands(directionRef.current, key), key),
      stopVoice: () => run([{type: 'STOP_VOICE'}], 'dialogue-advance'),
      speakUrl: (id, url) => {
        registry.register({id, channel: 'voice', loop: false, status: 'final', source: url, description: 'Spoken reply from the game server', license: 'Generated at runtime (TTS)'});
        run([{type: 'PLAY_VOICE', id}], `reply:${id}`);
      },
      // Heard only if the manifest has it AND the file is in the build (else the text must show).
      hasVoice: audioId => !!audioId && registry.playable(audioId) && (injected ? true : !!bundledPath(audioId)),
      suspend: on => {
        if (on === suspended.current) {
          return;
        }
        suspended.current = on;
        if (on) {
          director.stopAll();
        } else {
          // Re-apply the mix and the current place's music/ambience.
          run([
            {type: 'SET_VOLUME', gains: {music: channelGain(settingsRef.current, 'music'), ambient: channelGain(settingsRef.current, 'ambient'), sfx: channelGain(settingsRef.current, 'sfx'), voice: channelGain(settingsRef.current, 'voice')}},
            {type: 'MUTE', muted: settingsRef.current.muted || !foreground.current},
          ]);
          setVersion(v => v + 1);
        }
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  return <AudioCtx.Provider value={api}>{children}</AudioCtx.Provider>;
};

export function useAudio(): AudioApi {
  return useContext(AudioCtx);
}

/** Report part of the current place while mounted (and whenever it changes). */
export function useAudioPlace(part: Partial<AudioPlace>): void {
  const {report} = useAudio();
  const key = JSON.stringify(part);
  useEffect(() => {
    report(JSON.parse(key) as Partial<AudioPlace>);
  }, [key, report]);
}
