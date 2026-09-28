import type {Ending} from '@roomriddle/shared-types';

/**
 * Deterministic endings, checked in order: the first whose conditions all hold wins.
 * The ending id is decided by the engine from GameState. Narration is authored here.
 */
export const endings: Ending[] = [
  {
    id: 'the-truth',
    title: 'The Truth',
    tone: 'triumph',
    when: [
      {kind: 'puzzle-solved', puzzleId: 'final-signal'},
      {kind: 'major-clues-found'},
      {kind: 'hints-used-at-most', count: 4},
    ],
    narration: [
      'You draw the bolt on the lamp room.',
      'Elias Caldwell stumbles out, bruised, hoarse, alive.',
      '',
      'He caught Inspector Voss with a signal-box key at 11:47.',
      'In the blackout, Voss struck him down, wrote the lie in his ledger',
      'and meant to send the Northern Star into the sealed tunnel,',
      'taking the mail van and the evidence of his fraud with it.',
      '',
      'Voss is taken from seat eight in handcuffs.',
      'At 12:14 AM, the last train leaves on the right line.',
    ],
  },
  {
    id: 'the-unanswered-question',
    title: 'The Unanswered Question',
    tone: 'bittersweet',
    when: [{kind: 'puzzle-solved', puzzleId: 'final-signal'}],
    narration: [
      'The Northern Star is safe. The points are set, the signal holds.',
      '',
      'But pieces of the night slipped past you.',
      'Inspector Voss walks off the platform with his story intact,',
      'and no one can yet prove what happened in carriage C.',
      '',
      'Elias Caldwell is found at dawn.',
      'Some questions will have to wait for the inquiry.',
    ],
  },
  {
    id: 'too-late',
    title: 'Too Late',
    tone: 'defeat',
    when: [],
    narration: [
      'Midnight.',
      'The whistle blows, and the Northern Star pulls out into the storm.',
      '',
      'At Blackwater points it turns onto the old line.',
      'Its lamps grow small and vanish into the dark.',
      '',
      'Whatever happened at 11:47 PM,',
      'the truth left on the last train.',
    ],
  },
];
