import React, {memo, useEffect, useMemo, useState} from 'react';
import {Animated, Easing, StyleSheet, View} from 'react-native';
import {theme as ds} from '@roomriddle/ui';
import {px} from '../theme/theme';

/**
 * Lightweight 2.5D effects. Every loop runs on the native driver, starts
 * only while its effect is on, and stops when it goes off or when reduced
 * motion is on. Counts are fixed and small (Fire TV budget: no per-frame JS,
 * no hundreds of views).
 */
const W = ds.worldColors;

function useLoop(on: boolean, duration: number, delay = 0): Animated.Value {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!on) {
      v.stopAnimation();
      return;
    }
    v.setValue(0);
    const loop = Animated.loop(Animated.timing(v, {toValue: 1, duration, delay, easing: Easing.linear, useNativeDriver: true}));
    loop.start();
    return () => loop.stop();
  }, [on, duration, delay, v]);
  return v;
}

function useFade(on: boolean, duration = 600): Animated.Value {
  const [v] = useState(() => new Animated.Value(on ? 1 : 0));
  useEffect(() => {
    const a = Animated.timing(v, {toValue: on ? 1 : 0, duration, easing: Easing.out(Easing.quad), useNativeDriver: true});
    a.start();
    return () => a.stop();
  }, [on, duration, v]);
  return v;
}

/** Deterministic pseudo-random in [0,1) (same drops on every render and device). */
const rand = (i: number, salt: number) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const RAIN_BANDS = [
  {count: 6, length: 26, width: 1.5, opacity: 0.18, duration: 1500, drift: 60, salt: 1},
  {count: 7, length: 46, width: 2, opacity: 0.28, duration: 1050, drift: 90, salt: 2},
  {count: 6, length: 90, width: 3, opacity: 0.4, duration: 650, drift: 140, salt: 3},
] as const;

/** One band of rain: two stacked copies scrolling down forever (seamless). */
const RainBand = memo(({band, on, still}: {band: (typeof RAIN_BANDS)[number]; on: boolean; still: boolean}) => {
  const t = useLoop(on && !still, band.duration);
  const drops = useMemo(
    () =>
      Array.from({length: band.count}, (_, i) => ({
        x: rand(i, band.salt) * 1920,
        y: rand(i, band.salt + 10) * 1080,
      })),
    [band],
  );
  const translateY = t.interpolate({inputRange: [0, 1], outputRange: [0, px(1080)]});
  const translateX = t.interpolate({inputRange: [0, 1], outputRange: [0, px(band.drift)]});
  const copy = (offset: number) => (
    <View style={[StyleSheet.absoluteFill, {top: px(offset)}]}>
      {drops.map((d, i) => (
        <View
          key={i}
          style={[styles.abs, {
            left: px(d.x),
            top: px(d.y),
            width: px(band.width),
            height: px(band.length),
            backgroundColor: W.rain,
            opacity: band.opacity,
            transform: [{rotate: '12deg'}],
          }]}
        />
      ))}
    </View>
  );
  return (
    <Animated.View style={[StyleSheet.absoluteFill, {transform: [{translateX}, {translateY}]}]}>
      {copy(0)}
      {copy(-1080)}
    </Animated.View>
  );
});

/** Rain in three depth bands: far (thin, slow), mid, near (long, fast). */
export const Rain = ({on, reduced}: {on: boolean; reduced: boolean}) => {
  const fade = useFade(on, 900);
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip, {opacity: fade}]} testID={on ? 'fx-rain' : undefined}>
      {RAIN_BANDS.map((b, i) => (reduced && i === 0 ? null : <RainBand key={b.salt} band={b} on={on} still={reduced} />))}
    </Animated.View>
  );
};

/** Two soft fog banks drifting along the platform. */
export const Fog = ({on, reduced}: {on: boolean; reduced: boolean}) => {
  const fade = useFade(on, 1500);
  const a = useLoop(on && !reduced, 26000);
  const b = useLoop(on && !reduced, 34000, 1200);
  const bank = (t: Animated.Value, top: number, dir: 1 | -1, opacity: number) => (
    <Animated.View
      style={[
        styles.fog,
        {
          top: px(top),
          opacity,
          transform: [{translateX: t.interpolate({inputRange: [0, 0.5, 1], outputRange: [0, px(dir * 260), 0]})}],
        },
      ]}
    />
  );
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, {opacity: fade}]}>
      {bank(a, 780, 1, 0.07)}
      {bank(b, 880, -1, 0.1)}
    </Animated.View>
  );
};

