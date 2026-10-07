import React, {createContext, ReactNode, useContext, useEffect, useMemo, useRef} from 'react';
import type {AudioCommand} from '@roomriddle/shared-types';
import {AudioBackend, AudioDirector, AudioRegistry, ambientFor, momentCommands, musicCommand, MusicContext, musicStateFor} from '@roomriddle/scene';
import {audioManifests, coreCueSounds, coreMusic, getMysteryAudio} from '@roomriddle/mystery-data';
import {useGame} from '../game/GameContext';
import {channelGain} from '../settings/settings';
import {useSettings} from '../settings/SettingsContext';
import {setCueHandler, setWorldAudioHandler} from '../ui/cues';
import {createW3cBackend, onForegroundChange} from './w3cBackend';

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
}

const noop = () => undefined;
const AudioCtx = createContext<AudioApi>({report: noop, moment: noop, stopVoice: noop, hasVoice: () => false});

const registry = new AudioRegistry(audioManifests);

export const AudioProvider = ({children, backend: injected}: {children: ReactNode; backend?: (onEnded: (handle: number) => void) => AudioBackend}) => {
  const {settings} = useSettings();
  const {mystery, state, lastEvents, now} = useGame();
  const directorRef = useRef<AudioDirector | null>(null);
  if (!directorRef.current) {
    let director: AudioDirector | null = null;
    const ended = (h: number) => director?.ended(h, Date.now());
    let backend: AudioBackend;
    try {
      backend = (injected ?? createW3cBackend)(ended);
    } catch {
      backend = {play: (h: number) => ended(h), setVolume: noop, stop: noop};
    }
    director = new AudioDirector(registry, backend, {fadeMs: 1400, duckTo: 0.4});
    directorRef.current = director;
  }
  const director = directorRef.current;
  const run = (cmds: readonly AudioCommand[]) => {
    try {
      director.runAll(cmds, Date.now());
    } catch {
      // Audio must never break the game.
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
    run([
      {type: 'SET_VOLUME', gains: {music: channelGain(settings, 'music'), ambient: channelGain(settings, 'ambient'), sfx: channelGain(settings, 'sfx'), voice: channelGain(settings, 'voice')}},
      {type: 'MUTE', muted: settings.muted || !foreground.current},
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.master, settings.music, settings.sfx, settings.voice, settings.muted]);
  const mutedRef = useRef(settings.muted);
  mutedRef.current = settings.muted;
  useEffect(
    () =>
      onForegroundChange(active => {
        foreground.current = active;
        run([{type: 'MUTE', muted: mutedRef.current || !active}]);
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
        run([{type: 'PLAY_SFX', id}]);
      }
    });
    const offWorld = setWorldAudioHandler(ev => {
      if (ev.name === 'audio.cue' && typeof ev.payload?.cue === 'string') {
        run(momentCommands(directionRef.current, `cue:${ev.payload.cue}`));
      } else if (ev.name === 'dialogue' && typeof ev.payload?.audioId === 'string') {
        run([{type: 'PLAY_VOICE', id: ev.payload.audioId}]);
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
    run([...types].flatMap(t => momentCommands(directionRef.current, `event:${t}`)));
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
    const dir = directionRef.current;
    const remainingMs = deadline ? deadline - now() : null;
    const musicState = musicStateFor({...p, sceneId, remainingMs}, dir);
    const music = musicCommand(musicState, dir?.music, coreMusic);
    const layers = p.place === 'game' && dir ? ambientFor(dir, p.screen === 'puzzle' ? null : p.setId, sceneId) : [];
    run([...(music ? [music] : []), {type: 'PLAY_AMBIENT', ids: layers}]);
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
      moment: key => run(momentCommands(directionRef.current, key)),
      stopVoice: () => run([{type: 'STOP_VOICE'}]),
      hasVoice: audioId => !!audioId && registry.playable(audioId),
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
