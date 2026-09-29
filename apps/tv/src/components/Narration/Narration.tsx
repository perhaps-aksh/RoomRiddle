import React from 'react';
import {StyleSheet, Text, View, TextStyle, StyleProp} from 'react-native';
import {theme} from '../../theme/theme';

/**
 * Authored story text. Each string is a line, and an empty string is a
 * paragraph break (the same convention as mystery data).
 */
export const Narration = ({
  lines,
  size = 'narration',
  align = 'left',
  style,
}: {
  lines: readonly string[];
  size?: 'narration' | 'body';
  align?: 'left' | 'center';
  style?: StyleProp<TextStyle>;
}) => (
  <View>
    {lines.map((line, index) =>
      line === '' ? (
        <View key={index} style={styles.break} />
      ) : (
        <Text
          key={index}
          style={[
            size === 'narration' ? styles.narration : styles.body,
            align === 'center' && styles.center,
            style,
          ]}>
          {line}
        </Text>
      ),
    )}
  </View>
);

const styles = StyleSheet.create({
  // Story lines speak in the cinematic serif voice; instructions stay functional.
  narration: {
    ...theme.text.narration,
    color: theme.colors.textPrimary,
  },
  body: {
    ...theme.text.body,
    color: theme.colors.textSecondary,
  },
  center: {
    textAlign: 'center',
  },
  break: {
    height: theme.spacing.md,
  },
});
