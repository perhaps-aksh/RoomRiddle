import React, {memo} from 'react';
import {Image, StyleSheet, Text, View, type ViewStyle} from 'react-native';
import type {PlaceholderShape} from '@roomriddle/shared-types';
import {theme as ds} from '@roomriddle/ui';
import {px, theme} from '../theme/theme';
import {assetLoader, assetRegistry, imageSourceFor} from './art';

const W = ds.worldColors;

/** One primitive of a procedural placeholder. */
export const Shape = ({s, style}: {s: PlaceholderShape; style?: ViewStyle}) => {
  const box: ViewStyle = {
    position: 'absolute',
    left: px(s.x),
    top: px(s.y),
    width: px(s.w),
    height: px(s.h),
    opacity: s.opacity ?? 1,
    borderRadius: s.radius !== undefined ? px(s.radius) : undefined,
    transform: s.rotate ? [{rotate: `${s.rotate}deg`}] : undefined,
  };
  if (s.stroke) {
    box.borderWidth = px(s.stroke);
    box.borderColor = W[s.color];
  } else {
    box.backgroundColor = W[s.color];
  }
  return (
    <View style={[box, style, s.text !== undefined && styles.center]}>
      {s.text !== undefined && (
        <Text style={[styles.text, {color: W[s.textColor ?? 'ink'], fontSize: px(s.textSize ?? 20), lineHeight: px((s.textSize ?? 20) * 1.2)}]} numberOfLines={1}>
          {s.text}
        </Text>
      )}
    </View>
  );
};

/**
 * Draws an asset by id at its box: final art when loaded, otherwise its
 * placeholder. Shapes whose `role` is in `skipRoles` are left for the caller
 * to animate (e.g. train doors).
 */
export const AssetView = memo(({assetId, width, height, skipRoles}: {assetId: string; width: number; height: number; skipRoles?: readonly string[]}) => {
  const resolved = assetRegistry.resolve(assetId, assetLoader.isLoaded);
  if (resolved.kind === 'image') {
    return <Image source={imageSourceFor(resolved.asset.id, resolved.uri)} style={{width: px(width), height: px(height)}} resizeMode="stretch" />;
  }
  if (resolved.kind === 'missing') {
    // Visible in development, never a crash on the TV.
    return <View style={[styles.missing, {width: px(width), height: px(height)}]} />;
  }
  const {asset, shapes} = resolved;
  const sx = width / asset.size.width;
  const sy = height / asset.size.height;
  const scaled = sx === 1 && sy === 1;
  return (
    <View style={{width: px(width), height: px(height)}} pointerEvents="none">
      {shapes.map((s, i) =>
        s.role !== undefined && skipRoles?.includes(s.role) ? null : (
          <Shape key={i} s={scaled ? s : {...s, x: s.x * sx, y: s.y * sy, w: s.w * sx, h: s.h * sy, textSize: s.textSize !== undefined ? s.textSize * Math.min(sx, sy) : undefined}} />
        ),
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: theme.fonts.technical,
    textAlign: 'center',
  },
  missing: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.colors.danger,
  },
});
