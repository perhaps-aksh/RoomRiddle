/**
 * Three typographic voices, each with a job:
 *
 * - cinematic: serif. Mystery titles, scene titles, narration, ending titles.
 *   The story speaks in this voice.
 * - functional: sans. Instructions, buttons, descriptions, labels.
 *   The interface speaks in this voice.
 * - technical: monospace. Room codes, times, evidence IDs, scores.
 *   The investigation system speaks in this voice.
 *
 * Families are listed with fallbacks. On Fire TV (Vega) Bookerly, Amazon Ember
 * and Amazon Ember Mono are system fonts, so nothing is bundled.
 */
export const fontFamilies = {
  tv: {
    cinematic: 'Bookerly',
    functional: 'Amazon Ember',
    technical: 'Amazon Ember Mono',
  },
  web: {
    cinematic: "Bookerly, 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif",
    functional: "'Amazon Ember', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    technical: "'Amazon Ember Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
  },
} as const;

export type FontVoice = keyof (typeof fontFamilies)['tv'];

export interface TextStyleToken {
  voice: FontVoice;
  /** Size in design pixels (TV: 1920×1080 canvas; phone: CSS px). */
  size: number;
  lineHeight: number;
  /** Letter spacing in design pixels. */
  tracking: number;
  weight: '300' | '400' | '500' | '700';
  uppercase?: boolean;
}

const t = (
  voice: FontVoice,
  size: number,
  lineHeight: number,
  weight: TextStyleToken['weight'] = '400',
  tracking = 0,
  uppercase = false,
): TextStyleToken => ({voice, size, lineHeight, weight, tracking, uppercase});

/**
 * The hierarchy. TV body text never goes below 28 (AGENTS.md); 24 is kept for
 * short uppercase metadata only.
 */
export const textStyles = {
  tv: {
    wordmark: t('cinematic', 108, 124, '400', 20, true),
    display: t('cinematic', 76, 92, '400', 6, true),
    h1: t('cinematic', 56, 68, '400', 4),
    h2: t('functional', 40, 52, '500', 2),
    narration: t('cinematic', 36, 56),
    body: t('functional', 30, 44),
    button: t('functional', 32, 40, '500', 3, true),
    label: t('functional', 24, 32, '500', 6, true),
    mono: t('technical', 28, 36, '400', 2),
    monoLarge: t('technical', 44, 52, '400', 6),
    roomCode: t('technical', 150, 170, '400', 28),
  },
  phone: {
    wordmark: t('cinematic', 22, 28, '400', 6, true),
    display: t('cinematic', 30, 36, '400', 2, true),
    h1: t('cinematic', 26, 32),
    h2: t('functional', 18, 24, '500', 0.5),
    narration: t('cinematic', 18, 28),
    body: t('functional', 16, 24),
    button: t('functional', 16, 20, '500', 1.5, true),
    label: t('functional', 12, 16, '500', 2.5, true),
    mono: t('technical', 15, 20, '400', 1),
    monoLarge: t('technical', 26, 32, '400', 4),
    roomCode: t('technical', 40, 48, '400', 12),
  },
} as const;

export type TextStyleName = keyof (typeof textStyles)['tv'];
