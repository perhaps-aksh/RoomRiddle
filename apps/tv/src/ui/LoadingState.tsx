import React, {useEffect, useState} from 'react';
import {Animated, Easing, StyleSheet, Text, View} from 'react-native';
import {LOADING_COPY, type LoadingKind} from '@roomriddle/client';
import {px, theme} from '../theme/theme';
import {Transition} from './Transition';
import {useReducedMotion} from './motion';

const TRACK = px(420);
const SWEEP = px(110);

/**
 * The investigation-system loader: a scanner sweeping a thin track, with the
 * state written out underneath ("PREPARING INVESTIGATION"). One animation
 * for every waiting moment. It loops only while mounted, uses the native
 * driver, and holds still with reduced motion (the words carry the state).
 */
export const LoadingState = ({kind, title, detail, compact, testID}: {kind: LoadingKind; title?: string; detail?: string; compact?: boolean; testID?: string}) => {
  const reduced = useReducedMotion();
  const [sweep] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduced) {
      return;
    }
    const loop = Animated.loop(
      Animated.timing(sweep, {toValue: 1, duration: theme.motion.loaderCycle.duration, easing: Easing.inOut(Easing.cubic), useNativeDriver: true}),
    );
    loop.start();
    return () => loop.stop();
  }, [sweep, reduced]);

  const copy = LOADING_COPY[kind];
  return (
    <Transition preset="fade" style={[styles.wrap, compact && styles.compact]} testID={testID ?? `loading-${kind}`}>
      <View accessibilityRole="progressbar" accessibilityLabel={title ?? copy.title} style={styles.track}>
        <Animated.View
          style={[
            styles.sweep,
            reduced
              ? {left: (TRACK - SWEEP) / 2}
              : {transform: [{translateX: sweep.interpolate({inputRange: [0, 1], outputRange: [-SWEEP, TRACK]})}]},
          ]}
        />
      </View>
      <Text style={styles.title}>{title ?? copy.title}</Text>
      {!compact && <Text style={styles.detail}>{detail ?? copy.detail}</Text>}
    </Transition>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
  },
  compact: {
    paddingVertical: theme.spacing.sm,
  },
  track: {
    width: TRACK,
    height: px(3),
    overflow: 'hidden',
    backgroundColor: theme.colors.border,
  },
  sweep: {
    position: 'absolute',
    top: 0,
    width: SWEEP,
    height: px(3),
    backgroundColor: theme.colors.signalStrong,
  },
  title: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.signalStrong,
    marginTop: theme.spacing.md,
  },
  detail: {
    ...theme.text.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
});
