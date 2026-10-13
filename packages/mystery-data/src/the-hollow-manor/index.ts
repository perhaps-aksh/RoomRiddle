import type {Clue, Ending, MysteryDefinition, MysterySummary, Puzzle, Scene} from '@roomriddle/shared-types';
import {truth} from './truth';

/**
 * The Hollow Manor: a locked study, a moved portrait and a forgotten passage.
 * Not a haunting and not a murder: a historian racing to protect a record.
 * Source: vault "RoomRiddle Mysteries" §2.
 */
export const theHollowManor: MysterySummary = {
  id: 'the-hollow-manor',
  title: 'The Hollow Manor',
  tagline: 'No one left the room. So where did he go?',
  genre: 'Detective',
  ageGroup: 'teens',
  storyType: 'gothic',
  synopsis:
    'During a storm, historian Edmund Vale vanishes from his study, locked from the inside. ' +
    'A family document is missing too. Find out how he left, and why.',
  teaser: [
    'A storm over Hollow Manor.',
    'A study locked from the inside.',
    'A historian who was never seen leaving.',
    '',
    'And a family record that someone wanted lost.',
  ],
  atmosphere: ['Storm', 'Candlelight', 'Old house'],
  difficulty: 'Detective',
  estimatedMinutes: 25,
  minPlayers: 2,
  maxPlayers: 6,
  motif: 'LOCKED',
  availability: 'playable',
};

const intro = {
  title: 'Hollow Manor · Thursday · 10:40 PM',
  narration: [
    'Thunder rolls over the hill. The lights have failed twice tonight.',
    'An hour ago, Edmund Vale locked himself in his study to work.',
    'When his sister knocked, there was no answer.',
    '',
    'The door was forced. The key was still in the lock, on the inside.',
    'The room was empty.',
    '',
    'Find out how Edmund left, and why.',
  ],
};

const scenes: Scene[] = [
  {
    id: 'study',
    title: 'The Study',
    subtitle: "Edmund Vale's study · east wing",
    narration: [
      'Books from floor to ceiling. A cold lamp on the desk.',
      'The splintered door hangs open behind you.',
      '',
      'From the wall, a stern ancestor watches the room.',
    ],
    clueIds: ['locked-door', 'scrape-marks', 'dust-outline'],
    puzzleIds: ['impossible-room'],
    nextSceneId: 'passage',
  },
  {
    id: 'passage',
    title: 'The Passage',
    subtitle: 'Behind the portrait',
    narration: [
      'The portrait swings outward on hinges no one remembered.',
      'Behind it, a narrow stone passage breathes cold air.',
      '',
      'Footprints in the dust lead away into the dark.',
    ],
    clueIds: ['old-floor-plan', 'footprints', 'candle-stub'],
    puzzleIds: ['floor-plan'],
    nextSceneId: 'archive',
  },
  {
    id: 'archive',
    title: 'The Archive',
    subtitle: 'The family archive · below the library',
    narration: [
      'Drawers, ledgers and rolled documents, all under a century of dust.',
      'One lamp is lit. Someone was here minutes ago.',
    ],
    clueIds: ['catalogue-entry', 'modern-catalogue', 'archive-letter'],
    puzzleIds: ['restore-catalogue', 'final-theory'],
  },
];

