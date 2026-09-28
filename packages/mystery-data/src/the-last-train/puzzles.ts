import type {Puzzle} from '@roomriddle/shared-types';
import {hintsFor} from './hints';

/**
 * The four puzzles of The Last Train. Every answer can be deduced from the
 * clues in the same scene, and every input can be entered with a TV remote.
 */
export const puzzles: Puzzle[] = [
  // Puzzle 1: establishes the timestamp.
  {
    id: 'station-clock',
    sceneId: 'station',
    title: 'The Station Clock',
    prompt: [
      'Three clocks.',
      'One stopped at the exact moment.',
      'None of them tells the truth on its own.',
    ],
    question: 'What time did the incident occur?',
    input: {kind: 'digits', length: 4},
    acceptedAnswers: ['11:47', '1147'],
    hints: hintsFor('station-clock'),
    points: 100,
    requires: {clueIds: ['platform-clock', 'company-notice']},
    solvedText: [
      '11:59, less twelve minutes. 11:47 PM.',
      'At that moment, lightning struck the tower.',
      'And at that moment, the conductor disappeared.',
    ],
  },

  // Puzzle 2: reconstruct the ticket to find the carriage.
  {
    id: 'torn-ticket',
    sceneId: 'train',
    title: 'The Torn Ticket',
    prompt: [
      'Half of it is missing.',
      'The platform holds the rest of the story.',
    ],
    question: 'Rebuild the ticket: train, carriage, seat.',
    input: {
      kind: 'combination',
      fields: [
        {
          id: 'train',
          label: 'Train',
          options: [
            {id: '107', label: '107'},
            {id: '207', label: '207'},
            {id: '307', label: '307'},
            {id: '407', label: '407'},
          ],
        },
        {
          id: 'carriage',
          label: 'Carriage',
          options: [
            {id: 'a', label: 'A'},
            {id: 'b', label: 'B'},
            {id: 'c', label: 'C'},
            {id: 'd', label: 'D'},
          ],
        },
        {
          id: 'seat',
          label: 'Seat',
          options: [
            {id: '7', label: '7'},
            {id: '12', label: '12'},
            {id: '17', label: '17'},
            {id: '27', label: '27'},
          ],
        },
      ],
    },
    acceptedAnswers: ['207|c|7'],
    hints: hintsFor('torn-ticket'),
    points: 100,
    requires: {clueIds: ['torn-ticket', 'departure-board', 'carriage-plan']},
    solvedText: [
      'Train 207, carriage C, seat 7.',
      'The ticket was punched by Caldwell himself.',
      'Whatever happened, it happened in the sleeper.',
    ],
  },

  // Puzzle 3: the ledger's lie exposes who, where and when.
  {
    id: 'conductors-ledger',
    sceneId: 'carriage',
    title: "The Conductor's Ledger",
    prompt: [
      'The ledger looks routine.',
      'One entry was written by someone else.',
    ],
    question: 'Who wrote the false entry, where was Caldwell really, and when?',
    input: {
      kind: 'combination',
      fields: [
        {
          id: 'who',
          label: 'Who',
          options: [
            {id: 'caldwell', label: 'Caldwell'},
            {id: 'voss', label: 'Voss'},
            {id: 'driver', label: 'The Driver'},
            {id: 'signalman', label: 'Signalman'},
          ],
        },
        {
          id: 'where',
          label: 'Where',
          options: [
            {id: 'guards-van', label: "Guard's Van"},
            {id: 'carriage-a', label: 'Carriage A'},
            {id: 'carriage-c', label: 'Carriage C'},
            {id: 'signal-box', label: 'Signal Box'},
          ],
        },
        {
          id: 'when',
          label: 'When',
          options: [
            {id: '1140', label: '11:40'},
            {id: '1143', label: '11:43'},
            {id: '1147', label: '11:47'},
            {id: '1153', label: '11:53'},
          ],
        },
      ],
    },
    acceptedAnswers: ['voss|carriage-c|1147'],
    hints: hintsFor('conductors-ledger'),
    points: 100,
    requires: {clueIds: ['pocket-watch', 'conductors-ledger', 'seat-eight-card']},
    solvedText: [
      'The ledger says the guard\'s van. The watch says carriage C.',
      'Inspector Voss wrote that entry in blue pencil, to hide where Caldwell was at 11:47.',
      'Voss holds a key to the signal box.',
    ],
  },

  // Puzzle 4: combine everything into what really happened.
  {
    id: 'final-signal',
    sceneId: 'signal-box',
    title: 'The Final Signal',
    prompt: [
      'Two minutes to midnight.',
      'Only one account fits every clue.',
      'Choose it, and send the signal.',
    ],
    question: 'What happened at 11:47 PM?',
    input: {
      kind: 'choice',
      options: [
        {
          id: 'caldwell-fled',
          label: 'Caldwell forged his own ledger, wired the brake and fled in the storm.',
        },
        {
          id: 'lightning-accident',
          label: 'Lightning knocked out the signals and the points slipped by accident.',
        },
        {
          id: 'voss-sabotage',
          label: 'Voss silenced Caldwell in carriage C, wired the brake and set lever 7 for the tunnel.',
        },
        {
          id: 'signalman-error',
          label: 'The signalman mis-set the points and hid in the lamp room.',
        },
      ],
    },
    acceptedAnswers: ['voss-sabotage'],
    hints: hintsFor('final-signal'),
    points: 150,
    requires: {clueIds: ['blackwater-lever'], puzzleIds: ['conductors-ledger']},
    solvedText: [
      'You throw lever 7 back and set the signal to danger.',
      'On the platform, the Northern Star\'s whistle answers.',
      'It stays exactly where it is.',
    ],
    completesMystery: true,
  },
];
