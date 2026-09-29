/**
 * Phase 2 token names, kept so nothing that imported them breaks.
 * New code should import from './theme' (the Phase 5 design system).
 */
import {colors as semantic} from './theme/colors';
import {textStyles} from './theme/typography';
import {radii as r, spacing as s} from './theme/layout';
import {motionAmounts} from './theme/motion';

export const colors = {
  background: semantic.background,
  surface: semantic.surface,
  surfaceRaised: semantic.surfaceElevated,
  border: semantic.border,
  textPrimary: semantic.textPrimary,
  textSecondary: semantic.textSecondary,
  textMuted: semantic.textMuted,
  accent: semantic.accent,
  accentSoft: semantic.accentSoft,
  focus: semantic.focus,
  success: semantic.success,
  danger: semantic.danger,
} as const;

export const spacing = {xs: s.tv.xxs, sm: s.tv.xs, md: s.tv.sm, lg: s.tv.md, xl: s.tv.lg, xxl: s.tv.xl} as const;
export const radii = {sm: r.tv.sm, md: r.tv.md, lg: r.tv.lg, pill: r.tv.pill} as const;

export const typeScale = {
  tv: {display: textStyles.tv.display.size, title: textStyles.tv.h1.size, heading: textStyles.tv.h2.size, body: textStyles.tv.body.size, caption: textStyles.tv.label.size},
  phone: {display: textStyles.phone.display.size, title: textStyles.phone.h1.size, heading: textStyles.phone.h2.size, body: textStyles.phone.body.size, caption: textStyles.phone.label.size},
} as const;

export const focus = {borderWidth: 3, scale: motionAmounts.focusScale} as const;
