import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {ScreenHeader} from '../../components/ScreenHeader/ScreenHeader';
import {TVButton} from '../../components/TVButton/TVButton';
import {px, theme} from '../../theme/theme';
import {useMotionPrefs} from '../../ui/motion';
import {useWorldSession} from '../../world/WorldSession';
import {RRBadge} from '../../ui/RRBadge';
import {ScreenProps} from '../types';

interface SettingItem {
  key: string;
  label: string;
  options: readonly string[];
  description: string;
  /** Applied immediately (true), or a preview of a later phase (false). */
  live: boolean;
}

const SETTINGS: readonly SettingItem[] = [
  {key: 'motion', label: 'Motion', options: ['Full', 'Reduced'], description: 'Reduced removes movement and zoom from focus, transitions and reveals. Fades stay short and gentle.', live: true},
  {
    key: 'world',
    label: 'Scenes',
    options: ['Cinematic', 'Case file'],
    description: 'Cinematic plays each scene as a 2.5D world you explore with the remote. Case file shows the same scene as a written case file.',
    live: true,
  },
  {key: 'sound', label: 'Sound', options: ['On', 'Off'], description: 'Sound effects for clues, answers and timers.', live: false},
  {key: 'music', label: 'Music', options: ['On', 'Off'], description: 'Atmospheric music during a mystery.', live: false},
  {key: 'display', label: 'Display', options: ['Standard', 'Large Text'], description: 'Text size for the room and story screens.', live: false},
  {key: 'controls', label: 'Controls', options: ['Remote'], description: '▲ ▼ ◀ ▶ move focus · OK selects · BACK returns to the previous screen.', live: false},
];

/**
 * Settings. Motion (reduced-motion preference for the whole app) and Scenes
 * (2.5D world or case file) are live for this session. The rest cycle on OK as previews; sound and music arrive with
 * the audio phase.
 */
export const SettingsScreen = ({navigator}: ScreenProps) => {
  const {reduced, setReduced} = useMotionPrefs();
  const world = useWorldSession();
  const [values, setValues] = useState<Record<string, number>>({});
  const [focusedKey, setFocusedKey] = useState(SETTINGS[0]?.key ?? 'back');
  const focused = SETTINGS.find(s => s.key === focusedKey);

  const valueOf = (item: SettingItem) => (item.key === 'motion' ? (reduced ? 1 : 0) : item.key === 'world' ? (world.enabled ? 0 : 1) : values[item.key] ?? 0);
  const cycle = (item: SettingItem) => {
    if (item.key === 'motion') {
      setReduced(!reduced);
      return;
    }
    if (item.key === 'world') {
      world.setEnabled(!world.enabled);
      return;
    }
    setValues(current => ({...current, [item.key]: ((current[item.key] ?? 0) + 1) % item.options.length}));
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Settings" eyebrow="System" />

      <View style={styles.body}>
        <View style={styles.list}>
          {SETTINGS.map((item, index) => (
            <TVButton
              key={item.key}
              label={item.label}
              value={item.options[valueOf(item)]}
              onPress={() => cycle(item)}
              onFocus={() => setFocusedKey(item.key)}
              preferredFocus={index === 0}
              testID={`settings-${item.key}`}
            />
          ))}
          <View style={styles.gap} />
          <TVButton label="Back" onPress={() => navigator.back()} onFocus={() => setFocusedKey('back')} testID="settings-back" />
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHead}>
            <Text style={styles.panelTitle}>{focused ? focused.label.toUpperCase() : 'BACK'}</Text>
            {focused && <RRBadge label={focused.live ? 'Active' : 'Preview'} tone={focused.live ? 'success' : 'muted'} />}
          </View>
          <Text style={styles.panelText}>{focused ? focused.description : 'Return to the home screen.'}</Text>
          <Text style={styles.placeholder}>
            {focused?.live ? 'Applies immediately, for this session.' : 'Preview only. This setting is not saved or applied yet.'}
          </Text>
        </View>
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
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xxl,
  },
  list: {
    gap: theme.spacing.xs,
  },
  gap: {
    height: theme.spacing.md,
  },
  panel: {
    flex: 1,
    maxWidth: px(760),
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
    fontSize: px(34),
    lineHeight: px(48),
    marginTop: theme.spacing.md,
    color: theme.colors.textPrimary,
  },
  placeholder: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    marginTop: theme.spacing.lg,
    color: theme.colors.textMuted,
  },
});
