import React, {memo, useEffect, useState} from 'react';
import {Animated, Easing, StyleSheet, Text, View} from 'react-native';
import type {CharacterState, PlaceholderShape, TrainDefinition, TrainState} from '@roomriddle/shared-types';
import {headlightsOn, steaming} from '@roomriddle/scene';
import {theme as ds} from '@roomriddle/ui';
import {PX_SCALE, px, theme} from '../theme/theme';
import {assetLoader, assetRegistry} from './art';
import {AssetView, Shape} from './AssetView';
import {Glow, Puffs} from './Effects';

const W = ds.worldColors;

/**
 * The layered 2.5D train. Its x and door opening are Animated values driven
 * by the stage's frame loop (the train's state machine lives in
 * @roomriddle/scene). Parts: body, windows, doorway light, sliding door
 * leaves, headlight + beam, steam and smoke.
 */
export const TrainView = memo(
  ({
    def,
    x,
    doors,
    y,
    width,
    height,
    state,
    effects,
    reduced,
  }: {
    def: TrainDefinition;
    x: Animated.Value;
    doors: Animated.Value;
    y: number;
    width: number;
    height: number;
    state: TrainState;
    effects: {headlights?: boolean; steam?: boolean; smoke?: boolean};
    reduced: boolean;
  }) => {
    const doorShapes = (assetRegistry.get(def.parts.doorsAssetId)?.placeholder ?? []).filter(s => s.role === 'door-left' || s.role === 'door-right');
    const doorway = assetRegistry.get(def.parts.doorwayAssetId);
    const lights = effects.headlights ?? headlightsOn(state);
    const steam = (effects.steam ?? false) && steaming(state);
    const moving = state === 'approaching' || state === 'arriving' || state === 'departing' || state === 'far';
    // Painted trains have their own windows and doors: the procedural leaves and
    // window boxes are skipped (its doors are painted).
    const painted = assetRegistry.resolve(def.assetId, assetLoader.isLoaded).kind === 'image';
    if (painted) {
      return (
        <Animated.View pointerEvents="none" style={[styles.train, {top: px(y), width: px(width), height: px(height), transform: [{translateX: Animated.multiply(x, PX_SCALE)}]}]}>
          <AssetView assetId={def.assetId} width={width} height={height} />
          {lights && (
            <>
              <Glow x={width - 40} y={140} radius={90} color="headlight" strength={0.22} flicker={false} reduced={reduced} />
              <View style={[styles.beam, {left: px(width - 30), top: px(96)}]} />
            </>
          )}
          <Puffs on={steam} reduced={reduced} x={width * 0.35} y={height - 10} spread={width * 0.6} rise={160} size={150} count={4} />
          <Puffs on={moving && state !== 'far'} reduced={reduced} x={width - 80} y={30} color="cloud" spread={80} rise={260} size={90} count={4} />
        </Animated.View>
      );
    }
    return (
      <Animated.View pointerEvents="none" style={[styles.train, {top: px(y), width: px(width), height: px(height), transform: [{translateX: Animated.multiply(x, PX_SCALE)}]}]}>
        {/* Doorway light sits behind the door leaves: it shows as they part. */}
        {doorShapes
          .filter(s => s.role === 'door-left')
          .map((s, i) => (
            <View key={`gap-${i}`} style={[styles.abs, {left: px(s.x), top: px(s.y)}]}>
              {doorway && <AssetView assetId={doorway.id} width={s.w * 2} height={s.h} />}
            </View>
          ))}
        <AssetView assetId={def.assetId} width={width} height={height} />
        <View style={StyleSheet.absoluteFill}>
          <AssetView assetId={def.parts.windowsAssetId} width={width} height={height} />
        </View>
        {doorShapes.map((s, i) => (
          <DoorLeaf key={i} s={s} doors={doors} />
        ))}
        <View style={StyleSheet.absoluteFill}>
          <AssetView assetId={def.parts.headlightsAssetId} width={width} height={height} skipRoles={lights ? [] : ['headlight']} />
        </View>
        {lights && (
          <>
            <Glow x={width - 40} y={140} radius={90} color="headlight" strength={0.22} flicker={false} reduced={reduced} />
            <View style={[styles.beam, {left: px(width - 30), top: px(96)}]} />
          </>
        )}
        <Puffs on={steam} reduced={reduced} x={width * 0.35} y={height - 10} spread={width * 0.6} rise={160} size={150} count={4} />
        <Puffs on={moving && state !== 'far'} reduced={reduced} x={width - 80} y={30} color="cloud" spread={80} rise={260} size={90} count={4} />
      </Animated.View>
    );
  },
);

