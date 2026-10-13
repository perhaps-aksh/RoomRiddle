import {Image, type ImageSourcePropType} from 'react-native';
import {AssetLoader, AssetRegistry} from '@roomriddle/scene';
import {lastTrainWorld} from '@roomriddle/mystery-data';

/**
 * FINAL ART MAPPING: the bundled files behind each manifest entry marked
 * `status: 'final'` (see FINAL_ART in the case's world/manifest.ts).
 *
 * To add or replace art:
 *   1. run apps/tv/scripts/art/prepare_last_train.py <art dir> (sizes each
 *      file to its manifest box, writes src/assets/mysteries/<mystery>/),
 *   2. add `'<asset id>': require('../assets/mysteries/<mystery>/<file>')` below,
 *   3. add the id and file to FINAL_ART in the manifest.
 * Scenes, camera, director, interactions, engine and server are untouched.
 * test/Art.spec.ts checks every final asset has a bundled file.
 */
export const bundledArt: Readonly<Record<string, ImageSourcePropType>> = {
  'last-train.sky': require('../assets/mysteries/the-last-train/sky.jpg'),
  'last-train.city': require('../assets/mysteries/the-last-train/city.png'),
  'last-train.station.background': require('../assets/mysteries/the-last-train/station.background.png'),
  'last-train.station.platform': require('../assets/mysteries/the-last-train/station.platform.jpg'),
  'last-train.tracks': require('../assets/mysteries/the-last-train/tracks.jpg'),
  'last-train.station.lights': require('../assets/mysteries/the-last-train/station.lights.png'),
  'last-train.foreground.pole': require('../assets/mysteries/the-last-train/foreground.pole.png'),
  'last-train.bench': require('../assets/mysteries/the-last-train/bench.png'),
  'last-train.train': require('../assets/mysteries/the-last-train/train.png'),
  'last-train.train.interior': require('../assets/mysteries/the-last-train/train.interior.jpg'),
  'last-train.train.vestibule': require('../assets/mysteries/the-last-train/train.vestibule.jpg'),
  'last-train.signal-box.interior': require('../assets/mysteries/the-last-train/signal-box.interior.jpg'),
  'last-train.detective': require('../assets/mysteries/the-last-train/detective.png'),
  'last-train.clock': require('../assets/mysteries/the-last-train/clock.png'),
  'last-train.notice': require('../assets/mysteries/the-last-train/notice.png'),
  'last-train.waiting-room-clock': require('../assets/mysteries/the-last-train/waiting-room-clock.png'),
  'last-train.suitcase': require('../assets/mysteries/the-last-train/suitcase.png'),
  'last-train.newspaper': require('../assets/mysteries/the-last-train/newspaper.png'),
  'last-train.ticket': require('../assets/mysteries/the-last-train/ticket.png'),
  'last-train.departure-board': require('../assets/mysteries/the-last-train/departure-board.png'),
  'last-train.carriage-plan': require('../assets/mysteries/the-last-train/carriage-plan.png'),
  'last-train.carriage.props': require('../assets/mysteries/the-last-train/carriage.props.png'),
  'last-train.ledger': require('../assets/mysteries/the-last-train/ledger.png'),
  'last-train.pocket-watch': require('../assets/mysteries/the-last-train/pocket-watch.png'),
  'last-train.seat-card': require('../assets/mysteries/the-last-train/seat-card.png'),
  'last-train.brake': require('../assets/mysteries/the-last-train/brake.png'),
  'last-train.lever-frame': require('../assets/mysteries/the-last-train/lever-frame.png'),
  'last-train.lamp-room-door': require('../assets/mysteries/the-last-train/lamp-room-door.png'),
};

/** Painted close-ups shown on evidence cards, by clue id. */
const clueArt: Readonly<Record<string, ImageSourcePropType>> = {
  'platform-clock': require('../assets/mysteries/the-last-train/closeups/platform-clock.png'),
  'company-notice': require('../assets/mysteries/the-last-train/closeups/company-notice.png'),
  'waiting-room-clock': require('../assets/mysteries/the-last-train/closeups/waiting-room-clock.png'),
  'torn-ticket': require('../assets/mysteries/the-last-train/closeups/torn-ticket.png'),
  'departure-board': require('../assets/mysteries/the-last-train/closeups/departure-board.png'),
  'carriage-plan': require('../assets/mysteries/the-last-train/closeups/carriage-plan.png'),
  'pocket-watch': require('../assets/mysteries/the-last-train/closeups/pocket-watch.png'),
  'conductors-ledger': require('../assets/mysteries/the-last-train/closeups/conductors-ledger.png'),
  'seat-eight-card': require('../assets/mysteries/the-last-train/closeups/seat-eight-card.png'),
  'wired-brake': require('../assets/mysteries/the-last-train/closeups/wired-brake.png'),
  'blackwater-lever': require('../assets/mysteries/the-last-train/closeups/blackwater-lever.png'),
  'lamp-room-door': require('../assets/mysteries/the-last-train/closeups/lamp-room-door.png'),
};

export function closeupFor(clueId: string): ImageSourcePropType | undefined {
  return clueArt[clueId];
}

/**
 * Speech-bubble portraits by character id: `calm`, and `pressed` when the
 * players have just shown them evidence.
 */
const portraitArt: Readonly<Record<string, {calm: ImageSourcePropType; pressed: ImageSourcePropType}>> = {
  voss: {calm: require('../assets/mysteries/the-last-train/portraits/voss.calm.png'), pressed: require('../assets/mysteries/the-last-train/portraits/voss.pressed.png')},
  driver: {calm: require('../assets/mysteries/the-last-train/portraits/driver.calm.png'), pressed: require('../assets/mysteries/the-last-train/portraits/driver.pressed.png')},
  signalman: {calm: require('../assets/mysteries/the-last-train/portraits/signalman.calm.png'), pressed: require('../assets/mysteries/the-last-train/portraits/signalman.pressed.png')},
  caldwell: {calm: require('../assets/mysteries/the-last-train/portraits/caldwell.calm.png'), pressed: require('../assets/mysteries/the-last-train/portraits/caldwell.pressed.png')},
  detective: {calm: require('../assets/mysteries/the-last-train/portraits/detective.calm.png'), pressed: require('../assets/mysteries/the-last-train/portraits/detective.pressed.png')},
};

export function portraitFor(characterId: string, pressed: boolean): ImageSourcePropType | undefined {
  const p = portraitArt[characterId];
  return p ? (pressed ? p.pressed : p.calm) : undefined;
}

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
