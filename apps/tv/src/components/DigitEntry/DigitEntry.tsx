import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useTVEventHandler} from '@amazon-devices/react-native-kepler';
import type {HWEvent} from '@amazon-devices/react-native-kepler';
import {FocusableCard} from '../FocusableCard/FocusableCard';
import {px, theme} from '../../theme/theme';

const KEYS: readonly string[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'delete'];
const KEY_LABEL: Record<string, string> = {clear: 'CLR', delete: '⌫'};
const KEY_A11Y: Record<string, string> = {clear: 'Clear', delete: 'Delete last digit'};

/** Pure entry rules for a fixed-length digit code. */
export function applyDigitKey(code: string, key: string, maxLength: number): string {
  if (key === 'clear') {
    return '';
  }
  if (key === 'delete') {
    return code.slice(0, -1);
  }
  if (/^[0-9]$/.test(key) && code.length < maxLength) {
    return code + key;
  }
  return code;
}

/**
 * A remote-friendly digit entry: code slots plus a 3×4 on-screen keypad
 * (D-pad + OK), and the remote's own number keys where it has them.
 * The code itself is owned by the parent.
 */
export const DigitEntry = ({
  code,
  length,
  onKey,
  testIDPrefix = 'digit',
}: {
  code: string;
  length: number;
  onKey: (key: string) => void;
  testIDPrefix?: string;
}) => {
  useTVEventHandler((event: HWEvent) => {
    if (event.eventKeyAction === 1) {
      return; // ignore key-up
    }
    const match = /^num_([0-9])$/.exec(event.eventType);
    if (match) {
      onKey(match[1]);
    }
  });

  return (
    <View style={styles.row}>
      <View
        style={styles.slots}
        accessibilityLabel={code.length === 0 ? 'Code empty' : `Code ${code.split('').join(' ')}`}>
        {Array.from({length}, (_, i) => {
          const digit = code[i];
          return (
            <View
              key={i}
              style={[styles.slot, digit !== undefined && styles.slotFilled, i === code.length && styles.slotActive]}>
              <Text style={styles.slotText}>{digit ?? ''}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.keypad}>
        {KEYS.map(key => (
          <FocusableCard
            key={key}
            onPress={() => onKey(key)}
            preferredFocus={key === '1'}
            style={styles.key}
            accessibilityLabel={KEY_A11Y[key] ?? key}
            testID={`${testIDPrefix}-${key}`}>
            {focused => (
              <Text style={[styles.keyText, focused && styles.keyTextFocused, key.length > 1 && styles.keyTextSmall]}>
                {KEY_LABEL[key] ?? key}
              </Text>
            )}
          </FocusableCard>
        ))}
      </View>
    </View>
  );
};

const KEY_W = px(120);
const KEY_H = px(84);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xl,
  },
  slots: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  slot: {
    width: px(104),
    height: px(136),
    borderRadius: theme.radii.md,
    borderWidth: px(2),
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotFilled: {
    borderColor: theme.colors.accentSoft,
  },
  slotActive: {
    borderColor: theme.colors.accent,
  },
  slotText: {
    color: theme.colors.focus,
    fontSize: px(84),
    fontWeight: '200',
  },
  keypad: {
    width: KEY_W * 3 + theme.spacing.sm * 2,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  key: {
    width: KEY_W,
    height: KEY_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    color: theme.colors.mutedText,
    fontSize: px(40),
    fontWeight: '300',
  },
  keyTextSmall: {
    fontSize: theme.type.caption,
    letterSpacing: px(3),
  },
  keyTextFocused: {
    color: theme.colors.focus,
  },
});
