import type {Clue, Ending, MysteryDefinition, MysterySummary, Puzzle, Scene, MysteryTruth} from '@roomriddle/shared-types';

/**
 * The Forgotten Temple: four carved symbols lead to an archive hidden to protect manuscripts.
 * Family case (8+): untimed, no penalty for a wrong answer, ends with a preservation choice.
 * Source: vault §4. Treats the temple as architecture and history; worship is never a puzzle.
 */
export const theForgottenTemple: MysterySummary = {
  id: 'the-forgotten-temple',
  title: 'The Forgotten Temple',
  tagline: 'The builders left a path. Can you read it?',
  genre: 'Family',
  synopsis:
    'An old temple is being prepared for an exhibition. A carved panel of four symbols ' +
    'hints at a hidden archive. Follow the builders\' clues to find it, without damaging a thing.',
  teaser: [
    'A lotus. A river. A lamp. A sun.',
    '',
    'Four carvings, left on purpose,',
    'for someone patient enough to follow them.',
  ],
  atmosphere: ['Sunlit stone', 'Carvings', 'Discovery'],
  difficulty: 'Family',
  estimatedMinutes: 20,
  minPlayers: 1,
  maxPlayers: 6,
  motif: '◐',
  availability: 'playable',
};

const intro = {
  title: 'The temple courtyard · Saturday · 9:10 AM',
  narration: [
    'Morning sun warms the old stone. Birds call from the trees.',
    'The temple is being prepared for a history exhibition.',
    '',
    'Curator Anaya Rao has found something unexpected:',
    'a carved panel of four symbols, and a line that speaks of "a path for future caretakers".',
    '',
    'Help her read the builders\' clues.',
  ],
};

const scenes: Scene[] = [
  {
    id: 'courtyard',
    title: 'The Courtyard',
    subtitle: 'Entrance panel and research table',
    narration: ['The carved panel sits on a low wall, worn but clear.', 'Beside it, Anaya\'s research table is covered in notes.'],
    clueIds: ['stone-panel', 'lotus-symbol', 'reference-panel', 'curator-note'],
    puzzleIds: ['match-symbols'],
    nextSceneId: 'colonnade',
  },
  {
    id: 'colonnade',
    title: 'The Colonnade',
    subtitle: 'Pillars toward the eastern courtyard',
    narration: ['Rows of carved pillars march toward the east.', 'Sunbeams cross the floor between them.'],
    clueIds: ['river-motif', 'lamp-motif', 'inscription'],
    puzzleIds: ['follow-sequence'],
    nextSceneId: 'archive-wall',
  },
  {
    id: 'archive-wall',
    title: 'The Archive Wall',
    subtitle: 'The quiet end of the eastern courtyard',
    narration: ['A long wall of carved panels.', 'One of them is not just decoration.'],
    clueIds: ['sun-motif', 'wall-panels'],
    puzzleIds: ['find-entrance'],
    nextSceneId: 'chamber',
  },
  {
    id: 'chamber',
    title: 'The Manuscript Chamber',
    subtitle: 'Behind the sun panel',
    narration: ['Cool, dry air. A shaft of sunlight from above.', 'Shelves of palm-leaf manuscripts, wrapped in cloth, waiting.'],
    clueIds: ['manuscripts', 'flood-marks'],
    puzzleIds: ['preserve-archive'],
  },
];

