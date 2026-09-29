import React, {ReactNode} from 'react';
import {StyleSheet, View} from 'react-native';
import {px, theme} from '../theme/theme';
import {Transition} from './Transition';

/**
 * A modal layer: dims the screen and presents a centred case-file card.
 * Only the modal's content should be rendered focusable while it is open,
 * so the D-pad cannot wander behind it (the caller hides the rest).
 */
export const RRModal = ({children, testID}: {children: ReactNode; testID?: string}) => (
  <View style={styles.layer} testID={testID}>
    <Transition preset="fade" motion="modalEnter" style={StyleSheet.absoluteFill}>
      <View style={styles.scrim} />
    </Transition>
    <Transition preset="scale" motion="modalEnter" style={styles.card}>
      <View style={styles.cardEdge} />
      {children}
    </Transition>
  </View>
);

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrim: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
  },
  card: {
    minWidth: px(900),
    maxWidth: px(1300),
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  cardEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: px(4),
    backgroundColor: theme.colors.accent,
  },
});
