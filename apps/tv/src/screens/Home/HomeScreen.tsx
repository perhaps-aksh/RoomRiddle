import React, {useState} from 'react';
import {BackHandler, StyleSheet, Text, View} from 'react-native';
import {TVButton} from '../../components/TVButton/TVButton';
import {findMystery} from '../../data/mysteries';
import {Route} from '../../navigation/TVNavigation';
import {useBackInterceptor} from '../../navigation/useBackInterceptor';
import {px, theme} from '../../theme/theme';
import {ScreenProps} from '../types';

interface MenuItem {
  key: string;
  label: string;
  route: Route;
  hint: string;
}

const MENU: readonly MenuItem[] = [
  {key: 'createRoom', label: 'Create Room', route: {name: 'createRoom'}, hint: 'Host a new game on this TV'},
  {key: 'joinRoom', label: 'Join Room', route: {name: 'joinRoom'}, hint: 'Enter a room code'},
  {key: 'mysteries', label: 'Mysteries', route: {name: 'mysteries'}, hint: 'Browse the mystery library'},
  {key: 'settings', label: 'Settings', route: {name: 'settings'}, hint: 'Sound, music, display and controls'},
];

export const HomeScreen = ({
  navigator,
  initialFocusKey,
  selectedMysteryId,
}: ScreenProps) => {
  const [confirmExit, setConfirmExit] = useState(false);
  const focusKey = initialFocusKey ?? MENU[0].key;
  const mystery = findMystery(selectedMysteryId);

  // Back on Home asks before leaving the app instead of exiting straight away.
  useBackInterceptor(() => {
    setConfirmExit(current => !current);
    return true;
  });

  return (
    <View style={styles.screen}>
      <View style={styles.brand}>
        <Text style={styles.wordmark} accessibilityRole="header">
          ROOMRIDDLE
        </Text>
        <Text style={styles.tagline}>Gather. Investigate. Unravel.</Text>
      </View>

      <View style={styles.menu}>
        {confirmExit ? (
          <>
            <Text style={styles.confirmText}>Leave RoomRiddle?</Text>
            <TVButton
              label="Stay"
              onPress={() => setConfirmExit(false)}
              preferredFocus
              testID="home-exit-stay"
            />
            <TVButton
              label="Exit"
              onPress={() => BackHandler.exitApp()}
              testID="home-exit-confirm"
            />
          </>
        ) : (
          MENU.map(item => (
            <TVButton
              key={item.key}
              label={item.label}
              accessibilityHint={item.hint}
              onPress={() => navigator.push(item.route, item.key)}
              preferredFocus={item.key === focusKey}
              testID={`home-${item.key}`}
            />
          ))
        )}
      </View>

      <View style={styles.footer}>
        {mystery !== undefined && (
          <Text style={styles.footerText}>
            Tonight's mystery ·{' '}
            <Text style={styles.footerAccent}>{mystery.title}</Text>
          </Text>
        )}
        <Text style={styles.footerText}>▲ ▼ move · OK select · BACK return</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    paddingTop: theme.spacing.xxl + theme.spacing.lg,
    paddingBottom: theme.spacing.screenY,
    paddingHorizontal: theme.spacing.screenX,
  },
  brand: {
    alignItems: 'center',
  },
  wordmark: {
    color: theme.colors.text,
    fontSize: theme.type.wordmark,
    fontWeight: '200',
    letterSpacing: px(28),
    // Letter spacing adds trailing space after the last glyph; nudge back to centre.
    marginRight: px(-28),
  },
  tagline: {
    marginTop: theme.spacing.md,
    color: theme.colors.accent,
    fontSize: theme.type.body,
    letterSpacing: px(6),
  },
  menu: {
    marginTop: theme.spacing.xxl,
    gap: theme.spacing.xs,
    alignItems: 'center',
  },
  confirmText: {
    color: theme.colors.text,
    fontSize: theme.type.heading,
    fontWeight: '300',
    marginBottom: theme.spacing.md,
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  footerText: {
    color: theme.colors.faintText,
    fontSize: theme.type.caption,
    letterSpacing: px(2),
  },
  footerAccent: {
    color: theme.colors.mutedText,
  },
});
