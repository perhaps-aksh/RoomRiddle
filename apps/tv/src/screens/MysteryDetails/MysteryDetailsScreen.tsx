import React, {useEffect, useRef} from 'react';
import {Animated, Easing, StyleSheet, Text, View} from 'react-native';
import {ScreenHeader} from '../../components/ScreenHeader/ScreenHeader';
import {TVButton} from '../../components/TVButton/TVButton';
import {findMystery, formatPlayers} from '../../data/mysteries';
import {px, theme} from '../../theme/theme';
import {ScreenProps} from '../types';

export const MysteryDetailsScreen = ({
  navigator,
  route,
  selectedMysteryId,
  onSelectMystery,
}: ScreenProps & {route: {mysteryId: string}}) => {
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

  return (
    <View style={styles.screen}>
      {mystery.motif !== undefined && <Motif text={mystery.motif} />}

      <ScreenHeader title={mystery.title} eyebrow={mystery.genre} />

      <View style={styles.story}>
        {mystery.description.map((line, index) =>
          line === '' ? (
            <View key={index} style={styles.paragraphBreak} />
          ) : (
            <Text key={index} style={styles.storyLine}>
              {line}
            </Text>
          ),
        )}
      </View>

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
            ? '✓ Selected for tonight. Gameplay arrives with the game engine.'
            : ' '}
        </Text>
        <View style={styles.actionRow}>
          {available && (
            <TVButton
              variant="action"
              label={isSelected ? 'Selected' : 'Select Mystery'}
              onPress={() => onSelectMystery(mystery.id)}
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

  useEffect(() => {
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
  }, [breath]);

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
    fontSize: theme.type.motif,
    fontWeight: '100',
    letterSpacing: px(8),
  },
  story: {
    marginTop: theme.spacing.xl,
    maxWidth: px(1000),
  },
  storyLine: {
    color: theme.colors.text,
    fontSize: px(40),
    lineHeight: px(58),
    fontWeight: '300',
  },
  paragraphBreak: {
    height: theme.spacing.lg,
  },
  metaRow: {
    flexDirection: 'row',
    gap: theme.spacing.xxl,
    marginTop: theme.spacing.xl,
  },
  meta: {},
  metaLabel: {
    color: theme.colors.faintText,
    fontSize: theme.type.caption,
    letterSpacing: px(4),
  },
  metaValue: {
    marginTop: theme.spacing.xs,
    color: theme.colors.accent,
    fontSize: theme.type.nav,
  },
  actions: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  status: {
    color: theme.colors.mutedText,
    fontSize: theme.type.caption,
    marginBottom: theme.spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
});
