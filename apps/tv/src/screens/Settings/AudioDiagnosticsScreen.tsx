import React, {useEffect, useRef, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import type {AudioDefinition} from '@roomriddle/shared-types';
import {AudioRegistry} from '@roomriddle/scene';
import {audioManifests} from '@roomriddle/mystery-data';
import {theme} from '../../theme/theme';
import {TVButton} from '../../components/TVButton/TVButton';
import {ScreenHeader} from '../../components/ScreenHeader/ScreenHeader';
import {useAudio} from '../../audio/AudioContext';
import {audioConfig, audioStats, assetPath, createW3cBackend, onAudioStats, W3cBackend} from '../../audio/w3cBackend';
import {channelGain} from '../../settings/settings';
import {useSettings} from '../../settings/SettingsContext';
import type {ScreenProps} from '../types';

/**
 * DEVELOPMENT ONLY (Phase 7A): play single sounds with nothing else running, to
 * prove the platform audio path layer by layer. The game's audio is suspended
 * while this screen is open. Reached from Settings in __DEV__ builds only.
 */

// The diagnostic beep: 1 s, 880 Hz, mono, 44.1 kHz. PCM WAV and the same beep as MP3.
const BEEP_WAV: number = require('../../assets/audio/diag/diagnostic-beep.wav');
const BEEP_MP3: number = require('../../assets/audio/diag/diagnostic-beep.mp3');

const registry = new AudioRegistry(audioManifests);
const sound = (id: string): AudioDefinition => registry.get(id)!;
const diag = (id: string, mod: number, channel: AudioDefinition['channel']): AudioDefinition & {mod: number} => ({
  id,
  channel,
  loop: false,
  status: 'placeholder',
  source: '',
  description: 'diagnostic',
  license: 'generated',
  mod,
});

const TESTS: {key: string; label: string; ids: string[]}[] = [
  {key: 'beep-wav', label: 'Beep (WAV)', ids: ['diag.wav']},
  {key: 'beep-mp3', label: 'Beep (MP3)', ids: ['diag.mp3']},
  {key: 'sfx', label: 'Test SFX', ids: ['core.sfx.unlock']},
  {key: 'click', label: 'UI click', ids: ['core.ui.select']},
  {key: 'music', label: 'Test Music', ids: ['core.music.menu']},
  {key: 'ambient', label: 'Test Ambient', ids: ['last-train.ambient.rain']},
  {key: 'voice', label: 'Test Voice', ids: ['last-train.vo.arrival-1']},
  {key: 'x3', label: '3 at once', ids: ['core.sfx.unlock', 'core.sfx.discovery', 'core.ui.success']},
  {key: 'x5', label: '5 at once', ids: ['core.sfx.unlock', 'core.sfx.discovery', 'core.ui.success', 'last-train.sfx.clock', 'last-train.sfx.paper']},
  {key: 'x10', label: '10 at once', ids: ['core.sfx.unlock', 'core.sfx.discovery', 'core.ui.success', 'last-train.sfx.clock', 'last-train.sfx.paper', 'last-train.sfx.latch', 'last-train.sfx.lever', 'last-train.sfx.steam', 'last-train.sfx.doors', 'core.ui.hint']},
];

export const AudioDiagnosticsScreen = ({navigator}: ScreenProps) => {
  const audio = useAudio();
  const {settings} = useSettings();
  const [, setTick] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const backend = useRef<W3cBackend | null>(null);
  const handle = useRef(1);

  useEffect(() => {
    audio.suspend(true);
    const say = (m: string) => setLog(l => [m, ...l].slice(0, 8));
    backend.current = createW3cBackend(
      () => setTick(t => t + 1),
      m => {
        console.log(m);
        say(m.replace(/^\[AUDIO_(TEST|ERROR)\] /, ''));
      },
    );
    const off = onAudioStats(() => setTick(t => t + 1));
    return () => {
      off();
      backend.current?.stopAll();
      audio.suspend(false);
    };
  }, [audio]);

  const play = (ids: string[]) => {
    for (const id of ids) {
      const def: AudioDefinition & {mod?: number} = id === 'diag.wav' ? diag(id, BEEP_WAV, 'sfx') : id === 'diag.mp3' ? diag(id, BEEP_MP3, 'sfx') : sound(id);
      // The beeps ignore the volume settings (full level unless Sound is off), to test the path alone.
      const gain = settings.muted ? 0 : def.mod !== undefined ? 1 : channelGain(settings, def.channel) * (def.volume ?? 1);
      backend.current?.play(handle.current++, def, gain, def.mod !== undefined ? assetPath(def.mod) : undefined);
    }
  };

  /**
   * The scripted check: every step logs `[AUDIO_SEQ] step=…` with the time, so the
   * device log lines up with a recording of the emulator's output (vvd-wav-start.sh).
   * Steps are separated by ~3 s of silence; each ends with Stop all.
   */
  const [running, setRunning] = useState(false);
  const runSequence = async () => {
    if (running || !backend.current) {
      return;
    }
    setRunning(true);
    const b = backend.current;
    const wait = (ms: number) => new Promise<void>(r => setTimeout(() => r(), ms));
    const mark = (step: string) => console.log(`[AUDIO_SEQ] step=${step} t=${Date.now()} created=${audioStats.created} released=${audioStats.released} active=${audioStats.active} errors=${audioStats.errors}`);
    const gap = async () => {
      b.stopAll();
      await wait(3000);
    };
    const one = async (step: string, ids: string[], ms: number) => {
      mark(step);
      play(ids);
      await wait(ms);
      await gap();
    };
    const wasPooling = audioConfig.pooling;
    audioConfig.pooling = false;
    try {
      mark('begin');
      await wait(2000);
      await one('beep-wav', ['diag.wav'], 4000);
      await one('beep-mp3', ['diag.mp3'], 4000);
      await one('sfx', ['core.sfx.unlock'], 4000);
      await one('click', ['core.ui.select'], 3000);
      // Music at full, half, then zero volume on the same player (the volume path).
      mark('music-100');
      const h = handle.current++;
      b.play(h, sound('core.music.menu'), 1);
      await wait(6000);
      mark('music-50');
      b.setVolume(h, 0.5);
      await wait(3000);
      mark('music-0');
      b.setVolume(h, 0);
      await wait(3000);
      await gap();
      await one('ambient', ['last-train.ambient.rain'], 6000);
      await one('voice', ['last-train.vo.arrival-1'], 8000);
      await one('x3', TESTS.find(t => t.key === 'x3')!.ids, 5000);
      await one('x5', TESTS.find(t => t.key === 'x5')!.ids, 6000);
      await one('x10', TESTS.find(t => t.key === 'x10')!.ids, 8000);
      await one('stack', ['core.music.menu', 'last-train.ambient.rain', 'last-train.vo.arrival-1', 'core.sfx.unlock'], 8000);
      // Player reuse: warm up, then five clicks 800 ms apart.
      audioConfig.pooling = true;
      mark('reuse-warmup');
      play(['core.sfx.unlock']);
      await wait(4000);
      for (let i = 0; i < 5; i++) {
        mark(`reuse-${i + 1}`);
        play(['core.sfx.unlock']);
        await wait(800);
      }
      await wait(3000);
      await gap();
      audioConfig.pooling = false;
      await wait(3000);
      mark('end');
    } finally {
      audioConfig.pooling = wasPooling;
      setRunning(false);
    }
  };

  const s = audioStats;
  const rows: [string, string][] = [
    ['Audio initialized', backend.current ? 'YES' : 'NO'],
    ['Sound enabled', settings.muted ? 'NO (Sound is off in Settings)' : 'YES'],
    ['Volumes', `master ${settings.master}% · music ${settings.music}% · effects ${settings.sfx}% · voice ${settings.voice}%`],
    ['Player reuse', audioConfig.pooling ? 'ON (pooled effects)' : 'OFF (fresh player per sound)'],
    ['Players', `active ${s.active} · created ${s.created} · released ${s.released} · reused ${s.reused} · errors ${s.errors}`],
    ['States', Object.entries(s.states).map(([id, st]) => `${id}:${st}`).join(' ') || '-'],
    ['Last sound', `${s.lastSoundId || '-'} (player ${s.lastPlayerId || '-'})`],
    ['Last path', s.lastPath || '-'],
    ['Last error', s.lastError || '-'],
  ];

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Audio diagnostics" eyebrow="Development" />
      <View style={styles.columns}>
        <ScrollView style={styles.buttons} contentContainerStyle={styles.buttonsInner}>
          <TVButton label={running ? 'Running…' : 'Run sequence'} onPress={runSequence} preferredFocus testID="diag-sequence" />
          {TESTS.map(t => (
            <TVButton key={t.key} label={t.label} onPress={() => play(t.ids)} testID={`diag-${t.key}`} />
          ))}
          <TVButton
            label={`Reuse: ${audioConfig.pooling ? 'on' : 'off'}`}
            onPress={() => {
              audioConfig.pooling = !audioConfig.pooling;
              backend.current?.stopAll();
              setTick(t => t + 1);
            }}
            testID="diag-pooling"
          />
          <TVButton label="Stop all" onPress={() => backend.current?.stopAll()} testID="diag-stop" />
          <TVButton label="Back" onPress={() => navigator.back()} testID="diag-back" />
        </ScrollView>
        <View style={styles.status}>
          {rows.map(([k, v]) => (
            <View key={k} style={styles.row}>
              <Text style={styles.key}>{k}</Text>
              <Text style={styles.value} numberOfLines={2}>
                {v}
              </Text>
            </View>
          ))}
          <Text style={styles.logTitle}>LOG</Text>
          {log.map((l, i) => (
            <Text key={i} style={styles.log} numberOfLines={1}>
              {l}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, paddingHorizontal: theme.spacing.screenX, paddingTop: theme.spacing.screenY, paddingBottom: theme.spacing.screenY},
  columns: {flex: 1, flexDirection: 'row', gap: 48},
  buttons: {width: 420, flexGrow: 0},
  buttonsInner: {gap: 8, paddingBottom: 24},
  status: {flex: 1},
  row: {flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.colors.surfaceElevated},
  key: {width: 220, color: theme.colors.faintText, fontSize: 22},
  value: {flex: 1, color: theme.colors.text, fontSize: 22},
  logTitle: {marginTop: 16, color: theme.colors.faintText, fontSize: 20, letterSpacing: 2},
  log: {color: theme.colors.text, fontSize: 18, fontFamily: 'monospace'},
});
