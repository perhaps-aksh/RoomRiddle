import type {Clue, Ending, MysteryDefinition, MysterySummary, MysteryTruth, Puzzle, Scene} from '@roomriddle/shared-types';

/**
 * The Yaksha's Three Questions: a calm, cooperative case for all ages, inspired by the
 * Yaksha Prashna episode of the Mahabharata. The questions, inscriptions and puzzles are
 * original and fictional; nothing here is presented as scripture. Untimed, no penalties.
 * Source: vault §5.
 */
export const theYakshasQuestions: MysterySummary = {
  id: 'the-yakshas-questions',
  title: "The Yaksha's Three Questions",
  tagline: 'A guardian, a lake, and three questions.',
  genre: 'Family story',
  synopsis:
    'At sunrise, travellers reach a quiet forest lake. A calm guardian, the Yaksha, ' +
    'asks three questions. Observe, think, and answer together.',
  teaser: [
    'A forest lake at sunrise.',
    'A guardian who asks, and waits.',
    '',
    'There is no hurry. Only careful answers.',
  ],
  atmosphere: ['Sunrise', 'Forest lake', 'Reflection'],
  difficulty: 'All ages',
  estimatedMinutes: 15,
  minPlayers: 1,
  maxPlayers: 6,
  motif: '?',
  availability: 'playable',
};

const intro = {
  title: 'The forest lake · sunrise',
  narration: [
    'Mist rests on still water. Lotus flowers open in the first light.',
    'Three travellers have walked all night to reach this lake.',
    '',
    'Beside a carved stone pavilion, a tall figure waits: the Yaksha, guardian of this place.',
    '"The path beyond the lake opens for those who pay attention," the Yaksha says.',
    '"I will ask three questions. Take your time."',
  ],
};

const scenes: Scene[] = [
  {
    id: 'forest',
    title: 'The Forest Path',
    subtitle: 'The first question',
    narration: [
      'Two travellers argue. One says the path is blocked. The other says it is open.',
      '"A question is not always answered by the first voice you hear," says the Yaksha.',
    ],
    clueIds: ['two-accounts', 'footprints', 'direction-marker', 'lotus-inscription'],
    puzzleIds: ['question-one'],
    nextSceneId: 'lake',
  },
  {
    id: 'lake',
    title: 'The Lake Shore',
    subtitle: 'The second question',
    narration: [
      'Near the water lies a bundle of old palm leaves, edges curling in the damp air.',
      '"A choice can be quick and still be unwise," says the Yaksha.',
    ],
    clueIds: ['fragile-manuscript', 'river-inscription', 'caretaker-sign'],
    puzzleIds: ['question-two'],
    nextSceneId: 'pavilion',
  },
  {
    id: 'pavilion',
    title: 'The Pavilion',
    subtitle: 'The third question',
    narration: [
      'Inside the pavilion stand three inscription stones, and a carved back wall.',
      'Each traveller has noticed something different.',
      '"One person may see a part of the truth," says the Yaksha. "What happens when the parts are brought together?"',
    ],
    clueIds: ['lamp-inscription', 'travellers-observations', 'four-symbol-panel', 'caretaker-manuscript'],
    puzzleIds: ['question-three', 'final-panel'],
  },
];

