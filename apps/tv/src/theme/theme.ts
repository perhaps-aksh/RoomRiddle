/**
 * RoomRiddle TV theme: the TV's view of the shared design system in
 * `packages/ui` (colours, typography, spacing, motion). Screens and components
 * read values from here and never hard-code colours, sizes or timings.
 *
 * SIZES: every size is written in 1920×1080 design pixels and passed through
 * `px()`, which converts to layout units (dp) for the actual screen. The Vega
 * Virtual Device reports a 960×540 dp window at 2× density, so raw numbers
 * would render twice as large as designed (docs/friction-log.md FL-005).
 * 4K panels report the same dp canvas at a higher density, so the layout
 * holds and text simply gets sharper.
 */
import {Dimensions, Easing, PixelRatio, TextStyle} from 'react-native';
import {theme as ds, type EasingName, type TextStyleName, type TextStyleToken} from '@roomriddle/ui';

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

function computeScale(): number {
  const {width, height} = Dimensions.get('window');
  if (!width || !height) {
    return 1;
  }
  // Fit the 16:9 design canvas inside the window.
  return Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
}

const SCALE = computeScale();

/** Convert a 1920×1080 design-pixel value to layout units for this screen. */
export function px(designPixels: number): number {
  return PixelRatio.roundToNearestPixel(designPixels * SCALE);
}

const c = ds.colors;
const sp = ds.spacing.tv;

/** Ready-made React Native text styles for each step of the hierarchy. */
function textStyle(token: TextStyleToken): TextStyle {
  return {
    fontFamily: ds.fontFamilies.tv[token.voice],
    fontSize: px(token.size),
    lineHeight: px(token.lineHeight),
    letterSpacing: px(token.tracking),
    fontWeight: token.weight,
    ...(token.uppercase ? {textTransform: 'uppercase'} : null),
  };
}

const text = Object.fromEntries(
  Object.entries(ds.textStyles.tv).map(([name, token]) => [name, textStyle(token)]),
) as Record<TextStyleName, TextStyle>;

const bezier = (name: EasingName) => {
  const [a, b, x, y] = ds.easings[name];
  return Easing.bezier(a, b, x, y);
};

export const theme = {
  colors: {
    ...c,
    // Phase 2/3 names, kept so earlier screens read the same values.
    text: c.textPrimary,
    mutedText: c.textSecondary,
    faintText: c.textMuted,
    surfaceRaised: c.surfaceElevated,
    scrim: c.overlay,
  },
  fonts: ds.fontFamilies.tv,
  /** Full text styles: prefer these over assembling font properties by hand. */
  text,
  /** Font sizes (design pixels, converted). TV body text never goes below 28. */
  type: {
    wordmark: px(ds.textStyles.tv.wordmark.size),
    title: px(64),
    display: px(ds.textStyles.tv.display.size),
    heading: px(44),
    narration: px(ds.textStyles.tv.narration.size),
    nav: px(32),
    body: px(28),
    caption: px(24),
    roomCode: px(ds.textStyles.tv.roomCode.size),
    motif: px(280),
  },
  spacing: {
    xxs: px(sp.xxs),
    xs: px(sp.xs),
    sm: px(sp.sm),
    md: px(sp.md),
    lg: px(sp.lg),
    xl: px(sp.xl),
    xxl: px(sp.xxl),
    screenX: px(sp.screenX),
    screenY: px(sp.screenY),
  },
  radii: {
    none: 0,
    sm: px(ds.radii.tv.sm),
    md: px(ds.radii.tv.md),
    lg: px(ds.radii.tv.lg),
    pill: 999,
  },
  borders: {
    hairline: 1,
    thin: px(ds.borders.tv.thin),
    focus: px(ds.borders.tv.focus),
    heavy: px(ds.borders.tv.heavy),
  },
  measure: {
    narration: px(ds.measure.tv.narration),
    body: px(ds.measure.tv.body),
    panel: px(ds.measure.tv.panel),
  },
  motion: {
    ...ds.motion,
    easing: {
      standard: bezier('standard'),
      enter: bezier('enter'),
      exit: bezier('exit'),
      cinematic: bezier('cinematic'),
      linear: Easing.linear,
    },
    focusScale: ds.motionAmounts.focusScale,
    cardFocusScale: ds.motionAmounts.cardFocusScale,
    pressScale: ds.motionAmounts.pressScale,
    screenEnterOffset: px(ds.motionAmounts.screenEnterOffset),
    listItemOffset: px(ds.motionAmounts.listItemOffset),
    shake: px(ds.motionAmounts.shake),
    discoveryScaleFrom: ds.motionAmounts.discoveryScaleFrom,
    // Phase 2/3 names.
    focusMs: ds.motion.focusIn.duration,
    screenEnterMs: ds.motion.screenEnter.duration,
    backgroundDriftMs: ds.motion.ambient.duration,
    breathMs: ds.motion.breath.duration,
  },
} as const;

export type Theme = typeof theme;
