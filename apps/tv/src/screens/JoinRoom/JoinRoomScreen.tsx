import React, {useCallback, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useTVEventHandler} from '@amazon-devices/react-native-kepler';
import type {HWEvent} from '@amazon-devices/react-native-kepler';
import {FocusableCard} from '../../components/FocusableCard/FocusableCard';
import {ScreenHeader} from '../../components/ScreenHeader/ScreenHeader';
import {TVButton} from '../../components/TVButton/TVButton';
import {ROOM_CODE_LENGTH} from '../../data/mockRoom';
import {px, theme} from '../../theme/theme';
import {ScreenProps} from '../types';

const KEYS: readonly string[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'delete'];
const KEY_LABEL: Record<string, string> = {clear: 'CLR', delete: '⌫'};
const KEY_A11Y: Record<string, string> = {clear: 'Clear code', delete: 'Delete last digit'};

/** Pure helper so the entry rules are testable without rendering. */
export function applyKey(code: string, key: string): string {
  if (key === 'clear') {
    return '';
  }
  if (key === 'delete') {
    return code.slice(0, -1);
  }
  if (/^[0-9]$/.test(key) && code.length < ROOM_CODE_LENGTH) {
    return code + key;
  }
  return code;
}

/**
 * Join Room: UI PROTOTYPE. The code can be entered with the on-screen keypad (D-pad + OK)
 * or with the remote's number keys, but nothing is sent anywhere yet; joining a room
 * over the network arrives with multiplayer (Phase 4).
 */
export const JoinRoomScreen = ({navigator}: ScreenProps) => {
  const [code, setCode] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const press = useCallback((key: string) => {
    setNotice(null);
    setCode(current => applyKey(current, key));
  }, []);

  // Remotes with a number pad send num_0 … num_9.
  useTVEventHandler((event: HWEvent) => {
    if (event.eventKeyAction === 1) {
      return; // ignore key-up
    }
    const match = /^num_([0-9])$/.exec(event.eventType);
    if (match) {
      press(match[1]);
    }
  });

  const join = () => {
    setNotice(
      code.length < ROOM_CODE_LENGTH
        ? `Enter all ${ROOM_CODE_LENGTH} digits of the room code.`
        : `Room ${code}: joining arrives in the multiplayer phase.`,
    );
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Join Room" subtitle="Enter the room code shown on the host's TV." />

      <View style={styles.body}>
        <View style={styles.codeColumn}>
          <View
            style={styles.slots}
            accessibilityLabel={
              code.length === 0 ? 'Room code empty' : `Room code ${code.split('').join(' ')}`
            }>
            {Array.from({length: ROOM_CODE_LENGTH}, (_, i) => {
              const digit = code[i];
              const active = i === code.length;
              return (
                <View
                  key={i}
                  style={[styles.slot, digit !== undefined && styles.slotFilled, active && styles.slotActive]}>
                  <Text style={styles.slotText}>{digit ?? ''}</Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.notice}>{notice ?? ' '}</Text>
          <View style={styles.actionRow}>
            <TVButton
              variant="action"
              tone="primary"
              label="Join"
              onPress={join}
              // Once the code is complete, focus jumps to Join so OK submits it.
              preferredFocus={code.length === ROOM_CODE_LENGTH}
              testID="join-submit"
            />
            <TVButton variant="action" label="Back" onPress={() => navigator.back()} testID="join-back" />
          </View>
        </View>

        <View style={styles.keypad}>
          {KEYS.map(key => (
            <FocusableCard
              key={key}
              onPress={() => press(key)}
              // Only applied when the prop changes, so this sets the initial focus only.
              preferredFocus={key === '1'}
              style={styles.key}
              accessibilityLabel={KEY_A11Y[key] ?? key}
              testID={`key-${key}`}>
              {focused => (
                <Text style={[styles.keyText, focused && styles.keyTextFocused, key.length > 1 && styles.keyTextSmall]}>
                  {KEY_LABEL[key] ?? key}
                </Text>
              )}
            </FocusableCard>
          ))}
        </View>
      </View>
      <Text style={styles.hint}>Use the keypad or the number keys on your remote.</Text>
    </View>
  );
};

const KEY_W = px(128);
const KEY_H = px(96);

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
    justifyContent: 'space-between',
    paddingRight: theme.spacing.xl,
  },
  codeColumn: {
    alignItems: 'flex-start',
  },
  slots: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  // Same counter-style wells as the puzzle keypad, in the technical voice.
  slot: {
    width: px(132),
    height: px(168),
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderBottomWidth: px(4),
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotFilled: {
    borderColor: theme.colors.borderStrong,
    borderBottomColor: theme.colors.accentSoft,
    backgroundColor: theme.colors.surface,
  },
  slotActive: {
    borderBottomColor: theme.colors.focus,
  },
  slotText: {
    ...theme.text.monoLarge,
    fontSize: px(104),
    lineHeight: px(124),
    color: theme.colors.focus,
  },
  notice: {
    ...theme.text.body,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    color: theme.colors.accent,
  },
  actionRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
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
    ...theme.text.mono,
    fontSize: px(44),
    lineHeight: px(52),
    color: theme.colors.textSecondary,
  },
  keyTextSmall: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
  },
  keyTextFocused: {
    color: theme.colors.focus,
  },
  hint: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.textMuted,
  },
});