const clues: Clue[] = [
  {id: 'stone-panel', sceneId: 'courtyard', prompt: 'Look closely at the carved panel', title: 'The Carved Panel', description: ['Four carvings in a row: a flower, three wavy lines, a small flame, and a circle with rays.', 'Above them, a line of carved writing.'], major: true},
  {id: 'lotus-symbol', sceneId: 'courtyard', prompt: 'Read the line beside the flower', title: 'The Lotus Symbol', description: ['Anaya translates: "Where the journey begins, the flower opens."', 'The lotus marks the start.'], major: true},
  {id: 'reference-panel', sceneId: 'courtyard', prompt: 'Open the illustrated reference panel', title: 'The Reference Panel', description: ['Four drawings for visitors: a lotus on a pond, a flowing river, a clay oil lamp, and the morning sun.', 'Each one has the same outline as one carving.']},
  {id: 'curator-note', sceneId: 'courtyard', prompt: "Read the curator's note", title: "The Curator's Note", description: ['From an old temple record: "In the years of great floods, the caretakers moved the writings to a dry room', 'and left a path in stone, so those who came later could find them again."'], major: true},
  {id: 'river-motif', sceneId: 'colonnade', prompt: 'Inspect the second pillar', title: 'The River Motif', description: ['Three carved wave lines on pillar two, all flowing the same way: east.'], major: true},
  {id: 'lamp-motif', sceneId: 'colonnade', prompt: 'Look at the eastern pillar', title: 'The Lamp Motif', description: ['A small lamp flame carved beside a tiny doorway.', 'It points toward the long wall at the end of the courtyard.'], major: true},
  {id: 'inscription', sceneId: 'colonnade', prompt: 'Read the inscription with arrows', title: 'The Inscription', description: ['Anaya reads it aloud: "Begin with the flower. Follow the water. Carry the light. Arrive with the sun."', 'Small carved arrows link the four symbols.']},
  {id: 'sun-motif', sceneId: 'archive-wall', prompt: 'Find the sun carving', title: 'The Sun Motif', description: ['A sun with long rays. Its centre is worn smooth, as if many hands pressed it over the years.', 'It sits right beside the last line of the inscription.'], major: true},
  {id: 'wall-panels', sceneId: 'archive-wall', prompt: 'Compare the other panels', title: 'The Other Panels', description: ['A moon panel, a star panel, and an elephant panel.', 'All beautiful. None of them is worn at the centre.']},
  {id: 'manuscripts', sceneId: 'chamber', prompt: 'Look at the shelves', title: 'The Manuscripts', description: ['Hundreds of palm-leaf pages, tied with cord. Some edges crumble at a touch.', 'They have survived because this room stayed dry.']},
  {id: 'flood-marks', sceneId: 'chamber', prompt: 'Look at the outer wall', title: 'Old Flood Marks', description: ['Outside this room, faint water lines stain the stone at waist height.', 'Inside, the walls are clean. The builders chose this place well.']},
];

const hint = (puzzle: string, texts: [string, string, string]) => texts.map((text, i) => ({id: `${puzzle}-${i + 1}`, text}));
const MEANINGS = [
  {id: 'lotus', label: 'Lotus'},
  {id: 'river', label: 'River'},
  {id: 'lamp', label: 'Lamp'},
  {id: 'sun', label: 'Sun'},
];

