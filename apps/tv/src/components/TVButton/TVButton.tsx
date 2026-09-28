import React, {useEffect, useRef, useState} from 'react';
import {Animated, Pressable, StyleSheet, Text, View} from 'react-native';
import {px, theme} from '../../theme/theme';

export type TVButtonVariant = 'menu' | 'action';

export interface TVButtonProps {
  label: string;
  onPress: () => void;
  onFocus?: () => void;
  /** Take focus when this button mounts (one per screen). */
  preferredFocus?: boolean;
  /** 'menu' = wide left-aligned list row; 'action' = compact centred button. */
  variant?: TVButtonVariant;
  /** Secondary value shown on the right of a menu row (e.g. "On"). */
  value?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

/**
 * The one focusable button used across the TV shell.
 * Focused: gold border, warm fill, gold marker bar, slight scale-up.
 * Unfocused: no border (a transparent one keeps the layout from shifting), muted text.
 */
export const TVButton = ({
  label,
  onPress,
  onFocus,
  preferredFocus,
  variant = 'menu',
  value,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: TVButtonProps) => {
  const [focused, setFocused] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(scale, {
      toValue: focused ? theme.motion.focusScale : 1,
      duration: theme.motion.focusMs,
      useNativeDriver: true,
    }).start();
  }, [focused, scale]);

  const isMenu = variant === 'menu';

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
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{selected: focused}}
      testID={testID}>
      <Animated.View
        style={[
          styles.base,
          isMenu ? styles.menu : styles.action,
          focused ? styles.focused : styles.idle,
          {transform: [{scale}]},
        ]}>
        {isMenu && (
          <View style={[styles.marker, focused && styles.markerOn]} />
        )}
        <Text
          style={[
            styles.label,
            isMenu ? styles.menuLabel : styles.actionLabel,
            focused ? styles.labelFocused : styles.labelIdle,
          ]}
          numberOfLines={1}>
          {label.toUpperCase()}
        </Text>
        {value !== undefined && (
          <Text style={[styles.value, focused && styles.valueFocused]}>
            {value}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: px(2),
    borderRadius: theme.radii.md,
  },
  menu: {
    width: px(620),
    height: px(80),
    paddingHorizontal: theme.spacing.md,
  },
  action: {
    minWidth: px(300),
    height: px(76),
    paddingHorizontal: theme.spacing.lg,
    justifyContent: 'center',
  },
  idle: {
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  focused: {
    borderColor: theme.colors.focus,
    backgroundColor: theme.colors.focusFill,
  },
  marker: {
    width: px(5),
    height: px(30),
    borderRadius: px(3),
    marginRight: theme.spacing.md,
    backgroundColor: 'transparent',
  },
  markerOn: {
    backgroundColor: theme.colors.focus,
  },
  label: {
    fontSize: theme.type.nav,
    fontWeight: '600',
    letterSpacing: px(5),
  },
  menuLabel: {
    flex: 1,
  },
  actionLabel: {
    textAlign: 'center',
  },
  labelIdle: {
    color: theme.colors.mutedText,
  },
  labelFocused: {
    color: theme.colors.text,
  },
  value: {
    marginLeft: theme.spacing.sm,
    fontSize: theme.type.body,
    color: theme.colors.faintText,
    letterSpacing: 1,
  },
  valueFocused: {
    color: theme.colors.accent,
  },
});
