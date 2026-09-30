import React, {memo, useMemo, useState, type ReactNode} from 'react';
import {Animated, Pressable, StyleSheet, Text, View} from 'react-native';
import type {CharacterState, EffectId, MysteryWorld, TrainState, WorldSet} from '@roomriddle/shared-types';
import {LAYER_ORDER, objectBounds, verbFor, type ObjectView, type PlacedNode} from '@roomriddle/scene';
import {PX_SCALE, px, theme} from '../theme/theme';
import {FocusFrame, useFocusAnimation} from '../ui/focus';
import {cue} from '../ui/cues';
import {assetRegistry} from './art';
import {AssetView} from './AssetView';
import {CharacterView, TrainView} from './Actors';
import {Fog, Glow, Lightning, Puffs, Rain} from './Effects';

/** The camera, as native-friendly animated values (set every frame while it moves). */
export interface CameraValues {
  x: Animated.Value;
  y: Animated.Value;
  zoom: Animated.Value;
}

/**
 * One depth plane. Every plane obeys the same rule (see @roomriddle/scene
 * camera): translate = −camera × depth, scale = 1 + (zoom − 1) × depth, about
 * the screen centre. Near planes move more, far planes barely move: parallax
 * with no per-layer animation code.
 */
export const Plane = memo(({cam, depth, children, testID}: {cam: CameraValues; depth: number; children: ReactNode; testID?: string}) => {
  const style = useMemo(
    () => ({
      transform: [
        {scale: Animated.add(1, Animated.multiply(Animated.add(cam.zoom, -1), depth))},
        {translateX: Animated.multiply(cam.x, -depth * PX_SCALE)},
        {translateY: Animated.multiply(cam.y, -depth * PX_SCALE)},
      ],
    }),
    [cam, depth],
  );
  return (
    <Animated.View pointerEvents="box-none" style={[StyleSheet.absoluteFill, style]} testID={testID}>
      {children}
    </Animated.View>
  );
});

const NodeView = memo(({node, opacity}: {node: PlacedNode; opacity: number}) => (
  <View pointerEvents="none" style={[styles.abs, {left: px(node.x), top: px(node.y), opacity}]}>
    <AssetView assetId={node.assetId} width={node.width} height={node.height} />
  </View>
));

export interface StageProps {
  world: MysteryWorld;
  set: WorldSet;
  placed: Map<string, PlacedNode>;
  cam: CameraValues;
  train: {x: Animated.Value; doors: Animated.Value; state: TrainState} | null;
  effects: Partial<Record<EffectId, boolean>>;
  characters: Record<string, {state: CharacterState; nodeId?: string}>;
  nodeOpacity: (node: PlacedNode) => number;
  reduced: boolean;
  /** Drawn over the world and under its lights: the set's night overlay. */
  night?: ReactNode;
  /** Drawn in the world, above the interactive layer: focus targets. */
  hotspots?: ReactNode;
}

/**
 * The world, back to front: far → background → midground (+ the train) →
 * interactive → characters → foreground, then night, lights and weather.
 * Pure drawing; it knows nothing about the game.
 */
