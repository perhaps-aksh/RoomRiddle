import assert from 'node:assert/strict';
import {test} from 'node:test';
import {cssVariables} from './css';
import {colors} from './theme/colors';
import {motion, reducedMotion} from './theme/motion';
import {textStyles} from './theme/typography';

/** WCAG relative luminance contrast for #RRGGBB. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r = 0, g = 0, bl = 0] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi = 0, lo = 0] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test('text colours meet WCAG AA on every surface', () => {
  for (const surface of [colors.background, colors.surface, colors.surfaceElevated]) {
    for (const text of [colors.textPrimary, colors.textSecondary, colors.textMuted, colors.accent, colors.focus, colors.success, colors.danger, colors.warning, colors.signal]) {
      assert.ok(contrast(text, surface) >= 4.5, `${text} on ${surface}: ${contrast(text, surface).toFixed(2)}`);
    }
  }
  assert.ok(contrast(colors.ink, colors.paper) >= 7, 'evidence ink on paper');
  assert.ok(contrast(colors.textOnAccent, colors.focus) >= 7, 'text on focus');
});

test('TV text never goes below 24 and body is at least 28', () => {
  for (const [name, s] of Object.entries(textStyles.tv)) assert.ok(s.size >= 24, name);
  assert.ok(textStyles.tv.body.size >= 28);
});

test('focus motion stays fast enough for a remote', () => {
  assert.ok(motion.focusIn.duration <= 200);
  assert.ok(motion.focusOut.duration <= 200);
  assert.ok(reducedMotion(motion.sceneReveal).duration <= 120);
});

test('css variables cover colours, type, motion and reduced motion', () => {
  const css = cssVariables();
  assert.match(css, /--c-background: #07090E;/);
  assert.match(css, /--c-text-primary: /);
  assert.match(css, /--t-room-code-font: 400 40px\/48px var\(--font-technical\);/);
  assert.match(css, /--m-focus-in: 140ms var\(--ease-standard\);/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(css, /undefined|NaN/);
});
