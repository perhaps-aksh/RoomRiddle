import type {Hint} from '@roomriddle/shared-types';

/**
 * Progressive hints per puzzle: a nudge, then an interpretation, then a near-solution.
 * Hint ids are unique across the mystery. Each one used costs points (see ScoringRules).
 */
export const hints: Record<string, Hint[]> = {
  'station-clock': [
    {id: 'station-clock-1', text: 'Only one clock stopped at the exact moment. Which one?'},
    {id: 'station-clock-2', text: 'The platform clock froze at 11:59, but the notice says it never shows true time.'},
    {id: 'station-clock-3', text: 'Take twelve minutes off 11:59.'},
  ],
  'torn-ticket': [
    {id: 'torn-ticket-1', text: 'Each fragment has a partner on the platform: the board, the stripe, the plan.'},
    {id: 'torn-ticket-2', text: 'Only one train ending in 07 is still here tonight. Only one carriage is green.'},
    {id: 'torn-ticket-3', text: 'Train 207, carriage C. Sleeper seats only go up to 12, so the seat ends in 7 and is under 12.'},
  ],
  'conductors-ledger': [
    {id: 'conductors-ledger-1', text: 'One entry in the ledger is not like the others. Look at how it was written.'},
    {id: 'conductors-ledger-2', text: 'The blue-pencil entry puts Caldwell in the guard\'s van. His watch says otherwise.'},
    {id: 'conductors-ledger-3', text: 'The blue pencil was found at seat eight. The watch stopped at 11:47 in carriage C.'},
  ],
  'final-signal': [
    {id: 'final-signal-1', text: 'Each clue you found answers part of the question. Who, where, when, and how.'},
    {id: 'final-signal-2', text: 'Someone with a signal-box key wired the brake and pulled lever 7.'},
    {id: 'final-signal-3', text: 'Caldwell was not the one who fled. He was silenced, and he is still close by.'},
  ],
};

export function hintsFor(puzzleId: string): Hint[] {
  const list = hints[puzzleId];
  if (!list) throw new Error(`No hints authored for puzzle "${puzzleId}"`);
  return list;
}
