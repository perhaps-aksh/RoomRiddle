import type {AudioDirection, AudioManifest, MysteryDefinition, MysteryId, MysterySummary, MysteryWorld} from '@roomriddle/shared-types';
import {comingSoon} from './coming-soon';
import {theLastTrain, theLastTrainMystery} from './the-last-train';
import {theHollowManor, theHollowManorMystery} from './the-hollow-manor';
import {signalLost, signalLostMystery} from './signal-lost';
import {lastTrainWorld} from './the-last-train/world';
import {lastTrainAudio, lastTrainAudioManifest} from './the-last-train/audio';
import {coreAudioManifest, coreCueSounds, coreMusic} from './kit/audio';

/** Every mystery shown in the Mystery Library, in display order. */
export const mysteryCatalog: readonly MysterySummary[] = [theLastTrain, theHollowManor, signalLost, ...comingSoon];

/** Mysteries with full playable content, keyed by id. */
const playable: Readonly<Record<MysteryId, MysteryDefinition>> = {
  [theLastTrainMystery.summary.id]: theLastTrainMystery,
  [theHollowManorMystery.summary.id]: theHollowManorMystery,
  [signalLostMystery.summary.id]: signalLostMystery,
};

export function findMystery(id: MysteryId): MysterySummary | undefined {
  return mysteryCatalog.find((mystery) => mystery.id === id);
}

/** The full content for a playable mystery, or undefined. */
export function getMysteryDefinition(id: MysteryId): MysteryDefinition | undefined {
  return playable[id];
}

export const playableMysteries: readonly MysteryDefinition[] = Object.values(playable);

/** 2.5D worlds (presentation only), keyed by mystery id. A mystery without one uses the P5 screens. */
const worlds: Readonly<Record<MysteryId, MysteryWorld>> = {
  [lastTrainWorld.mysteryId]: lastTrainWorld,
};

export function getMysteryWorld(id: MysteryId): MysteryWorld | undefined {
  return worlds[id];
}

/** How each mystery sounds (Phase 7), keyed by mystery id. A mystery without one plays the shared sounds only. */
const audio: Readonly<Record<MysteryId, {manifest: AudioManifest; direction: AudioDirection}>> = {
  [lastTrainWorld.mysteryId]: {manifest: lastTrainAudioManifest, direction: lastTrainAudio},
};

export function getMysteryAudio(id: MysteryId): {manifest: AudioManifest; direction: AudioDirection} | undefined {
  return audio[id];
}

/** Every audio manifest (shared first), for the renderer's registry. */
export const audioManifests: readonly AudioManifest[] = [coreAudioManifest, ...Object.values(audio).map(a => a.manifest)];

export {theHollowManor, theHollowManorMystery, signalLost, signalLostMystery};
export {theLastTrain, theLastTrainMystery, lastTrainWorld, lastTrainAudio, lastTrainAudioManifest, coreAudioManifest, coreCueSounds, coreMusic};