const clues: Clue[] = [
  {id: 'two-accounts', sceneId: 'forest', prompt: 'Listen to the two travellers', title: 'Two Accounts', description: ['Dev: "The path is blocked by a fallen tree. I am sure of it."', 'Anaya: "No, it is open! I saw light through the trees."']},
  {id: 'footprints', sceneId: 'forest', prompt: 'Look at the ground', title: 'Footprints', description: ['Fresh footprints lead along the path, around a fallen branch, and on toward the lake.', 'Someone walked through this morning.'], major: true},
  {id: 'direction-marker', sceneId: 'forest', prompt: 'Read the carved marker', title: 'The Direction Marker', description: ['A small carved stone with an arrow pointing down the path: "To the lake."', 'Moss has been brushed off it recently.'], major: true},
  {id: 'lotus-inscription', sceneId: 'forest', prompt: 'Look at the flower carving on the marker', title: 'The Lotus Inscription', description: ['A lotus is carved at the top of the marker.', 'The same lotus appears on the pavilion wall across the lake.'], major: true},
  {id: 'fragile-manuscript', sceneId: 'lake', prompt: 'Look at the bundle of palm leaves', title: 'The Fragile Manuscript', description: ['Old palm-leaf pages, tied with faded cord.', 'The edges are crumbling. One more splash of water could ruin them.'], major: true},
  {id: 'river-inscription', sceneId: 'lake', prompt: 'Read the stone by the water', title: 'The River Inscription', description: ['Carved beside wavy lines: "Look before you cross. Look again before you decide."'], major: true},
  {id: 'caretaker-sign', sceneId: 'lake', prompt: 'Notice the small hut by the trees', title: "The Caretaker's Hut", description: ['A small hut with a sign: "Caretaker. Keeper of old writings."', 'A dry wooden box sits by the door.']},
  {id: 'lamp-inscription', sceneId: 'pavilion', prompt: 'Read the third stone', title: 'The Lamp Inscription', description: ['Beside a carved lamp: "A quick step is easy. Seeing where it leads takes light."'], major: true},
  {id: 'travellers-observations', sceneId: 'pavilion', prompt: 'Ask each traveller what they noticed', title: "The Travellers' Observations", description: ['Anaya noticed the lotus again and again. Dev noticed the river lines.', 'The grandmother noticed the lamp. Nobody has all of it alone.']},
  {id: 'four-symbol-panel', sceneId: 'pavilion', prompt: 'Look at the carved back wall', title: 'The Four-Symbol Panel', description: ['Four empty slots in the wall, shaped like a lotus, waves, a lamp and a sun.', 'Matching stone tiles lie in a basket below.'], major: true},
  {id: 'caretaker-manuscript', sceneId: 'pavilion', prompt: 'Read the note revealed in the alcove', title: "The Caretaker's Manuscript", description: ['"This pavilion was built as a place for reflection. Those who look, consider, and listen to each other', 'may set the stones in order and read what we kept safe."'], requires: {puzzleIds: ['question-three']}},
];

const hint = (puzzle: string, texts: [string, string, string]) => texts.map((text, i) => ({id: `${puzzle}-${i + 1}`, text}));
const SYMBOLS = [
  {id: 'lotus', label: 'Lotus'},
  {id: 'river', label: 'River'},
  {id: 'lamp', label: 'Lamp'},
  {id: 'sun', label: 'Sun'},
];

