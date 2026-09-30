import {Image, type ImageSourcePropType} from 'react-native';
import {AssetLoader, AssetRegistry} from '@roomriddle/scene';
import {lastTrainWorld} from '@roomriddle/mystery-data';

/**
 * FINAL ART MAPPING. The only file that changes when production art arrives.
 *
 * To replace a placeholder:
 *   1. put the file in src/assets/mysteries/<mystery>/ (WebP, sized as the
 *      manifest entry's `size`, transparent where the placeholder is),
 *   2. add `'<asset id>': require('../assets/mysteries/<mystery>/<file>')` below,
 *   3. in the manifest entry set status: 'final', format: 'webp', source: '<file>'.
 * Scenes, camera, director, interactions, engine and server are untouched.
 */
export const bundledArt: Readonly<Record<string, ImageSourcePropType>> = {
  // 'last-train.train': require('../assets/mysteries/the-last-train/train.webp'),
};

export const assetRegistry = new AssetRegistry([lastTrainWorld.manifest]);

/** Bundled art is ready immediately; anything remote is prefetched (and falls back if it fails). */
export const assetLoader = new AssetLoader(assetRegistry, async (uri, asset) => {
  if (bundledArt[asset.id] !== undefined) {
    return;
  }
  const ok = await Image.prefetch(uri);
  if (!ok) {
    throw new Error(`could not load ${uri}`);
  }
});

export function imageSourceFor(id: string, uri: string): ImageSourcePropType {
  return bundledArt[id] ?? {uri};
}