export const Stage = ({world, set, placed, cam, train, effects, characters, nodeOpacity, reduced, night, hotspots}: StageProps) => {
  const trainDef = world.train;
  const nodes = [...placed.values()]
    .filter(n => n.assetId !== trainDef?.assetId)
    .sort((a, b) => LAYER_ORDER.indexOf(a.layer) - LAYER_ORDER.indexOf(b.layer) || a.z - b.z);

  // Consecutive nodes on the same depth share one plane (fewer transformed views).
  const groups: {depth: number; layer: string; nodes: PlacedNode[]}[] = [];
  for (const n of nodes) {
    const last = groups[groups.length - 1];
    if (last && last.depth === n.depth && last.layer === n.layer) {
      last.nodes.push(n);
    } else {
      groups.push({depth: n.depth, layer: n.layer, nodes: [n]});
    }
  }

  const trainSize = trainDef ? assetRegistry.get(trainDef.assetId)?.size : undefined;
  const trainPlane =
    trainDef && train && set.train && trainSize ? (
      <Plane key="train" cam={cam} depth={trainDef.depth} testID={`train-${train.state}`}>
        <TrainView def={trainDef} x={train.x} doors={train.doors} y={set.train.y} width={trainSize.width} height={trainSize.height} state={train.state} effects={{headlights: effects.headlights, steam: effects.steam}} reduced={reduced} />
      </Plane>
    ) : null;

  const out: ReactNode[] = [];
  let trainDrawn = false;
  // Characters stand just in front of the (last) interactive plane.
  const lastInteractive = groups.map(g => g.layer).lastIndexOf('interactive');
  groups.forEach((g, i) => {
    // The train runs in the midground, in front of the tracks, behind the platform edge.
    if (!trainDrawn && trainPlane && (LAYER_ORDER.indexOf(g.layer as never) > LAYER_ORDER.indexOf('midground') || (g.layer === 'midground' && g.nodes[0]!.z > 0))) {
      out.push(trainPlane);
      trainDrawn = true;
    }
    if (g.layer === 'character') {
      return; // characters are drawn below, when present
    }
    out.push(
      <Plane key={`g${i}`} cam={cam} depth={g.depth}>
        {g.nodes.map(n => {
          const o = nodeOpacity(n);
          return o > 0 ? <NodeView key={n.id} node={n} opacity={o} /> : null;
        })}
      </Plane>,
    );
    if (i === lastInteractive) {
      out.push(...characterPlanes());
    }
  });
  if (!trainDrawn && trainPlane) {
    out.push(trainPlane);
  }

  function characterPlanes(): ReactNode[] {
    return world.characters.map(c => {
      const presence = characters[c.id];
      const node = presence ? placed.get(presence.nodeId ?? 'detective-spot') : undefined;
      if (!presence || !node || presence.state === 'hidden') {
        return null;
      }
      return (
        <Plane key={`char-${c.id}`} cam={cam} depth={node.depth}>
          <CharacterView assetId={c.assetId} state={presence.state} x={node.x} y={node.y} width={node.width} height={node.height} reduced={reduced} />
        </Plane>
      );
    });
  }
  if (lastInteractive < 0) {
    out.push(...characterPlanes());
  }

  const lights = nodes
    .map(n => ({n, light: assetRegistry.get(n.assetId)?.light}))
    .filter((l): l is {n: PlacedNode; light: NonNullable<typeof l.light>} => l.light !== undefined && nodeOpacity(l.n) > 0);

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill} testID={`world-set-${set.id}`}>
      {out}
      {night}
      {lights.map(({n, light}, i) => (
        <Plane key={`light-${n.id}`} cam={cam} depth={n.depth}>
          <Glow x={n.x + light.x} y={n.y + light.y} radius={light.radius} color={light.color} strength={(light.strength ?? 0.16) * Math.min(1, nodeOpacity(n))} flicker={(light.flicker ?? false) && effects.flicker === true} reduced={reduced} seed={i % 4} />
        </Plane>
      ))}
      <Fog on={effects.fog === true} reduced={reduced} />
      {effects.smoke && <Puffs on reduced={reduced} x={1500} y={420} color="fog" spread={300} rise={200} size={160} count={4} />}
      <Rain on={effects.rain === true} reduced={reduced} />
      <Lightning on={effects.lightning === true} reduced={reduced} />
      {hotspots}
    </View>
  );
};

/**
 * A focusable object in the world. Invisible until focused (objects never
 * glow on their own); focus closes the P5 viewfinder brackets on it and
 * names it with its action.
 */
export const Hotspot = ({
  view,
  node,
  tagBelow = false,
  preferredFocus,
  onFocus,
  onSelect,
}: {
  view: ObjectView;
  node: PlacedNode;
  /** Put the name tag under the object (for objects near the top of the screen). */
  tagBelow?: boolean;
  preferredFocus: boolean;
  onFocus: () => void;
  onSelect: () => void;
}) => {
  const [focused, setFocused] = useState(false);
  const {progress} = useFocusAnimation(focused, 1);
  const box = objectBounds(view.object, node);
  const examined = view.status === 'examined';
  return (
    <View style={[styles.abs, {left: px(box.x), top: px(box.y), width: px(box.width), height: px(box.height)}]}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onFocus={() => {
          setFocused(true);
          cue('focus');
          onFocus();
        }}
        onBlur={() => setFocused(false)}
        onPress={() => {
          cue('select');
          onSelect();
        }}
        hasTVPreferredFocus={preferredFocus}
        accessibilityRole="button"
        accessibilityLabel={`${view.object.name}. ${examined ? 'Examined' : verbFor(view.object)}`}
        testID={`world-object-${view.object.id}`}>
        <FocusFrame progress={progress} radius={theme.radii.sm} />
      </Pressable>
      <Animated.View pointerEvents="none" style={[styles.tag, tagBelow && styles.tagBelow, {opacity: progress, transform: [{translateY: progress.interpolate({inputRange: [0, 1], outputRange: [px(tagBelow ? -8 : 8), 0]})}]}]}>
        <Text style={styles.tagName} numberOfLines={1}>
          {examined ? `✓ ${view.object.name.toUpperCase()}` : view.object.name.toUpperCase()}
        </Text>
        <Text style={styles.tagAction} numberOfLines={1}>
          {examined ? 'Examined · look again' : `${verbFor(view.object).toUpperCase()} · OK`}
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  abs: {
    position: 'absolute',
  },
  tag: {
    position: 'absolute',
    bottom: '100%',
    left: -px(200),
    right: -px(200),
    marginBottom: px(18),
    alignItems: 'center',
  },
  tagBelow: {
    bottom: undefined,
    top: '100%',
    marginBottom: 0,
    marginTop: px(18),
  },
  tagName: {
    ...theme.text.label,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.overlay,
    paddingHorizontal: px(14),
    paddingVertical: px(4),
  },
  tagAction: {
    ...theme.text.mono,
    color: theme.colors.accentStrong,
    backgroundColor: theme.colors.overlay,
    paddingHorizontal: px(14),
    paddingBottom: px(4),
  },
});