const puzzles: Puzzle[] = [
  {
    id: 'question-one',
    sceneId: 'forest',
    title: 'Question One',
    prompt: ['Two travellers disagree about the path.', '"What should you do before deciding?"'],
    question: 'What is the best next step?',
    input: {kind: 'choice', options: [
      {id: 'first', label: 'Believe the first traveller.'},
      {id: 'louder', label: 'Follow whoever is louder.'},
      {id: 'examine', label: 'Examine the footprints and the marker before deciding.'},
      {id: 'guess', label: 'Ignore the clues and guess.'},
    ]},
    acceptedAnswers: ['examine'],
    hints: hint('question-one', [
      'You have more than one account. What could help you check them?',
      'Look at the physical evidence near the path.',
      'Inspect the footprints and the direction marker before choosing.',
    ]),
    points: 100,
    requires: {clueIds: ['direction-marker']},
    solvedText: ['"You looked before deciding," says the Yaksha. "Continue."'],
  },
  {
    id: 'question-two',
    sceneId: 'lake',
    title: 'Question Two',
    prompt: ['The manuscript is old and fragile.', '"Which choice protects what matters?"'],
    question: 'What should be done with the manuscript?',
    input: {kind: 'choice', options: [
      {id: 'carry', label: 'Carry it through the water right away.'},
      {id: 'leave', label: 'Leave it where it is and keep exploring.'},
      {id: 'preserve', label: 'Ask the caretaker to record it and keep it safe.'},
      {id: 'souvenir', label: 'Take one page as a keepsake.'},
    ]},
    acceptedAnswers: ['preserve'],
    hints: hint('question-two', [
      'Think about what could be lost if you act carelessly.',
      'The manuscript is fragile, and the caretaker knows how to protect old writings.',
      'Choose the option that protects the manuscript and lets it be recorded.',
    ]),
    points: 100,
    requires: {clueIds: ['fragile-manuscript']},
    solvedText: ['"You thought about what could be lost before you acted," says the Yaksha.'],
  },
  {
    id: 'question-three',
    sceneId: 'pavilion',
    title: 'Question Three',
    prompt: ['Each traveller noticed something different.', '"How should the group settle a disagreement?"'],
    question: 'What should the group do?',
    input: {kind: 'choice', options: [
      {id: 'first-decides', label: 'Let the first person decide.'},
      {id: 'ignore', label: "Ignore the others' observations."},
      {id: 'combine', label: 'Put everyone\'s observations together and compare them with the inscriptions.'},
      {id: 'random', label: 'Pick an answer at random.'},
    ]},
    acceptedAnswers: ['combine'],
    hints: hint('question-three', [
      'Nobody here saw everything. Who saw what?',
      'The repeated symbols may connect their observations.',
      'Put the lotus, river and lamp observations together and compare them with the panel.',
    ]),
    points: 100,
    requires: {clueIds: ['lotus-inscription', 'river-inscription', 'lamp-inscription']},
    solvedText: ['"You brought together what each of you noticed," says the Yaksha.', 'In the wall, a small alcove slides open.'],
  },
  {
    id: 'final-panel',
    sceneId: 'pavilion',
    title: 'The Purpose of the Pavilion',
    prompt: ['The caretaker left a pattern to follow.', 'Set the four stones in order.'],
    question: 'Place the symbols from first to last.',
    input: {kind: 'combination', fields: [
      {id: 'first', label: 'First', options: SYMBOLS},
      {id: 'second', label: 'Second', options: SYMBOLS},
      {id: 'third', label: 'Third', options: SYMBOLS},
      {id: 'fourth', label: 'Last', options: SYMBOLS},
    ]},
    acceptedAnswers: ['lotus|river|lamp|sun'],
    hints: hint('final-panel', [
      'The inscriptions gave you a pattern: you met them in an order.',
      'Lotus at the forest, river at the lake, lamp in the pavilion. What rises at the end of the night?',
      'Arrange them as lotus, river, lamp, sun.',
    ]),
    points: 150,
    requires: {clueIds: ['four-symbol-panel', 'caretaker-manuscript'], puzzleIds: ['question-three']},
    solvedText: ['As the last stone settles, sunlight fills the pavilion.'],
    completesMystery: true,
  },
];

const endings: Ending[] = [
  {
    id: 'complete-reflection',
    title: 'Complete Reflection',
    tone: 'triumph',
    when: [{kind: 'puzzle-solved', puzzleId: 'final-panel'}, {kind: 'major-clues-found'}],
    narration: [
      '"You observed before deciding," says the Yaksha,',
      '"considered the consequences of your actions, and combined what others noticed.',
      'The path was not hidden to keep knowledge away from you.',
      'It was preserved for those willing to approach it with care."',
      '',
      'The manuscript goes to the caretaker. The path beyond the lake is open.',
      'Which clue changed your mind today?',
    ],
  },
  {
    id: 'the-path-opens',
    title: 'The Path Opens',
    tone: 'triumph',
    when: [{kind: 'puzzle-solved', puzzleId: 'final-panel'}],
    narration: [
      'The pavilion glows in the morning sun and the path beyond the lake opens.',
      'Some of the inscriptions are still waiting to be read. You are welcome to return.',
    ],
  },
  {
    id: 'rest-by-the-lake',
    title: 'Rest by the Lake',
    tone: 'bittersweet',
    when: [],
    narration: ['The Yaksha nods. "There is no hurry. The lake will be here when you return."'],
  },
];

