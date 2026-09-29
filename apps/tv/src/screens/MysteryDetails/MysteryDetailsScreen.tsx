import React, {useEffect, useRef} from 'react';
import {Animated, Easing, StyleSheet, Text, View} from 'react-native';
import {ScreenHeader} from '../../components/ScreenHeader/ScreenHeader';
import {TVButton} from '../../components/TVButton/TVButton';
import {findMystery, formatPlayers} from '../../data/mysteries';
import {useGame} from '../../game/GameContext';
import {px, theme} from '../../theme/theme';
import {useReducedMotion} from '../../ui/motion';
import {Transition} from '../../ui/Transition';
import {ScreenProps} from '../types';

export const MysteryDetailsScreen = ({
  navigator,
  route,
  selectedMysteryId,
  onSelectMystery,
}: ScreenProps & {route: {mysteryId: string}}) => {
  const {start} = useGame();
  const mystery = findMystery(route.mysteryId);

  if (mystery === undefined) {
    // Defensive: the library only links to known ids.
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Mystery not found" />
        <View style={styles.actions}>
          <TVButton variant="action" label="Back" onPress={() => navigator.back()} preferredFocus />
        </View>
      </View>
    );
  }

  const available = mystery.availability === 'available';
  const isSelected = mystery.id === selectedMysteryId;

  // Select the mystery for tonight and start it locally (no room needed yet).
  const selectAndStart = () => {
    onSelectMystery(mystery.id);
    start(mystery.id);
    navigator.push({name: 'gameIntro'}, 'details-select');
  };

  return (
    <View style={styles.screen}>
      {mystery.motif !== undefined && <Motif text={mystery.motif} />}

      <ScreenHeader title={mystery.title} eyebrow={mystery.genre} />

      <Transition preset="fade" motion="sceneReveal" delay={120} style={styles.story}>
        {mystery.description.map((line, index) =>
          line === '' ? (
            <View key={index} style={styles.paragraphBreak} />
          ) : (
            <Text key={index} style={styles.storyLine}>
              {line}
            </Text>
          ),
        )}
      </Transition>

      <View style={styles.metaRow}>
        <Meta label="Players" value={formatPlayers(mystery)} />
        <Meta label="Difficulty" value={mystery.difficulty} />
        <Meta label="Length" value={`~${mystery.estimatedMinutes} min`} />
      </View>

      <View style={styles.actions}>
        <Text style={styles.status}>
          {!available
            ? 'Coming soon. This mystery is not playable yet.'
            : isSelected
            ? '✓ Selected for tonight. Local play on this TV, phones join in a later phase.'
            : ' '}
        </Text>
        <View style={styles.actionRow}>
          {available && (
            <TVButton
              variant="action"
              tone="primary"
              label="Select Mystery"
              accessibilityHint="Selects this mystery and starts it"
              onPress={selectAndStart}
              preferredFocus
              testID="details-select"
            />
          )}
          <TVButton
            variant="action"
            label="Back"
            onPress={() => navigator.back()}
            preferredFocus={!available}
            testID="details-back"
          />
        </View>
      </View>
    </View>
  );
};

const Meta = ({label, value}: {label: string; value: string}) => (
  <View style={styles.meta}>
    <Text style={styles.metaLabel}>{label.toUpperCase()}</Text>
    <Text style={styles.metaValue}>{value}</Text>
  </View>
);

/** Huge, faint, slowly breathing background motif (e.g. "11:47"). */
const Motif = ({text}: {text: string}) => {
  const breath = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      breath.setValue(0.5);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: theme.motion.breathMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: theme.motion.breathMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breath, reduced]);

  return (
    <Animated.Text
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        styles.motif,
        {opacity: breath.interpolate({inputRange: [0, 1], outputRange: [0.05, 0.1]})},
      ]}>
      {text}
    </Animated.Text>
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
    top: px(250),
    color: theme.colors.accent,
    fontFamily: theme.fonts.cinematic,
    fontSize: theme.type.motif,
    letterSpacing: px(8),
  },
  story: {
    marginTop: theme.spacing.xl,
    maxWidth: px(1000),
  },
  storyLine: {
    ...theme.text.narration,
    fontSize: px(40),
    lineHeight: px(58),
    color: theme.colors.textPrimary,
  },
  paragraphBreak: {
    height: theme.spacing.lg,
  },
  metaRow: {
    flexDirection: 'row',
    gap: theme.spacing.xxl,
    marginTop: theme.spacing.xl,
  },
  // Case facts in the technical voice, like a file's index card.
  meta: {
    paddingLeft: theme.spacing.sm,
    borderLeftWidth: px(3),
    borderLeftColor: theme.colors.accentSoft,
  },
  metaLabel: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.textMuted,
  },
  metaValue: {
    ...theme.text.mono,
    fontSize: px(32),
    lineHeight: px(40),
    marginTop: theme.spacing.xs,
    color: theme.colors.accent,
  },
  actions: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  status: {
    ...theme.text.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
});
