import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {px, theme} from '../theme/theme';

/**
 * Case progress as discrete segments (scenes, puzzles). Done segments are
 * filled, the current one is outlined in brass, the rest are hairlines.
 * The count is also written out, so it isn't colour-only.
 */
export const RRProgress = ({total, done, current, label, testID}: {total: number; done: number; current?: number; label?: string; testID?: string}) => (
  <View style={styles.wrap} testID={testID} accessibilityLabel={`${label ?? 'Progress'}: ${done} of ${total}`}>
    <View style={styles.row}>
      {Array.from({length: total}, (_, i) => (
        <View key={i} style={[styles.segment, i < done ? styles.done : i === current ? styles.current : styles.todo]} />
      ))}
    </View>
    {label !== undefined && (
      <Text style={styles.label}>
        {label.toUpperCase()} {String(done).padStart(2, '0')}/{String(total).padStart(2, '0')}
      </Text>
    )}
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    gap: px(6),
  },
  segment: {
    width: px(46),
    height: px(6),
  },
  done: {
    backgroundColor: theme.colors.accent,
  },
  current: {
    borderWidth: 1,
    borderColor: theme.colors.focus,
    backgroundColor: theme.colors.accentWash,
  },
  todo: {
    backgroundColor: theme.colors.border,
  },
  label: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.textMuted,
    marginTop: px(8),
  },
});
