import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import type {ErrorCode} from '@roomriddle/shared-types';
import {RECOVERY_LABEL, errorExperience, type ErrorKind, type RecoveryAction} from '@roomriddle/client';
import {TVButton} from '../components/TVButton/TVButton';
import {px, theme} from '../theme/theme';
import {Transition} from './Transition';

const GLYPH: Record<ErrorKind, string> = {
  room: '⌧',
  identity: '◌',
  permission: '⊘',
  connection: '⌁',
  server: '△',
  action: '⊘',
};

export interface ErrorStateProps {
  code: ErrorCode;
  /** Handlers for the recovery actions this screen supports. */
  actions: Partial<Record<RecoveryAction, () => void>>;
  /** Override the title/message (e.g. a screen-specific wording). */
  title?: string;
  message?: string;
  testIDPrefix?: string;
}

/**
 * A designed error: glyph, uppercase title, plain message and recovery
 * buttons, from the shared error vocabulary. Never shows technical detail.
 * Buttons appear in the experience's recommended order, then any extra
 * handlers the screen offers, so there is always a way forward.
 */
export const ErrorState = ({code, actions, title, message, testIDPrefix = 'error'}: ErrorStateProps) => {
  const x = errorExperience(code);
  const order = [...x.actions, ...(Object.keys(actions) as RecoveryAction[])].filter(
    (a, i, all) => all.indexOf(a) === i && actions[a] !== undefined,
  );
  const tone = x.kind === 'connection' || x.kind === 'server' ? theme.colors.warning : theme.colors.danger;
  return (
    <Transition preset="scale" style={styles.wrap} testID={`${testIDPrefix}-state`}>
      <View style={[styles.glyphRing, {borderColor: tone}]}>
        <Text style={[styles.glyph, {color: tone}]}>{GLYPH[x.kind]}</Text>
      </View>
      <Text style={[styles.title, {color: tone}]} accessibilityRole="header">
        {title ?? x.title}
      </Text>
      <Text style={styles.message}>{message ?? x.message}</Text>
      <View style={styles.row}>
        {order.map((action, i) => (
          <TVButton
            key={action}
            variant="action"
            tone={i === 0 ? 'primary' : 'default'}
            label={RECOVERY_LABEL[action]}
            onPress={actions[action]!}
            preferredFocus={i === 0}
            testID={`${testIDPrefix}-${action}`}
          />
        ))}
      </View>
    </Transition>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  glyphRing: {
    width: px(96),
    height: px(96),
    borderRadius: px(48),
    borderWidth: theme.borders.thin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontSize: px(46),
  },
  title: {
    ...theme.text.h2,
    letterSpacing: px(8),
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  message: {
    ...theme.text.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    maxWidth: px(1000),
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
});
