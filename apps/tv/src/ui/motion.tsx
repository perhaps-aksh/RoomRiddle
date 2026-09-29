/**
 * TV motion layer: turns the shared motion tokens into Animated timings and
 * applies the reduced-motion preference in one place, so no screen invents
 * its own durations or easings.
 */
import React, {createContext, ReactNode, useContext, useEffect, useMemo, useState} from 'react';
import {AccessibilityInfo, Animated} from 'react-native';
import {theme} from '../theme/theme';

export type {MotionName} from '@roomriddle/ui';
import type {MotionName} from '@roomriddle/ui';

interface MotionPrefs {
  reduced: boolean;
  setReduced: (reduced: boolean) => void;
}

const MotionContext = createContext<MotionPrefs>({reduced: false, setReduced: () => undefined});

/** Holds the reduced-motion preference. Seeds from the OS setting when the platform exposes it. */
export const MotionProvider = ({children, initialReduced = false}: {children: ReactNode; initialReduced?: boolean}) => {
  const [reduced, setReduced] = useState(initialReduced);
  useEffect(() => {
    let alive = true;
    try {
      AccessibilityInfo.isReduceMotionEnabled?.()
        .then(enabled => {
          if (alive && enabled) {
            setReduced(true);
          }
        })
        .catch(() => undefined);
    } catch {
      // Not available on this platform: keep the in-app setting.
    }
    return () => {
      alive = false;
    };
  }, []);
  const value = useMemo(() => ({reduced, setReduced}), [reduced]);
  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
};

export function useMotionPrefs(): MotionPrefs {
  return useContext(MotionContext);
}

export function useReducedMotion(): boolean {
  return useContext(MotionContext).reduced;
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
