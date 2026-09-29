import React, {ReactNode} from 'react';
import {Animated, StyleProp, ViewStyle} from 'react-native';
import {theme} from '../theme/theme';
import {MotionName, useEntrance} from './motion';

export type TransitionPreset = 'fade' | 'rise' | 'scale' | 'slide' | 'reveal' | 'cinematic';

const DEFAULT_MOTION: Record<TransitionPreset, MotionName> = {
  fade: 'screenEnter',
  rise: 'screenEnter',
  scale: 'modalEnter',
  slide: 'listItemEnter',
  reveal: 'discovery',
  cinematic: 'sceneReveal',
};

export interface TransitionProps {
  children: ReactNode;
  preset?: TransitionPreset;
  motion?: MotionName;
  /** Milliseconds; use `index * theme.motion.stagger.duration` for lists. */
  delay?: number;
  /** Start when true (default: on mount). */
  play?: boolean;
  /** Slide direction. */
  from?: 'left' | 'right';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * The one entrance primitive. Screens say what kind of arrival they want
 * (fade, rise, scale, slide, reveal, cinematic) and this applies the shared
 * timing. With reduced motion every preset becomes a short fade.
 * Entrances never block input: children are focusable immediately.
 */
export const Transition = ({children, preset = 'rise', motion, delay = 0, play = true, from = 'left', style, testID}: TransitionProps) => {
  const {progress, reduced} = useEntrance(motion ?? DEFAULT_MOTION[preset], {delay, play});
  const lerp = (a: number, b: number) => progress.interpolate({inputRange: [0, 1], outputRange: [a, b]});

  let transform: ViewStyle['transform'] = [];
  if (!reduced) {
    switch (preset) {
      case 'rise':
        transform = [{translateY: lerp(theme.motion.screenEnterOffset, 0)}];
        break;
      case 'scale':
        transform = [{scale: lerp(0.94, 1)}];
        break;
      case 'slide':
        transform = [{translateX: lerp(from === 'left' ? -theme.motion.listItemOffset : theme.motion.listItemOffset, 0)}];
        break;
      case 'reveal':
        transform = [{scale: lerp(theme.motion.discoveryScaleFrom, 1)}, {translateY: lerp(theme.motion.screenEnterOffset / 2, 0)}];
        break;
      case 'cinematic':
        transform = [{scale: lerp(1.035, 1)}];
        break;
      default:
        break;
    }
  }
  const opacity = preset === 'cinematic' && !reduced ? progress.interpolate({inputRange: [0, 0.35, 1], outputRange: [0, 0.4, 1]}) : progress;

  return (
    <Animated.View testID={testID} style={[style, {opacity, transform}]}>
      {children}
    </Animated.View>
  );
};
