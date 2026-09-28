import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {TVButton} from '../TVButton/TVButton';
import {theme} from '../../theme/theme';

/**
 * An inline question with two answers, e.g. "Leave the mystery?".
 * The safe option is first and takes focus, so a stray OK never destroys progress.
 */
export const ConfirmPrompt = ({
  question,
  detail,
  safeLabel,
  onSafe,
  riskyLabel,
  onRisky,
  testIDPrefix,
}: {
  question: string;
  detail?: string;
  safeLabel: string;
  onSafe: () => void;
  riskyLabel: string;
  onRisky: () => void;
  testIDPrefix: string;
}) => (
  <View style={styles.box}>
    <Text style={styles.question}>{question}</Text>
    {detail !== undefined && <Text style={styles.detail}>{detail}</Text>}
    <View style={styles.row}>
      <TVButton
        variant="action"
        label={safeLabel}
        onPress={onSafe}
        preferredFocus
        testID={`${testIDPrefix}-safe`}
      />
      <TVButton
        variant="action"
        label={riskyLabel}
        onPress={onRisky}
        testID={`${testIDPrefix}-risky`}
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  box: {
    alignItems: 'flex-start',
  },
  question: {
    color: theme.colors.text,
    fontSize: theme.type.heading,
    fontWeight: '300',
  },
  detail: {
    marginTop: theme.spacing.xs,
    color: theme.colors.mutedText,
    fontSize: theme.type.body,
  },
  row: {
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
});
