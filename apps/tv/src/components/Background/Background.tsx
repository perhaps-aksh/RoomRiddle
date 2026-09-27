import React, {useEffect, useRef} from 'react';
import {Animated, Easing, StyleSheet, View} from 'react-native';
import {px, theme} from '../../theme/theme';

/**
 * Full-screen cinematic backdrop: near-black base with two soft light pools
 * (warm gold, cool night-blue) that drift very slowly.
 *
 * No images or gradient libraries: each "glow" is a stack of concentric,
 * low-opacity circles, which reads as a soft radial light on a TV.
 * Only transform animations with the native driver, so it's cheap.
 */
export const Background = () => {
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: theme.motion.backgroundDriftMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: theme.motion.backgroundDriftMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [drift]);

  const warmShift = {
    transform: [
      {translateX: drift.interpolate({inputRange: [0, 1], outputRange: [px(0), px(-90)]})},
      {translateY: drift.interpolate({inputRange: [0, 1], outputRange: [px(0), px(40)]})},
    ],
  };
  const coolShift = {
    transform: [
      {translateX: drift.interpolate({inputRange: [0, 1], outputRange: [px(0), px(70)]})},
      {translateY: drift.interpolate({inputRange: [0, 1], outputRange: [px(0), px(-50)]})},
    ],
  };

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <View style={styles.base} />
      <Animated.View style={[styles.warmAnchor, warmShift]}>
        <Glow color={theme.colors.glowWarm} size={px(1100)} peakOpacity={0.05} />
      </Animated.View>
      <Animated.View style={[styles.coolAnchor, coolShift]}>
        <Glow color={theme.colors.glowCool} size={px(1300)} peakOpacity={0.09} />
      </Animated.View>
      <View style={styles.horizon} />
    </View>
  );
};

const RINGS = [1, 0.78, 0.58, 0.4, 0.24];

const Glow = ({
  color,
  size,
  peakOpacity,
}: {
  color: string;
  size: number;
  peakOpacity: number;
}) => (
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
