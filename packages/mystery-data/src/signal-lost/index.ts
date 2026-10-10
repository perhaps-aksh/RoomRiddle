import type {Clue, Ending, MysteryDefinition, MysterySummary, Puzzle, Scene} from '@roomriddle/shared-types';
import {truth} from './truth';

/**
 * Signal Lost: a station that went silent after a warning, and a clock that lies by four minutes.
 * A technology mystery about reading evidence, not a guide to real systems. Source: vault §3.
 */
export const signalLost: MysterySummary = {
  id: 'signal-lost',
  title: 'Signal Lost',
  tagline: 'The station sent one warning. Then silence.',
  genre: 'Tech',
  synopsis:
    'At 10:16 PM the remote Northpoint station sends one short transmission and goes silent. ' +
    'The equipment is still running, the operator is gone, and the log makes no sense.',
  teaser: [
    '"Northpoint to Control. Signal received.',
    'Do not open the eastern relay."',
    '',
    'Then nothing.',
  ],
  atmosphere: ['Storm', 'Static', 'Remote station'],
  difficulty: 'Mystery',
  estimatedMinutes: 25,
  minPlayers: 2,
  maxPlayers: 6,
  motif: '10:16',
  availability: 'playable',
};

const intro = {
  title: 'Northpoint Communications Station · 11:05 PM',
  narration: [
    'A storm hammers the northern coast.',
    'At 10:16 PM, Control received one short, distorted message from Northpoint.',
    'Since then, nothing. No answer on any channel.',
    '',
    'You arrive with Detective Grace. The lights are on. The consoles are running.',
    'The operator, Nikhil Rao, is not here.',
    '',
    'Was the station attacked, sabotaged, or misunderstood?',
  ],
};

const scenes: Scene[] = [
  {
    id: 'radio-room',
    title: 'The Radio Room',
    subtitle: 'Northpoint · main console',
    narration: [
      'Green waveforms crawl across three old monitors.',
      'The operator\'s chair is pushed back. His mug is cold.',
      '',
      'On the recorder, a single reel waits to be played.',
    ],
    clueIds: ['final-transmission', 'signal-graph', 'empty-chair'],
    puzzleIds: ['decode-transmission'],
    nextSceneId: 'operations',
  },
  {
    id: 'operations',
    title: 'The Operations Desk',
    subtitle: 'Logs, clocks and the time source',
    narration: [
      'Every system here writes the time on everything it does.',
      'The trouble is deciding which clock to believe.',
    ],
    clueIds: ['console-log', 'fast-clock', 'time-source', 'maintenance-log'],
    puzzleIds: ['correct-timeline'],
    nextSceneId: 'relay-room',
  },
  {
    id: 'relay-room',
    title: 'The Eastern Relay',
    subtitle: 'Equipment room · east side',
    narration: [
      'A red lamp pulses over grey cabinets.',
      'One cabinet door hangs open. The air smells of hot dust.',
    ],
    clueIds: ['isolation-record', 'relay-board', 'wet-bootprints'],
    puzzleIds: ['shutdown-cause', 'final-explanation'],
  },
];

