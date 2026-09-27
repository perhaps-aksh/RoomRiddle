import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {px, theme} from '../../theme/theme';

export interface ScreenHeaderProps {
  title: string;
  /** Small gold line above the title (e.g. the genre). */
  eyebrow?: string;
  subtitle?: string;
  align?: 'left' | 'center';
}

export const ScreenHeader = ({
  title,
  eyebrow,
  subtitle,
  align = 'left',
}: ScreenHeaderProps) => {
  const centered = align === 'center';
  return (
    <View
      style={[styles.container, centered && styles.centered]}
      accessibilityRole="header">
      {eyebrow !== undefined && (
        <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text>
      )}
      <Text style={[styles.title, centered && styles.textCenter]}>
        {title.toUpperCase()}
      </Text>
      <View style={styles.rule} />
      {subtitle !== undefined && (
        <Text style={[styles.subtitle, centered && styles.textCenter]}>
          {subtitle}
        </Text>
      )}
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
  eyebrow: {
    color: theme.colors.accent,
    fontSize: theme.type.caption,
    letterSpacing: px(6),
    marginBottom: theme.spacing.sm,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.type.title,
    fontWeight: '300',
    letterSpacing: px(10),
  },
  rule: {
    width: px(72),
    height: px(3),
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.accent,
  },
  subtitle: {
    marginTop: theme.spacing.md,
    color: theme.colors.mutedText,
    fontSize: theme.type.body,
    letterSpacing: 1,
  },
  textCenter: {
    textAlign: 'center',
  },
});
