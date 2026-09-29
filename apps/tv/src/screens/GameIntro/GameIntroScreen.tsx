import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Narration} from '../../components/Narration/Narration';
import {TVButton} from '../../components/TVButton/TVButton';
import {useGame} from '../../game/GameContext';
import {px, theme} from '../../theme/theme';
import {Transition} from '../../ui/Transition';
import {ScreenProps} from '../types';

/** Opening narration. "Begin" starts the clock and enters the first scene. */
export const GameIntroScreen = ({navigator}: ScreenProps) => {
  const {mystery, state, dispatch} = useGame();
  if (!mystery || !state) {
    return null;
  }
  const minutes = mystery.failure?.timeLimitMinutes;

  const begin = () => {
    // Local play enters the first scene here. In a room the server has
    // already done so when the host started the game.
    if (state.status === 'intro') {
      dispatch({type: 'ADVANCE_SCENE'});
    }
    navigator.replace({name: 'scene'});
  };

  return (
    <View style={styles.screen}>
      {mystery.summary.motif !== undefined && (
        <Text style={styles.motif} accessibilityElementsHidden importantForAccessibility="no">
          {mystery.summary.motif}
        </Text>
      )}
      <Transition preset="fade" style={styles.fileRow}>
        <Text style={styles.fileNo}>CASE FILE</Text>
        <View style={styles.fileDash} />
        <Text style={styles.eyebrow}>{mystery.intro.title.toUpperCase()}</Text>
      </Transition>
      <Transition preset="cinematic" delay={200}>
        <Text style={styles.title}>{mystery.summary.title.toUpperCase()}</Text>
      </Transition>
      <View style={styles.rule} />
      <Transition preset="fade" motion="sceneReveal" delay={600} style={styles.story}>
        <Narration lines={mystery.intro.narration} />
      </Transition>
      <View style={styles.footer}>
        <View style={styles.row}>
          <TVButton variant="action" tone="primary" label="Begin" onPress={begin} preferredFocus testID="intro-begin" />
          <TVButton variant="action" label="Back" onPress={() => navigator.back()} testID="intro-back" />
        </View>
        {minutes !== undefined && (
          <Text style={styles.note}>
            ◷  The clock starts when you begin. You have {minutes} minutes.
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: theme.spacing.screenX,
    paddingTop: theme.spacing.screenY,
    paddingBottom: theme.spacing.screenY,
  },
  motif: {
    position: 'absolute',
    right: theme.spacing.screenX - px(20),
    top: px(260),
    color: theme.colors.accent,
    opacity: 0.07,
    fontFamily: theme.fonts.cinematic,
    fontSize: theme.type.motif,
    letterSpacing: px(8),
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
    color: theme.colors.accent,
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
    backgroundColor: theme.colors.accent,
  },
  story: {
    marginTop: theme.spacing.lg,
    maxWidth: theme.measure.narration,
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  note: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
  },
});
