import React, {useEffect, useRef} from 'react';
import {Animated, Easing, StyleSheet, View} from 'react-native';
import {px, theme} from '../../theme/theme';
import {useReducedMotion} from '../../ui/motion';

export type BackgroundMood = 'default' | 'warm' | 'cool' | 'dim';

/**
 * Full-screen cinematic backdrop: near-black base, two soft light pools
 * (warm brass, cool night-blue) that drift very slowly, a faint survey grid
 * and a vignette frame. This is UI atmosphere, not a game environment.
 *
 * No images or gradient libraries: each glow is a stack of concentric,
 * low-opacity circles, which reads as a soft radial light on a TV. Only
 * transform animations with the native driver, so it's cheap. With reduced
 * motion the lights hold still, and they also hold still when `still` is set
 * (a full-screen scene covers the backdrop).
 */
export const Background = ({mood = 'default', still = false}: {mood?: BackgroundMood; still?: boolean}) => {
  const drift = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || still) {
      return;
    }
    const half = (to: number) =>
      Animated.timing(drift, {toValue: to, duration: theme.motion.backgroundDriftMs, easing: Easing.inOut(Easing.sin), useNativeDriver: true});
    const loop = Animated.loop(Animated.sequence([half(1), half(0)]));
    loop.start();
    return () => loop.stop();
  }, [drift, reduced, still]);

  const shift = (x: number, y: number) => ({
    transform: [
      {translateX: drift.interpolate({inputRange: [0, 1], outputRange: [0, px(x)]})},
      {translateY: drift.interpolate({inputRange: [0, 1], outputRange: [0, px(y)]})},
    ],
  });
  const warm = mood === 'warm' ? 0.08 : mood === 'dim' || mood === 'cool' ? 0.025 : 0.05;
  const cool = mood === 'cool' ? 0.13 : mood === 'dim' ? 0.05 : 0.09;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.base} />
      <Animated.View style={[styles.warmAnchor, shift(-90, 40)]}>
        <Glow color={theme.colors.glowWarm} size={px(1100)} peakOpacity={warm} />
      </Animated.View>
      <Animated.View style={[styles.coolAnchor, shift(70, -50)]}>
        <Glow color={theme.colors.glowCool} size={px(1300)} peakOpacity={cool} />
      </Animated.View>
      <SurveyGrid />
      <View style={styles.frame} />
      <View style={styles.horizon} />
    </View>
  );
};

const RINGS = [1, 0.78, 0.58, 0.4, 0.24];

const Glow = ({color, size, peakOpacity}: {color: string; size: number; peakOpacity: number}) => (
  <View style={{width: size, height: size}}>
    {RINGS.map(ratio => {
      const d = size * ratio;
      return (
        <View
          key={ratio}
          style={[
            styles.ring,
            {
              left: (size - d) / 2,
              top: (size - d) / 2,
              width: d,
              height: d,
              borderRadius: d / 2,
              backgroundColor: color,
              opacity: peakOpacity / RINGS.length + peakOpacity * 0.15,
            },
          ]}
        />
      );
    })}
  </View>
);

const COLUMNS = [0.25, 0.5, 0.75];
const ROWS = [0.33, 0.66];

/** A barely-there investigation grid with registration ticks in the corners. */
const SurveyGrid = () => (
  <View style={StyleSheet.absoluteFill}>
    {COLUMNS.map(x => (
      <View key={`c${x}`} style={[styles.gridV, {left: `${x * 100}%`}]} />
    ))}
    {ROWS.map(y => (
      <View key={`r${y}`} style={[styles.gridH, {top: `${y * 100}%`}]} />
    ))}
    <View style={[styles.tick, styles.tickTL]} />
    <View style={[styles.tick, styles.tickTR]} />
    <View style={[styles.tick, styles.tickBL]} />
    <View style={[styles.tick, styles.tickBR]} />
  </View>
);

const TICK = px(34);
const INSET = px(44);

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
  },
  base: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.background,
  },
  warmAnchor: {
    position: 'absolute',
    top: px(-520),
    right: px(-380),
  },
  coolAnchor: {
    position: 'absolute',
    bottom: px(-700),
    left: px(-520),
  },
  gridV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: theme.colors.hairline,
    opacity: 0.35,
  },
  gridH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: theme.colors.hairline,
    opacity: 0.35,
  },
  tick: {
    position: 'absolute',
    width: TICK,
    height: TICK,
    borderColor: theme.colors.borderStrong,
    opacity: 0.7,
  },
  tickTL: {top: INSET, left: INSET, borderTopWidth: 1, borderLeftWidth: 1},
  tickTR: {top: INSET, right: INSET, borderTopWidth: 1, borderRightWidth: 1},
  tickBL: {bottom: INSET, left: INSET, borderBottomWidth: 1, borderLeftWidth: 1},
  tickBR: {bottom: INSET, right: INSET, borderBottomWidth: 1, borderRightWidth: 1},
  frame: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: px(28),
    borderColor: theme.colors.backgroundDeep,
    opacity: 0.6,
  },
  horizon: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: theme.colors.border,
    opacity: 0.6,
  },
});
