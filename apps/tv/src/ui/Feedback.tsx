import React, {useEffect, useState} from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';
import {px, theme} from '../theme/theme';
import {cue} from './cues';
import {timing, useReducedMotion} from './motion';

export type FeedbackKind = 'success' | 'failure' | 'hint' | 'info';

const LOOK: Record<FeedbackKind, {glyph: string; color: string; wash: string}> = {
  success: {glyph: '✓', color: theme.colors.success, wash: theme.colors.successWash},
  failure: {glyph: '×', color: theme.colors.danger, wash: theme.colors.dangerWash},
  hint: {glyph: '◇', color: theme.colors.accentStrong, wash: theme.colors.accentWash},
  info: {glyph: '•', color: theme.colors.signalStrong, wash: theme.colors.signalWash},
};

export interface FeedbackProps {
  kind: FeedbackKind;
  /** Short uppercase headline, e.g. "THAT DOESN'T FIT". */
  title: string;
  /** Detail line (authored text or the engine's numbers). */
  detail?: string;
  /** Score change, shown in the technical voice: "+100", "−10". */
  amount?: string;
  /** Changing this key replays the animation (e.g. per attempt). */
  playKey?: string | number;
  layout?: 'banner' | 'stack';
  testID?: string;
}

/**
 * Answer and hint feedback. Every kind has a glyph, a word and a colour, so
 * the result never depends on colour alone. Success rises in; failure gives a
 * short horizontal shake ("that doesn't fit"); hints unfold. Each replays when
 * `playKey` changes, so a second wrong answer still registers.
 */
export const Feedback = ({kind, title, detail, amount, playKey, layout = 'banner', testID}: FeedbackProps) => {
  const reduced = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(0));
  const [shake] = useState(() => new Animated.Value(0));
  useEffect(() => {
    cue(kind === 'failure' ? 'failure' : kind === 'success' ? 'success' : kind === 'hint' ? 'hint' : 'transition');
    progress.setValue(0);
    shake.setValue(0);
    const enter = timing(progress, 1, kind === 'success' ? 'success' : kind === 'failure' ? 'failure' : 'toast', reduced);
    const shakes =
      kind === 'failure' && !reduced
        ? Animated.sequence([1, -1, 0.6, -0.4, 0].map(v => timing(shake, v, 'press', false)))
        : null;
    const all = shakes ? Animated.parallel([enter, shakes]) : enter;
    all.start();
    return () => all.stop();
  }, [kind, playKey, progress, shake, reduced]);

  const look = LOOK[kind];
  const stack = layout === 'stack';
  const transform = reduced
    ? []
    : [
        {translateX: shake.interpolate({inputRange: [-1, 1], outputRange: [-theme.motion.shake, theme.motion.shake]})},
        {translateY: progress.interpolate({inputRange: [0, 1], outputRange: [px(stack ? 18 : 10), 0]})},
        {scale: kind === 'success' ? progress.interpolate({inputRange: [0, 1], outputRange: [0.96, 1]}) : 1},
      ];

  return (
    <Animated.View
      testID={testID}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[stack ? styles.stack : styles.banner, {backgroundColor: look.wash, borderColor: look.color, opacity: progress, transform}]}>
      <View style={[styles.glyphRing, stack && styles.glyphRingLarge, {borderColor: look.color}]}>
        <Text style={[styles.glyph, stack && styles.glyphLarge, {color: look.color}]}>{look.glyph}</Text>
      </View>
      <View style={stack ? styles.stackText : styles.bannerText}>
        <Text style={[styles.title, {color: look.color}, stack && styles.center]}>{title.toUpperCase()}</Text>
        {detail !== undefined && <Text style={[styles.detail, stack && styles.center]}>{detail}</Text>}
      </View>
      {amount !== undefined && <Text style={[styles.amount, stack && styles.amountStack, {color: look.color}]}>{amount}</Text>}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    minWidth: px(760),
    maxWidth: px(1300),
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderLeftWidth: px(6),
  },
  stack: {
    alignItems: 'center',
    alignSelf: 'center',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    borderTopWidth: px(3),
  },
  glyphRing: {
    width: px(56),
    height: px(56),
    borderRadius: px(28),
    borderWidth: px(2),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  glyphRingLarge: {
    width: px(104),
    height: px(104),
    borderRadius: px(52),
    marginRight: 0,
    marginBottom: theme.spacing.md,
  },
  glyph: {
    fontSize: px(30),
    fontWeight: '700',
  },
  glyphLarge: {
    fontSize: px(56),
  },
  bannerText: {
    flex: 1,
  },
  stackText: {
    alignItems: 'center',
  },
  title: {
    ...theme.text.label,
    fontSize: px(28),
    letterSpacing: px(7),
  },
  detail: {
    ...theme.text.body,
    color: theme.colors.textPrimary,
    marginTop: px(4),
  },
  center: {
    textAlign: 'center',
  },
  amount: {
    ...theme.text.monoLarge,
    marginLeft: theme.spacing.md,
  },
  amountStack: {
    marginLeft: 0,
    marginTop: theme.spacing.md,
    fontSize: px(64),
    lineHeight: px(72),
  },
});
