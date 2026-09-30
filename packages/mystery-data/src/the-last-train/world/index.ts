/**
 * The Last Train: the 2.5D world.
 *
 * Pure presentation data: sets (what stands where, at what depth), the
 * objects players can examine (each mapped to an engine clue), authored
 * timelines (the train arrival and each scene's entry) and the detective's
 * dialogue. The engine never reads this file; nothing here affects scoring,
 * answers or unlocks.
 *
 * Layout: 1920×1080 design px. Node x/y are in their depth plane's space
 * (the plane is aligned with the screen when the camera is at 0,0).
 */
import type {DialogueLine, MysteryWorld, SceneTimeline, SceneWorld, TimelineAction, TimelineEvent, TrainDefinition, WorldNode, WorldSet} from '@roomriddle/shared-types';
import {BOARDING_DOOR, lastTrainManifest, TRAIN_SIZE} from './manifest';

// ── Shared placements ──────────────────────────────────────────────────

/** Train rests with its left edge here (carriage C's door centred at x≈1100). */
const TRAIN_STOP_X = 125;
const TRAIN_Y = 620;
const TRAIN_DEPTH = 0.6;

const DOOR_NODE: WorldNode = {
  id: 'doorway',
  assetId: 'last-train.train.doorway',
  layer: 'midground',
  depth: TRAIN_DEPTH,
  x: TRAIN_STOP_X + BOARDING_DOOR.x,
  y: TRAIN_Y + BOARDING_DOOR.y,
  z: -1,
  // A camera target only: the train draws its own doorway as the doors open.
  visible: false,
};

const TRAIN_NODE: WorldNode = {id: 'train', assetId: 'last-train.train', x: TRAIN_STOP_X, y: TRAIN_Y, z: 0};

/** The station skyline, shared by every platform set. */
const STATION_BACKDROP: WorldNode[] = [
  {id: 'sky', assetId: 'last-train.sky', x: -340, y: -60},
  {id: 'city', assetId: 'last-train.city', x: -740, y: 430},
  {id: 'station', assetId: 'last-train.station.background', x: -40, y: 120},
  {id: 'tracks', assetId: 'last-train.tracks', x: -1840, y: 960, z: -2},
  {id: 'platform', assetId: 'last-train.station.platform', x: -1840, y: 990, z: 1},
  {id: 'lamp-1', assetId: 'last-train.station.lights', x: 180, y: 440, z: 2},
  {id: 'lamp-2', assetId: 'last-train.station.lights', x: 1320, y: 440, z: 2},
  {id: 'lamp-3', assetId: 'last-train.station.lights', x: 2420, y: 440, z: 2},
  {id: 'pole-1', assetId: 'last-train.foreground.pole', x: -60, y: -40},
  {id: 'pole-2', assetId: 'last-train.foreground.pole', x: 1980, y: -40},
];

const DETECTIVE_ON_PLATFORM: WorldNode = {id: 'detective-spot', assetId: 'last-train.detective', x: 1560, y: 560, depth: 0.82, z: 4};

/**
 * Where the camera rests when players have control: lifted a little, so
 * objects on the platform sit clear of the action bar at the bottom.
 */
const REST = {x: 0, y: 220, zoom: 1};

// ── Train ──────────────────────────────────────────────────────────────

export const lastTrainTrain: TrainDefinition = {
  assetId: 'last-train.train',
  depth: TRAIN_DEPTH,
  positions: {
    far: -5200,
    approaching: -3000,
    arriving: -250,
    stopped: TRAIN_STOP_X,
    'doors-opening': TRAIN_STOP_X,
    boarding: TRAIN_STOP_X,
    departing: 4200,
  },
  durations: {
    far: 0,
    approaching: 2400,
    arriving: 3000,
    stopped: 2000,
    'doors-opening': 1200,
    boarding: 0,
    departing: 6000,
  },
  // Constant speed in, then braking whose initial speed matches (enter starts at 5× average).
  easing: {approaching: 'linear', arriving: 'linear', stopped: 'enter', departing: 'exit'},
  parts: {
    doorsAssetId: 'last-train.train.doors',
    windowsAssetId: 'last-train.train.windows',
    headlightsAssetId: 'last-train.train.headlights',
    doorwayAssetId: 'last-train.train.doorway',
  },
};

