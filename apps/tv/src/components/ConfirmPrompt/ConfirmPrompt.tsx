import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {TVButton} from '../TVButton/TVButton';
import {px, theme} from '../../theme/theme';
import {Transition} from '../../ui/Transition';

/**
 * An inline question with two answers, e.g. "Leave the mystery?".
 * The safe option is first and takes focus, so a stray OK never destroys progress.
 * It reads as a warning slip: amber spine, the question, then the choices.
 */
export const ConfirmPrompt = ({
  question,
  detail,
  safeLabel,
  onSafe,
  riskyLabel,
  onRisky,
  testIDPrefix,
  safeTestID,
  riskyTestID,
}: {
  question: string;
  detail?: string;
  safeLabel: string;
  onSafe: () => void;
  riskyLabel: string;
  onRisky: () => void;
  testIDPrefix: string;
  /** Override the default `${testIDPrefix}-safe` / `-risky` IDs. */
  safeTestID?: string;
  riskyTestID?: string;
}) => (
  <Transition preset="slide" motion="modalEnter" style={styles.box}>
    <View style={styles.spine} />
    <View style={styles.body}>
      <Text style={styles.label}>CONFIRM</Text>
      <Text style={styles.question}>{question}</Text>
      {detail !== undefined && <Text style={styles.detail}>{detail}</Text>}
      <View style={styles.row}>
        <TVButton variant="action" tone="primary" label={safeLabel} onPress={onSafe} preferredFocus testID={safeTestID ?? `${testIDPrefix}-safe`} />
        <TVButton variant="action" tone="danger" label={riskyLabel} onPress={onRisky} testID={riskyTestID ?? `${testIDPrefix}-risky`} />
      </View>
    </View>
  </Transition>
);

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  spine: {
    width: px(6),
    backgroundColor: theme.colors.warning,
  },
  body: {
    padding: theme.spacing.lg,
  },
  label: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.warning,
  },
  question: {
    ...theme.text.h1,
    fontSize: px(44),
    lineHeight: px(56),
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.xs,
  },
  detail: {
    ...theme.text.body,
    marginTop: theme.spacing.xs,
    color: theme.colors.textSecondary,
    maxWidth: px(1100),
  },
  row: {
    marginTop: theme.spacing.lg,
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
});
