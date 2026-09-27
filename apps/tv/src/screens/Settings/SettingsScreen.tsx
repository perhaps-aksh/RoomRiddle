import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {ScreenHeader} from '../../components/ScreenHeader/ScreenHeader';
import {TVButton} from '../../components/TVButton/TVButton';
import {px, theme} from '../../theme/theme';
import {ScreenProps} from '../types';

interface SettingItem {
  key: string;
  label: string;
  /** Placeholder values; nothing is persisted or applied yet. */
  options: readonly string[];
  description: string;
}

const SETTINGS: readonly SettingItem[] = [
  {key: 'sound', label: 'Sound', options: ['On', 'Off'], description: 'Sound effects for clues, answers and timers.'},
  {key: 'music', label: 'Music', options: ['On', 'Off'], description: 'Atmospheric music during a mystery.'},
  {key: 'display', label: 'Display', options: ['Standard', 'Large Text'], description: 'Text size for the room and story screens.'},
  {key: 'controls', label: 'Controls', options: ['Remote'], description: '▲ ▼ ◀ ▶ move focus · OK selects · BACK returns to the previous screen.'},
];

/**
 * Settings: UI PROTOTYPE. Values cycle on OK for the demo but aren't saved or applied yet.
 */
export const SettingsScreen = ({navigator}: ScreenProps) => {
  const [values, setValues] = useState<Record<string, number>>({});
  const [focusedKey, setFocusedKey] = useState(SETTINGS[0].key);
  const focused = SETTINGS.find(s => s.key === focusedKey);

  const cycle = (item: SettingItem) =>
    setValues(current => ({
      ...current,
      [item.key]: ((current[item.key] ?? 0) + 1) % item.options.length,
    }));

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Settings" />

      <View style={styles.body}>
        <View style={styles.list}>
          {SETTINGS.map((item, index) => (
            <TVButton
              key={item.key}
              label={item.label}
              value={item.options[values[item.key] ?? 0]}
              onPress={() => cycle(item)}
              onFocus={() => setFocusedKey(item.key)}
              preferredFocus={index === 0}
              testID={`settings-${item.key}`}
            />
          ))}
          <View style={styles.gap} />
          <TVButton
            label="Back"
            onPress={() => navigator.back()}
            onFocus={() => setFocusedKey('back')}
            testID="settings-back"
          />
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>
            {focused ? focused.label.toUpperCase() : 'BACK'}
          </Text>
          <Text style={styles.panelText}>
            {focused ? focused.description : 'Return to the home screen.'}
          </Text>
          <Text style={styles.placeholder}>Preview only. Settings are not saved yet.</Text>
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
    maxWidth: px(720),
    paddingLeft: theme.spacing.xl,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
  },
  panelTitle: {
    color: theme.colors.accent,
    fontSize: theme.type.caption,
    letterSpacing: px(6),
  },
  panelText: {
    marginTop: theme.spacing.md,
    color: theme.colors.text,
    fontSize: px(34),
    lineHeight: px(48),
    fontWeight: '300',
  },
  placeholder: {
    marginTop: theme.spacing.lg,
    color: theme.colors.faintText,
    fontSize: theme.type.caption,
  },
});
