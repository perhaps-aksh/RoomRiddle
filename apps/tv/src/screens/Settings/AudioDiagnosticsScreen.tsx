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
          {TESTS.map((t, i) => (
            <TVButton key={t.key} label={t.label} onPress={() => play(t.ids)} preferredFocus={i === 0} testID={`diag-${t.key}`} />
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
