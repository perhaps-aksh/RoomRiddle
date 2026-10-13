import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import {TVButton} from '../../components/TVButton/TVButton';
import {useSettings} from '../../settings/SettingsContext';
import {px, theme} from '../../theme/theme';
import {Transition} from '../../ui/Transition';
import {homeArt} from '../../ui/keyArt';
import {HOW_IT_WORKS} from '../Home/HomeScreen';
import {ScreenProps} from '../types';

const DETAIL: readonly string[] = [
  'The TV shows the room code and a QR code. Up to six investigators can join.',
  'Scan the QR code, type a name, and you are in. Clues, puzzles and hints live on your phone; the TV shows everyone what happened.',
  'Move with the remote to inspect the scene. Ask suspects anything from your phone: they answer on the TV, but only with what you have found.',
];

/**
 * How to Play: the three steps in full, then straight into a game. Reaching
 * the end marks this TV as onboarded, so Home stops showing the steps.
 */
export const HowToPlayScreen = ({navigator}: ScreenProps) => {
  const {update} = useSettings();
  const done = (then: () => void) => {
    update({onboarded: true});
    then();
  };
  return (
    <View style={styles.screen}>
      <Image source={homeArt} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <View style={styles.scrim} />
      <Text style={styles.label}>HOW TO PLAY</Text>
      <Text style={styles.title}>Three steps. About a minute.</Text>
      <View style={styles.row}>
        {HOW_IT_WORKS.map((s, i) => (
          <Transition key={s.n} preset="rise" delay={i * theme.motion.stagger.duration * 1.5} style={styles.card}>
            <Text style={styles.n}>{s.n}</Text>
            <Text style={styles.cardTitle}>{s.title}</Text>
            <Text style={styles.cardLine}>{DETAIL[i]}</Text>
          </Transition>
        ))}
      </View>
      <View style={styles.actions}>
        <TVButton variant="action" tone="primary" label="Start a Game" onPress={() => done(() => navigator.replace({name: 'createRoom'}))} preferredFocus testID="howto-start" />
        <TVButton variant="action" label="Back" onPress={() => done(() => navigator.back())} testID="howto-back" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: theme.spacing.screenX,
    paddingTop: theme.spacing.screenY,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.overlay,
  },
  label: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.accent,
  },
  title: {
    ...theme.text.h1,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    marginTop: theme.spacing.xl,
  },
  card: {
    flex: 1,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderTopWidth: px(4),
    borderTopColor: theme.colors.accent,
    minHeight: px(400),
  },
  n: {
    ...theme.text.display,
    color: theme.colors.accent,
  },
  cardTitle: {
    ...theme.text.h2,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.sm,
  },
  cardLine: {
    ...theme.text.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xl,
  },
});
