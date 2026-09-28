import React from 'react';
import {StyleSheet, Text, View, TextStyle, StyleProp} from 'react-native';
import {px, theme} from '../../theme/theme';

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
  narration: {
    color: theme.colors.text,
    fontSize: theme.type.narration,
    lineHeight: px(54),
    fontWeight: '300',
  },
  body: {
    color: theme.colors.mutedText,
    fontSize: theme.type.body,
    lineHeight: px(42),
  },
  center: {
    textAlign: 'center',
  },
  break: {
    height: theme.spacing.md,
  },
});
