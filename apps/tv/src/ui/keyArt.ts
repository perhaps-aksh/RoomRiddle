import type {ImageSourcePropType} from 'react-native';

/**
 * Shared key art for the menus. Files are made by
 * apps/tv/scripts/art/prepare_ui.py (darkening baked in for legible text).
 */
export const homeArt: ImageSourcePropType = require('../assets/ui/home.jpg');
export const libraryArt: ImageSourcePropType = require('../assets/ui/library.jpg');

const cards: Readonly<Record<string, ImageSourcePropType>> = {
  'the-last-train': require('../assets/ui/cards/the-last-train.jpg'),
  'the-hollow-manor': require('../assets/ui/cards/the-hollow-manor.jpg'),
  'signal-lost': require('../assets/ui/cards/signal-lost.jpg'),
  'the-forgotten-temple': require('../assets/ui/cards/the-forgotten-temple.jpg'),
  'the-yakshas-questions': require('../assets/ui/cards/the-yakshas-questions.jpg'),
};

/** Painted card art for a case, if it has any. */
export function cardArtFor(mysteryId: string): ImageSourcePropType | undefined {
  return cards[mysteryId];
}
