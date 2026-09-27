import React, {ReactNode, useEffect, useRef} from 'react';
import {Animated, Easing, StyleSheet} from 'react-native';
import {theme} from '../../theme/theme';

/**
 * Screen entrance: fade in and rise slightly. Mount it with a new `key` per screen
 * so every navigation replays the entrance.
 */
export const ScreenTransition = ({children}: {children: ReactNode}) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: theme.motion.screenEnterMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress]);

  return (
    <Animated.View
      style={[
        styles.fill,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [theme.motion.screenEnterOffset, 0],
              }),
            },
          ],
        },
      ]}>
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
