import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {formatClock, remainingMs} from '@roomriddle/game-engine';
import {useGame} from '../../game/GameContext';
import {px, theme} from '../../theme/theme';

/**
 * The strip across the top of every in-game screen: mystery title, where the
 * players are, the score and the time left. Read-only: it renders GameState.
 */
export const GameHeader = ({context}: {context?: string}) => {
  const {mystery, state, now} = useGame();
  const [, tick] = useState(0);

  // Redraw the countdown once a second while the game is running.
  useEffect(() => {
    if (state?.status !== 'playing') {
      return;
    }
    const timer = setInterval(() => tick(n => n + 1), 1000);
    return () => clearInterval(timer);
  }, [state?.status]);

  if (!mystery || !state) {
    return null;
  }
  const left = remainingMs(state, now());
  const urgent = left !== null && left < 3 * 60_000;

  return (
    <View style={styles.bar}>
      <View style={styles.left}>
        <Text style={styles.title}>{mystery.summary.title.toUpperCase()}</Text>
        {context !== undefined && <Text style={styles.context}>{context}</Text>}
      </View>
      <View style={styles.right}>
        <Stat label="Score" value={String(state.score)} testID="game-score" />
        {left !== null && (
          <Stat
            label={state.status === 'paused' ? 'Paused' : 'Time left'}
            value={formatClock(left)}
            urgent={urgent}
            testID="game-clock"
          />
        )}
      </View>
    </View>
  );
};

const Stat = ({
  label,
  value,
  urgent,
  testID,
}: {
  label: string;
  value: string;
  urgent?: boolean;
  testID?: string;
}) => (
  <View style={styles.stat}>
    <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
    <Text style={[styles.statValue, urgent && styles.urgent]} testID={testID}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  left: {},
  title: {
    color: theme.colors.accent,
    fontSize: theme.type.caption,
    letterSpacing: px(6),
  },
  context: {
    marginTop: theme.spacing.xs,
    color: theme.colors.faintText,
    fontSize: theme.type.caption,
    letterSpacing: px(2),
  },
  right: {
    flexDirection: 'row',
    gap: theme.spacing.xl,
  },
  stat: {
    alignItems: 'flex-end',
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
    letterSpacing: px(2),
  },
  urgent: {
    color: theme.colors.danger,
  },
});
