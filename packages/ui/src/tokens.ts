/**
 * Design tokens: plain values only, no React/DOM imports, so the React Native TV app
 * and the web player can both consume them.
 * Direction: dark, cinematic, calm. Near-black navy with antique-gold accents
 * (matches the project thumbnail).
 */

export const colors = {
  background: '#07090E',
  surface: '#10141C',
  surfaceRaised: '#171C27',
  border: '#262D3B',
  textPrimary: '#F2EBDD',
  textSecondary: '#A8A294',
  textMuted: '#6E6A61',
  accent: '#D4A64A',
  accentSoft: '#8C6A2A',
  /** Remote-focus ring. Must be obvious from the couch. */
  focus: '#F0C465',
  success: '#6FBF8A',
  danger: '#D9695F',
} as const;

/** Spacing scale in density-independent pixels (TV layouts assume a 1920×1080 canvas). */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
  xxl: 64,
} as const;

export const radii = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

/** Type sizes for couch distance (TV) and phone. TV body text never goes below 28. */
export const typeScale = {
  tv: { display: 96, title: 56, heading: 40, body: 30, caption: 28 },
  phone: { display: 34, title: 26, heading: 20, body: 16, caption: 13 },
} as const;

export const focus = {
  borderWidth: 4,
  /** Focused elements scale up slightly so focus reads even without colour. */
  scale: 1.06,
} as const;