// ── Sets ───────────────────────────────────────────────────────────────

const arrivalSet: WorldSet = {
  id: 'arrival',
  label: 'Platform two, before the train',
  nodes: [...STATION_BACKDROP, TRAIN_NODE, DOOR_NODE, {id: 'bench', assetId: 'last-train.bench', x: 700, y: 900, z: 1}],
  objects: [],
  camera: {x: 0, y: 0, zoom: 1},
  effects: ['rain', 'fog'],
  darkness: 0.2,
  train: {y: TRAIN_Y, state: 'far'},
};

const stationSet: WorldSet = {
  id: 'platform',
  label: 'Platform two',
  nodes: [
    ...STATION_BACKDROP,
    TRAIN_NODE,
    DOOR_NODE,
    {id: 'bench', assetId: 'last-train.bench', x: 700, y: 900, z: 1},
    {id: 'clock', assetId: 'last-train.clock', x: 220, y: 200},
    {id: 'notice', assetId: 'last-train.notice', x: 230, y: 430},
    {id: 'waiting-clock', assetId: 'last-train.waiting-room-clock', x: 890, y: 440},
    {id: 'suitcase', assetId: 'last-train.suitcase', x: 300, y: 880},
    {id: 'newspaper', assetId: 'last-train.newspaper', x: 780, y: 868},
    DETECTIVE_ON_PLATFORM,
  ],
  objects: [
    {id: 'obj-clock', nodeId: 'clock', name: 'Platform clock', interaction: 'inspect', clueId: 'platform-clock', inspectZoom: 1.9},
    {id: 'obj-notice', nodeId: 'notice', name: 'Company notice', interaction: 'read', clueId: 'company-notice', inspectZoom: 2.1},
    {id: 'obj-waiting-clock', nodeId: 'waiting-clock', name: 'Waiting room clock', interaction: 'inspect', clueId: 'waiting-room-clock', inspectZoom: 2.2},
    {
      id: 'obj-suitcase',
      nodeId: 'suitcase',
      name: 'Suitcase',
      interaction: 'inspect',
      prompt: 'Look at the abandoned suitcase',
      flavor: ['A good leather case, tagged for carriage B.', 'Nobody has come back for it.'],
      inspectZoom: 1.7,
    },
    {
      id: 'obj-newspaper',
      nodeId: 'newspaper',
      name: 'Evening paper',
      interaction: 'read',
      prompt: 'Read the evening paper',
      flavor: ['STORM CLOSES COAST LINE.', "Tonight's edition, folded once and left on the bench."],
      inspectZoom: 1.8,
    },
  ],
  camera: REST,
  effects: ['rain', 'fog', 'flicker'],
  darkness: 0.18,
  train: {y: TRAIN_Y, state: 'boarding'},
};

const vestibuleSet: WorldSet = {
  id: 'vestibule',
  label: 'Carriage C, inside the door',
  nodes: [
    {id: 'vestibule', assetId: 'last-train.train.vestibule', x: -140, y: 0},
    {id: 'detective-spot', assetId: 'last-train.detective', x: 1180, y: 470, depth: 0.8, z: 2},
  ],
  objects: [],
  camera: {x: 0, y: 0, zoom: 1},
  effects: ['rain'],
  darkness: 0.1,
};

