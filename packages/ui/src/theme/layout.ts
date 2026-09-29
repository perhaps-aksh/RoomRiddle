/**
 * Spacing, radii, borders and elevation.
 * TV values are 1920×1080 design pixels (the TV converts them with px());
 * phone values are CSS pixels.
 */
export const spacing = {
  tv: {
    xxs: 4,
    xs: 8,
    sm: 16,
    md: 24,
    lg: 40,
    xl: 64,
    xxl: 96,
    /** TV-safe margins: 10-ish % from the edges, beyond overscan. */
    screenX: 128,
    screenY: 88,
  },
  phone: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 40,
    screenX: 20,
    screenY: 16,
  },
} as const;

/**
 * Case-file geometry: mostly squared corners with a small bevel.
 * Soft rounded pills are reserved for status chips.
 */
export const radii = {
  tv: {none: 0, sm: 4, md: 8, lg: 14, pill: 999},
  phone: {none: 0, sm: 3, md: 6, lg: 10, pill: 999},
} as const;

export const borders = {
  tv: {hairline: 1, thin: 2, focus: 3, heavy: 4},
  phone: {hairline: 1, thin: 1.5, focus: 2, heavy: 3},
} as const;

/**
 * Elevation. The TV avoids real shadows (they are expensive on the TV GPU);
 * depth comes from surface steps and borders. Phones get cheap CSS shadows.
 */
export const shadows = {
  web: {
    none: 'none',
    card: '0 1px 0 rgba(242,235,221,0.04) inset, 0 8px 24px rgba(0,0,0,0.35)',
    raised: '0 1px 0 rgba(242,235,221,0.06) inset, 0 16px 40px rgba(0,0,0,0.5)',
    focus: '0 0 0 3px rgba(240,196,101,0.35)',
  },
} as const;

/** Minimum touch target on the phone (WCAG 2.5.5 / platform guidance). */
export const touch = {minTarget: 48} as const;

/** Content width rules: TV text columns stay readable from the couch. */
export const measure = {
  tv: {narration: 1180, body: 1300, panel: 1100},
  phone: {content: 560},
} as const;
