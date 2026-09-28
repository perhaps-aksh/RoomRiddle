/**
 * RoomRiddle TV theme: the only place colours, type sizes, spacing and motion values live.
 *
 * Colour values mirror the shared design tokens in `packages/ui/src/tokens.ts`.
 * The TV app keeps this copy until the shared packages are wired into Metro
 * (apps/tv is outside the npm workspaces, see apps/tv/README.md).
 *
 * SIZES: every size in the app is written in 1920×1080 design pixels and passed through
 * `px()`, which converts to layout units (dp) for the actual screen. The Vega Virtual
 * Device reports a 960×540 dp window at 2× density, so raw numbers would render twice
 * as large as designed (see docs/friction-log.md FL-005).
 */
import {Dimensions, PixelRatio} from 'react-native';

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

export const theme = {
  colors: {
    background: '#07090E',
    surface: '#10141C',
    surfaceRaised: '#171C27',
    border: '#262D3B',
    text: '#F2EBDD',
    mutedText: '#A8A294',
    faintText: '#6E6A61',
    accent: '#D4A64A',
    accentSoft: '#8C6A2A',
    /** Remote focus. Must be obvious from the couch. */
    focus: '#F0C465',
    focusFill: 'rgba(212, 166, 74, 0.14)',
    glowWarm: '#D4A64A',
    glowCool: '#27466F',
    scrim: 'rgba(4, 5, 9, 0.86)',
    success: '#6FBF8A',
    danger: '#D9695F',
    /** Ending tones. */
    toneTriumph: '#F0C465',
    toneBittersweet: '#9FB4CF',
    toneDefeat: '#D9695F',
  },
  /** Font sizes in design pixels (1080p). TV body text never goes below 28 (AGENTS.md). */
  type: {
    wordmark: px(104),
    title: px(64),
    heading: px(44),
    narration: px(36),
    nav: px(32),
    body: px(28),
    caption: px(24),
    roomCode: px(148),
    motif: px(280),
  },
  spacing: {
    xs: px(8),
    sm: px(16),
    md: px(24),
    lg: px(40),
    xl: px(64),
    xxl: px(96),
    screenX: px(128),
    screenY: px(88),
  },
  radii: {
    sm: px(8),
    md: px(14),
    lg: px(22),
  },
  motion: {
    focusScale: 1.04,
    cardFocusScale: 1.05,
    focusMs: 160,
    screenEnterMs: 420,
    screenEnterOffset: px(28),
    backgroundDriftMs: 16000,
    breathMs: 3600,
  },
} as const;

export type Theme = typeof theme;