const trainSet: WorldSet = {
  id: 'platform-train',
  label: 'The Northern Star',
  nodes: [
    ...STATION_BACKDROP,
    TRAIN_NODE,
    {id: 'departure-board', assetId: 'last-train.departure-board', x: 1320, y: 260},
    {id: 'carriage-plan', assetId: 'last-train.carriage-plan', x: TRAIN_STOP_X + BOARDING_DOOR.x + 140, y: TRAIN_Y + 130, depth: TRAIN_DEPTH, z: 2},
    {id: 'ticket', assetId: 'last-train.ticket', x: 1180, y: 940},
    DETECTIVE_ON_PLATFORM,
  ],
  objects: [
    {id: 'obj-ticket', nodeId: 'ticket', name: 'Torn ticket', interaction: 'pickup', clueId: 'torn-ticket', inspectZoom: 2},
    {id: 'obj-board', nodeId: 'departure-board', name: 'Departure board', interaction: 'read', clueId: 'departure-board', inspectZoom: 1.8},
    {id: 'obj-plan', nodeId: 'carriage-plan', name: 'Carriage plan', interaction: 'read', clueId: 'carriage-plan', inspectZoom: 2.2},
  ],
  camera: REST,
  effects: ['rain', 'fog', 'flicker', 'steam'],
  darkness: 0.2,
  train: {y: TRAIN_Y, state: 'stopped'},
};

const corridorSet: WorldSet = {
  id: 'corridor',
  label: 'Carriage C, the sleeper corridor',
  nodes: [
    {id: 'interior', assetId: 'last-train.train.interior', x: -240, y: 0},
    {id: 'seat-seven', assetId: 'last-train.carriage.props', x: 180, y: 620},
    {id: 'seat-eight', assetId: 'last-train.carriage.props', x: 1260, y: 620},
    {id: 'ledger', assetId: 'last-train.ledger', x: 300, y: 660, z: 2},
    {id: 'pocket-watch', assetId: 'last-train.pocket-watch', x: 420, y: 870, z: 2},
    {id: 'seat-card', assetId: 'last-train.seat-card', x: 1420, y: 560, z: 2},
    {id: 'brake', assetId: 'last-train.brake', x: 880, y: 380},
    {id: 'detective-spot', assetId: 'last-train.detective', x: 1640, y: 470, depth: 0.82, z: 4},
  ],
  objects: [
    {id: 'obj-watch', nodeId: 'pocket-watch', name: 'Beneath seat seven', interaction: 'inspect', clueId: 'pocket-watch', inspectZoom: 2},
    {id: 'obj-ledger', nodeId: 'ledger', name: "Conductor's ledger", interaction: 'open', clueId: 'conductors-ledger', inspectZoom: 2},
    {id: 'obj-seat-card', nodeId: 'seat-card', name: 'Seat eight', interaction: 'read', clueId: 'seat-eight-card', inspectZoom: 2.2},
    {id: 'obj-brake', nodeId: 'brake', name: 'Emergency brake', interaction: 'activate', clueId: 'wired-brake', inspectZoom: 1.8},
  ],
  camera: REST,
  effects: ['rain', 'flicker'],
  darkness: 0.12,
};

const signalBoxSet: WorldSet = {
  id: 'signal-box',
  label: 'The signal box',
  nodes: [
    {id: 'interior', assetId: 'last-train.signal-box.interior', x: -190, y: 0},
    {id: 'lamp-room-door', assetId: 'last-train.lamp-room-door', x: 1480, y: 380},
    {id: 'lever-frame', assetId: 'last-train.lever-frame', x: 300, y: 620},
    {id: 'detective-spot', assetId: 'last-train.detective', x: 1180, y: 480, depth: 0.82, z: 4},
  ],
  objects: [
    {id: 'obj-levers', nodeId: 'lever-frame', name: 'Lever frame', interaction: 'inspect', clueId: 'blackwater-lever', inspectZoom: 1.5},
    {id: 'obj-lamp-room', nodeId: 'lamp-room-door', name: 'Lamp room door', interaction: 'open', clueId: 'lamp-room-door', inspectZoom: 1.6},
  ],
  camera: REST,
  effects: ['rain', 'flicker'],
  darkness: 0.25,
};

// ── Timelines ──────────────────────────────────────────────────────────

const ev = (at: number, e: TimelineAction): TimelineEvent => ({at, ...e});

