import type {MysteryTruth} from '@roomriddle/shared-types';

/** Signal Lost's truth table (server-only). */
export const truth: MysteryTruth = {
  narratorId: 'detective',
  solution: [
    "The eastern relay's timing circuit overheated and began corrupting the station's outbound signal (Tara logged irregularities at 10:08).",
    'Operator Nikhil Rao isolated the relay by hand at 10:12 and at 10:16 warned Control: "Do not open the eastern relay." The station wall clock, which stamps the console log, is four minutes fast, so the log shows 10:12, 10:16 and 10:20.',
    'Isolating the relay also dropped the main uplink, so the station went silent. Nikhil walked 400 m to the north hut to bring up the backup antenna. There was no intruder and no sabotage.',
  ],
  characters: [
    {
      id: 'detective',
      name: 'Detective Grace',
      voice: {edge: 'en-GB-SoniaNeural', groq: 'diana'},
      role: 'Detective',
      persona: 'Calm, precise, dry. Separates facts from assumptions, especially about times. Never gives answers away.',
      interviewable: false,
      facts: [
        {id: 'sl-det-silent', kind: 'truth', text: 'Control heard one message at 10:16 PM, then nothing.'},
        {id: 'sl-det-warning', kind: 'truth', text: 'The message was a warning not to open the eastern relay.', unlockedBy: {puzzleIds: ['decode-transmission']}},
        {id: 'sl-det-clock', kind: 'truth', text: 'The console times are four minutes fast.', unlockedBy: {puzzleIds: ['correct-timeline']}},
      ],
    },
    {
      id: 'tara',
      name: 'Tara Singh',
      voice: {edge: 'en-IN-NeerjaNeural', groq: 'hannah'},
      role: 'Remote technician (on the radio)',
      persona: 'Brisk, practical, slightly frustrated that nobody listened earlier. Talks in short technical sentences, never jargon-heavy.',
      interviewable: true,
      facts: [
        {id: 'tara-earlier', kind: 'truth', text: 'Relay E has been glitchy all week. I flagged it tonight and asked for an inspection.'},
        {id: 'tara-watch', kind: 'truth', text: 'I wrote my log entry by my own watch, not the station clock.', unlockedBy: {clueIds: ['maintenance-log']}},
        {id: 'tara-drift', kind: 'secret', text: 'That drift on the graph is exactly what a dying timing crystal looks like.', unlockedBy: {clueIds: ['signal-graph']}},
      ],
    },
    {
      id: 'vikram',
      name: 'Vikram Das',
      voice: {edge: 'en-IN-PrabhatNeural', rate: '-4%', pitch: '-6%', groq: 'daniel'},
      role: 'Shift supervisor (at Control)',
      persona: 'Confident, managerial, defensive about procedures. Comes round when shown evidence.',
      interviewable: true,
      facts: [
        {id: 'vikram-claim-clock', kind: 'claim', false: true, text: 'The station clock is accurate. We checked it at the last inspection.'},
        {id: 'vikram-claim-intruder', kind: 'claim', false: true, text: 'A station going dark like that usually means someone got in.'},
        {id: 'vikram-concede', kind: 'secret', text: 'Fine. The clock has not been synced since the summer outage.', unlockedBy: {clueIds: ['time-source']}},
      ],
    },
    {
      id: 'control',
      name: 'Control Centre operator',
      voice: {edge: 'en-US-AndrewNeural', groq: 'troy'},
      role: 'Duty operator at Control',
      persona: 'Professional radio voice, careful and factual.',
      interviewable: true,
      facts: [
        {id: 'control-heard', kind: 'truth', text: 'We logged the message at 10:16 PM by our own clock. It was badly distorted in the middle.'},
        {id: 'control-reopen', kind: 'truth', text: 'Our standing order is to reopen any relay that drops, unless a station tells us not to.', unlockedBy: {puzzleIds: ['decode-transmission']}},
      ],
    },
    {
      id: 'nikhil',
      name: 'Nikhil Rao',
      voice: {edge: 'en-IN-PrabhatNeural', rate: '+4%', pitch: '+8%', groq: 'austin'},
      role: 'Station operator (missing)',
      persona: 'Tired, earnest, matter-of-fact. Explains clearly.',
      interviewable: true,
      facts: [
        {id: 'nikhil-why', kind: 'secret', text: 'The relay was sending garbage into the network. Switching it off was the only safe thing to do.', unlockedBy: {clueIds: ['isolation-record']}},
        {id: 'nikhil-where', kind: 'secret', text: 'I went to the north hut to bring up the backup antenna.', unlockedBy: {puzzleIds: ['final-explanation']}},
      ],
    },
  ],
  guarded: [
    {terms: ['do not open', 'do not open the eastern relay'], until: {puzzleIds: ['decode-transmission']}},
    {terms: ['four minutes', '4 minutes', 'fast clock', 'clock is fast'], until: {clueIds: ['time-source']}},
    {terms: ['10:12', '1012'], until: {puzzleIds: ['correct-timeline']}},
    {terms: ['timing crystal', 'timing circuit', 'oscillator'], until: {clueIds: ['signal-graph']}},
    {terms: ['isolated', 'isolation'], until: {clueIds: ['isolation-record']}},
    {terms: ['north hut', 'backup antenna', 'nikhil is safe'], until: {puzzleIds: ['final-explanation']}},
  ],
  offLimits: ['real-world instructions for accessing or attacking communications systems', 'real hacking techniques'],
};
