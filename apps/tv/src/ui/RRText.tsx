import React from 'react';
import {StyleProp, StyleSheet, Text, TextProps, TextStyle} from 'react-native';
import {theme} from '../theme/theme';

export type TextVariant = keyof typeof theme.text;
export type TextColor = keyof typeof theme.colors;

export interface RRTextProps extends TextProps {
  variant?: TextVariant;
  color?: TextColor;
  align?: 'left' | 'center' | 'right';
  style?: StyleProp<TextStyle>;
}

/**
 * Text in one of the three RoomRiddle voices (cinematic serif, functional sans,
 * technical mono), picked by hierarchy step rather than by font properties.
 */
export const RRText = ({variant = 'body', color = 'textPrimary', align, style, ...rest}: RRTextProps) => (
  <Text {...rest} style={[theme.text[variant], {color: theme.colors[color]}, align && styles[align], style]} />
);

const styles = StyleSheet.create({
  left: {textAlign: 'left'},
  center: {textAlign: 'center'},
  right: {textAlign: 'right'},
});
