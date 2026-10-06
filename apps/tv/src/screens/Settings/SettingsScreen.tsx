import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {ScreenHeader} from '../../components/ScreenHeader/ScreenHeader';
import {TVButton} from '../../components/TVButton/TVButton';
import {px, theme} from '../../theme/theme';
import {nextVolume, Settings} from '../../settings/settings';
import {useSettings} from '../../settings/SettingsContext';
import {RRBadge} from '../../ui/RRBadge';
import {ScreenProps} from '../types';

interface SettingItem {
  key: string;
  label: string;
  description: string;
  /** Saved and applied (true), or a preview of a later phase (false). */
  live: boolean;
  /** Current value shown on the row. */
  value: (s: Settings) => string;
  /** What OK does. Absent for information-only rows. */
  next?: (s: Settings) => Partial<Settings>;
}

const pct = (v: number) => (v === 0 ? 'Off' : `${v}%`);
const PREVIEW_DISPLAY = ['Standard', 'Large Text'] as const;

const SETTINGS: readonly SettingItem[] = [
  {
    key: 'motion',
    label: 'Motion',
    description: 'Reduced removes movement and zoom from focus, transitions and reveals. Fades stay short and gentle.',
    live: true,
    value: s => (s.motion === 'reduced' ? 'Reduced' : 'Full'),
    next: s => ({motion: s.motion === 'reduced' ? 'full' : 'reduced'}),
  },
  {
    key: 'world',
    label: 'Scenes',
    description: 'Cinematic plays each scene as a 2.5D world you explore with the remote. Case file shows the same scene as a written case file.',
    live: true,
    value: s => (s.scenes === 'cinematic' ? 'Cinematic' : 'Case file'),
    next: s => ({scenes: s.scenes === 'cinematic' ? 'casefile' : 'cinematic'}),
  },
  {
    key: 'sound',
    label: 'Sound',
    description: 'All game audio: music, ambience, effects and the detective\'s voice. Off mutes everything without losing your levels.',
    live: true,
    value: s => (s.muted ? 'Off' : 'On'),
    next: s => ({muted: !s.muted}),
  },
  {key: 'master', label: 'Volume', description: 'Overall level for all game audio.', live: true, value: s => pct(s.master), next: s => ({master: nextVolume(s.master)})},
  {key: 'music', label: 'Music', description: 'The score: menus, investigation, danger and the reveal.', live: true, value: s => pct(s.music), next: s => ({music: nextVolume(s.music)})},
  {key: 'sfx', label: 'Effects', description: 'Clues, answers, timers, and the station around you (rain, wind, trains).', live: true, value: s => pct(s.sfx), next: s => ({sfx: nextVolume(s.sfx)})},
  {key: 'voice', label: 'Voice', description: 'The detective and other spoken lines.', live: true, value: s => pct(s.voice), next: s => ({voice: nextVolume(s.voice)})},
  {
    key: 'subtitles',
    label: 'Subtitles',
    description: 'Show spoken lines as text. Lines without a recording are always shown.',
    live: true,
    value: s => (s.subtitles ? 'On' : 'Off'),
    next: s => ({subtitles: !s.subtitles}),
  },
  {key: 'display', label: 'Display', description: 'Text size for the room and story screens.', live: false, value: () => PREVIEW_DISPLAY[0]},
  {key: 'controls', label: 'Controls', description: '▲ ▼ ◀ ▶ move focus · OK selects · BACK returns to the previous screen.', live: false, value: () => 'Remote'},
];

const SECTIONS = [
  {title: 'GAME', keys: ['motion', 'world', 'subtitles', 'display', 'controls']},
  {title: 'SOUND', keys: ['sound', 'master', 'music', 'sfx', 'voice']},
] as const;

/**
 * Settings. Every live row is saved on this TV and applies at once
 * (settings/SettingsContext); Display and Controls are previews.
 */
export const SettingsScreen = ({navigator}: ScreenProps) => {
  const {settings, update} = useSettings();
  const [focusedKey, setFocusedKey] = useState(SETTINGS[0]?.key ?? 'back');
  const focused = SETTINGS.find(s => s.key === focusedKey);

  const row = (item: SettingItem) => (
    <TVButton
      key={item.key}
      label={item.label}
      value={item.value(settings)}
      onPress={() => item.next && update(item.next(settings))}
      onFocus={() => setFocusedKey(item.key)}
      preferredFocus={item.key === SETTINGS[0]?.key}
      testID={`settings-${item.key}`}
    />
  );

  const panel = (
      <View style={styles.panel}>
      <View style={styles.panelHead}>
        <Text style={styles.panelTitle}>{focused ? focused.label.toUpperCase() : 'BACK'}</Text>
        {focused && <RRBadge label={focused.live ? 'Active' : 'Preview'} tone={focused.live ? 'success' : 'muted'} />}
      </View>
      <Text style={styles.panelText}>{focused ? focused.description : 'Return to the home screen.'}</Text>
      <Text style={styles.placeholder}>
        {focused?.live ? 'Saved on this TV' : 'Preview · not applied yet'}
      </Text>
      </View>
  );

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Settings" eyebrow="System" />

      <View style={styles.columns}>
        {SECTIONS.map(section => (
          <View key={section.title} style={styles.column}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.keys.map(key => SETTINGS.find(i => i.key === key)).map(item => item && row(item))}
            {section.title === SECTIONS[1]?.title && panel}
            {section.title === SECTIONS[0]?.title && (
              <>
                <View style={styles.gap} />
                <TVButton label="Back" onPress={() => navigator.back()} onFocus={() => setFocusedKey('back')} testID="settings-back" />
              </>
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: theme.spacing.screenX,
    paddingTop: theme.spacing.screenY,
    paddingBottom: theme.spacing.screenY,
  },
  columns: {
    flexDirection: 'row',
    gap: theme.spacing.xl,
    marginTop: theme.spacing.md,
  },
  column: {
    gap: theme.spacing.xs,
  },
  sectionTitle: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.textMuted,
    paddingLeft: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  gap: {
    height: theme.spacing.sm,
  },
  panel: {
    width: px(640),
    marginTop: theme.spacing.lg,
    paddingLeft: theme.spacing.xl,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
  },
  panelHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panelTitle: {
    ...theme.text.label,
    color: theme.colors.accent,
  },
  panelText: {
    ...theme.text.narration,
    fontSize: px(28),
    lineHeight: px(38),
    marginTop: theme.spacing.sm,
    color: theme.colors.textPrimary,
  },
  placeholder: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    marginTop: theme.spacing.sm,
    color: theme.colors.textMuted,
  },
});
