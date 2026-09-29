import React from 'react';
import {StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {FocusableCard} from '../FocusableCard/FocusableCard';
import {px, theme} from '../../theme/theme';

/**
 * A selectable answer option (combination dial value or multiple-choice account).
 * Selected options keep a brass edge and a filled marker (● vs ○) even when
 * focus moves away, so the choice never relies on colour alone.
 */
export const OptionButton = ({
  label,
  selected,
  onPress,
  preferredFocus,
  wide,
  style,
  testID,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  preferredFocus?: boolean;
  /** Wrapping, full-width row for long options. */
  wide?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) => (
  <FocusableCard
    onPress={onPress}
    preferredFocus={preferredFocus}
    selected={selected}
    focusScale={wide ? 1.015 : theme.motion.cardFocusScale}
    style={[wide ? styles.wide : styles.compact, style]}
    accessibilityLabel={`${label}${selected ? ', selected' : ''}`}
    testID={testID}>
    {focused => (
      <View style={styles.inner}>
        {wide && <View style={[styles.tick, selected && styles.tickOn]} />}
        <Text
          style={[wide ? styles.wideText : styles.compactText, selected && styles.textSelected, focused && styles.textFocused]}
          numberOfLines={wide ? 2 : 1}>
          {label}
        </Text>
        {!wide && selected && <Text style={styles.check}>✓</Text>}
      </View>
    )}
  </FocusableCard>
);

const styles = StyleSheet.create({
  compact: {
    minWidth: px(190),
    height: px(76),
    paddingHorizontal: theme.spacing.sm,
    justifyContent: 'center',
  },
  wide: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: {
    width: px(18),
    height: px(18),
    borderRadius: px(9),
    borderWidth: px(2),
    borderColor: theme.colors.textMuted,
    marginRight: theme.spacing.md,
  },
  tickOn: {
    borderColor: theme.colors.focus,
    backgroundColor: theme.colors.focus,
  },
  compactText: {
    ...theme.text.mono,
    fontSize: theme.type.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  wideText: {
    ...theme.text.body,
    flex: 1,
    color: theme.colors.textSecondary,
  },
  textSelected: {
    color: theme.colors.textPrimary,
  },
  textFocused: {
    color: theme.colors.accentStrong,
  },
  check: {
    marginLeft: px(10),
    color: theme.colors.focus,
    fontSize: px(24),
  },
});
