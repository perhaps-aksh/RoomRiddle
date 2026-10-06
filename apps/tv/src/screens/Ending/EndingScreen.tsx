import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {getGameSummary, formatClock} from '@roomriddle/game-engine';
import {errorExperience} from '@roomriddle/client';
import {Narration} from '../../components/Narration/Narration';
import {TVButton} from '../../components/TVButton/TVButton';
import {useGame} from '../../game/GameContext';
import {px, theme} from '../../theme/theme';
import {Feedback} from '../../ui/Feedback';
import {Transition} from '../../ui/Transition';
import {ScreenProps} from '../types';

/**
 * The ending the engine resolved from GameState, then the night's numbers.
 * Nothing here decides the outcome: it is read from state.endingId.
 */
export const EndingScreen = ({navigator}: ScreenProps) => {
  const {mystery, state, now, start, mode, closeRoom, room: roomView} = useGame();
  // In a room, Play Again is a request: the server starts the new game (or refuses, e.g. the phones have left).
  const [replaying, setReplaying] = useState(false);
  const [refusal, setRefusal] = useState<{title: string; detail: string; key: number} | null>(null);
  const restarted = replaying && state !== null && state.endingId === null;
  useEffect(() => {
    if (restarted) {
      navigator.reset([{name: 'mysteries'}, {name: 'gameIntro'}]);
    }
  }, [restarted, navigator]);
  const roomError = roomView.error;
  useEffect(() => {
    if (replaying && roomError) {
      const x = errorExperience(roomError.code);
      setReplaying(false);
      setRefusal(current => ({title: x.title, detail: x.message, key: (current?.key ?? 0) + 1}));
    }
  }, [replaying, roomError]);
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
    if (mode === 'room') {
      setRefusal(null);
      setReplaying(true);
      return;
    }
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
      {/* The verdict arrives slowly (the one place the UI takes its time), then the story, then the numbers. */}
      <View style={styles.body}>
        <Transition preset="fade" style={styles.fileRow}>
          <Text style={styles.fileNo}>CASE CLOSED</Text>
          <View style={styles.fileDash} />
          <Text style={[styles.eyebrow, {color: toneColor}]}>{mystery.summary.title.toUpperCase()} · ENDING</Text>
        </Transition>
        <Transition preset="cinematic" motion="endingReveal" delay={250}>
          <Text style={styles.title} testID="ending-title">
            {ending.title.toUpperCase()}
          </Text>
        </Transition>
        <View style={[styles.rule, {backgroundColor: toneColor}]} />
        <Transition preset="fade" motion="sceneReveal" delay={1100} style={styles.story}>
          <Narration lines={ending.narration} size="body" style={styles.narration} />
        </Transition>
      </View>

      <Transition preset="rise" delay={1700} style={styles.stats}>
        <Stat label="Score" value={String(summary.score)} strong testID="ending-score" />
        <Stat label="Puzzles" value={`${summary.puzzlesSolved}/${summary.puzzlesTotal}`} />
        <Stat label="Key evidence" value={`${summary.majorCluesFound}/${summary.majorCluesTotal}`} />
        <Stat label="Hints" value={String(summary.hintsUsed)} />
        <Stat label="Wrong answers" value={String(summary.incorrectAttempts)} />
        {summary.elapsedMs !== null && <Stat label="Time" value={formatClock(summary.elapsedMs)} />}
      </Transition>

      <View style={styles.actions}>
        {/* Floats beside the buttons, so the story and numbers never move. */}
        {refusal && (
          <View style={styles.refusal}>
            <Feedback kind="failure" title={refusal.title} detail={refusal.detail} playKey={refusal.key} />
          </View>
        )}
        <TVButton variant="action" tone="primary" label="Play Again" onPress={playAgain} preferredFocus testID="ending-again" />
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
  <View style={styles.stat}>
    <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
    <Text style={[styles.statValue, strong && styles.statStrong]} testID={testID}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  refusal: {
    position: 'absolute',
    left: px(1000),
    right: 0,
    bottom: 0,
  },
  screen: {
    flex: 1,
    paddingHorizontal: theme.spacing.screenX,
    paddingTop: theme.spacing.screenY - px(16),
    paddingBottom: theme.spacing.screenY - px(24),
  },
  body: {
    flex: 1,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileNo: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.textMuted,
  },
  fileDash: {
    width: px(36),
    height: 1,
    marginHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.textMuted,
  },
  eyebrow: {
    ...theme.text.label,
  },
  title: {
    ...theme.text.display,
    marginTop: theme.spacing.sm,
    color: theme.colors.textPrimary,
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
    ...theme.text.narration,
    fontSize: px(32),
    lineHeight: px(46),
    color: theme.colors.textPrimary,
  },
  // The night's numbers, as a ledger row: hairline-separated cells.
  stats: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.hairline,
  },
  stat: {
    paddingVertical: theme.spacing.sm,
    paddingRight: theme.spacing.xl,
    marginRight: theme.spacing.lg,
    borderRightWidth: 1,
    borderRightColor: theme.colors.hairline,
  },
  statLabel: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.textMuted,
  },
  statValue: {
    ...theme.text.monoLarge,
    marginTop: px(4),
    color: theme.colors.textPrimary,
  },
  statStrong: {
    color: theme.colors.focus,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
});