const truth: MysteryTruth = {
  narratorId: 'narrator',
  solution: [
    'The pavilion is a place for reflection built by old caretakers. Its three questions ask travellers to observe before deciding, to consider consequences before acting, and to combine what each person noticed.',
    'The four symbols are set lotus, river, lamp, sun, the order in which the travellers met them. This order is an original fiction of this game, not a scriptural sequence.',
  ],
  characters: [
    {
      id: 'narrator',
      name: 'The Narrator',
      role: 'Storyteller',
      persona: 'Warm, unhurried storyteller suitable for all ages. Respectful about the Mahabharata; clearly says the puzzles are original.',
      interviewable: false,
      facts: [
        {id: 'yq-nar-source', kind: 'truth', text: 'This story is inspired by the Yaksha Prashna, an episode of the Mahabharata, but its questions and puzzles are original.'},
      ],
    },
    {
      id: 'yaksha',
      name: 'The Yaksha',
      role: 'Guardian of the lake',
      persona: 'Calm, dignified, kind and mysterious. Speaks in short, gentle sentences. Never threatens, never mocks a wrong answer; invites another look instead. Never quotes scripture as fact.',
      interviewable: true,
      facts: [
        {id: 'yq-yaksha-guard', kind: 'truth', text: 'I keep this place for those who pay attention.'},
        {id: 'yq-yaksha-time', kind: 'truth', text: 'There is no hurry here. A careful answer is better than a fast one.'},
        {id: 'yq-yaksha-purpose', kind: 'secret', text: 'The pavilion was built to teach reflection, not to keep anyone out.', unlockedBy: {puzzleIds: ['question-three']}},
      ],
    },
    {
      id: 'anaya-traveller',
      name: 'Anaya',
      role: 'Young traveller',
      persona: 'Curious, cheerful, about twelve; quick to notice pictures and shapes.',
      interviewable: true,
      facts: [
        {id: 'yq-anaya-open', kind: 'claim', text: 'The path is open! I saw light through the trees.'},
        {id: 'yq-anaya-lotus', kind: 'truth', text: 'I keep seeing a lotus everywhere we go.', unlockedBy: {clueIds: ['lotus-inscription']}},
      ],
    },
    {
      id: 'dev-traveller',
      name: 'Dev',
      role: 'Traveller',
      persona: 'Kind but stubborn, sure of himself at first, happy to be corrected.',
      interviewable: true,
      facts: [
        {id: 'yq-dev-blocked', kind: 'claim', false: true, text: 'The path is blocked by a fallen tree. I am sure of it.'},
        {id: 'yq-dev-river', kind: 'truth', text: 'I noticed the river lines on the stone by the water.', unlockedBy: {clueIds: ['river-inscription']}},
      ],
    },
    {
      id: 'elder',
      name: 'Grandmother',
      role: 'Eldest traveller',
      persona: 'Gentle, wise, patient, a little humorous. Encourages everyone to speak.',
      interviewable: true,
      facts: [
        {id: 'yq-elder-listen', kind: 'truth', text: 'When we disagree, we should each say what we saw.'},
        {id: 'yq-elder-lamp', kind: 'truth', text: 'I noticed the lamp carved on the third stone.', unlockedBy: {clueIds: ['lamp-inscription']}},
      ],
    },
  ],
  guarded: [
    {terms: ['examine the footprints', 'check the marker'], until: {puzzleIds: ['question-one']}},
    {terms: ['give it to the caretaker', 'ask the caretaker'], until: {puzzleIds: ['question-two']}},
    {terms: ['combine', 'put them together'], until: {puzzleIds: ['question-three']}},
    {terms: ['lotus river lamp sun', 'lotus, river, lamp, sun'], until: {puzzleIds: ['final-panel']}},
  ],
  offLimits: ['religious doctrine presented as fact', 'quoting or paraphrasing scripture as the answer', 'disrespect toward any faith', 'frightening or threatening language'],
};

export const theYakshasQuestionsMystery: MysteryDefinition = {
  summary: theYakshasQuestions,
  audience: {
    label: 'All ages',
    contentNote: [
      'This story is inspired by the Yaksha Prashna, an episode of the Mahabharata.',
      'Its questions, inscriptions and puzzles are original and fictional, made for this game.',
      'It is offered with respect, for players of every faith and none.',
    ],
  },
  truth,
  intro,
  startSceneId: 'forest',
  scenes,
  clues,
  puzzles,
  endings,
  scoring: {puzzlePoints: 100, hintPenalty: 0, incorrectAttemptPenalty: 0, minPuzzlePoints: 100, clueDiscoveryPoints: 10, timeBonusPerMinute: 0},
};
