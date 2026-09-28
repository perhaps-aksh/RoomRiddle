import type {MysteryDefinition} from '@roomriddle/shared-types';

/**
 * A tiny made-up mystery used only by engine tests. It is NOT The Last Train:
 * it proves the engine is driven purely by data.
 */
export const fixtureMystery: MysteryDefinition = {
  summary: {
    id: 'test-vault',
    title: 'The Test Vault',
    tagline: 'A fixture.',
    genre: 'Test',
    synopsis: 'Two rooms, three puzzles.',
    teaser: ['A fixture.'],
    atmosphere: ['Test'],
    difficulty: 'Easy',
    estimatedMinutes: 5,
    minPlayers: 1,
    maxPlayers: 4,
    availability: 'playable',
  },
  intro: {title: 'Intro', narration: ['Welcome.']},
  startSceneId: 'hall',
  scenes: [
    {
      id: 'hall',
      title: 'Hall',
      narration: ['A hall.'],
      clueIds: ['note', 'key', 'secret'],
      puzzleIds: ['door-code'],
      nextSceneId: 'vault',
    },
    {
      id: 'vault',
      title: 'Vault',
      narration: ['A vault.'],
      clueIds: ['ledger'],
      puzzleIds: ['culprit', 'combo'],
    },
  ],
  clues: [
    {id: 'note', sceneId: 'hall', prompt: 'Read the note', title: 'Note', description: ['12:30'], major: true},
    {id: 'key', sceneId: 'hall', prompt: 'Take the key', title: 'Key', description: ['A key.']},
    {
      id: 'secret',
      sceneId: 'hall',
      prompt: 'Look behind the painting',
      title: 'Secret',
      description: ['Hidden.'],
      requires: {clueIds: ['key']},
    },
    {id: 'ledger', sceneId: 'vault', prompt: 'Open the ledger', title: 'Ledger', description: ['Ink.'], major: true},
  ],
  puzzles: [
    {
      id: 'door-code',
      sceneId: 'hall',
      title: 'Door Code',
      prompt: ['A keypad.'],
      question: 'What time?',
      input: {kind: 'digits', length: 4},
      acceptedAnswers: ['12:30'],
      hints: [
        {id: 'door-1', text: 'Look at the note.'},
        {id: 'door-2', text: 'It is a time.'},
        {id: 'door-3', text: 'Half past twelve.'},
      ],
      requires: {clueIds: ['note']},
      solvedText: ['The door opens.'],
    },
    {
      id: 'combo',
      sceneId: 'vault',
      title: 'Combination',
      prompt: ['Dials.'],
      question: 'Who and where?',
      input: {
        kind: 'combination',
        fields: [
          {id: 'who', label: 'Who', options: [{id: 'ada', label: 'Ada'}, {id: 'bo', label: 'Bo'}]},
          {id: 'where', label: 'Where', options: [{id: 'attic', label: 'Attic'}, {id: 'cellar', label: 'Cellar'}]},
        ],
      },
      acceptedAnswers: ['bo|cellar'],
      hints: [{id: 'combo-1', text: 'Not Ada.'}],
      solvedText: ['Click.'],
    },
    {
      id: 'culprit',
      sceneId: 'vault',
      title: 'Culprit',
      prompt: ['Decide.'],
      question: 'What happened?',
      input: {
        kind: 'choice',
        options: [
          {id: 'theft', label: 'A theft'},
          {id: 'accident', label: 'An accident'},
        ],
      },
      acceptedAnswers: ['theft'],
      hints: [{id: 'culprit-1', text: 'Something was taken.'}],
      points: 150,
      requires: {clueIds: ['ledger'], puzzleIds: ['combo']},
      solvedText: ['Case closed.'],
      completesMystery: true,
    },
  ],
  endings: [
    {
      id: 'best',
      title: 'Best',
      tone: 'triumph',
      when: [
        {kind: 'puzzle-solved', puzzleId: 'culprit'},
        {kind: 'major-clues-found'},
        {kind: 'hints-used-at-most', count: 1},
      ],
      narration: ['Perfect.'],
    },
    {
      id: 'good',
      title: 'Good',
      tone: 'bittersweet',
      when: [{kind: 'puzzle-solved', puzzleId: 'culprit'}],
      narration: ['Solved.'],
    },
    {id: 'fail', title: 'Fail', tone: 'defeat', when: [], narration: ['Too late.']},
  ],
  scoring: {clueDiscoveryPoints: 10},
  failure: {timeLimitMinutes: 10, maxIncorrectAttempts: 3},
};
