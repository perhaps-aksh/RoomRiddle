import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {px, theme} from '../../theme/theme';

export interface ScreenHeaderProps {
  title: string;
  /** Small line above the title (e.g. the genre). */
  eyebrow?: string;
  subtitle?: string;
  align?: 'left' | 'center';
  /** File number shown before the eyebrow in the technical voice, e.g. "FILE 02". */
  index?: string;
}

/**
 * Screen title in the cinematic voice, with a case-file eyebrow and a brass
 * rule. Every non-game screen opens with one.
 */
export const ScreenHeader = ({title, eyebrow, subtitle, align = 'left', index}: ScreenHeaderProps) => {
  const centered = align === 'center';
  return (
    <View style={[styles.container, centered && styles.centered]} accessibilityRole="header">
      {(eyebrow !== undefined || index !== undefined) && (
        <View style={styles.eyebrowRow}>
          {index !== undefined && <Text style={styles.index}>{index.toUpperCase()}</Text>}
          {index !== undefined && eyebrow !== undefined && <View style={styles.dash} />}
          {eyebrow !== undefined && <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text>}
        </View>
      )}
      <Text style={[styles.title, centered && styles.textCenter]}>{title.toUpperCase()}</Text>
      <View style={styles.rule} />
      {subtitle !== undefined && <Text style={[styles.subtitle, centered && styles.textCenter]}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
  },
  centered: {
    alignItems: 'center',
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  index: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.textMuted,
  },
  dash: {
    width: px(28),
    height: 1,
    marginHorizontal: px(14),
    backgroundColor: theme.colors.textMuted,
  },
  eyebrow: {
    ...theme.text.label,
    color: theme.colors.accent,
  },
  title: {
    ...theme.text.display,
    fontSize: px(64),
    lineHeight: px(78),
    color: theme.colors.textPrimary,
  },
  rule: {
    width: px(72),
    height: px(3),
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.accent,
  },
  subtitle: {
    ...theme.text.body,
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
  },
  textCenter: {
    textAlign: 'center',
  },
});
