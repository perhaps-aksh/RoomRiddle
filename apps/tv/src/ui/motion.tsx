/**
 * TV motion layer: turns the shared motion tokens into Animated timings and
 * applies the reduced-motion preference in one place, so no screen invents
 * its own durations or easings.
 */
import {useEffect, useMemo, useState} from 'react';
import {Animated} from 'react-native';
import {useSettings} from '../settings/SettingsContext';
import {theme} from '../theme/theme';

export type {MotionName} from '@roomriddle/ui';
import type {MotionName} from '@roomriddle/ui';

interface MotionPrefs {
  reduced: boolean;
  setReduced: (reduced: boolean) => void;
}

/**
 * Reduced motion is a saved player preference (settings/SettingsContext), so it
 * survives restarts; the OS reduce-motion setting seeds it on first launch.
 */
export function useMotionPrefs(): MotionPrefs {
  const {settings, update} = useSettings();
  return useMemo(() => ({reduced: settings.motion === 'reduced', setReduced: (r: boolean) => update({motion: r ? 'reduced' : 'full'})}), [settings.motion, update]);
}

export function useReducedMotion(): boolean {
  return useSettings().settings.motion === 'reduced';
}

/** Duration for a semantic motion, respecting reduced motion. */
export function motionDuration(name: MotionName, reduced: boolean): number {
  const token = theme.motion[name];
  return reduced ? Math.min(token.duration, 120) : token.duration;
}

/** An Animated.timing driven by a semantic motion token. */
export function timing(
  value: Animated.Value,
  toValue: number,
  name: MotionName,
  reduced: boolean,
  delay = 0,
): Animated.CompositeAnimation {
  const token = theme.motion[name];
  return Animated.timing(value, {
    toValue,
    duration: motionDuration(name, reduced),
    delay: reduced ? 0 : delay,
    easing: theme.motion.easing[token.easing],
    useNativeDriver: true,
  });
}

/**
 * A 0→1 progress value that plays once on mount (or when `play` turns true).
 * With reduced motion the value still animates, only briefly, so opacity fades
 * stay gentle and nothing pops.
 */
export function useEntrance(name: MotionName, {delay = 0, play = true}: {delay?: number; play?: boolean} = {}) {
  const reduced = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!play) {
      return;
    }
    const animation = timing(progress, 1, name, reduced, delay);
    animation.start();
    return () => animation.stop();
  }, [progress, name, reduced, delay, play]);
  return {progress, reduced};
}
