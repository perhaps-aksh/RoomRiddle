import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Narration} from '../../components/Narration/Narration';
import {TVButton} from '../../components/TVButton/TVButton';
import {useGame} from '../../game/GameContext';
import {px, theme} from '../../theme/theme';
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
      <Text style={styles.eyebrow}>{mystery.intro.title.toUpperCase()}</Text>
      <Text style={styles.title}>{mystery.summary.title.toUpperCase()}</Text>
      <View style={styles.rule} />
      <View style={styles.story}>
        <Narration lines={mystery.intro.narration} />
      </View>
      <View style={styles.footer}>
        <View style={styles.row}>
          <TVButton variant="action" label="Begin" onPress={begin} preferredFocus testID="intro-begin" />
          <TVButton variant="action" label="Back" onPress={() => navigator.back()} testID="intro-back" />
        </View>
        {minutes !== undefined && (
          <Text style={styles.note}>
            The clock starts when you begin. You have {minutes} minutes.
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
    fontSize: theme.type.motif,
    fontWeight: '100',
    letterSpacing: px(8),
  },
  eyebrow: {
    color: theme.colors.accent,
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
    backgroundColor: theme.colors.accent,
  },
  story: {
    marginTop: theme.spacing.lg,
    maxWidth: px(1100),
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
    marginTop: theme.spacing.md,
    color: theme.colors.faintText,
    fontSize: theme.type.caption,
  },
});
