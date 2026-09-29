import React, {ReactNode, useState} from 'react';
import {Animated, Pressable, StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {theme} from '../../theme/theme';
import {cue} from '../../ui/cues';
import {FocusFrame, useFocusAnimation} from '../../ui/focus';

export interface FocusableCardProps {
  onPress: () => void;
  onFocus?: () => void;
  preferredFocus?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
  accessibilityHint?: string;
  testID?: string;
  /** Keeps a brass edge while unfocused (a chosen answer option). */
  selected?: boolean;
  /** Scale when focused (defaults to the card focus scale). */
  focusScale?: number;
  /** Render the card body; receives whether the card currently has remote focus. */
  children: (focused: boolean) => ReactNode;
}

/**
 * A focusable surface for content-rich items (mystery cards, keypad keys,
 * answer options). Focus uses the same language as TVButton: the viewfinder
 * frame closes in, the card lifts and its surface brightens.
 */
export const FocusableCard = ({
  onPress,
  onFocus,
  preferredFocus,
  style,
  accessibilityLabel,
  accessibilityHint,
  testID,
  children,
  selected,
  focusScale = theme.motion.cardFocusScale,
}: FocusableCardProps) => {
  const [focused, setFocused] = useState(false);
  const {progress, scale} = useFocusAnimation(focused, focusScale);

  return (
    <Pressable
      onPress={() => {
        cue('select');
        onPress();
      }}
      onFocus={() => {
        setFocused(true);
        cue('focus');
        onFocus?.();
      }}
      onBlur={() => setFocused(false)}
      hasTVPreferredFocus={preferredFocus}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{selected: focused || !!selected}}
      testID={testID}>
      <Animated.View style={{transform: [{scale}]}}>
        <View style={[styles.card, style, focused ? styles.focused : selected ? styles.selected : styles.idle]}>{children(focused)}</View>
        <FocusFrame progress={progress} />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: theme.borders.thin,
    borderRadius: theme.radii.sm,
    overflow: 'hidden',
  },
  idle: {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  focused: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.surfaceElevated,
  },
  /** Chosen but not focused (answer options): a quieter brass edge. */
  selected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.focusFill,
  },
});
