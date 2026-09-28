import type {MysteryDefinition, MysteryId, MysterySummary} from '@roomriddle/shared-types';
import {comingSoon} from './coming-soon';
import {theLastTrain, theLastTrainMystery} from './the-last-train';

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

export {theLastTrain, theLastTrainMystery};
