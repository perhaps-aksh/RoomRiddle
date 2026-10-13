import React, {useState} from 'react';
import {BackHandler, StyleSheet, Text, View} from 'react-native';
import {TVButton} from '../../components/TVButton/TVButton';
import {findMystery} from '../../data/mysteries';
import {Route} from '../../navigation/TVNavigation';
import {useBackInterceptor} from '../../navigation/useBackInterceptor';
import {px, theme} from '../../theme/theme';
import {Transition} from '../../ui/Transition';
import {ScreenProps} from '../types';

interface MenuItem {
  key: string;
  label: string;
  route: Route;
  hint: string;
}

const PRIMARY: readonly MenuItem[] = [
  {key: 'createRoom', label: 'Create Room', route: {name: 'createRoom'}, hint: 'Host an investigation on this TV'},
  {key: 'joinRoom', label: 'Join Room', route: {name: 'joinRoom'}, hint: 'Enter a room code'},
];
const SECONDARY: readonly MenuItem[] = [
  {key: 'mysteries', label: 'Mysteries', route: {name: 'mysteries'}, hint: 'Browse the case library'},
  {key: 'settings', label: 'Settings', route: {name: 'settings'}, hint: 'Motion, sound, display and controls'},
];
const STAGGER = theme.motion.stagger.duration;

/**
 * Home: the title card. Wordmark in the cinematic voice between brass rules,
 * the two primary actions as a focus list (▶ marker + what will happen),
 * the secondary actions as a quieter row, and tonight's case in the
 * technical voice. Elements arrive in a short stagger; focus is available
 * immediately.
 */
export const HomeScreen = ({navigator, initialFocusKey, selectedMysteryId}: ScreenProps) => {
  const [confirmExit, setConfirmExit] = useState(false);
  const focusKey = initialFocusKey ?? PRIMARY[0].key;
  const mystery = findMystery(selectedMysteryId);

  // Back on Home asks before leaving the app instead of exiting straight away.
  useBackInterceptor(() => {
    setConfirmExit(current => !current);
    return true;
  });

  const item = (m: MenuItem, variant: 'menu' | 'action') => (
    <TVButton
      key={m.key}
      variant={variant}
      label={m.label}
      caption={variant === 'menu' ? m.hint : undefined}
      accessibilityHint={m.hint}
      onPress={() => navigator.push(m.route, m.key)}
      preferredFocus={m.key === focusKey}
      testID={`home-${m.key}`}
    />
  );

  return (
    <View style={styles.screen}>
      <Transition preset="fade" style={styles.caseLine}>
        <Text style={styles.caseText}>INVESTIGATION SYSTEM</Text>
        <View style={styles.caseDot} />
        <Text style={styles.caseText}>{mystery ? `CASE · ${mystery.title.toUpperCase()}` : 'NO CASE SELECTED'}</Text>
      </Transition>

      <Transition preset="cinematic" style={styles.brand}>
        <View style={styles.wordRow}>
          <View style={styles.wordRule} />
          <Text style={styles.wordmark} accessibilityRole="header">
            ROOM RIDDLE
          </Text>
          <View style={styles.wordRule} />
        </View>
        <Text style={styles.tagline}>Gather. Investigate. Unravel.</Text>
      </Transition>

      <View style={styles.menu}>
        {confirmExit ? (
          <Transition preset="scale" motion="modalEnter" style={styles.confirm}>
            <Text style={styles.confirmLabel}>CONFIRM</Text>
            <Text style={styles.confirmText}>Leave Room Riddle?</Text>
            <View style={styles.confirmRow}>
              <TVButton variant="action" tone="primary" label="Stay" onPress={() => setConfirmExit(false)} preferredFocus testID="home-exit-stay" />
              <TVButton variant="action" tone="danger" label="Exit" onPress={() => BackHandler.exitApp()} testID="home-exit-confirm" />
            </View>
          </Transition>
        ) : (
          <>
            {PRIMARY.map((m, i) => (
              <Transition key={m.key} preset="rise" delay={120 + i * STAGGER}>
                {item(m, 'menu')}
              </Transition>
            ))}
            <Transition preset="fade" delay={120 + 2 * STAGGER} style={styles.secondary}>
              {SECONDARY.map(m => item(m, 'action'))}
            </Transition>
          </>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>▲ ▼ ◀ ▶ MOVE · OK SELECT · BACK RETURN</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    paddingTop: theme.spacing.screenY,
    paddingBottom: theme.spacing.screenY - px(20),
    paddingHorizontal: theme.spacing.screenX,
  },
  caseLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  caseText: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.textMuted,
  },
  caseDot: {
    width: px(8),
    height: px(8),
    borderRadius: px(4),
    backgroundColor: theme.colors.accent,
  },
  brand: {
    alignItems: 'center',
    marginTop: theme.spacing.xxl,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordRule: {
    width: px(120),
    height: 1,
    backgroundColor: theme.colors.accentSoft,
  },
  wordmark: {
    ...theme.text.wordmark,
    color: theme.colors.textPrimary,
    marginHorizontal: theme.spacing.lg,
    // Letter spacing adds trailing space after the last glyph; nudge back to centre.
    marginRight: theme.spacing.lg - px(20),
  },
  tagline: {
    ...theme.text.label,
    fontSize: px(30),
    letterSpacing: px(10),
    marginTop: theme.spacing.md,
    color: theme.colors.accent,
    textTransform: 'uppercase',
  },
  menu: {
    marginTop: theme.spacing.xxl,
    gap: theme.spacing.xs,
    alignItems: 'center',
  },
  secondary: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  confirm: {
    alignItems: 'center',
  },
  confirmLabel: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.warning,
  },
  confirmText: {
    ...theme.text.h1,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  confirmRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  footerText: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.textMuted,
  },
});
