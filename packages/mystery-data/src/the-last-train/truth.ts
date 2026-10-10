import type {MysteryTruth} from '@roomriddle/shared-types';

/**
 * The Last Train's truth table (server-only). This maps the vault's character
 * model onto the case as it is actually built (Caldwell, Voss, lever 7), as the
 * vault blueprint asks: the working story is preserved, not replaced.
 */
export const truth: MysteryTruth = {
  narratorId: 'detective',
  solution: [
    'At 11:47 PM conductor Elias Caldwell caught Company Inspector R. Voss in carriage C with a signal-box key.',
    "Voss struck him down (Caldwell's watch smashed and stopped at 11:47), wrote a false 11:47 entry in Caldwell's ledger in blue pencil, wired the emergency brake shut and pulled lever 7 to send the Northern Star into the sealed Blackwater tunnel, destroying the mail van that held evidence of his fraud.",
    'Caldwell is alive, bolted inside the signal-box lamp room.',
    'The platform clock stopped at 11:59 when lightning struck, but it is kept twelve minutes fast: 11:47.',
  ],
  characters: [
    {
      id: 'detective',
      name: 'Detective Grace',
      voice: {edge: 'en-GB-SoniaNeural'},
      role: 'Railway police detective',
      persona: 'Calm, precise, dry. Separates what is known from what is suspected. Never guesses aloud and never gives answers away; she asks the question that points at the evidence.',
      interviewable: false,
      facts: [
        {id: 'det-held', kind: 'truth', text: 'The Northern Star is held at platform two until midnight.'},
        {id: 'det-missing', kind: 'truth', text: 'The conductor, Elias Caldwell, has not been seen since just before midnight.'},
        {id: 'det-time', kind: 'truth', text: 'The incident happened at 11:47 PM.', unlockedBy: {puzzleIds: ['station-clock']}},
        {id: 'det-carriage', kind: 'truth', text: 'Whatever happened, it happened in carriage C, the sleeper.', unlockedBy: {puzzleIds: ['torn-ticket']}},
        {id: 'det-voss', kind: 'truth', text: 'Voss wrote the false ledger entry to hide where Caldwell really was.', unlockedBy: {puzzleIds: ['conductors-ledger']}},
      ],
    },
    {
      id: 'voss',
      name: 'Inspector R. Voss',
      voice: {edge: 'en-GB-ThomasNeural', rate: '-4%', pitch: '-8%'},
      role: 'Northern Railway Company inspector, seat eight',
      persona: 'Clipped, officious, impatient. Hides behind company procedure and answers questions with questions. Becomes defensive, never confesses outright.',
      interviewable: true,
      facts: [
        {id: 'voss-claim-seat', kind: 'claim', text: 'I have been in my compartment reading the whole time.', false: true},
        {id: 'voss-claim-caldwell', kind: 'claim', text: "Caldwell was in the guard's van at 11:47. It's in his own ledger.", false: true},
        {id: 'voss-key', kind: 'secret', text: 'I hold a signal-box key. It is my duty to.', unlockedBy: {clueIds: ['seat-eight-card']}},
        {id: 'voss-pencil', kind: 'secret', text: 'Yes, I carry a blue pencil. Half the company does.', unlockedBy: {clueIds: ['seat-eight-card']}},
        {id: 'voss-ledger', kind: 'secret', text: 'Faced with the watch and the pencil, he stops denying the ledger entry and says only that he wants to speak to the Company.', unlockedBy: {puzzleIds: ['conductors-ledger']}},
      ],
    },
    {
      id: 'driver',
      name: 'Ned Hollis',
      voice: {edge: 'en-GB-RyanNeural', rate: '-6%', pitch: '-10%'},
      role: 'Engine driver of the Northern Star',
      persona: 'Gruff, practical, tired, worried about the storm and his schedule. Honest. Speaks in short railway terms.',
      interviewable: true,
      facts: [
        {id: 'driver-held', kind: 'truth', text: "I'm told to wait until midnight, then go, conductor or not."},
        {id: 'driver-brake', kind: 'truth', text: "Someone's tied off the emergency brake in carriage C with signal wire. You don't do that by accident.", unlockedBy: {clueIds: ['wired-brake']}},
        {id: 'driver-points', kind: 'truth', text: 'If the Blackwater points are set to the old line, we go straight into the sealed tunnel.', unlockedBy: {clueIds: ['blackwater-lever']}},
        {id: 'driver-saw', kind: 'truth', text: 'I saw the inspector cross the platform toward the signal box in the blackout, just after the lightning.', unlockedBy: {clueIds: ['seat-eight-card']}},
      ],
    },
    {
      id: 'signalman',
      name: 'Tom Ashby',
      voice: {edge: 'en-IE-ConnorNeural', rate: '+6%'},
      role: 'Night signalman at Harrow Cross',
      persona: 'Nervous, apologetic, eager to help. Fears he will be blamed. Rambles a little.',
      interviewable: true,
      facts: [
        {id: 'sig-lightning', kind: 'truth', text: 'Lightning hit the clock tower and the power went. I went down to the lamp store for a lantern.'},
        {id: 'sig-clock', kind: 'truth', text: 'The platform clock is kept fast on purpose. Company rules.'},
        {id: 'sig-away', kind: 'truth', text: 'When I got back, the signal box door was open and lever 7 had been pulled. I never touched it.', unlockedBy: {clueIds: ['blackwater-lever']}},
        {id: 'sig-keys', kind: 'truth', text: 'Only two people carry signal-box keys tonight: me, and the Company inspector.', unlockedBy: {clueIds: ['seat-eight-card']}},
      ],
    },
    {
      id: 'caldwell',
      name: 'Elias Caldwell',
      voice: {edge: 'en-GB-RyanNeural', rate: '-8%', pitch: '-16%'},
      role: 'Conductor of the Northern Star (missing)',
      persona: 'Hoarse, shaken, brave. Only reachable once found.',
      interviewable: true,
      facts: [
        {id: 'cal-found', kind: 'secret', text: 'I caught Voss with a signal-box key in carriage C at 11:47. He hit me and locked me in here.', unlockedBy: {clueIds: ['lamp-room-door']}},
        {id: 'cal-why', kind: 'secret', text: 'The mail van carries the Company audit. Voss has been stealing for years.', unlockedBy: {puzzleIds: ['final-signal']}},
      ],
    },
  ],
  guarded: [
    {terms: ['11:47', '1147', 'twelve minutes', '12 minutes'], until: {clueIds: ['company-notice']}},
    {terms: ['carriage c', 'seat 7', 'seat seven', 'sleeper'], until: {clueIds: ['torn-ticket', 'carriage-plan']}},
    {terms: ['blue pencil', 'false entry', 'forged'], until: {clueIds: ['conductors-ledger']}},
    {terms: ['lever 7', 'blackwater', 'sealed tunnel', 'tunnel'], until: {clueIds: ['blackwater-lever']}},
    {terms: ['lamp room', 'locked in'], until: {clueIds: ['lamp-room-door']}},
    {terms: ['voss did it', 'voss attacked', 'voss struck', 'fraud', 'audit'], until: {puzzleIds: ['final-signal']}},
  ],
  offLimits: ['graphic violence', 'death of Caldwell'],
};