/** The first cinematic: the Northern Star arrives at Harrow Cross. ~24 s plus dialogue. */
export const trainArrival: SceneTimeline = {
  id: 'train-arrival',
  label: 'Train arrival',
  endMode: 'investigation',
  events: [
    ev(0, {type: 'set', setId: 'arrival', transition: 'cut', duration: 0}),
    ev(0, {type: 'fade', to: 1, duration: 0}),
    ev(0, {type: 'interaction', enabled: false}),
    ev(0, {type: 'camera.cut', shot: {x: 180, y: -40, zoom: 1.08}}),
    ev(500, {type: 'caption', text: '11:42 PM', style: 'time', duration: 2600}),
    ev(1400, {type: 'effect', effect: 'rain', on: true}),
    ev(1400, {type: 'custom', name: 'audio.cue', payload: {cue: 'rain-start'}}),
    ev(2600, {type: 'fade', to: 0, duration: 2400}),
    ev(2600, {type: 'camera.move', shot: {x: 0, y: 0, zoom: 1}, duration: 4200, easing: 'standard'}),
    ev(3400, {type: 'effect', effect: 'flicker', on: true}),
    ev(4200, {type: 'caption', text: 'Harrow Cross · Platform two', style: 'place', duration: 2800}),
    ev(5600, {type: 'effect', effect: 'headlights', on: true}),
    ev(5600, {type: 'train.state', state: 'approaching'}),
    ev(5600, {type: 'camera.move', shot: {x: -380, y: 0, zoom: 1.02}, duration: 2800, easing: 'standard'}),
    ev(5600, {type: 'custom', name: 'audio.cue', payload: {cue: 'train-approach'}}),
    ev(8000, {type: 'train.state', state: 'arriving'}),
    ev(8000, {type: 'camera.follow', target: 'train', duration: 3000}),
    ev(8800, {type: 'effect', effect: 'steam', on: true}),
    ev(11000, {type: 'train.state', state: 'stopped'}),
    ev(12800, {type: 'camera.shake', intensity: 7, duration: 450}),
    ev(12800, {type: 'custom', name: 'audio.cue', payload: {cue: 'train-brake'}}),
    ev(13600, {type: 'camera.release'}),
    ev(13600, {type: 'effect', effect: 'headlights', on: false}),
    ev(13600, {type: 'camera.focus', nodeId: 'doorway', zoom: 1.15, duration: 1800}),
    ev(15400, {type: 'train.state', state: 'doors-opening'}),
    ev(15400, {type: 'custom', name: 'audio.cue', payload: {cue: 'doors-open'}}),
    ev(16600, {type: 'train.state', state: 'boarding'}),
    ev(16800, {type: 'camera.focus', nodeId: 'doorway', zoom: 3.2, duration: 1600, easing: 'exit'}),
    ev(18200, {type: 'set', setId: 'vestibule', transition: 'push', duration: 900}),
    ev(18200, {type: 'camera.cut', shot: {x: 60, y: 0, zoom: 1.1}}),
    ev(18300, {type: 'camera.move', shot: {x: 0, y: 0, zoom: 1}, duration: 2400, easing: 'cinematic'}),
    ev(19000, {type: 'character', characterId: 'detective', state: 'enter', nodeId: 'detective-spot'}),
    ev(19900, {type: 'character', characterId: 'detective', state: 'talk'}),
    ev(20000, {type: 'dialogue', lineIds: ['arrival-1', 'arrival-2']}),
    ev(20100, {type: 'character', characterId: 'detective', state: 'exit'}),
    ev(20700, {type: 'set', setId: 'platform', transition: 'pull', duration: 1000}),
    ev(20700, {type: 'camera.cut', shot: {x: 120, y: -20, zoom: 1.12}}),
    ev(20750, {type: 'camera.reset', duration: 1600}),
    ev(22400, {type: 'mode', mode: 'investigation'}),
    ev(22400, {type: 'interaction', enabled: true}),
  ],
};

