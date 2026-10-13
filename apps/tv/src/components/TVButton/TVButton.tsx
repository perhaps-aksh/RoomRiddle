import React, {useState} from 'react';
import {Animated, Pressable, StyleSheet, Text, View} from 'react-native';
import {px, theme} from '../../theme/theme';
import {cue} from '../../ui/cues';
import {FocusFrame, useFocusAnimation} from '../../ui/focus';

export type TVButtonVariant = 'menu' | 'action';
export type TVButtonTone = 'default' | 'primary' | 'danger';

export interface TVButtonProps {
  label: string;
  onPress: () => void;
  onFocus?: () => void;
  /** Take focus when this button mounts (one per screen). */
  preferredFocus?: boolean;
  /** 'menu' = wide left-aligned list row; 'action' = compact centred button. */
  variant?: TVButtonVariant;
  /** 'primary' marks the main action of a screen; 'danger' a destructive one. */
  tone?: TVButtonTone;
  /** Secondary value shown on the right of a menu row (e.g. "On"). */
  value?: string;
  /** Small caption under a menu label (what will happen). */
  caption?: string;
  /** Shown but not selectable (still focusable, so focus never disappears). */
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** Row width for a menu row (default 640). The focus frame follows it. */
  width?: number;
  /** A small action (filter chips): shorter, no minimum width. */
  compact?: boolean;
  testID?: string;
}

/**
 * The one focusable button on the TV.
 *
 * Focus is carried by four things at once, so it reads from the couch and
 * without colour: viewfinder brackets close in, the button lifts (scale),
 * the fill shifts to brass, and a ▶ marker slides in. The press is
 * acknowledged with a quick scale dip.
 */
export const TVButton = ({
  label,
  onPress,
  onFocus,
  preferredFocus,
  variant = 'menu',
  tone = 'default',
  value,
  caption,
  disabled,
  accessibilityLabel,
  accessibilityHint,
  width,
  compact,
  testID,
}: TVButtonProps) => {
  const [focused, setFocused] = useState(false);
  const isMenu = variant === 'menu';
  const {progress, scale} = useFocusAnimation(focused, isMenu ? 1.02 : theme.motion.focusScale);
  const markerShift = progress.interpolate({inputRange: [0, 1], outputRange: [-px(12), 0]});

  const fill = focused && !disabled;
  const labelColor = disabled
    ? theme.colors.textMuted
    : fill && !isMenu
    ? theme.colors.textOnAccent
    : focused
    ? theme.colors.textPrimary
    : tone === 'primary'
    ? theme.colors.accentStrong
    : tone === 'danger'
    ? theme.colors.danger
    : theme.colors.textSecondary;

  return (
    <Pressable
      onPress={() => {
        if (disabled) {
          return;
        }
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
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{selected: focused, disabled: !!disabled}}
      testID={testID}>
      <Animated.View style={{transform: [{scale}], alignSelf: 'flex-start'}}>
        <View
          style={[
            styles.base,
            isMenu ? styles.menu : styles.action,
            isMenu ? (fill ? styles.menuFocused : styles.menuIdle) : fill ? (tone === 'danger' ? styles.actionDanger : styles.actionFocused) : tone === 'primary' ? styles.actionPrimary : styles.actionIdle,
            disabled && styles.disabled,
            isMenu && width !== undefined && {width},
            !isMenu && compact && styles.compact,
          ]}>
          {isMenu && (
            <Animated.Text style={[styles.marker, {opacity: progress, transform: [{translateX: markerShift}]}]}>▶</Animated.Text>
          )}
          <View style={isMenu ? styles.menuText : undefined}>
            <Text style={[theme.text.button, isMenu ? styles.menuLabel : styles.actionLabel, compact && styles.compactLabel, {color: labelColor}]} numberOfLines={1}>
              {label.toUpperCase()}
            </Text>
            {caption !== undefined && isMenu && (
              <Text style={[styles.caption, focused && styles.captionFocused]} numberOfLines={1}>
                {caption}
              </Text>
            )}
          </View>
          {value !== undefined && <Text style={[styles.value, focused && styles.valueFocused]}>{value}</Text>}
          {!isMenu && tone === 'primary' && !disabled && (
            <Animated.Text style={[styles.arrow, {color: labelColor, transform: [{translateX: progress.interpolate({inputRange: [0, 1], outputRange: [0, px(6)]})}]}]}>→</Animated.Text>
          )}
        </View>
        <FocusFrame progress={progress} tone={tone === 'danger' ? 'danger' : 'focus'} />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: theme.borders.thin,
    borderRadius: theme.radii.sm,
  },
  menu: {
    width: px(640),
    minHeight: px(84),
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  menuIdle: {
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  menuFocused: {
    borderColor: theme.colors.accentSoft,
    backgroundColor: theme.colors.focusFill,
  },
  action: {
    minWidth: px(300),
    height: px(76),
    paddingHorizontal: theme.spacing.lg,
    justifyContent: 'center',
  },
  compact: {
    minWidth: 0,
    height: px(56),
    paddingHorizontal: theme.spacing.md,
  },
  compactLabel: {
    fontSize: px(22),
    letterSpacing: px(2),
  },
  actionIdle: {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  actionPrimary: {
    borderColor: theme.colors.accentSoft,
    backgroundColor: theme.colors.accentWash,
  },
  actionFocused: {
    borderColor: theme.colors.focus,
    backgroundColor: theme.colors.focus,
  },
  actionDanger: {
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.danger,
  },
  disabled: {
    opacity: 0.55,
  },
  marker: {
    width: px(36),
    color: theme.colors.focus,
    fontSize: px(22),
  },
  menuText: {
    flex: 1,
  },
  menuLabel: {
    letterSpacing: px(5),
  },
  actionLabel: {
    textAlign: 'center',
  },
  caption: {
    marginTop: px(2),
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.functional,
    fontSize: theme.type.caption,
  },
  captionFocused: {
    color: theme.colors.textSecondary,
  },
  value: {
    marginLeft: theme.spacing.sm,
    ...theme.text.mono,
    color: theme.colors.textMuted,
  },
  valueFocused: {
    color: theme.colors.accentStrong,
  },
  arrow: {
    marginLeft: theme.spacing.sm,
    fontSize: px(30),
  },
});
