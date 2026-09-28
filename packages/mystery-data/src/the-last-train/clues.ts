import type {Clue} from '@roomriddle/shared-types';

/**
 * Discoverable evidence. `major` clues decide between the good endings:
 * find them all (and don't lean on hints) for The Truth.
 */
export const clues: Clue[] = [
  // ── The Station ─────────────────────────────────────────────
  {
    id: 'platform-clock',
    sceneId: 'station',
    prompt: 'Look up at the platform clock',
    title: 'The Platform Clock',
    description: [
      'The glass is cracked and blackened. Lightning struck the tower.',
      'The hands froze the instant it hit.',
      'They read 11:59.',
    ],
    major: true,
  },
  {
    id: 'company-notice',
    sceneId: 'station',
    prompt: 'Read the notice beneath the clock',
    title: 'The Company Notice',
    description: [
      '"By order of the Northern Railway Company:',
      'the platform clock is kept TWELVE MINUTES FAST',
      'so that no passenger misses the last train."',
    ],
  },
  {
    id: 'waiting-room-clock',
    sceneId: 'station',
    prompt: 'Check the waiting room clock',
    title: 'The Waiting Room Clock',
    description: [
      'Still ticking, and kept to true time.',
      'It reads 11:53, a few minutes after everything went wrong.',
      'Its minute hand tells you nothing about the moment itself.',
    ],
  },

  // ── The Train ───────────────────────────────────────────────
  {
    id: 'torn-ticket',
    sceneId: 'train',
    prompt: 'Pick up the ticket from the puddle',
    title: 'The Torn Ticket',
    description: [
      'Clipped with the conductor\'s punch, initials "E.C.", then torn.',
      'TRAIN ▒07 · a GREEN carriage stripe · SEAT ▒7',
      'The rest has washed away.',
    ],
    major: true,
  },
  {
    id: 'departure-board',
    sceneId: 'train',
    prompt: 'Study the departure board',
    title: 'The Departure Board',
    description: [
      '107 · Kingsmoor Mail · DEPARTED 11:15',
      '207 · The Northern Star · HELD UNTIL 00:00',
      '307 · Coastal Sleeper · CANCELLED (STORM)',
      '407 · Dawn Goods · MONDAYS ONLY',
    ],
  },
  {
    id: 'carriage-plan',
    sceneId: 'train',
    prompt: 'Read the carriage plan by the door',
    title: 'The Carriage Plan',
    description: [
      'The Northern Star: A first class (red) · B dining (blue) ·',
      'C sleeper (green) · D mail van (grey).',
      'Sleeper compartments are numbered 1 to 12.',
    ],
  },

  // ── The Carriage ────────────────────────────────────────────
  {
    id: 'pocket-watch',
    sceneId: 'carriage',
    prompt: 'Search beneath seat seven',
    title: 'The Pocket Watch',
    description: [
      'A brass watch, engraved "E. Caldwell". Its glass is smashed.',
      'It stopped when it hit the floor, at 11:47.',
      'Caldwell was here, in carriage C, when it happened.',
    ],
    major: true,
  },
  {
    id: 'conductors-ledger',
    sceneId: 'carriage',
    prompt: 'Open the ledger on the seat',
    title: "The Conductor's Ledger",
    description: [
      '11:40 · Arrived Harrow Cross · Guard\'s van  (black ink)',
      '11:43 · Tickets checked · Carriage A  (black ink)',
      '11:47 · All quiet · Guard\'s van  (smudged BLUE PENCIL)',
      'Every other entry is in Caldwell\'s neat black ink.',
    ],
    major: true,
  },
  {
    id: 'seat-eight-card',
    sceneId: 'carriage',
    prompt: 'Check the next compartment, seat eight',
    title: 'The Seat Eight Reservation',
    description: [
      'A stub of BLUE PENCIL is wedged in the seat.',
      'The reservation card reads:',
      '"R. Voss · Company Inspector · signal-box key holder"',
    ],
  },
  {
    id: 'wired-brake',
    sceneId: 'carriage',
    prompt: 'Try the emergency brake',
    title: 'The Wired Brake',
    description: [
      'The emergency handle won\'t move.',
      'It has been lashed shut with signal wire,',
      'the kind used on the levers in the signal box.',
    ],
    major: true,
  },

  // ── The Signal Box ──────────────────────────────────────────
  {
    id: 'blackwater-lever',
    sceneId: 'signal-box',
    prompt: 'Inspect the lever frame',
    title: 'Lever 7 · Blackwater Points',
    description: [
      'Lever 7 has been pulled over. Its label reads:',
      '"BLACKWATER POINTS: TO OLD TUNNEL LINE. TUNNEL SEALED. DO NOT USE."',
      'The Northern Star is set to run straight into the sealed tunnel.',
    ],
    major: true,
  },
  {
    id: 'lamp-room-door',
    sceneId: 'signal-box',
    prompt: 'Listen at the lamp room door',
    title: 'The Lamp Room Door',
    description: [
      'Bolted from the outside. Behind it, a faint knocking,',
      'and a voice, hoarse from shouting:',
      '"The points! Somebody stop the train!"',
    ],
    major: true,
  },
];