/** Puffs rising and spreading from a point (steam under the train, smoke from the engine). */
export const Puffs = ({on, reduced, x, y, color = 'steam', count = 5, spread = 260, rise = 220, size = 120}: {on: boolean; reduced: boolean; x: number; y: number; color?: 'steam' | 'fog' | 'cloud'; count?: number; spread?: number; rise?: number; size?: number}) => {
  const fade = useFade(on, 800);
  const loops = [useLoop(on && !reduced, 2600, 0), useLoop(on && !reduced, 2600, 900), useLoop(on && !reduced, 2600, 1700)];
  return (
    <Animated.View pointerEvents="none" style={[styles.puffOrigin, {left: px(x), top: px(y), opacity: fade}]}>
      {Array.from({length: count}, (_, i) => {
        const t = loops[i % loops.length]!;
        const dx = (rand(i, 7) - 0.5) * spread;
        return (
          <Animated.View key={i} style={[styles.abs, puffStyle(t, dx, size, rise, W[color], reduced)]} />
        );
      })}
    </Animated.View>
  );
};

function puffStyle(t: Animated.Value, dx: number, size: number, rise: number, color: string, reduced: boolean) {
  return {
    left: px(dx - size / 2),
    top: px(-size / 2),
    width: px(size),
    height: px(size),
    borderRadius: px(size / 2),
    backgroundColor: color,
    opacity: reduced ? 0.12 : t.interpolate({inputRange: [0, 0.2, 1], outputRange: [0, 0.22, 0]}),
    transform: reduced
      ? []
      : [
          {translateY: t.interpolate({inputRange: [0, 1], outputRange: [0, -px(rise)]})},
          {translateX: t.interpolate({inputRange: [0, 1], outputRange: [0, px(dx * 0.4)]})},
          {scale: t.interpolate({inputRange: [0, 1], outputRange: [0.5, 1.8]})},
        ],
  };
}

/** A warm light pool (concentric discs, no gradients needed) with an optional flicker. */
export const Glow = ({x, y, radius, color = 'lampGlow', strength = 0.16, flicker, reduced, seed = 0}: {x: number; y: number; radius: number; color?: 'lampGlow' | 'windowGlow' | 'headlight'; strength?: number; flicker: boolean; reduced: boolean; seed?: number}) => {
  const [v] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!flicker || reduced) {
      v.setValue(1);
      return;
    }
    // Irregular: mostly steady, the odd dip. Different per lamp.
    const dip = (to: number, d: number) => Animated.timing(v, {toValue: to, duration: d, useNativeDriver: true});
    const loop = Animated.loop(
      Animated.sequence([Animated.delay(1800 + seed * 700), dip(0.55, 60), dip(1, 90), Animated.delay(400 + seed * 300), dip(0.7, 50), dip(1, 120), Animated.delay(2600)]),
    );
    loop.start();
    return () => loop.stop();
  }, [flicker, reduced, seed, v]);
  return (
    <Animated.View pointerEvents="none" style={[styles.abs, {left: px(x - radius), top: px(y - radius), width: px(radius * 2), height: px(radius * 2), opacity: v}]}>
      {/* Five soft steps read as a falloff, not as rings. */}
      {[1, 0.8, 0.6, 0.42, 0.26].map((k, i) => (
        <View
          key={i}
          style={[styles.abs, {
            left: px(radius * (1 - k)),
            top: px(radius * (1 - k)),
            width: px(radius * 2 * k),
            height: px(radius * 2 * k),
            borderRadius: px(radius * k),
            backgroundColor: W[color],
            opacity: strength * 0.62,
          }]}
        />
      ))}
    </Animated.View>
  );
};

/** Full-screen lightning flash. */
export const Lightning = ({on, reduced}: {on: boolean; reduced: boolean}) => {
  const [v] = useState(() => new Animated.Value(0));
  // The flash always runs to the end: timelines switch the effect off ~200 ms
  // later, and stopping it then left a grey veil over the scene.
  useEffect(() => () => v.stopAnimation(), [v]);
  useEffect(() => {
    if (!on) {
      return;
    }
    const peak = reduced ? 0.12 : 0.55;
    const a = Animated.sequence([
      Animated.timing(v, {toValue: peak, duration: 40, useNativeDriver: true}),
      Animated.timing(v, {toValue: 0.1, duration: 80, useNativeDriver: true}),
      Animated.timing(v, {toValue: peak * 0.7, duration: 40, useNativeDriver: true}),
      Animated.timing(v, {toValue: 0, duration: 420, useNativeDriver: true}),
    ]);
    a.start();
  }, [on, reduced, v]);
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, {backgroundColor: W.steam, opacity: v}]} />;
};

const styles = StyleSheet.create({
  abs: {
    position: 'absolute',
  },
  clip: {
    overflow: 'hidden',
  },
  fog: {
    position: 'absolute',
    left: -px(400),
    width: px(2720),
    height: px(260),
    borderRadius: px(130),
    backgroundColor: W.fog,
  },
  puffOrigin: {
    position: 'absolute',
    width: 0,
    height: 0,
  },
});
