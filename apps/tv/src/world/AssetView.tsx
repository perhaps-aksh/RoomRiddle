import React, {memo} from 'react';
import {Image, StyleSheet, Text, View, type ViewStyle} from 'react-native';
import type {PlaceholderShape} from '@roomriddle/shared-types';
import {theme as ds} from '@roomriddle/ui';
import {pivotFrame, scaleShape} from '@roomriddle/scene';
import {px, theme} from '../theme/theme';
import {assetLoader, assetRegistry, imageSourceFor} from './art';

const W = ds.worldColors;

/** One primitive of a procedural placeholder. */
export const Shape = ({s, style}: {s: PlaceholderShape; style?: ViewStyle}) => {
  // A pivoted shape (a clock hand) turns inside a square frame centred on its
  // pivot, so it rotates about the pivot instead of its own middle.
  const pf = s.rotate ? pivotFrame(s) : null;
  if (pf) {
    return (
      <View
        style={{
          ...styles.abs,
          left: px(pf.frame.x),
          top: px(pf.frame.y),
          width: px(pf.frame.size),
          height: px(pf.frame.size),
          transform: [{rotate: `${s.rotate}deg`}],
        }}>
        <Shape s={{...s, x: pf.inner.x, y: pf.inner.y, rotate: undefined, pivot: undefined}} style={style} />
      </View>
    );
  }
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
    const image = <Image source={imageSourceFor(resolved.asset.id, resolved.uri)} style={{width: px(width), height: px(height)}} resizeMode="stretch" />;
    if (resolved.overlay.length === 0) {
      return image;
    }
    // Painted art carries the look; the overlay carries the facts (clock hands at the clue's time).
    const ox = width / resolved.asset.size.width;
    const oy = height / resolved.asset.size.height;
    return (
      <View style={{width: px(width), height: px(height)}} pointerEvents="none">
        {image}
        {resolved.overlay.map((s, i) => (s.role !== undefined && skipRoles?.includes(s.role) ? null : <Shape key={i} s={scaleShape(s, ox, oy)} />))}
      </View>
    );
  }
  if (resolved.kind === 'missing') {
    // Visible in development, never a crash on the TV.
    return <View style={[styles.missing, {width: px(width), height: px(height)}]} />;
  }
  const {asset, shapes} = resolved;
  const sx = width / asset.size.width;
  const sy = height / asset.size.height;
  return (
    <View style={{width: px(width), height: px(height)}} pointerEvents="none">
      {shapes.map((s, i) => (s.role !== undefined && skipRoles?.includes(s.role) ? null : <Shape key={i} s={scaleShape(s, sx, sy)} />))}
    </View>
  );
});

const styles = StyleSheet.create({
  abs: {
    position: 'absolute',
  },
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