const clues: Clue[] = [
  {
    id: 'final-transmission',
    sceneId: 'radio-room',
    prompt: 'Play the last recording',
    title: 'The Final Transmission',
    description: [
      'Through crackling static, Nikhil\'s voice, steady and urgent:',
      '"Northpoint to Control. Signal received. Do not... open the eastern relay. Do not open the eastern relay."',
      'In the middle, the audio stutters, as if the timing is wrong.',
    ],
    major: true,
  },
  {
    id: 'signal-graph',
    sceneId: 'radio-room',
    prompt: 'Read the main monitor',
    title: 'The Signal Graph',
    description: [
      'The eastern relay\'s timing trace drifts further out of step with every cycle,',
      'then goes flat. The drift began well before the station went silent.',
    ],
    major: true,
  },
  {
    id: 'empty-chair',
    sceneId: 'radio-room',
    prompt: "Check the operator's desk",
    title: "The Operator's Desk",
    description: [
      'Headset on the desk. Coat hook empty. The storm torch is missing from its bracket.',
      'Nothing is broken. Nothing looks forced.',
    ],
  },
  {
    id: 'console-log',
    sceneId: 'operations',
    prompt: 'Print the console log',
    title: 'The Console Log',
    description: [
      '10:12 · RELAY E · TIMING WARNING (AUTO)',
      '10:16 · RELAY E · ISOLATED LOCALLY',
      '10:20 · TRANSMISSION SENT TO CONTROL',
      'Every time stamp comes from the station wall clock.',
    ],
    major: true,
  },
  {
    id: 'fast-clock',
    sceneId: 'operations',
    prompt: 'Compare the wall clock',
    title: 'The Wall Clock',
    description: [
      'The station wall clock reads 11:09.',
      'It drives the console\'s time stamps.',
    ],
    major: true,
  },
  {
    id: 'time-source',
    sceneId: 'operations',
    prompt: 'Check the time receiver',
    title: 'The Verified Time Source',
    description: [
      'A precision receiver locked to the national time signal. Green LED: LOCKED.',
      'It reads 11:05. The wall clock is exactly four minutes fast.',
    ],
  },
  {
    id: 'maintenance-log',
    sceneId: 'operations',
    prompt: 'Read the maintenance logbook',
    title: 'The Maintenance Log',
    description: [
      'Handwritten, by remote technician Tara Singh, timed by her own watch:',
      '"10:08 PM. Timing irregularities on relay E again. Requesting inspection. Do not reset blind. T.S."',
    ],
    major: true,
  },
  {
    id: 'isolation-record',
    sceneId: 'relay-room',
    prompt: 'Read the clipboard on the relay cabinet',
    title: 'The Isolation Record',
    description: [
      'A safety tag hangs on the big red switch, set to OFF.',
      '"Relay E isolated by hand. Timing circuit corrupting outbound signal. DO NOT RE-ENERGISE. N. Rao."',
    ],
    major: true,
  },
  {
    id: 'relay-board',
    sceneId: 'relay-room',
    prompt: 'Look inside the open cabinet',
    title: 'The Timing Board',
    description: [
      'One circuit board is browned and blistered around a small crystal oscillator.',
      'Heat damage, not a cut wire. No tool marks.',
    ],
  },
  {
    id: 'wet-bootprints',
    sceneId: 'relay-room',
    prompt: 'Follow the wet floor to the side door',
    title: 'Wet Boot Prints',
    description: [
      'One set of boot prints, leaving through the side door into the storm.',
      'A sign beside the door: "NORTH HUT · BACKUP ANTENNA · 400 m".',
    ],
  },
];

const hint = (puzzle: string, texts: [string, string, string]) =>
  texts.map((text, i) => ({id: `${puzzle}-${i + 1}`, text}));