const trainEntry: SceneTimeline = {
  id: 'train-entry',
  label: 'Along the carriages',
  endMode: 'investigation',
  events: [
    ev(0, {type: 'fade', to: 1, duration: 0}),
    ev(0, {type: 'camera.cut', shot: {x: 900, y: 0, zoom: 1.1}}),
    ev(200, {type: 'fade', to: 0, duration: 1200}),
    ev(200, {type: 'camera.reset', duration: 4200}),
    ev(900, {type: 'caption', text: 'The Northern Star · held at platform two', style: 'place', duration: 2800}),
    ev(3600, {type: 'character', characterId: 'detective', state: 'enter', nodeId: 'detective-spot'}),
    ev(4400, {type: 'character', characterId: 'detective', state: 'talk'}),
    ev(4400, {type: 'dialogue', lineIds: ['train-1']}),
    ev(4500, {type: 'character', characterId: 'detective', state: 'exit'}),
    ev(5200, {type: 'mode', mode: 'investigation'}),
  ],
};

const carriageEntry: SceneTimeline = {
  id: 'carriage-entry',
  label: 'Into carriage C',
  endMode: 'investigation',
  events: [
    ev(0, {type: 'set', setId: 'door-closeup', transition: 'cut', duration: 0}),
    ev(0, {type: 'camera.cut', shot: {x: 0, y: 0, zoom: 1}}),
    ev(0, {type: 'fade', to: 1, duration: 0}),
    ev(100, {type: 'fade', to: 0, duration: 800}),
    ev(300, {type: 'camera.focus', nodeId: 'doorway', zoom: 3.2, duration: 2200, easing: 'exit'}),
    ev(2400, {type: 'set', setId: 'corridor', transition: 'push', duration: 900}),
    ev(2400, {type: 'camera.cut', shot: {x: -140, y: 0, zoom: 1.12}}),
    ev(2450, {type: 'camera.reset', duration: 2600}),
    ev(2900, {type: 'caption', text: 'Carriage C · the sleeper', style: 'place', duration: 2600}),
    ev(3400, {type: 'effect', effect: 'lightning', on: true}),
    ev(3400, {type: 'custom', name: 'audio.cue', payload: {cue: 'thunder'}}),
    ev(3600, {type: 'effect', effect: 'lightning', on: false}),
    ev(4400, {type: 'character', characterId: 'detective', state: 'enter', nodeId: 'detective-spot'}),
    ev(5200, {type: 'character', characterId: 'detective', state: 'talk'}),
    ev(5200, {type: 'dialogue', lineIds: ['carriage-1']}),
    ev(5300, {type: 'character', characterId: 'detective', state: 'exit'}),
    ev(6000, {type: 'mode', mode: 'investigation'}),
  ],
};

const signalBoxEntry: SceneTimeline = {
  id: 'signal-box-entry',
  label: 'The signal box',
  endMode: 'investigation',
  events: [
    ev(0, {type: 'fade', to: 1, duration: 0}),
    ev(0, {type: 'camera.cut', shot: {x: -220, y: 60, zoom: 1.15}}),
    ev(300, {type: 'effect', effect: 'lightning', on: true}),
    ev(500, {type: 'effect', effect: 'lightning', on: false}),
    ev(500, {type: 'fade', to: 0, duration: 1400}),
    ev(500, {type: 'camera.reset', duration: 3600}),
    ev(1200, {type: 'caption', text: '11:58 PM', style: 'time', duration: 2400}),
    ev(3600, {type: 'character', characterId: 'detective', state: 'enter', nodeId: 'detective-spot'}),
    ev(4400, {type: 'character', characterId: 'detective', state: 'talk'}),
    ev(4400, {type: 'dialogue', lineIds: ['signal-1']}),
    ev(4500, {type: 'character', characterId: 'detective', state: 'exit'}),
    ev(5200, {type: 'mode', mode: 'investigation'}),
  ],
};

/** Carriage C's door, close, used only by the carriage entry. */
const doorCloseupSet: WorldSet = {
  ...stationSet,
  id: 'door-closeup',
  label: 'Carriage C door',
  objects: [],
  nodes: stationSet.nodes.filter(n => n.id !== 'detective-spot'),
  effects: ['rain', 'flicker', 'steam'],
};

// ── Dialogue ───────────────────────────────────────────────────────────

