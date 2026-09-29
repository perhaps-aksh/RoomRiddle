/**
 * The 2.5D world palette: colours the placeholder world is painted with.
 *
 * Kept apart from the UI colours on purpose: the world is scenery, the UI is
 * information. World data (packages/mystery-data) refers to these by key
 * (`WorldColor` in shared-types), never by value, so placeholders can be
 * restyled here and final art replaces them without touching data.
 *
 * Night-time, rain, sodium lamps, brass: the same mood as the UI palette.
 */
export const worldColors = {
  black: '#000000',
  sky: '#070B14',
  skyLow: '#111A2A',
  cloud: '#1A2334',
  city: '#0C121D',
  cityLight: '#C9A25A',
  brick: '#2B2023',
  brickDark: '#1A1416',
  stone: '#2A2E36',
  stoneLight: '#3C414B',
  iron: '#15191F',
  ironLight: '#2C323B',
  rail: '#6B6F75',
  wood: '#3A2A1E',
  woodLight: '#5A4330',
  trainBody: '#1E3A2E',
  trainTrim: '#B08A3E',
  trainDark: '#0F1E18',
  window: '#0E1622',
  windowGlow: '#E9C27A',
  lamp: '#F3D08A',
  lampGlow: '#F0C465',
  headlight: '#FFF1C9',
  paper: '#E6DCC6',
  ink: '#1B1812',
  brass: '#D4A64A',
  coat: '#4A3F33',
  coatDark: '#2E271F',
  hat: '#1C1A18',
  skin: '#C9A48A',
  shadow: '#000000',
  fog: '#9FB0C4',
  steam: '#D8DEE6',
  rain: '#A9C2DA',
  danger: '#B5483F',
  upholstery: '#4A2226',
} as const;

export type WorldColorToken = keyof typeof worldColors;
