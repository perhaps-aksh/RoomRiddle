import React, {useEffect, useRef} from 'react';
import {Animated, Easing, StyleSheet, Text, View} from 'react-native';
import {FocusableCard} from '../FocusableCard/FocusableCard';
import {formatPlayers, TVMystery} from '../../data/mysteries';
import {px, theme} from '../../theme/theme';
import {useReducedMotion} from '../../ui/motion';

export interface MysteryCardProps {
  mystery: TVMystery;
  onPress: () => void;
  preferredFocus?: boolean;
  selected?: boolean;
  testID?: string;
}

// Five cases fit across the 1664 px safe width (1920 − 2 × 128) with room for the focus scale.
export const CARD_WIDTH = px(312);
const CARD_HEIGHT = px(500);

export const MysteryCard = ({
  mystery,
  onPress,
  preferredFocus,
  selected,
  testID,
}: MysteryCardProps) => {
  const available = mystery.availability === 'available';
  return (
    <FocusableCard
      onPress={onPress}
      preferredFocus={preferredFocus}
      style={styles.card}
      accessibilityLabel={`${mystery.title}. ${mystery.shortDescription} ${
        available ? '' : 'Coming soon.'
      }`}
      accessibilityHint="Opens the mystery details"
      testID={testID}>
      {focused => (
        <>
          <CardAtmosphere active={focused} />
          <View style={styles.topRow}>
            <Text style={styles.genre} numberOfLines={1}>{mystery.genre.toUpperCase()}</Text>
            {selected ? (
              <Text style={styles.selectedTag} accessibilityLabel="Selected">✓</Text>
            ) : !available ? (
              <Text style={styles.soonTag}>SOON</Text>
            ) : null}
          </View>
          <Text
            style={[styles.title, focused && styles.titleFocused]}
            numberOfLines={3}>
            {mystery.title}
          </Text>
          <Text style={styles.description} numberOfLines={3}>
            {mystery.shortDescription}
          </Text>
          <View style={styles.spacer} />
          {/* Mood words live on the details screen; five cards leave no room for them here. */}
          <View style={styles.divider} />
          <View style={styles.metaRow}>
            <Meta label="Players" value={formatPlayers(mystery)} />
            <Meta label="Level" value={mystery.difficulty} />
          </View>
        </>
      )}
    </FocusableCard>
  );
};

// One line per fact (label, then value) so narrow cards never truncate either.
const Meta = ({label, value}: {label: string; value: string}) => (
  <Text style={styles.metaLabel} numberOfLines={1}>
    {label.toUpperCase()}  <Text style={styles.metaValue}>{value}</Text>
  </Text>
);

/** Slow drifting light inside the focused card. Stopped when not focused. */
const CardAtmosphere = ({active}: {active: boolean}) => {
  const drift = useRef(new Animated.Value(0)).current;
  const presence = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();

  useEffect(() => {
    Animated.timing(presence, {
      toValue: active ? 1 : 0,
      duration: reduced ? 120 : theme.motion.success.duration,
      useNativeDriver: true,
    }).start();
    if (!active || reduced) {
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: theme.motion.breathMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: theme.motion.breathMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, drift, presence, reduced]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.atmosphereGlow,
        {
          opacity: presence,
          transform: [
            {translateX: drift.interpolate({inputRange: [0, 1], outputRange: [px(-40), px(40)]})},
            {translateY: drift.interpolate({inputRange: [0, 1], outputRange: [px(0), px(30)]})},
          ],
        },
      ]}>
      <View style={[styles.glowRing, styles.glowOuter]} />
      <View style={[styles.glowRing, styles.glowInner]} />
    </Animated.View>
  );
};

const GLOW = px(520);

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    padding: theme.spacing.lg,
  },
  // Label tracking (6) is sized for headings; on a 382 px card two labels need tighter
  // tracking and an explicit gap or they run together ("THRILLERSELECTED").
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    columnGap: theme.spacing.sm,
  },
  genre: {
    ...theme.text.label,
    flexShrink: 1,
    color: theme.colors.accent,
  },
  soonTag: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    fontSize: px(20),
    letterSpacing: px(3),
    color: theme.colors.textMuted,
  },
  selectedTag: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    fontSize: px(20),
    letterSpacing: px(3),
    color: theme.colors.success,
  },
  title: {
    ...theme.text.h1,
    fontSize: px(34),
    lineHeight: px(40),
    letterSpacing: 0,
    textTransform: 'none',
    marginTop: theme.spacing.md,
    color: theme.colors.textPrimary,
  },
  titleFocused: {
    color: theme.colors.focus,
  },
  description: {
    ...theme.text.body,
    marginTop: theme.spacing.sm,
    color: theme.colors.textSecondary,
  },
  spacer: {
    flex: 1,
  },
  atmosphere: {
    ...theme.text.narration,
    fontSize: px(24),
    lineHeight: px(32),
    fontStyle: 'italic',
    color: theme.colors.textMuted,
  },
  divider: {
    height: 1,
    marginVertical: theme.spacing.md,
    backgroundColor: theme.colors.border,
  },
  metaRow: {
    rowGap: px(6),
  },
  metaLabel: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    fontSize: px(20),
    letterSpacing: px(2),
    color: theme.colors.textMuted,
  },
  metaValue: {
    ...theme.text.mono,
    fontSize: px(24),
    letterSpacing: 0,
    textTransform: 'none',
    color: theme.colors.textPrimary,
  },
  atmosphereGlow: {
    position: 'absolute',
    top: -GLOW / 2,
    left: CARD_WIDTH / 2 - GLOW / 2,
    width: GLOW,
    height: GLOW,
  },
  glowRing: {
    position: 'absolute',
    borderRadius: GLOW,
    backgroundColor: theme.colors.glowWarm,
  },
  glowOuter: {
    left: 0,
    top: 0,
    width: GLOW,
    height: GLOW,
    opacity: 0.05,
  },
  glowInner: {
    left: GLOW * 0.2,
    top: GLOW * 0.2,
    width: GLOW * 0.6,
    height: GLOW * 0.6,
    opacity: 0.06,
  },
});
