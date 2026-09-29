import {colors} from './theme/colors';
import {fontFamilies, textStyles, type TextStyleName} from './theme/typography';
import {borders, radii, shadows, spacing, touch} from './theme/layout';
import {durations, easings, motion} from './theme/motion';

const kebab = (s: string) => s.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);

/**
 * The phone's design tokens as CSS custom properties, generated from the same
 * source as the TV theme. The player build writes this to tokens.css, so the
 * stylesheet never hard-codes a colour, size or timing.
 */
export function cssVariables(): string {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(colors)) lines.push(`--c-${kebab(k)}: ${v};`);
  for (const [k, v] of Object.entries(fontFamilies.web)) lines.push(`--font-${k}: ${v};`);
  for (const [name, s] of Object.entries(textStyles.phone)) {
    const n = kebab(name as TextStyleName);
    lines.push(
      `--t-${n}-font: ${s.weight} ${s.size}px/${s.lineHeight}px var(--font-${s.voice});`,
      `--t-${n}-tracking: ${s.tracking}px;`,
    );
  }
  for (const [k, v] of Object.entries(spacing.phone)) lines.push(`--s-${kebab(k)}: ${v}px;`);
  for (const [k, v] of Object.entries(radii.phone)) lines.push(`--r-${k}: ${v}px;`);
  for (const [k, v] of Object.entries(borders.phone)) lines.push(`--b-${k}: ${v}px;`);
  for (const [k, v] of Object.entries(shadows.web)) lines.push(`--shadow-${k}: ${v};`);
  lines.push(`--touch-min: ${touch.minTarget}px;`);
  for (const [k, v] of Object.entries(durations)) lines.push(`--d-${k}: ${v}ms;`);
  for (const [k, v] of Object.entries(easings)) lines.push(`--ease-${k}: cubic-bezier(${v.join(', ')});`);
  for (const [k, v] of Object.entries(motion)) {
    lines.push(`--m-${kebab(k)}: ${v.duration}ms var(--ease-${v.easing});`);
  }
  return `/* Generated from @roomriddle/ui by build.mjs. Do not edit. */\n:root {\n  ${lines.join('\n  ')}\n}\n@media (prefers-reduced-motion: reduce) {\n  :root {\n    ${Object.keys(motion)
    .map(k => `--m-${kebab(k)}: 1ms linear;`)
    .join('\n    ')}\n  }\n}\n`;
}
