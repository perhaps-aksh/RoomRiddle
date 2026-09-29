/**
 * RoomRiddle colour system: "Cinematic Investigation Interface".
 *
 * Three families, each with a job:
 * - Night (backgrounds, surfaces): a deep blue-black, like a station at midnight.
 * - Brass (accent, focus): warm antique gold. It marks where you are and what matters.
 * - Signal (system): a cool steel blue for the investigation system itself:
 *   connections, sync, status. Never used for story content.
 * Paper and ink are for evidence documents.
 *
 * Components use these semantic names, never raw hex values.
 */
export const palette = {
  night950: '#040509',
  night900: '#07090E',
  night850: '#0A0D13',
  night800: '#0E121A',
  night700: '#151B26',
  night600: '#1D2432',
  night500: '#2A3344',
  night400: '#3A4456',

  paper100: '#F2EBDD',
  paper200: '#E6DCC6',
  paper300: '#B3AC9D',
  paper400: '#8A8375',

  brass300: '#F0C465',
  brass400: '#D4A64A',
  brass600: '#8C6A2A',
  brass800: '#3A2D14',

  signal300: '#8FC3E0',
  signal400: '#6FA8C8',
  signal700: '#27466F',
  signal900: '#122033',

  green400: '#6FBF8A',
  green800: '#1C3A28',
  amber400: '#E39A55',
  red400: '#E07068',
  red800: '#3D1C1A',

  ink900: '#1B1812',
} as const;

export const colors = {
  // Surfaces
  background: palette.night900,
  backgroundDeep: palette.night950,
  surfaceSunken: palette.night850,
  surface: palette.night800,
  surfaceElevated: palette.night700,
  surfaceHighlight: palette.night600,

  // Text (paper tones)
  textPrimary: palette.paper100,
  textSecondary: palette.paper300,
  /** Still passes 4.5:1 on background; use for metadata, never for instructions. */
  textMuted: palette.paper400,
  textOnAccent: palette.night900,

  // Brass
  accent: palette.brass400,
  accentStrong: palette.brass300,
  accentSoft: palette.brass600,
  accentWash: 'rgba(212, 166, 74, 0.10)',

  // Remote focus: must be obvious from the couch.
  focus: palette.brass300,
  focusFill: 'rgba(240, 196, 101, 0.13)',
  focusHalo: 'rgba(240, 196, 101, 0.30)',

  // The investigation system
  signal: palette.signal400,
  signalStrong: palette.signal300,
  signalSoft: palette.signal700,
  signalWash: 'rgba(111, 168, 200, 0.10)',

  // Feedback
  success: palette.green400,
  successWash: 'rgba(111, 191, 138, 0.12)',
  warning: palette.amber400,
  warningWash: 'rgba(227, 154, 85, 0.12)',
  danger: palette.red400,
  dangerWash: 'rgba(224, 112, 104, 0.12)',

  // Structure
  border: palette.night500,
  borderStrong: palette.night400,
  hairline: 'rgba(242, 235, 221, 0.08)',
  overlay: 'rgba(4, 5, 9, 0.88)',
  veil: palette.night950,

  // Evidence documents
  paper: palette.paper200,
  ink: palette.ink900,

  // Atmosphere (background light pools)
  glowWarm: palette.brass400,
  glowCool: palette.signal700,

  // Ending tones
  toneTriumph: palette.brass300,
  toneBittersweet: '#9FB4CF',
  toneDefeat: palette.red400,
} as const;

export type ColorToken = keyof typeof colors;
