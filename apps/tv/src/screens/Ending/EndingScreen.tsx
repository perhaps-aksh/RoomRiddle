import React, {useEffect, useRef} from 'react';
import {Animated, Easing, StyleSheet, Text, View} from 'react-native';
import {getGameSummary, formatClock} from '@roomriddle/game-engine';
import {Narration} from '../../components/Narration/Narration';
import {TVButton} from '../../components/TVButton/TVButton';
import {useGame} from '../../game/GameContext';
import {px, theme} from '../../theme/theme';
import {ScreenProps} from '../types';

/**
 * The ending the engine resolved from GameState, then the night's numbers.
 * Nothing here decides the outcome: it is read from state.endingId.
 */
export const EndingScreen = ({navigator}: ScreenProps) => {
  const {mystery, state, now, start, mode, closeRoom} = useGame();
  const reveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(reveal, {
      toValue: 1,
      duration: 1600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [reveal]);

  if (!mystery || !state || state.endingId === null) {
    return null;
  }
  const ending = mystery.endings.find(e => e.id === state.endingId);
  if (!ending) {
    return null;
  }
  const summary = getGameSummary(mystery, state, now());
  const toneColor =
    ending.tone === 'triumph'
      ? theme.colors.toneTriumph
      : ending.tone === 'bittersweet'
      ? theme.colors.toneBittersweet
      : theme.colors.toneDefeat;

  const playAgain = () => {
    start(mystery.summary.id);
    navigator.reset([{name: 'mysteries'}, {name: 'gameIntro'}]);
  };
  // Leaving the ending of a room game closes the room (phones are told).
  const leave = (routes?: Parameters<typeof navigator.reset>[0]) => {
    if (mode === 'room') {
      closeRoom();
    }
    navigator.reset(routes);
  };

  return (
    <View style={styles.screen}>
      <Animated.View style={[styles.body, {opacity: reveal}]}>
        <Text style={[styles.eyebrow, {color: toneColor}]}>
          {mystery.summary.title.toUpperCase()} · ENDING
        </Text>
        <Text style={styles.title} testID="ending-title">
          {ending.title.toUpperCase()}
        </Text>
        <View style={[styles.rule, {backgroundColor: toneColor}]} />
        <View style={styles.story}>
          <Narration lines={ending.narration} size="body" style={styles.narration} />
        </View>
      </Animated.View>

      <View style={styles.stats}>
        <Stat label="Score" value={String(summary.score)} strong testID="ending-score" />
        <Stat label="Puzzles" value={`${summary.puzzlesSolved}/${summary.puzzlesTotal}`} />
        <Stat label="Key evidence" value={`${summary.majorCluesFound}/${summary.majorCluesTotal}`} />
        <Stat label="Hints" value={String(summary.hintsUsed)} />
        <Stat label="Wrong answers" value={String(summary.incorrectAttempts)} />
        {summary.elapsedMs !== null && <Stat label="Time" value={formatClock(summary.elapsedMs)} />}
      </View>

      <View style={styles.actions}>
        <TVButton variant="action" label="Play Again" onPress={playAgain} preferredFocus testID="ending-again" />
        <TVButton
          variant="action"
          label="Mysteries"
          onPress={() => leave([{name: 'mysteries'}])}
          testID="ending-mysteries"
        />
        <TVButton variant="action" label="Home" onPress={() => leave()} testID="ending-home" />
      </View>
    </View>
  );
};

const Stat = ({
  label,
  value,
  strong,
  testID,
}: {
  label: string;
  value: string;
  strong?: boolean;
  testID?: string;
}) => (
  <View>
    <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
    <Text style={[styles.statValue, strong && styles.statStrong]} testID={testID}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: theme.spacing.screenX,
    paddingTop: theme.spacing.screenY - px(16),
    paddingBottom: theme.spacing.screenY - px(24),
  },
  body: {
    flex: 1,
  },
  eyebrow: {
    fontSize: theme.type.caption,
    letterSpacing: px(6),
  },
  title: {
    marginTop: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: theme.type.title,
    fontWeight: '300',
    letterSpacing: px(10),
  },
  rule: {
    width: px(72),
    height: px(3),
    marginTop: theme.spacing.md,
  },
  story: {
    marginTop: theme.spacing.lg,
    maxWidth: px(1300),
  },
  narration: {
    color: theme.colors.text,
    lineHeight: px(40),
  },
  stats: {
    flexDirection: 'row',
    gap: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  statLabel: {
    color: theme.colors.faintText,
    fontSize: px(20),
    letterSpacing: px(4),
  },
  statValue: {
    marginTop: px(4),
    color: theme.colors.text,
    fontSize: theme.type.nav,
    fontWeight: '300',
  },
  statStrong: {
    color: theme.colors.focus,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
});
