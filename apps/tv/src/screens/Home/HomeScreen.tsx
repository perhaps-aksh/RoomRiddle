import React, {useState} from 'react';
import {BackHandler, Image, StyleSheet, Text, View} from 'react-native';
import {TVButton} from '../../components/TVButton/TVButton';
import {AGE_LABEL, findMystery} from '../../data/mysteries';
import {Route} from '../../navigation/TVNavigation';
import {useBackInterceptor} from '../../navigation/useBackInterceptor';
import {useSettings} from '../../settings/SettingsContext';
import {px, theme} from '../../theme/theme';
import {Transition} from '../../ui/Transition';
import {GRACE_ASPECT, graceArt, homeArt} from '../../ui/keyArt';
import {ScreenProps} from '../types';

interface MenuItem {
  key: string;
  label: string;
  route: Route;
  hint: string;
}

const STAGGER = theme.motion.stagger.duration;
const GRACE_HEIGHT = px(900);

/** The three steps a first-time group needs, shown on Home until they've played. */
export const HOW_IT_WORKS: readonly {n: string; title: string; line: string}[] = [
  {n: '1', title: 'Open a room', line: 'A QR code appears here.'},
  {n: '2', title: 'Scan to join', line: 'No app. Phone = notebook.'},
  {n: '3', title: 'Investigate', line: 'Explore, question, accuse.'},
];

/**
 * Home, after the "noir character" reference: Detective Grace stands on the
 * left in the rain; the right column is the wordmark and a short menu led by
 * Quick Start (one press: a room for tonight's case, straight to the QR code).
 * First-time groups see how it works under the menu; afterwards that space
 * shows tonight's case. Focus starts on Quick Start.
 */
