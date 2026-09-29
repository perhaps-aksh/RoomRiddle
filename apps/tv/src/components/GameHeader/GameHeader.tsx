import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {formatClock, remainingMs} from '@roomriddle/game-engine';
import {useGame} from '../../game/GameContext';
import {px, theme} from '../../theme/theme';
import {StatusDot} from '../../ui/RRBadge';

/**
 * The instrument strip across the top of every in-game screen: case title and
 * where the players are on the left; investigators online, score and time on
 * the right, in the technical voice. Read-only: it renders GameState.
 */
export const GameHeader = ({context}: {context?: string}) => {
  const {mystery, state, now, mode, room} = useGame();
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
  const players = room.room?.players.filter(p => p.role === 'player') ?? [];
  const online = players.filter(p => p.connected).length;
  const linkUp = room.connection === 'open';

  return (
    <View style={styles.bar}>
      <View style={styles.left}>
        <Text style={styles.title}>{mystery.summary.title.toUpperCase()}</Text>
        {context !== undefined && <Text style={styles.context}>{context}</Text>}
      </View>
      <View style={styles.right}>
        {mode === 'room' && (
          <View style={styles.stat}>
            <Text style={styles.statLabel}>ROOM {room.room?.code ?? ''}</Text>
            <View style={styles.link}>
              <StatusDot online={linkUp} label={linkUp ? `${online}/${players.length} online` : 'Reconnecting'} />
            </View>
          </View>
        )}
        <Stat label="Score" value={String(state.score)} testID="game-score" />
        {left !== null && (
          <Stat label={state.status === 'paused' ? 'Paused' : 'Time left'} value={formatClock(left)} urgent={urgent} testID="game-clock" />
        )}
      </View>
    </View>
  );
};

const Stat = ({label, value, urgent, testID}: {label: string; value: string; urgent?: boolean; testID?: string}) => (
  <View style={styles.stat}>
    <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
    <Text style={[styles.statValue, urgent && styles.urgent]} testID={testID}>
      {urgent ? `! ${value}` : value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.hairline,
  },
  left: {
    flexShrink: 1,
  },
  title: {
    ...theme.text.label,
    color: theme.colors.accent,
  },
  context: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    marginTop: theme.spacing.xs,
    color: theme.colors.textMuted,
    letterSpacing: px(3),
  },
  right: {
    flexDirection: 'row',
    gap: theme.spacing.xl,
  },
  stat: {
    alignItems: 'flex-end',
  },
  link: {
    marginTop: px(12),
  },
  statLabel: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.textMuted,
  },
  statValue: {
    ...theme.text.monoLarge,
    fontSize: px(36),
    lineHeight: px(44),
    marginTop: px(2),
    color: theme.colors.textPrimary,
  },
  urgent: {
    color: theme.colors.danger,
  },
});