export const lastTrainDialogue: DialogueLine[] = [
  {id: 'arrival-1', characterId: 'detective', text: 'The Northern Star. Held at Harrow Cross, and nobody will say why.', trigger: {type: 'timeline'}, audioId: 'vo.last-train.arrival-1'},
  {id: 'arrival-2', characterId: 'detective', text: 'The conductor was last seen on this platform. We start out there.', trigger: {type: 'timeline'}, audioId: 'vo.last-train.arrival-2'},
  {
    id: 'react-clock',
    characterId: 'detective',
    text: 'Stopped dead when the lightning hit. Eleven fifty-nine, if this clock can be trusted.',
    trigger: {type: 'clue-discovered', clueId: 'platform-clock'},
    audioId: 'vo.last-train.react-clock',
  },
  {
    id: 'react-notice',
    characterId: 'detective',
    text: 'Twelve minutes fast. The tower has been lying to everyone on this platform.',
    trigger: {type: 'clue-discovered', clueId: 'company-notice'},
    audioId: 'vo.last-train.react-notice',
  },
  {
    id: 'react-station-puzzle',
    characterId: 'detective',
    text: 'Now we can work out when it really happened.',
    trigger: {type: 'puzzle-unlocked', puzzleId: 'station-clock'},
    audioId: 'vo.last-train.react-station-puzzle',
  },
  {id: 'train-1', characterId: 'detective', text: 'Every blind drawn. Someone aboard knows where Caldwell went.', trigger: {type: 'timeline'}, audioId: 'vo.last-train.train-1'},
  {
    id: 'react-ticket',
    characterId: 'detective',
    text: 'His punch, his initials. Torn in a hurry.',
    trigger: {type: 'clue-discovered', clueId: 'torn-ticket'},
    audioId: 'vo.last-train.react-ticket',
  },
  {id: 'carriage-1', characterId: 'detective', text: 'Compartment seven. The window is open to the storm.', trigger: {type: 'timeline'}, audioId: 'vo.last-train.carriage-1'},
  {
    id: 'react-brake',
    characterId: 'detective',
    text: "Wired shut. Somebody didn't want this train stopping.",
    trigger: {type: 'clue-discovered', clueId: 'wired-brake'},
    audioId: 'vo.last-train.react-brake',
  },
  {id: 'signal-1', characterId: 'detective', text: 'Two minutes to midnight. Whatever happens next happens here.', trigger: {type: 'timeline'}, audioId: 'vo.last-train.signal-1'},
];

// ── Scenes ─────────────────────────────────────────────────────────────

const stationWorld: SceneWorld = {
  sceneId: 'station',
  templates: ['cinematic', 'transition', 'dialogue', 'investigation', 'inspection'],
  initialSetId: 'platform',
  sets: [arrivalSet, vestibuleSet, stationSet],
  entryTimelineId: 'train-arrival',
  timelines: [trainArrival],
};

const trainWorld: SceneWorld = {
  sceneId: 'train',
  templates: ['cinematic', 'dialogue', 'investigation', 'inspection'],
  initialSetId: 'platform-train',
  sets: [trainSet],
  entryTimelineId: 'train-entry',
  timelines: [trainEntry],
};

const carriageWorld: SceneWorld = {
  sceneId: 'carriage',
  templates: ['transition', 'dialogue', 'investigation', 'inspection'],
  initialSetId: 'corridor',
  sets: [doorCloseupSet, corridorSet],
  entryTimelineId: 'carriage-entry',
  timelines: [carriageEntry],
};

const signalBoxWorld: SceneWorld = {
  sceneId: 'signal-box',
  templates: ['transition', 'dialogue', 'investigation', 'inspection'],
  initialSetId: 'signal-box',
  sets: [signalBoxSet],
  entryTimelineId: 'signal-box-entry',
  timelines: [signalBoxEntry],
};

export const lastTrainWorld: MysteryWorld = {
  mysteryId: 'the-last-train',
  manifest: lastTrainManifest,
  train: lastTrainTrain,
  characters: [{id: 'detective', name: 'Detective', assetId: 'last-train.detective'}],
  dialogue: lastTrainDialogue,
  scenes: [stationWorld, trainWorld, carriageWorld, signalBoxWorld],
};

export {lastTrainManifest, TRAIN_SIZE};