export const HomeScreen = ({navigator, initialFocusKey, selectedMysteryId}: ScreenProps) => {
  const [confirmExit, setConfirmExit] = useState(false);
  const {settings} = useSettings();
  const mystery = findMystery(selectedMysteryId);
  const caseTitle = mystery?.title ?? 'The Last Train';

  const menu: readonly MenuItem[] = [
    {key: 'createRoom', label: 'Quick Start', route: {name: 'createRoom'}, hint: `${caseTitle} · phones scan to join`},
    {key: 'mysteries', label: 'Choose a Case', route: {name: 'mysteries'}, hint: 'Filter by age group and story type'},
    {key: 'joinRoom', label: 'Join a Room', route: {name: 'joinRoom'}, hint: 'Enter a room code'},
  ];
  const minor: readonly MenuItem[] = [
    {key: 'howToPlay', label: 'How to Play', route: {name: 'howToPlay'}, hint: 'Three steps, one minute'},
    {key: 'settings', label: 'Settings', route: {name: 'settings'}, hint: 'Motion, sound, display and controls'},
  ];
  const focusKey = initialFocusKey ?? menu[0]!.key;

  // Back on Home asks before leaving the app instead of exiting straight away.
  useBackInterceptor(() => {
    setConfirmExit(current => !current);
    return true;
  });

  const button = (m: MenuItem, variant: 'menu' | 'action', primary = false) => (
    <TVButton
      key={m.key}
      variant={variant}
      tone={primary ? 'primary' : undefined}
      label={m.label}
      caption={variant === 'menu' ? m.hint : undefined}
      width={variant === 'menu' ? px(760) : undefined}
      accessibilityHint={m.hint}
      onPress={() => navigator.push(m.route, m.key)}
      preferredFocus={m.key === focusKey}
      testID={`home-${m.key}`}
    />
  );

  return (
    <View style={styles.screen}>
      <Image source={homeArt} style={StyleSheet.absoluteFill} resizeMode="cover" testID="home-art" />
      <Transition preset="cinematic" style={styles.graceWrap}>
        <Image source={graceArt} style={styles.grace} resizeMode="contain" accessibilityLabel="Detective Grace" />
      </Transition>

      <View style={styles.column}>
        <Transition preset="cinematic" style={styles.brand}>
          <Text style={styles.kicker}>A CO-OP MYSTERY FOR THE BIG SCREEN</Text>
          <Text style={styles.wordmark} accessibilityRole="header">
            ROOM RIDDLE
          </Text>
          <View style={styles.rule} />
          <Text style={styles.tagline}>Gather. Investigate. Unravel.</Text>
        </Transition>

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
          <View style={styles.menu}>
            {menu.map((m, i) => (
              <Transition key={m.key} preset="rise" delay={80 + i * STAGGER}>
                {button(m, 'menu', i === 0)}
              </Transition>
            ))}
            <Transition preset="fade" delay={80 + menu.length * STAGGER} style={styles.minor}>
              {minor.map(m => button(m, 'action'))}
            </Transition>
          </View>
        )}

        <Transition preset="fade" delay={200 + 4 * STAGGER} style={styles.footerCard}>
          {settings.onboarded ? (
            <View testID="home-tonight">
              <Text style={styles.cardLabel}>TONIGHT'S CASE</Text>
              <Text style={styles.cardTitle}>{caseTitle}</Text>
              {mystery && (
                <Text style={styles.cardLine}>
                  {AGE_LABEL[mystery.ageGroup]} · {mystery.minPlayers}–{mystery.maxPlayers} players · ~{mystery.estimatedMinutes} min
                </Text>
              )}
            </View>
          ) : (
            <View testID="home-how-it-works">
              <Text style={styles.cardLabel}>FIRST TIME? IT TAKES A MINUTE</Text>
              <View style={styles.steps}>
                {HOW_IT_WORKS.map(s => (
                  <View key={s.n} style={styles.step}>
                    <Text style={styles.stepN}>{s.n}</Text>
                    <View style={styles.stepText}>
                      <Text style={styles.stepTitle}>{s.title}</Text>
                      <Text style={styles.stepLine}>{s.line}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Transition>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.screenX,
  },
  graceWrap: {
    position: 'absolute',
    left: px(170),
    bottom: 0,
  },
  grace: {
    height: GRACE_HEIGHT,
    width: GRACE_HEIGHT * GRACE_ASPECT,
  },
  column: {
    marginLeft: 'auto',
    width: px(860),
    paddingTop: theme.spacing.screenY - px(20),
    paddingBottom: theme.spacing.screenY - px(20),
  },
  brand: {
    alignItems: 'flex-start',
  },
  kicker: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.textMuted,
  },
  wordmark: {
    ...theme.text.wordmark,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.xs,
  },
  rule: {
    width: px(140),
    height: px(3),
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.accent,
  },
  tagline: {
    ...theme.text.label,
    fontSize: px(26),
    letterSpacing: px(8),
    marginTop: theme.spacing.sm,
    color: theme.colors.accent,
    textTransform: 'uppercase',
  },
  menu: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  minor: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  confirm: {
    marginTop: theme.spacing.xl,
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
  footerCard: {
    marginTop: 'auto',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.overlay,
    borderLeftWidth: px(4),
    borderLeftColor: theme.colors.accent,
  },
  cardLabel: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.accent,
  },
  cardTitle: {
    ...theme.text.h2,
    color: theme.colors.textPrimary,
    marginTop: px(4),
  },
  cardLine: {
    ...theme.text.body,
    color: theme.colors.textSecondary,
  },
  steps: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  step: {
    flex: 1,
    flexDirection: 'row',
    gap: px(10),
  },
  stepN: {
    ...theme.text.h2,
    color: theme.colors.accent,
    width: px(30),
  },
  stepText: {
    flex: 1,
  },
  stepTitle: {
    ...theme.text.label,
    color: theme.colors.textPrimary,
    letterSpacing: px(1),
  },
  stepLine: {
    ...theme.text.body,
    fontSize: px(22),
    lineHeight: px(28),
    color: theme.colors.textSecondary,
  },
});
