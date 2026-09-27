import type { MysteryId, MysterySummary } from '@roomriddle/shared-types';
import { theLastTrain } from './the-last-train/mystery';
import { comingSoon } from './coming-soon';

/** Every mystery shown in the Mystery Library, in display order. */
export const mysteryCatalog: readonly MysterySummary[] = [theLastTrain, ...comingSoon];

export function findMystery(id: MysteryId): MysterySummary | undefined {
  return mysteryCatalog.find((mystery) => mystery.id === id);
}

export { theLastTrain };
