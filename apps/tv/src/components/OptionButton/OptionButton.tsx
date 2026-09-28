import React from 'react';
import {StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {FocusableCard} from '../FocusableCard/FocusableCard';
import {px, theme} from '../../theme/theme';

/**
 * A selectable answer option (combination dial value or multiple-choice account).
 * Selected options keep a gold edge and tick even when focus moves away.
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
    style={[wide ? styles.wide : styles.compact, style]}
    accessibilityLabel={`${label}${selected ? ', selected' : ''}`}
    testID={testID}>
    {focused => (
      <View style={styles.inner}>
        {wide && <View style={[styles.tick, selected && styles.tickOn]} />}
        <Text
          style={[
            wide ? styles.wideText : styles.compactText,
            selected && styles.textSelected,
            focused && styles.textFocused,
          ]}
          numberOfLines={wide ? 2 : 1}>
          {label}
        </Text>
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
    borderRadius: theme.radii.md,
  },
  wide: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.md,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: {
    width: px(14),
    height: px(14),
    borderRadius: px(7),
    borderWidth: px(2),
    borderColor: theme.colors.faintText,
    marginRight: theme.spacing.md,
  },
  tickOn: {
    borderColor: theme.colors.focus,
    backgroundColor: theme.colors.focus,
  },
  compactText: {
    color: theme.colors.mutedText,
    fontSize: theme.type.body,
    textAlign: 'center',
  },
  wideText: {
    flex: 1,
    color: theme.colors.mutedText,
    fontSize: theme.type.body,
    lineHeight: px(38),
  },
  textSelected: {
    color: theme.colors.text,
  },
  textFocused: {
    color: theme.colors.focus,
  },
});