const puzzles: Puzzle[] = [
  {
    id: 'match-symbols',
    sceneId: 'courtyard',
    title: 'Match the Symbols',
    prompt: ['The builders left us a way to understand this place.', "Let's observe before we guess."],
    question: 'Match each carving to its picture.',
    input: {kind: 'combination', fields: [
      {id: 'flower', label: 'Flower carving', options: MEANINGS},
      {id: 'waves', label: 'Wave carving', options: MEANINGS},
      {id: 'flame', label: 'Flame carving', options: MEANINGS},
      {id: 'rays', label: 'Rays carving', options: MEANINGS},
    ]},
    acceptedAnswers: ['lotus|river|lamp|sun'],
    hints: hint('match-symbols', [
      'Look for repeated shapes in the carvings.',
      'Compare the outlines with the drawings on the reference panel.',
      'The flower is the lotus, the waves are the river, the flame is the lamp, and the rays are the sun.',
    ]),
    points: 100,
    requires: {clueIds: ['stone-panel', 'reference-panel']},
    solvedText: ['Good. Now we know what each symbol means.'],
  },
  {
    id: 'follow-sequence',
    sceneId: 'colonnade',
    title: 'Follow the Sequence',
    prompt: ['The inscription connects the symbols.', 'Put them in the order it describes.'],
    question: 'Which symbol comes first, second, third and last?',
    input: {kind: 'combination', fields: [
      {id: 'first', label: 'First', options: MEANINGS},
      {id: 'second', label: 'Second', options: MEANINGS},
      {id: 'third', label: 'Third', options: MEANINGS},
      {id: 'fourth', label: 'Last', options: MEANINGS},
    ]},
    acceptedAnswers: ['lotus|river|lamp|sun'],
    hints: hint('follow-sequence', [
      'The symbols are connected by the inscription.',
      'Look for the line that tells you where the journey begins.',
      "The inscription's arrows show lotus first, then river, lamp, and sun.",
    ]),
    points: 100,
    requires: {clueIds: ['inscription', 'lotus-symbol'], puzzleIds: ['match-symbols']},
    solvedText: ['The sequence leads from the courtyard toward the archive wall.'],
  },
  {
    id: 'find-entrance',
    sceneId: 'archive-wall',
    title: 'Find the Archive Entrance',
    prompt: ['The last symbol should lead us to the next place.'],
    question: 'Which panel hides the entrance?',
    input: {kind: 'choice', options: [
      {id: 'moon', label: 'The moon panel'},
      {id: 'sun', label: 'The sun panel with the worn centre'},
      {id: 'star', label: 'The star panel'},
      {id: 'elephant', label: 'The elephant panel'},
    ]},
    acceptedAnswers: ['sun'],
    hints: hint('find-entrance', [
      'The last symbol in the sequence should help us find the next location.',
      'Look for the sun carving with the unusual centre.',
      'Choose the sun panel beside the final inscription.',
    ]),
    points: 100,
    requires: {clueIds: ['sun-motif'], puzzleIds: ['follow-sequence']},
    solvedText: ['Anaya presses the worn centre. With a soft grind of stone, the panel slides aside.', "This isn't a random decoration. It matches the end of our sequence."],
  },
  {
    id: 'preserve-archive',
    sceneId: 'chamber',
    title: 'Preserve the Archive',
    prompt: ['We found it. Now the most important decision.', 'What should we do with the manuscripts?'],
    question: 'What is the right next step?',
    input: {kind: 'choice', options: [
      {id: 'remove', label: 'Carry everything out right now.'},
      {id: 'open', label: 'Leave the chamber open for visitors today.'},
      {id: 'document', label: 'Record the find and let the curator preserve the manuscripts.'},
      {id: 'souvenir', label: 'Take one page as a souvenir.'},
    ]},
    acceptedAnswers: ['document'],
    hints: hint('preserve-archive', [
      'Think about why the builders hid these pages in the first place.',
      'The pages are fragile. Who here knows how to protect them?',
      'Choose the option that protects the manuscripts and lets them be documented.',
    ]),
    points: 150,
    requires: {clueIds: ['manuscripts']},
    solvedText: ['Anaya smiles. "Then they will last another few hundred years."'],
    completesMystery: true,
  },
];

const endings: Ending[] = [
  {
    id: 'archive-guardians',
    title: 'Archive Guardians',
    tone: 'triumph',
    when: [{kind: 'puzzle-solved', puzzleId: 'preserve-archive'}, {kind: 'major-clues-found'}],
    narration: [
      'The symbols were a guide, not a trap.',
      'The builders hid the archive to keep it safe from floods,',
      'and by reading their carvings carefully you found it without harming a single page.',
      '',
      'Every symbol found. Every page protected. Thank you, archive guardians.',
    ],
  },
  {
    id: 'archive-found',
    title: 'The Archive Found',
    tone: 'triumph',
    when: [{kind: 'puzzle-solved', puzzleId: 'preserve-archive'}],
    narration: [
      'The manuscripts are safe, and the curators will study them for years.',
      'A few of the builders\' clues are still waiting on the walls. Come back and find them all.',
    ],
  },
  {
    id: 'the-temple-waits',
    title: 'The Temple Waits',
    tone: 'bittersweet',
    when: [],
    narration: ['The sun moves on. The carvings keep their secret a little longer.', 'The temple will be here when you are ready to try again.'],
  },
];