const puzzles: Puzzle[] = [
  {
    id: 'decode-transmission',
    sceneId: 'radio-room',
    title: 'Decode the Transmission',
    prompt: ['A recording gives us words.', 'We still need to understand why they were spoken.'],
    question: 'Which transcript matches the recording?',
    input: {
      kind: 'choice',
      options: [
        {id: 'open', label: '"Open the eastern relay."'},
        {id: 'do-not-open', label: '"Do not open the eastern relay."'},
        {id: 'safe', label: '"The eastern relay is safe."'},
      ],
    },
    acceptedAnswers: ['do-not-open'],
    hints: hint('decode-transmission', [
      'Listen for the phrase repeated most clearly.',
      'The recording contains a warning, not an instruction to switch equipment on.',
      'The exact phrase is: "Do not open the eastern relay."',
    ]),
    points: 100,
    requires: {clueIds: ['final-transmission']},
    solvedText: ['The warning is clear.', 'Now find out what made it necessary.'],
  },
  {
    id: 'correct-timeline',
    sceneId: 'operations',
    title: 'Correct the Timeline',
    prompt: ['Once the clock is corrected, the warning and the fault fall into order.', 'Every console stamp needs the same correction.'],
    question: 'At what true time was relay E isolated? (HH:MM)',
    input: {kind: 'digits', length: 4},
    acceptedAnswers: ['10:12'],
    hints: hint('correct-timeline', [
      'The time shown on a device is not always the correct time.',
      'Compare the wall clock with the verified time source.',
      'Subtract four minutes from every station-clock reading.',
    ]),
    points: 100,
    requires: {clueIds: ['console-log', 'fast-clock', 'time-source']},
    solvedText: [
      '10:08: the timing warning, just as Tara logged it.',
      '10:12: the relay isolated by hand. 10:16: the warning sent, exactly when Control heard it.',
    ],
  },
  {
    id: 'shutdown-cause',
    sceneId: 'relay-room',
    title: 'Identify the Cause',
    prompt: ['A shutdown can be evidence of a failure,', 'or a deliberate attempt to stop one.'],
    question: 'What failed, and what did Nikhil do about it?',
    input: {
      kind: 'combination',
      fields: [
        {id: 'failed', label: 'What failed', options: [
          {id: 'timing', label: 'The relay timing circuit'},
          {id: 'power', label: 'The station power'},
          {id: 'antenna', label: 'The main antenna'},
          {id: 'intrusion', label: 'An outside intrusion'},
        ]},
        {id: 'action', label: 'What Nikhil did', options: [
          {id: 'opened', label: 'Opened the relay'},
          {id: 'isolated', label: 'Isolated the relay'},
          {id: 'deleted', label: 'Deleted the logs'},
          {id: 'fled', label: 'Abandoned the station'},
        ]},
      ],
    },
    acceptedAnswers: ['timing|isolated'],
    hints: hint('shutdown-cause', [
      'Look for a problem that appears before the station goes silent.',
      'Compare the signal graph with the earlier maintenance entry.',
      'The timing drift starts before the shutdown, and the relay record shows a local isolation.',
    ]),
    points: 100,
    requires: {clueIds: ['signal-graph', 'maintenance-log', 'isolation-record']},
    solvedText: ['The relay was failing, and Nikhil stopped it on purpose.', 'But why can\'t anyone reach him?'],
  },
  {
    id: 'final-explanation',
    sceneId: 'relay-room',
    title: 'Choose the Explanation',
    prompt: ['The log, the graph and the record agree.', 'What really happened at Northpoint?'],
    question: 'Which explanation fits every piece of evidence?',
    input: {
      kind: 'choice',
      options: [
        {id: 'intruder', label: 'An intruder broke in and shut the station down.'},
        {id: 'nikhil-isolated', label: 'Nikhil isolated a faulty relay after discovering timing drift, then warned Control not to reopen it.'},
        {id: 'tara-hoax', label: 'Tara sent a false warning to cause panic.'},
        {id: 'never-worked', label: 'The station was never operating correctly.'},
      ],
    },
    acceptedAnswers: ['nikhil-isolated'],
    hints: hint('final-explanation', [
      'Put the corrected times in order before you decide.',
      'Nothing was forced, and the only damage is heat on one board.',
      'The warning came from Nikhil, after he isolated the faulty relay himself.',
    ]),
    points: 150,
    requires: {puzzleIds: ['correct-timeline', 'shutdown-cause']},
    solvedText: [
      'The radio crackles. "Northpoint North Hut to Control. Backup link up. This is Nikhil Rao."',
      '"The relay was poisoning the signal. I shut it down and came out here to get you a clean line."',
    ],
    completesMystery: true,
  },
];

const endings: Ending[] = [
  {
    id: 'signal-restored',
    title: 'Signal Restored',
    tone: 'triumph',
    when: [{kind: 'puzzle-solved', puzzleId: 'final-explanation'}, {kind: 'major-clues-found'}, {kind: 'hints-used-at-most', count: 4}],
    narration: [
      "The signal wasn't a threat. It was a warning.",
      'The fast clock made the sequence look suspicious, but the log, the graph and the record agree:',
      'Nikhil stopped a failing relay before it sent more corrupted signals, then walked into the storm to restore a clean link.',
      '',
      'Relay E is tagged for repair. Northpoint is back on the air.',
    ],
  },
  {
    id: 'back-online',
    title: 'Back Online',
    tone: 'bittersweet',
    when: [{kind: 'puzzle-solved', puzzleId: 'final-explanation'}],
    narration: [
      'Northpoint reconnects, and Nikhil is safe.',
      '',
      'But parts of the evidence were missed, and the incident report will ask hard questions',
      'about why it took so long to trust the warning.',
    ],
  },
  {
    id: 'static',
    title: 'Static',
    tone: 'defeat',
    when: [],
    narration: [
      'At midnight Control orders the eastern relay reopened to restore the link.',
      'The corrupted signal floods the network for the rest of the night.',
      '',
      'The warning was there all along. Nobody believed it in time.',
    ],
  },
];

export const signalLostMystery: MysteryDefinition = {
  summary: signalLost,
  audience: {label: 'Teens & adults'},
  truth,
  intro,
  startSceneId: 'radio-room',
  scenes,
  clues,
  puzzles,
  endings,
  scoring: {puzzlePoints: 100, hintPenalty: 25, incorrectAttemptPenalty: 10, minPuzzlePoints: 25, clueDiscoveryPoints: 10, timeBonusPerMinute: 5},
  failure: {timeLimitMinutes: 30, maxIncorrectAttempts: 8},
};
