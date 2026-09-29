import React, {useEffect, useState} from 'react';
import {Animated, StyleSheet, View} from 'react-native';
import {px, theme} from '../theme/theme';
import {timing, useReducedMotion} from './motion';

/**
 * Focus animation for any focusable element: a 0→1 progress value plus the
 * matching scale. Focus-in is fast; focus-out is faster, so moving from A to B
 * reads as "A lets go, B takes hold" without ever feeling sluggish.
 */
export function useFocusAnimation(focused: boolean, scaleTo: number = theme.motion.focusScale) {
  const reduced = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(focused ? 1 : 0));
  useEffect(() => {
    const animation = timing(progress, focused ? 1 : 0, focused ? 'focusIn' : 'focusOut', reduced);
    animation.start();
    return () => animation.stop();
  }, [focused, progress, reduced]);
  const scale = reduced ? 1 : progress.interpolate({inputRange: [0, 1], outputRange: [1, scaleTo]});
  return {progress, scale, reduced};
}

const BRACKET = px(22);
const BRACKET_TRAVEL = px(10);

/**
 * The RoomRiddle focus mark: "viewfinder" corner brackets that close in on the
 * focused element, over a soft halo. It is drawn outside the element, so it
 * never shifts layout, and it uses shape as well as colour (focus is readable
 * without colour vision). Place it inside a relatively positioned container.
 */
export const FocusFrame = ({progress, radius = theme.radii.md, tone = 'focus'}: {progress: Animated.Value; radius?: number; tone?: 'focus' | 'danger' | 'signal'}) => {
  const reduced = useReducedMotion();
  const color = tone === 'danger' ? theme.colors.danger : tone === 'signal' ? theme.colors.signalStrong : theme.colors.focus;
  const travel = (sign: number) =>
    reduced ? 0 : progress.interpolate({inputRange: [0, 1], outputRange: [sign * BRACKET_TRAVEL, 0]});
  const corner = (v: 'top' | 'bottom', h: 'left' | 'right') => (
    <Animated.View
      key={`${v}${h}`}
      style={[
        styles.corner,
        {
          [v]: -px(9),
          [h]: -px(9),
          borderColor: color,
          [v === 'top' ? 'borderTopWidth' : 'borderBottomWidth']: theme.borders.focus,
          [h === 'left' ? 'borderLeftWidth' : 'borderRightWidth']: theme.borders.focus,
          opacity: progress,
          transform: [{translateX: travel(h === 'left' ? -1 : 1)}, {translateY: travel(v === 'top' ? -1 : 1)}],
        },
      ]}
    />
  );
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.halo, {borderRadius: radius + px(4), borderColor: color, opacity: progress.interpolate({inputRange: [0, 1], outputRange: [0, 0.35]})}]} />
      {corner('top', 'left')}
      {corner('top', 'right')}
      {corner('bottom', 'left')}
      {corner('bottom', 'right')}
    </View>
  );
};

const styles = StyleSheet.create({
  halo: {
    position: 'absolute',
    top: -px(5),
    left: -px(5),
    right: -px(5),
    bottom: -px(5),
    borderWidth: px(2),
  },
  corner: {
    position: 'absolute',
    width: BRACKET,
    height: BRACKET,
  },
});