const clues: Clue[] = [
  {
    id: 'locked-door',
    sceneId: 'study',
    prompt: 'Examine the forced door',
    title: 'The Locked Door',
    description: [
      'The key is still in the lock, turned from the inside.',
      'The bolt was thrown too. No one locked this door from the corridor.',
      'If Edmund left, it was not this way.',
    ],
    major: true,
  },
  {
    id: 'scrape-marks',
    sceneId: 'study',
    prompt: 'Look at the floor beneath the portrait',
    title: 'Scrape Marks',
    description: [
      'Fresh pale arcs in the floorboards, right under the great portrait.',
      'Something heavy has swung across this floor, more than once.',
    ],
    major: true,
  },
  {
    id: 'dust-outline',
    sceneId: 'study',
    prompt: 'Study the wall around the portrait',
    title: 'The Dust Outline',
    description: [
      'Beside the frame, a clean rectangle of wallpaper where the portrait usually hangs flat.',
      'Tonight it hangs crooked, a hand-width out from the wall.',
    ],
    major: true,
  },
  {
    id: 'old-floor-plan',
    sceneId: 'passage',
    prompt: 'Unroll the plan tucked into the wall niche',
    title: 'The Old Floor Plan',
    description: [
      'An 1840s builder\'s plan of the east wing, in faded brown ink.',
      'A thin double line runs from the study wall, behind the portrait,',
      'down a stair, and ends in the room beneath the library: the old archive.',
    ],
    major: true,
  },
  {
    id: 'footprints',
    sceneId: 'passage',
    prompt: 'Follow the footprints',
    title: 'Footprints in the Dust',
    description: [
      'One set, a man\'s slippers, going down only.',
      'No one has come back up this way.',
    ],
  },
  {
    id: 'candle-stub',
    sceneId: 'passage',
    prompt: 'Pick up the candle on the ledge',
    title: 'A Candle Stub',
    description: [
      'Still soft. Lit tonight and pinched out.',
      'It carries the same green wax as the candles on Edmund\'s desk.',
    ],
  },
  {
    id: 'catalogue-entry',
    sceneId: 'archive',
    prompt: 'Open the oldest catalogue',
    title: 'The 1871 Catalogue',
    description: [
      'Entry 214: "Charter of Hollow Manor, sealed 1702."',
      'Custodian: THE ASHWORTH FAMILY, in trust for the village of Hollow End.',
    ],
    major: true,
  },
  {
    id: 'modern-catalogue',
    sceneId: 'archive',
    prompt: 'Compare the modern catalogue',
    title: 'The Modern Catalogue',
    description: [
      'Entry 214: "Charter of Hollow Manor, sealed 1702."',
      'Custodian: THE VALE FAMILY. Private property.',
      'The ink of that line is newer than the rest of the page.',
    ],
  },
  {
    id: 'archive-letter',
    sceneId: 'archive',
    prompt: 'Read the letter under the lamp',
    title: "Edmund's Letter",
    description: [
      '"If you are reading this, you found the passage too.',
      'The charter was never ours. Someone rewrote the catalogue to make it so,',
      'and I fear the original will be burned before anyone can authenticate it.',
      'I have taken it somewhere safe. Forgive the theatre. E.V."',
    ],
    major: true,
  },
];

const hint = (puzzle: string, texts: [string, string, string]) =>
  texts.map((text, i) => ({id: `${puzzle}-${i + 1}`, text}));

const SIGNS = [
  {id: 'locked-door', label: 'The key in the lock'},
  {id: 'scrape-marks', label: 'Scrape marks under the portrait'},
  {id: 'dust-outline', label: 'The dust outline'},
  {id: 'cold-lamp', label: 'The cold lamp'},
];

