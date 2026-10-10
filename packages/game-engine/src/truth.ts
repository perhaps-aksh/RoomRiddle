import type {CharacterTruth, GameState, MysteryDefinition, TruthFact} from '@roomriddle/shared-types';
import {isRequirementMet} from './mystery';
import {normalizeText} from './validation';

/**
 * Truth-table gates. Pure and deterministic: given a mystery and the current
 * GameState, which facts may a character speak, and which words are still
 * spoilers? Any voice (authored or AI) must go through these. The engine's
 * rules never read the truth table; answers are still decided by puzzles alone.
 */

export function findCharacter(mystery: MysteryDefinition, id: string): CharacterTruth | undefined {
  return mystery.truth?.characters.find((c) => c.id === id);
}

export function interviewableCharacters(mystery: MysteryDefinition): CharacterTruth[] {
  return (mystery.truth?.characters ?? []).filter((c) => c.interviewable);
}

/** Facts this character may speak right now. */
export function speakableFacts(mystery: MysteryDefinition, state: GameState, characterId: string): TruthFact[] {
  const character = findCharacter(mystery, characterId);
  if (!character) return [];
  return character.facts.filter((f) => isRequirementMet(f.unlockedBy, state));
}

/** Facts this character holds but may NOT speak yet (the AI must never be shown these). */
export function lockedFacts(mystery: MysteryDefinition, state: GameState, characterId: string): TruthFact[] {
  const character = findCharacter(mystery, characterId);
  if (!character) return [];
  return character.facts.filter((f) => !isRequirementMet(f.unlockedBy, state));
}

/** Terms nobody may say yet in this game. */
export function activeGuardedTerms(mystery: MysteryDefinition, state: GameState): string[] {
  return (mystery.truth?.guarded ?? []).filter((g) => !isRequirementMet(g.until, state)).flatMap((g) => g.terms);
}

/**
 * The guarded terms a line of speech contains (empty = safe to say).
 * Matching is on normalised words, so "VOSS," and "voss" both count.
 */
export function spoilersIn(mystery: MysteryDefinition, state: GameState, line: string): string[] {
  const text = ` ${normalizeText(line.replace(/[^\p{L}\p{N}:]+/gu, ' '))} `;
  return activeGuardedTerms(mystery, state).filter((term) => {
    const t = normalizeText(term.replace(/[^\p{L}\p{N}:]+/gu, ' '));
    return t.length > 0 && text.includes(` ${t} `);
  });
}
