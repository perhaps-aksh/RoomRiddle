import type {CharacterTruth, Clue, TruthFact} from '@roomriddle/shared-types';

/**
 * Authored replies: used when no model is configured, every provider fails, or
 * a generated line is rejected. Deterministic, offline, and built only from
 * facts the room has already unlocked, so the game plays without AI.
 */

const STOP = new Set(
  'about after again also another any are been before being could did does doing from have having here into just know more most much must only other over said same should some such than that their them then there these they this those through under very want were what when where which while who whom whose why will with would your you tell'.split(
    ' ',
  ),
);

const DEFLECT_GRIM = [
  "I've told you what I know.",
  'Ask me something I can actually answer.',
  "Look at the evidence, not at me.",
  "I can't help you with that.",
];
const DEFLECT_GENTLE = [
  "I'm not sure about that. Have another look around?",
  "Hmm, I don't know. Maybe the clues can tell us.",
  'That is a good question. I wish I knew.',
  "Let's look at what we have found so far.",
];

export function authoredReply(input: {
  character: CharacterTruth;
  facts: TruthFact[];
  question: string;
  evidence?: Clue;
  gentle?: boolean;
}): string {
  const {character, facts, question, evidence, gentle = false} = input;
  // Speech only: notes written in the third person ("he stops denying…") are not lines.
  const lines = facts.filter(f => /\b(i|i'm|i've|i'd|my|me|we|we're|our|us)\b/i.test(f.text));

  if (evidence) {
    const unlocked = lines.find(f => f.unlockedBy?.clueIds?.includes(evidence.id));
    if (unlocked) return unlocked.text;
  }

  const asked = words(`${question} ${evidence?.title ?? ''}`);
  let best: TruthFact | undefined;
  let bestScore = 0;
  for (const fact of lines) {
    const score = words(fact.text).filter(w => asked.includes(w)).length;
    if (score > bestScore) {
      best = fact;
      bestScore = score;
    }
  }
  if (best) return best.text;

  const pool = gentle ? DEFLECT_GENTLE : DEFLECT_GRIM;
  return pool[hash(`${character.id}|${question}`) % pool.length]!;
}

function words(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter(w => w.length >= 4 && !STOP.has(w)).map(stem);
}

function stem(w: string): string {
  return w.replace(/(ing|ed|es|s)$/, '');
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
