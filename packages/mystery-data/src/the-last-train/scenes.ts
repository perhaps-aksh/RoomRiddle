import type {Scene} from '@roomriddle/shared-types';

/** The Last Train: four scenes, one puzzle each. The story moves on only when a scene's puzzle is solved. */
export const scenes: Scene[] = [
  {
    id: 'station',
    title: 'The Station',
    subtitle: 'Harrow Cross · platform two',
    narration: [
      'Rain strikes the station windows.',
      'The platform is almost empty.',
      '',
      'Above the booking hall, the clock tower is dark.',
      'Scorch marks run down its face.',
    ],
    clueIds: ['platform-clock', 'company-notice', 'waiting-room-clock'],
    puzzleIds: ['station-clock'],
    nextSceneId: 'train',
  },
  {
    id: 'train',
    title: 'The Train',
    subtitle: 'The Northern Star · held at platform two',
    narration: [
      'Steam drifts along the carriages.',
      'Every door is shut. Every blind is drawn.',
      '',
      'Somewhere aboard, someone knows where the conductor went.',
    ],
    clueIds: ['torn-ticket', 'departure-board', 'carriage-plan'],
    puzzleIds: ['torn-ticket'],
    nextSceneId: 'carriage',
  },
  {
    id: 'carriage',
    title: 'The Carriage',
    subtitle: 'Carriage C · the sleeper',
    narration: [
      'The corridor lights flicker with every roll of thunder.',
      'Compartment seven is empty. Its window is open to the storm.',
      '',
      'Someone left in a hurry.',
    ],
    clueIds: ['pocket-watch', 'conductors-ledger', 'seat-eight-card', 'wired-brake'],
    puzzleIds: ['conductors-ledger'],
    nextSceneId: 'signal-box',
  },
  {
    id: 'signal-box',
    title: 'The Signal Box',
    subtitle: 'Beyond the platform end · 11:58 PM',
    narration: [
      'A ladder climbs into the dark above the tracks.',
      'Inside the signal box, the levers stand in a long brass row.',
      '',
      'Two minutes to midnight.',
    ],
    clueIds: ['blackwater-lever', 'lamp-room-door'],
    puzzleIds: ['final-signal'],
  },
];
