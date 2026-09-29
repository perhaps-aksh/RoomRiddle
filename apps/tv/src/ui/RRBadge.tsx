import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {px, theme} from '../theme/theme';

export type BadgeTone = 'accent' | 'success' | 'danger' | 'warning' | 'signal' | 'muted';

const TONE: Record<BadgeTone, {fg: string; bg: string}> = {
  accent: {fg: theme.colors.accentStrong, bg: theme.colors.accentWash},
  success: {fg: theme.colors.success, bg: theme.colors.successWash},
  danger: {fg: theme.colors.danger, bg: theme.colors.dangerWash},
  warning: {fg: theme.colors.warning, bg: theme.colors.warningWash},
  signal: {fg: theme.colors.signalStrong, bg: theme.colors.signalWash},
  muted: {fg: theme.colors.textSecondary, bg: theme.colors.hairline},
};

/**
 * A status chip. Always carries a glyph and a word, so state is never
 * communicated by colour alone (● online, ○ offline, ✓ solved, 🔒 locked…).
 */
export const RRBadge = ({label, glyph, tone = 'muted', testID}: {label: string; glyph?: string; tone?: BadgeTone; testID?: string}) => (
  <View style={[styles.badge, {backgroundColor: TONE[tone].bg, borderColor: TONE[tone].fg}]} testID={testID}>
    {glyph !== undefined && <Text style={[styles.glyph, {color: TONE[tone].fg}]}>{glyph}</Text>}
    <Text style={[styles.label, {color: TONE[tone].fg}]}>{label.toUpperCase()}</Text>
  </View>
);

/** Status dot + text for live connection state. */
export const StatusDot = ({online, label}: {online: boolean; label?: string}) => (
  <View style={styles.dotRow}>
    <View style={[styles.dot, online ? styles.dotOn : styles.dotOff]} />
    {label !== undefined && <Text style={[styles.dotLabel, !online && styles.dotLabelOff]}>{label.toUpperCase()}</Text>}
  </View>
);

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: px(14),
    paddingVertical: px(4),
    borderWidth: 1,
    borderRadius: theme.radii.pill,
  },
  glyph: {
    fontSize: px(22),
    marginRight: px(8),
  },
  label: {
    ...theme.text.label,
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: px(14),
    height: px(14),
    borderRadius: px(7),
    borderWidth: px(2),
  },
  dotOn: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  dotOff: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.textMuted,
  },
  dotLabel: {
    ...theme.text.label,
    marginLeft: px(10),
    color: theme.colors.success,
  },
  dotLabelOff: {
    color: theme.colors.textMuted,
  },
});