const DoorLeaf = ({s, doors}: {s: PlaceholderShape; doors: Animated.Value}) => {
  const dir = s.role === 'door-left' ? -1 : 1;
  return (
    <Animated.View style={[styles.leaf, {transform: [{translateX: doors.interpolate({inputRange: [0, 1], outputRange: [0, px(dir * (s.w - 6))]})}]}]}>
      <Shape s={s} />
    </Animated.View>
  );
};

/**
 * A character (the detective), a layered placeholder: shadow, legs, coat, face, hat.
 * enter (slide + fade in), idle (slow breath), talk (small nods), react
 * (a start), exit (fade out). Final art replaces the asset, not this logic.
 */
export const CharacterView = ({assetId, state, x, y, width, height, reduced}: {assetId: string; state: CharacterState; x: number; y: number; width: number; height: number; reduced: boolean}) => {
  const [opacity] = useState(() => new Animated.Value(0));
  const [shift] = useState(() => new Animated.Value(0));
  const [pose] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const t = (v: Animated.Value, to: number, duration: number) => Animated.timing(v, {toValue: to, duration: reduced ? Math.min(duration, 150) : duration, easing: Easing.out(Easing.cubic), useNativeDriver: true});
    let anim: Animated.CompositeAnimation;
    switch (state) {
      case 'hidden':
        opacity.setValue(0);
        return;
      case 'enter':
        shift.setValue(reduced ? 0 : 60);
        anim = Animated.parallel([t(opacity, 1, 700), t(shift, 0, 900)]);
        break;
      case 'exit':
        anim = Animated.parallel([t(opacity, 0, 600), t(shift, reduced ? 0 : 40, 700)]);
        break;
      case 'talk':
        opacity.setValue(1);
        anim = reduced ? t(pose, 0, 1) : Animated.loop(Animated.sequence([t(pose, 1, 380), t(pose, 0, 420)]));
        break;
      case 'react':
        opacity.setValue(1);
        shift.setValue(0);
        anim = reduced ? t(opacity, 1, 150) : Animated.sequence([t(pose, 1, 120), t(pose, 0, 420)]);
        break;
      case 'idle':
      default:
        opacity.setValue(1);
        anim = reduced ? t(pose, 0, 1) : Animated.loop(Animated.sequence([t(pose, 0.5, 1800), t(pose, 0, 1800)]));
    }
    anim.start();
    return () => anim.stop();
  }, [state, reduced, opacity, shift, pose]);

  return (
    <Animated.View
      pointerEvents="none"
      testID={state === 'hidden' ? undefined : `character-${state}`}
      style={[styles.abs, {
        left: px(x),
        top: px(y),
        opacity,
        transform: [
          {translateX: Animated.multiply(shift, PX_SCALE)},
          {translateY: pose.interpolate({inputRange: [0, 1], outputRange: [0, -px(6)]})},
          {scaleY: pose.interpolate({inputRange: [0, 1], outputRange: [1, 1.012]})},
        ],
      }]}>
      <AssetView assetId={assetId} width={width} height={height} />
    </Animated.View>
  );
};

/** Caption over the world: the time card, the place line, or a title. */
export const WorldCaption = ({text, style}: {text: string; style: 'time' | 'place' | 'title'}) => {
  const [o] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const a = Animated.timing(o, {toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true});
    a.start();
    return () => a.stop();
  }, [o, text]);
  return (
    <Animated.View pointerEvents="none" style={[style === 'place' ? styles.captionPlace : styles.captionCentre, {opacity: o}]} testID="world-caption">
      {style === 'place' && <View style={styles.captionRule} />}
      <Text style={style === 'time' ? styles.captionTime : style === 'title' ? styles.captionTitle : styles.captionPlaceText}>{style === 'place' ? text.toUpperCase() : text}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  abs: {
    position: 'absolute',
  },
  leaf: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  train: {
    position: 'absolute',
    left: 0,
  },
  beam: {
    position: 'absolute',
    width: px(900),
    height: px(90),
    backgroundColor: W.headlight,
    opacity: 0.08,
    borderTopRightRadius: px(200),
    borderBottomRightRadius: px(200),
  },
  captionCentre: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionTime: {
    fontFamily: theme.fonts.technical,
    fontSize: px(96),
    lineHeight: px(116),
    letterSpacing: px(12),
    color: theme.colors.textPrimary,
  },
  captionTitle: {
    ...theme.text.display,
    color: theme.colors.textPrimary,
  },
  captionPlace: {
    position: 'absolute',
    left: theme.spacing.screenX,
    bottom: theme.spacing.screenY + px(40),
    flexDirection: 'row',
    alignItems: 'center',
  },
  captionRule: {
    width: px(56),
    height: px(3),
    marginRight: theme.spacing.md,
    backgroundColor: theme.colors.accent,
  },
  captionPlaceText: {
    ...theme.text.label,
    fontSize: px(28),
    lineHeight: px(36),
    letterSpacing: px(6),
    color: theme.colors.textPrimary,
  },
});
