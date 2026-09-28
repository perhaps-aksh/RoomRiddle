import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import type {Clue} from '@roomriddle/shared-types';
import {px, theme} from '../../theme/theme';

/** A discovered clue, presented like a found document. */
export const ClueCard = ({
  clue,
  compact,
  testID,
}: {
  clue: Clue;
  compact?: boolean;
  testID?: string;
}) => (
  <View style={[styles.card, compact && styles.compact]} testID={testID}>
    <Text style={styles.eyebrow}>{clue.major ? 'KEY EVIDENCE' : 'EVIDENCE'}</Text>
    <Text style={[styles.title, compact && styles.titleCompact]}>{clue.title}</Text>
    <View style={styles.rule} />
    {clue.description.map((line, index) => (
      <Text key={index} style={[styles.line, compact && styles.lineCompact]}>
        {line}
      </Text>
    ))}
  </View>
);

const styles = StyleSheet.create({
  card: {
    padding: theme.spacing.lg,
    borderRadius: theme.radii.lg,
    borderWidth: px(2),
    borderColor: theme.colors.accentSoft,
    backgroundColor: theme.colors.surface,
  },
  compact: {
    padding: theme.spacing.md,
  },
  eyebrow: {
    color: theme.colors.accent,
    fontSize: px(20),
    letterSpacing: px(5),
  },
  title: {
    marginTop: theme.spacing.xs,
    color: theme.colors.text,
    fontSize: theme.type.heading,
    fontWeight: '300',
  },
  titleCompact: {
    fontSize: theme.type.nav,
  },
  rule: {
    width: px(56),
    height: px(2),
    marginVertical: theme.spacing.md,
    backgroundColor: theme.colors.accentSoft,
  },
  line: {
    color: theme.colors.text,
    fontSize: theme.type.body,
    lineHeight: px(44),
  },
  lineCompact: {
    color: theme.colors.mutedText,
    fontSize: theme.type.caption,
    lineHeight: px(36),
  },
});
