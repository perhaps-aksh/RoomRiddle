import {normalizeText, spoilersIn} from '@roomriddle/game-engine';
import type {CharacterTruth, GameState, MysteryDefinition} from '@roomriddle/shared-types';

/**
 * Last line of defence: every generated line is checked before anyone sees it.
 * A rejected line is replaced by an authored one; nothing here is negotiable.
 */

export type GuardResult = {ok: true; text: string} | {ok: false; reason: string};

export const MAX_REPLY_CHARS = 360;
const MAX_SENTENCES = 3;

const OUT_OF_CHARACTER =
  /\b(as an ai|an ai\b|a?n? ?(large )?language model|chatbot|artificial intelligence|openai|chatgpt|gemini|llama|groq|system prompt|my (instructions|rules|notes)|i('m| am) (just )?(a|an) (program|assistant|bot))\b/i;

export function checkReply(mystery: MysteryDefinition, state: GameState, character: CharacterTruth, raw: string): GuardResult {
  let text = raw
    .replace(/\*[^*]{0,80}\*/g, ' ') // *leans back*
    .replace(/\([^)]{0,80}\)/g, ' ') // (sighs)
    .replace(/\s+/g, ' ')
    .trim();
  // "Voss: ..." prefixes and wrapping quotes.
  const prefix = new RegExp(`^(${escape(character.name)}|${escape(character.name.split(' ').pop() ?? '')})\\s*:\\s*`, 'i');
  text = text.replace(prefix, '').replace(/^["“'‘]+|["”'’]+$/g, '').trim();

  if (!text) return {ok: false, reason: 'empty'};
  const sentences = text.match(/[^.!?…]+[.!?…]+["”’]?|[^.!?…]+$/g) ?? [text];
  if (sentences.length > MAX_SENTENCES) text = sentences.slice(0, MAX_SENTENCES).join(' ').replace(/\s+/g, ' ').trim();
  if (text.length > MAX_REPLY_CHARS) return {ok: false, reason: 'too long'};
  if (OUT_OF_CHARACTER.test(text)) return {ok: false, reason: 'out of character'};

  const spoilers = spoilersIn(mystery, state, text);
  if (spoilers.length) return {ok: false, reason: `spoiler: ${spoilers.join(', ')}`};

  const answer = unsolvedAnswerIn(mystery, state, text);
  if (answer) return {ok: false, reason: `puzzle answer: ${answer}`};
  return {ok: true, text};
}

/** Typed answers (codes, words) of puzzles not yet solved. Choice ids are ordinary words and are skipped. */
function unsolvedAnswerIn(mystery: MysteryDefinition, state: GameState, text: string): string | null {
  const said = ` ${normalizeText(text.replace(/[^\p{L}\p{N}]+/gu, ' '))} `;
  for (const puzzle of mystery.puzzles) {
    if (state.solvedPuzzleIds.includes(puzzle.id)) continue;
    if (puzzle.input.kind !== 'digits' && puzzle.input.kind !== 'text') continue;
    for (const answer of puzzle.acceptedAnswers) {
      const a = normalizeText(answer.replace(/[^\p{L}\p{N}]+/gu, ' '));
      if (a.length >= 3 && said.includes(` ${a} `)) return answer;
    }
  }
  return null;
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
