import React, {ReactNode} from 'react';
import {StyleSheet} from 'react-native';
import {Transition, TransitionPreset} from '../../ui/Transition';

/**
 * Screen entrance. Mount it with a new `key` per screen so every navigation
 * replays it. The preset is chosen by the shell per kind of move (see
 * App.tsx): story beats get the cinematic reveal, menus rise, going back
 * fades. Input is never blocked while it plays.
 */
export const ScreenTransition = ({children, preset = 'rise'}: {children: ReactNode; preset?: TransitionPreset}) => (
  <Transition preset={preset} style={styles.fill}>
    {children}
  </Transition>
);

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