const puzzles: Puzzle[] = [
  {
    id: 'impossible-room',
    sceneId: 'study',
    title: 'The Impossible Room',
    prompt: ['A locked room proves only that no one used the door.', 'Which two details say the room has another way out?'],
    question: 'Choose the two details that contradict "one entrance".',
    input: {
      kind: 'combination',
      fields: [
        {id: 'first', label: 'First detail', options: SIGNS},
        {id: 'second', label: 'Second detail', options: SIGNS},
      ],
    },
    acceptedAnswers: ['scrape-marks|dust-outline', 'dust-outline|scrape-marks'],
    hints: hint('impossible-room', [
      "A locked door doesn't prove that a room has no other exit.",
      'Look for signs that a large object has been moved.',
      "The portrait's dust outline and the scrape marks indicate a hidden opening.",
    ]),
    points: 100,
    requires: {clueIds: ['locked-door', 'scrape-marks', 'dust-outline']},
    solvedText: ['You pull the frame. It swings out on old hinges.', 'Behind it: cold air, and darkness.'],
  },
  {
    id: 'floor-plan',
    sceneId: 'passage',
    title: 'Read the Floor Plan',
    prompt: ['The builders drew what later owners forgot.', 'Where does this passage begin, and where does it end?'],
    question: 'Trace the passage on the old plan.',
    input: {
      kind: 'combination',
      fields: [
        {id: 'from', label: 'It starts behind', options: [
          {id: 'fireplace', label: 'The study fireplace'},
          {id: 'portrait', label: 'The study portrait'},
          {id: 'shelves', label: 'The library shelves'},
          {id: 'stairs', label: 'The main stairs'},
        ]},
        {id: 'to', label: 'It ends in', options: [
          {id: 'cellar', label: 'The wine cellar'},
          {id: 'chapel', label: 'The chapel'},
          {id: 'archive', label: 'The old archive'},
          {id: 'kitchen', label: 'The kitchen'},
        ]},
      ],
    },
    acceptedAnswers: ['portrait|archive'],
    hints: hint('floor-plan', [
      'Older buildings sometimes hide more than ordinary rooms.',
      'Compare the study wall with the room beneath the library.',
      'The double line starts behind the portrait and ends in the old archive.',
    ]),
    points: 100,
    requires: {clueIds: ['old-floor-plan']},
    solvedText: ['The passage is real, and it leads to the archive.', 'Now we must find out why Edmund used it.'],
  },
  {
    id: 'restore-catalogue',
    sceneId: 'archive',
    title: 'Restore the Catalogue',
    prompt: ['Two catalogues. One document. Two different owners.', 'What was changed, and who really held the charter?'],
    question: 'Which detail was altered, and who was the true custodian?',
    input: {
      kind: 'combination',
      fields: [
        {id: 'altered', label: 'Altered detail', options: [
          {id: 'date', label: 'The date sealed'},
          {id: 'custodian', label: 'The custodian'},
          {id: 'title', label: 'The title'},
          {id: 'number', label: 'The entry number'},
        ]},
        {id: 'true', label: 'True custodian', options: [
          {id: 'vale', label: 'The Vale family'},
          {id: 'ashworth', label: 'The Ashworth family'},
          {id: 'reed', label: 'The Reed family'},
          {id: 'crown', label: 'The Crown'},
        ]},
      ],
    },
    acceptedAnswers: ['custodian|ashworth'],
    hints: hint('restore-catalogue', [
      'The problem may be with the record, not the document.',
      'Compare the date and the custodian in each version.',
      'The earliest record names a different custodian than the modern catalogue.',
    ]),
    points: 100,
    requires: {clueIds: ['catalogue-entry', 'modern-catalogue']},
    solvedText: [
      'Someone rewrote one line to make a village trust into private property.',
      'That gives Edmund a reason to protect the original.',
    ],
  },
  {
    id: 'final-theory',
    sceneId: 'archive',
    title: 'Explain the Disappearance',
    prompt: ['Every clue points one way.', 'What happened to Edmund Vale?'],
    question: 'Which explanation does the evidence support?',
    input: {
      kind: 'choice',
      options: [
        {id: 'kidnapped', label: 'Someone entered through the passage and took Edmund away.'},
        {id: 'protected', label: 'Edmund used the forgotten passage to take the original charter somewhere safe before it could be destroyed.'},
        {id: 'fled', label: 'Edmund stole the charter to sell it and ran into the storm.'},
        {id: 'never-there', label: 'Edmund was never in the study; the locked door was staged by the family.'},
      ],
    },
    acceptedAnswers: ['protected'],
    hints: hint('final-theory', [
      'Read Edmund\'s own words before you judge him.',
      'The footprints only go down, and the letter says why.',
      'He took the charter to keep it safe, not to sell it, and no one else used the passage.',
    ]),
    points: 150,
    requires: {puzzleIds: ['restore-catalogue'], clueIds: ['archive-letter']},
    solvedText: [
      'Behind the last cabinet, a narrow door. Edmund Vale steps out, the charter in a leather case.',
      '"I had to be sure someone would come looking for the truth, and not just for me."',
    ],
    completesMystery: true,
  },
];

const endings: Ending[] = [
  {
    id: 'the-preserved-record',
    title: 'The Preserved Record',
    tone: 'triumph',
    when: [{kind: 'puzzle-solved', puzzleId: 'final-theory'}, {kind: 'major-clues-found'}, {kind: 'hints-used-at-most', count: 4}],
    narration: [
      "The room wasn't impossible to escape. It was built with a passage later generations forgot.",
      'Edmund found that one line in the catalogue had been rewritten,',
      'turning a village trust into private property, and he moved the original before it could vanish.',
      '',
      'At dawn the charter goes to the county archive for authentication.',
      'What looked like a disappearance was a race to preserve the truth.',
    ],
  },
  {
    id: 'the-found-historian',
    title: 'The Found Historian',
    tone: 'bittersweet',
    when: [{kind: 'puzzle-solved', puzzleId: 'final-theory'}],
    narration: [
      'Edmund is safe and the charter survives the night.',
      '',
      'But some of the evidence slipped past you,',
      'and the question of who rewrote the catalogue will be argued over for months.',
    ],
  },
  {
    id: 'the-storm-passes',
    title: 'The Storm Passes',
    tone: 'defeat',
    when: [],
    narration: [
      'By morning the storm has gone, and so has the trail.',
      'The study is cleaned, the portrait straightened,',
      'and a thin column of smoke rises from the kitchen chimney.',
      '',
      'Whatever the charter said, no one will read it now.',
    ],
  },
];

export const theHollowManorMystery: MysteryDefinition = {
  summary: theHollowManor,
  audience: {label: 'Teens & adults'},
  truth,
  intro,
  startSceneId: 'study',
  scenes,
  clues,
  puzzles,
  endings,
  scoring: {puzzlePoints: 100, hintPenalty: 25, incorrectAttemptPenalty: 10, minPuzzlePoints: 25, clueDiscoveryPoints: 10, timeBonusPerMinute: 5},
  failure: {timeLimitMinutes: 30, maxIncorrectAttempts: 8},
};
