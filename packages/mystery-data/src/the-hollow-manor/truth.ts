import type {MysteryTruth} from '@roomriddle/shared-types';

/** The Hollow Manor's truth table (server-only). */
export const truth: MysteryTruth = {
  narratorId: 'detective',
  solution: [
    'Edmund Vale learned from the archivist that the 1871 catalogue names the Ashworth family, in trust for the village, as custodian of the 1702 charter; the modern catalogue was rewritten to say the Vale family.',
    'Fearing the original would be destroyed, he left his study through a forgotten passage behind the portrait that leads to the old archive, taking the charter, and hid in a closet behind the last archive cabinet.',
    'The locked door was real: he locked it himself. No one was kidnapped and nothing supernatural happened.',
  ],
  characters: [
    {
      id: 'detective',
      name: 'Detective Grace',
      voice: {edge: 'en-GB-SoniaNeural', groq: 'diana'},
      role: 'Detective',
      persona: 'Calm, precise, dry. Separates what is known from what is suspected. Never gives answers away; asks the question that points at the evidence.',
      interviewable: false,
      facts: [
        {id: 'hm-det-locked', kind: 'truth', text: 'The study was locked from the inside and the room was empty.'},
        {id: 'hm-det-passage', kind: 'truth', text: 'The portrait hides a passage.', unlockedBy: {puzzleIds: ['impossible-room']}},
        {id: 'hm-det-archive', kind: 'truth', text: 'The passage leads to the old archive.', unlockedBy: {puzzleIds: ['floor-plan']}},
        {id: 'hm-det-record', kind: 'truth', text: 'The catalogue was altered to change who owned the charter.', unlockedBy: {puzzleIds: ['restore-catalogue']}},
      ],
    },
    {
      id: 'clara',
      name: 'Clara Vale',
      voice: {edge: 'en-GB-LibbyNeural', groq: 'hannah'},
      role: "Edmund's sister",
      persona: 'Composed, formal, protective of the family name. Polite but clipped; dislikes scandal. Not a villain.',
      interviewable: true,
      facts: [
        {id: 'clara-claim-drawing', kind: 'claim', text: 'I was in the drawing room all evening. I heard nothing until I knocked.'},
        {id: 'clara-claim-nothing', kind: 'claim', false: true, text: 'That portrait has never been moved in my lifetime.'},
        {id: 'clara-portrait', kind: 'secret', text: 'As children we were told never to touch that portrait. Father once found Edmund behind it.', unlockedBy: {clueIds: ['dust-outline']}},
        {id: 'clara-charter', kind: 'secret', text: 'Father always said the charter was best left in a drawer. I never asked why.', unlockedBy: {clueIds: ['modern-catalogue']}},
      ],
    },
    {
      id: 'thomas',
      name: 'Thomas Reed',
      voice: {edge: 'en-GB-RyanNeural', rate: '+4%', groq: 'daniel'},
      role: 'Caretaker',
      persona: 'Gruff, slow-spoken old countryman. Knows every creak of the house. Evasive at first, then honest.',
      interviewable: true,
      facts: [
        {id: 'thomas-lights', kind: 'truth', text: 'The lights went twice tonight. I was down in the boiler room both times.'},
        {id: 'thomas-claim-bricked', kind: 'claim', false: true, text: 'Any old servants\' ways in this house were bricked up long before my time.'},
        {id: 'thomas-routes', kind: 'secret', text: 'There is one way they never bricked up. My grandfather called it the archivist\'s stair.', unlockedBy: {clueIds: ['old-floor-plan']}},
      ],
    },
    {
      id: 'evelyn',
      name: 'Evelyn Cross',
      voice: {edge: 'en-AU-NatashaNeural', rate: '-6%', groq: 'autumn'},
      role: 'Family archivist',
      persona: 'Precise, careful, quietly worried. Speaks in exact dates and catalogue numbers.',
      interviewable: true,
      facts: [
        {id: 'evelyn-work', kind: 'truth', text: 'I have been re-cataloguing the family papers since spring.'},
        {id: 'evelyn-discrepancy', kind: 'secret', text: 'I found that entry 214 was written in newer ink than the rest. I told Edmund last week.', unlockedBy: {clueIds: ['catalogue-entry']}},
        {id: 'evelyn-fear', kind: 'secret', text: 'If the 1871 record is right, the charter belongs to the village trust, not the family.', unlockedBy: {puzzleIds: ['restore-catalogue']}},
      ],
    },
    {
      id: 'edmund',
      name: 'Edmund Vale',
      voice: {edge: 'en-GB-ThomasNeural', rate: '-8%', pitch: '-6%', groq: 'troy'},
      role: 'Historian (missing)',
      persona: 'Absent-minded, earnest, a little theatrical. Talks like a lecturer.',
      interviewable: true,
      facts: [
        {id: 'edmund-why', kind: 'secret', text: 'I took the charter so it could not be burned. I locked the door so no one would follow too soon.', unlockedBy: {clueIds: ['archive-letter']}},
        {id: 'edmund-where', kind: 'secret', text: 'I hid in the old map closet behind the last cabinet.', unlockedBy: {puzzleIds: ['final-theory']}},
      ],
    },
  ],
  guarded: [
    {terms: ['passage', 'hidden door', 'behind the portrait', 'secret door'], until: {puzzleIds: ['impossible-room']}},
    {terms: ['archive', "archivist's stair"], until: {puzzleIds: ['floor-plan']}},
    {terms: ['ashworth', 'custodian', 'village trust', 'rewritten'], until: {clueIds: ['catalogue-entry']}},
    {terms: ['map closet', 'last cabinet', 'edmund is safe'], until: {puzzleIds: ['final-theory']}},
  ],
  offLimits: ['ghosts or the supernatural as an explanation', 'violence against Edmund', 'blaming a specific family member'],
};
