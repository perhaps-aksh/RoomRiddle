import type {MysteryDefinition, MysteryId, MysterySummary, MysteryWorld} from '@roomriddle/shared-types';
import {comingSoon} from './coming-soon';
import {theLastTrain, theLastTrainMystery} from './the-last-train';
import {lastTrainWorld} from './the-last-train/world';

/** Every mystery shown in the Mystery Library, in display order. */
export const mysteryCatalog: readonly MysterySummary[] = [theLastTrain, ...comingSoon];

/** Mysteries with full playable content, keyed by id. */
const playable: Readonly<Record<MysteryId, MysteryDefinition>> = {
  [theLastTrainMystery.summary.id]: theLastTrainMystery,
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

export {theLastTrain, theLastTrainMystery, lastTrainWorld};
