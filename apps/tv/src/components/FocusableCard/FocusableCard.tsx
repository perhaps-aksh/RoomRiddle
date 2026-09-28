import React, {ReactNode, useEffect, useRef, useState} from 'react';
import {Animated, Pressable, StyleProp, StyleSheet, ViewStyle} from 'react-native';
import {px, theme} from '../../theme/theme';

export interface FocusableCardProps {
  onPress: () => void;
  onFocus?: () => void;
  preferredFocus?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
  accessibilityHint?: string;
  testID?: string;
  /** Keeps a gold edge while unfocused (a chosen answer option). */
  selected?: boolean;
  /** Render the card body; receives whether the card currently has remote focus. */
  children: (focused: boolean) => ReactNode;
}

/** A focusable surface for content-rich items (mystery cards, keypad keys). */
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
}: FocusableCardProps) => {
  const [focused, setFocused] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(scale, {
      toValue: focused ? theme.motion.cardFocusScale : 1,
      duration: theme.motion.focusMs,
      useNativeDriver: true,
    }).start();
  }, [focused, scale]);

  return (
    <Pressable
      onPress={onPress}
      onFocus={() => {
        setFocused(true);
        onFocus?.();
      }}
      onBlur={() => setFocused(false)}
      hasTVPreferredFocus={preferredFocus}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{selected: focused}}
      testID={testID}>
      <Animated.View
        style={[
          styles.card,
          style,
          focused ? styles.focused : selected ? styles.selected : styles.idle,
          {transform: [{scale}]},
        ]}>
        {children(focused)}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: px(2),
    borderRadius: theme.radii.lg,
    overflow: 'hidden',
  },
  idle: {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  focused: {
    borderColor: theme.colors.focus,
    backgroundColor: theme.colors.surfaceRaised,
  },
  /** Chosen but not focused (answer options): a quieter gold edge. */
  selected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.focusFill,
  },
});