const truth: MysteryTruth = {
  narratorId: 'anaya',
  solution: [
    'In a time of great floods, the temple caretakers moved the palm-leaf manuscripts into a dry chamber and hid its entrance behind the sun panel.',
    'They left a path in stone for future caretakers: lotus (start), river (pillar two, flowing east), lamp (pointing to the wall), sun (the panel with the worn centre).',
    'The right ending is to document and preserve the manuscripts, not to take them.',
  ],
  characters: [
    {
      id: 'anaya',
      name: 'Anaya Rao',
      role: 'Curator',
      persona: 'Warm, curious, encouraging; speaks simply for children and adults alike. Loves history, never preachy.',
      interviewable: true,
      facts: [
        {id: 'ft-anaya-exhibit', kind: 'truth', text: 'We are preparing the temple for a history exhibition.'},
        {id: 'ft-anaya-path', kind: 'truth', text: 'The line above the panel speaks of a path left for future caretakers.'},
        {id: 'ft-anaya-flood', kind: 'secret', text: 'The old record says the writings were moved during years of floods.', unlockedBy: {clueIds: ['curator-note']}},
      ],
    },
    {
      id: 'dev-sharma',
      name: 'Dev Sharma',
      role: 'Temple archivist',
      persona: 'Gentle, thoughtful elder. Explains history slowly and kindly. Cares deeply about fragile things.',
      interviewable: true,
      facts: [
        {id: 'ft-dev-records', kind: 'truth', text: 'Our records mention manuscripts that were never found after the floods.'},
        {id: 'ft-dev-care', kind: 'truth', text: 'Palm leaves crumble if they are handled carelessly or get damp.'},
        {id: 'ft-dev-sequence', kind: 'secret', text: 'The inscription reads like a journey: begin, follow, carry, arrive.', unlockedBy: {clueIds: ['inscription']}},
      ],
    },
    {
      id: 'meera',
      name: 'Meera',
      role: 'Young research assistant',
      persona: 'Excited, quick, notices visual details; speaks like a bright teenager.',
      interviewable: true,
      facts: [
        {id: 'ft-meera-shapes', kind: 'truth', text: 'I keep seeing the same shapes on different walls!'},
        {id: 'ft-meera-waves', kind: 'secret', text: 'The waves on pillar two all flow the same way, toward the east.', unlockedBy: {clueIds: ['river-motif']}},
        {id: 'ft-meera-worn', kind: 'secret', text: 'Only one carving on the far wall looks touched a lot: the sun.', unlockedBy: {clueIds: ['sun-motif']}},
      ],
    },
  ],
  guarded: [
    {terms: ['lotus river lamp sun', 'lotus, river, lamp, sun'], until: {puzzleIds: ['follow-sequence']}},
    {terms: ['sun panel', 'worn centre', 'worn center'], until: {clueIds: ['sun-motif']}},
    {terms: ['flood', 'floods'], until: {clueIds: ['curator-note']}},
    {terms: ['manuscript chamber', 'hidden room'], until: {puzzleIds: ['find-entrance']}},
  ],
  offLimits: ['religious doctrine or worship', 'treating sacred objects as treasure', 'danger, traps or curses', 'mocking any faith'],
};

export const theForgottenTempleMystery: MysteryDefinition = {
  summary: theForgottenTemple,
  audience: {
    label: 'Family · Ages 8+',
    contentNote: [
      'This temple, its carvings and its records are fictional, inspired by South Indian architecture.',
      'The puzzles are about history and preservation, not religious knowledge.',
    ],
  },
  truth,
  intro,
  startSceneId: 'courtyard',
  scenes,
  clues,
  puzzles,
  endings,
  scoring: {puzzlePoints: 100, hintPenalty: 0, incorrectAttemptPenalty: 0, minPuzzlePoints: 100, clueDiscoveryPoints: 10, timeBonusPerMinute: 0},
};
