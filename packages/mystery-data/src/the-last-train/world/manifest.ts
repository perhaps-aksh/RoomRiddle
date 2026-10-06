/**
 * The Last Train: asset manifest.
 *
 * Every visual the 2.5D world draws, by stable id. Today every entry is a
 * PLACEHOLDER: procedural shapes sized, layered and positioned like the final
 * art will be. To drop in production art for an id: set `status: 'final'`,
 * `format: 'webp'` and `source: '<file>'` (under basePath). Nothing else in
 * the game changes.
 *
 * Sizes are design px (1920×1080 screen). Depth: 0 = sky, 1 = moves with the camera.
 */
import type {AssetDefinition, AssetManifest, PlaceholderShape, WorldColor} from '@roomriddle/shared-types';
import {clockFace} from '../../kit/clock';

type Extra = Partial<Omit<PlaceholderShape, 'x' | 'y' | 'w' | 'h' | 'color'>>;
const r = (x: number, y: number, w: number, h: number, color: WorldColor, extra: Extra = {}): PlaceholderShape => ({x, y, w, h, color, ...extra});

const asset = (a: Omit<AssetDefinition, 'status' | 'format'> & Partial<Pick<AssetDefinition, 'status' | 'format'>>): AssetDefinition => ({
  status: 'placeholder',
  format: 'procedural',
  ...a,
});

// ── Repeating details (windows, rails) generated once ──────────────────

function row<T>(n: number, f: (i: number) => T): T[] {
  return Array.from({length: n}, (_, i) => f(i));
}

const SKY = asset({
  id: 'last-train.sky',
  type: 'background',
  group: 'environment',
  layer: 'far',
  depth: 0.04,
  size: {width: 2600, height: 1200},
  animation: 'none',
  description: 'Night sky over Harrow Cross: low storm clouds lit from beneath by the town.',
  placeholder: [
    r(0, 0, 2600, 1200, 'sky'),
    r(0, 560, 2600, 640, 'skyLow', {opacity: 0.9}),
    r(120, 90, 900, 160, 'cloud', {radius: 80, opacity: 0.55}),
    r(1300, 40, 1100, 200, 'cloud', {radius: 100, opacity: 0.45}),
    r(700, 260, 800, 120, 'cloud', {radius: 60, opacity: 0.35}),
  ],
});

const CITY = asset({
  id: 'last-train.city',
  type: 'background',
  group: 'environment',
  layer: 'far',
  depth: 0.12,
  size: {width: 3400, height: 360},
  animation: 'none',
  description: 'Distant town silhouette with a few lit windows and a church spire.',
  placeholder: [
    ...row(17, i => r(i * 200, 120 + ((i * 53) % 110), 190, 240 - ((i * 53) % 110), 'city')),
    r(1480, 0, 40, 200, 'city'),
    ...row(22, i => r(40 + i * 150, 190 + ((i * 37) % 90), 12, 16, 'cityLight', {opacity: 0.55})),
  ],
});

const STATION = asset({
  id: 'last-train.station.background',
  type: 'background',
  group: 'environment',
  layer: 'background',
  depth: 0.3,
  size: {width: 1700, height: 760},
  animation: 'none',
  animationNote: 'Static art. Window glow is a separate light layer.',
  description: 'The booking hall: brick, a tall clock tower on the left, lit waiting-room windows.',
  placeholder: [
    // Clock tower
    r(200, 0, 320, 760, 'brickDark'),
    r(180, 0, 360, 40, 'stone'),
    r(230, 60, 260, 260, 'brick'),
    // Booking hall
    r(520, 200, 1180, 560, 'brick'),
    r(480, 180, 1220, 36, 'stone'),
    // Waiting-room windows (one holds the waiting-room clock)
    ...row(4, i => r(620 + i * 250, 300, 170, 220, 'window', {radius: 6})),
    ...row(4, i => r(628 + i * 250, 308, 154, 204, 'windowGlow', {opacity: i === 1 ? 0.55 : 0.28, radius: 4})),
    // Scorch marks under the clock
    r(300, 330, 30, 220, 'shadow', {opacity: 0.6}),
    r(380, 330, 18, 160, 'shadow', {opacity: 0.5}),
  ],
});

const PLATFORM = asset({
  id: 'last-train.station.platform',
  type: 'background',
  group: 'environment',
  layer: 'midground',
  depth: 0.75,
  size: {width: 5600, height: 320},
  animation: 'none',
  description: 'Platform two: wet stone slabs with a painted edge and puddles reflecting the lamps.',
  placeholder: [
    r(0, 0, 5600, 320, 'stone'),
    r(0, 0, 5600, 18, 'paper', {opacity: 0.55}),
    r(0, 18, 5600, 10, 'stoneLight'),
    ...row(14, i => r(i * 400 + 60, 120 + ((i * 41) % 90), 220, 26, 'lampGlow', {radius: 13, opacity: 0.12})),
  ],
});

const TRACKS = asset({
  id: 'last-train.tracks',
  type: 'background',
  group: 'environment',
  layer: 'midground',
  depth: 0.6,
  size: {width: 5600, height: 90},
  animation: 'none',
  description: 'Rails and sleepers running the length of the platform.',
  placeholder: [
    r(0, 30, 5600, 60, 'iron'),
    ...row(56, i => r(i * 100, 38, 60, 44, 'wood', {opacity: 0.7})),
    r(0, 34, 5600, 8, 'rail'),
    r(0, 70, 5600, 8, 'rail'),
  ],
});

const LAMP = asset({
  id: 'last-train.station.lights',
  type: 'object',
  group: 'environment',
  layer: 'midground',
  depth: 0.75,
  size: {width: 90, height: 560},
  animation: 'triggered',
  animationNote: 'Lamp head glow flickers (effect: flicker). Final art: lamp without glow; glow stays procedural.',
  description: 'Cast-iron platform gas lamp.',
  light: {x: 45, y: 50, radius: 170, color: 'lampGlow', strength: 0.14, flicker: true},
  placeholder: [r(38, 60, 14, 500, 'iron'), r(20, 20, 50, 60, 'ironLight', {radius: 8}), r(28, 30, 34, 40, 'lamp', {radius: 6, role: 'lamp-head'})],
});

const POLE = asset({
  id: 'last-train.foreground.pole',
  type: 'foreground',
  group: 'environment',
  layer: 'foreground',
  depth: 1,
  size: {width: 110, height: 1200},
  animation: 'none',
  description: 'Canopy column close to the camera, almost black.',
  placeholder: [r(20, 0, 70, 1200, 'iron'), r(0, 0, 110, 60, 'iron')],
});

const BENCH = asset({
  id: 'last-train.bench',
  type: 'object',
  group: 'object',
  layer: 'midground',
  depth: 0.75,
  size: {width: 320, height: 120},
  animation: 'none',
  description: 'Wooden platform bench.',
  placeholder: [r(0, 20, 320, 26, 'wood'), r(0, 56, 320, 18, 'woodLight'), r(20, 74, 16, 46, 'iron'), r(284, 74, 16, 46, 'iron')],
});

// ── Train ──────────────────────────────────────────────────────────────
// One 2600×380 box; parts share it so they line up at any position.
const TRAIN_W = 2600;
const TRAIN_H = 380;
const CARS = 4;
const CAR_W = TRAIN_W / CARS;
/** Door of carriage C (the boarding door), in train space. */
export const BOARDING_DOOR = {x: 1 * CAR_W + CAR_W / 2 - 50, y: 110, w: 100, h: 230};

const TRAIN = asset({
  id: 'last-train.train',
  type: 'animation',
  group: 'train',
  layer: 'midground',
  depth: 0.6,
  size: {width: TRAIN_W, height: TRAIN_H},
  animation: 'states',
  animationNote: 'States: far, approaching, arriving, stopped, doors-opening, boarding, departing. Movement is code-driven; final art = side view of engine + 3 carriages, wheels as a separate strip for rotation.',
  description: 'The Northern Star: a green-and-brass night train (engine + carriages A–C + mail van), side view.',
  placeholder: [
    ...row(CARS, i => r(i * CAR_W + 10, 60, CAR_W - 20, 290, 'trainBody', {radius: 18})),
    ...row(CARS, i => r(i * CAR_W + 10, 60, CAR_W - 20, 30, 'trainDark', {radius: 14})),
    ...row(CARS, i => r(i * CAR_W + 10, 250, CAR_W - 20, 10, 'trainTrim')),
    // Engine nose on the right-hand car
    r(TRAIN_W - 120, 20, 80, 60, 'trainDark', {radius: 10}),
    // Wheels
    ...row(CARS * 4, i => r(Math.floor(i / 4) * CAR_W + 60 + (i % 4) * 150, 330, 50, 50, 'iron', {radius: 25, role: 'wheel'})),
    // Carriage letters
    ...row(CARS, i => r(i * CAR_W + 20, 270, 60, 40, 'trainTrim', {text: ['D', 'C', 'B', 'A'][i], textColor: 'ink', textSize: 26, opacity: 0.9})),
  ],
});

const TRAIN_WINDOWS = asset({
  id: 'last-train.train.windows',
  type: 'animation',
  group: 'train',
  layer: 'midground',
  depth: 0.6,
  size: {width: TRAIN_W, height: TRAIN_H},
  animation: 'loop',
  animationNote: 'Warm window light; gently flickers while moving.',
  description: 'Carriage windows with drawn blinds lit from inside.',
  placeholder: row(CARS * 4, i => {
    const car = Math.floor(i / 4);
    const k = i % 4;
    // Two windows either side of the centre door.
    const x = car * CAR_W + (k < 2 ? 30 + k * 120 : 400 + (k - 2) * 120);
    return r(x, 110, 100, 100, 'windowGlow', {radius: 6, opacity: 0.7, role: 'window'});
  }),
});

const TRAIN_DOORS = asset({
  id: 'last-train.train.doors',
  type: 'animation',
  group: 'train',
  layer: 'midground',
  depth: 0.6,
  size: {width: TRAIN_W, height: TRAIN_H},
  animation: 'states',
  animationNote: 'Each door = two leaves (role door-left / door-right) that slide apart during doors-opening.',
  description: 'Carriage doors (one per car).',
  placeholder: row(CARS, i => i).flatMap(i => {
    const cx = i * CAR_W + CAR_W / 2;
    return [
      r(cx - 50, BOARDING_DOOR.y, 50, BOARDING_DOOR.h, 'trainDark', {role: 'door-left'}),
      r(cx, BOARDING_DOOR.y, 50, BOARDING_DOOR.h, 'trainDark', {role: 'door-right'}),
      r(cx - 2, BOARDING_DOOR.y, 4, BOARDING_DOOR.h, 'trainTrim', {role: 'door-seam', opacity: 0.8}),
    ];
  }),
});

const TRAIN_DOORWAY = asset({
  id: 'last-train.train.doorway',
  type: 'object',
  group: 'train',
  layer: 'midground',
  depth: 0.6,
  size: {width: BOARDING_DOOR.w, height: BOARDING_DOOR.h},
  animation: 'triggered',
  description: 'Warm light spilling from the open door of carriage C (behind the door leaves).',
  placeholder: [r(0, 0, BOARDING_DOOR.w, BOARDING_DOOR.h, 'windowGlow', {opacity: 0.85}), r(10, 40, 80, 190, 'upholstery', {opacity: 0.35})],
});

const TRAIN_HEADLIGHTS = asset({
  id: 'last-train.train.headlights',
  type: 'effect',
  group: 'train',
  layer: 'midground',
  depth: 0.6,
  size: {width: TRAIN_W, height: TRAIN_H},
  animation: 'triggered',
  animationNote: 'On while the train runs. The beam is procedural.',
  description: 'Engine headlamp at the front (right) of the train.',
  placeholder: [r(TRAIN_W - 60, 120, 40, 40, 'headlight', {radius: 20, role: 'headlight'})],
});

const TRAIN_INTERIOR = asset({
  id: 'last-train.train.interior',
  type: 'background',
  group: 'train',
  layer: 'background',
  depth: 0.35,
  size: {width: 2400, height: 1080},
  animation: 'none',
  description: 'Sleeper carriage corridor: panelled wood, compartment doors, brass fittings, windows onto the storm.',
  placeholder: [
    r(0, 0, 2400, 1080, 'wood'),
    r(0, 0, 2400, 120, 'trainDark'),
    r(0, 860, 2400, 220, 'coatDark'),
    r(0, 850, 2400, 12, 'brass', {opacity: 0.8}),
    // Windows onto the night
    ...row(5, i => r(120 + i * 460, 220, 300, 300, 'window', {radius: 14})),
    ...row(5, i => r(132 + i * 460, 232, 276, 276, 'sky', {radius: 10})),
    // Wall lamps
    ...row(5, i => r(460 + i * 460, 300, 40, 60, 'lamp', {radius: 10, opacity: 0.9, role: 'lamp-head'})),
    // Compartment numbers
    ...row(5, i => r(470 + i * 460, 580, 60, 60, 'brass', {text: String(i + 5), textColor: 'ink', textSize: 30, radius: 30, opacity: 0.9})),
  ],
});

const VESTIBULE = asset({
  id: 'last-train.train.vestibule',
  type: 'background',
  group: 'train',
  layer: 'background',
  depth: 0.35,
  size: {width: 2200, height: 1080},
  animation: 'none',
  description: 'Inside the door of carriage C: the vestibule, a view back out to the rain-swept platform.',
  placeholder: [
    r(0, 0, 2200, 1080, 'woodLight'),
    r(0, 0, 2200, 140, 'trainDark'),
    r(200, 180, 700, 760, 'trainDark', {radius: 10}),
    r(220, 200, 660, 720, 'skyLow', {radius: 8}),
    r(220, 700, 660, 220, 'stone', {opacity: 0.7}),
    r(1200, 300, 600, 520, 'wood', {radius: 8}),
    r(1260, 360, 480, 400, 'upholstery', {radius: 8, opacity: 0.8}),
    r(0, 940, 2200, 140, 'coatDark'),
  ],
});

// ── Character ──────────────────────────────────────────────────────────

const DETECTIVE = asset({
  id: 'last-train.detective',
  type: 'character',
  group: 'character',
  layer: 'character',
  depth: 0.8,
  size: {width: 240, height: 560},
  animation: 'states',
  animationNote: 'Layers: shadow, body, coat, face, dialogue pose. States: enter, idle (breathing), talk, react, exit. Final: layered PNG/WebP parts or a short sprite per state.',
  description: 'The detective: long coat, hat brim low, seen from the side-back. Placeholder silhouette.',
  placeholder: [
    r(30, 530, 180, 30, 'shadow', {radius: 15, opacity: 0.5, role: 'shadow'}),
    r(70, 250, 100, 280, 'coatDark', {radius: 12, role: 'legs'}),
    r(50, 120, 140, 300, 'coat', {radius: 30, role: 'body'}),
    r(96, 70, 56, 70, 'skin', {radius: 26, role: 'face'}),
    r(64, 52, 120, 26, 'hat', {radius: 12, role: 'hat'}),
    r(88, 20, 72, 44, 'hat', {radius: 14, role: 'hat'}),
    r(50, 150, 140, 16, 'coatDark', {role: 'collar'}),
  ],
});

// ── Objects (interactive) ──────────────────────────────────────────────

const CLOCK = asset({
  id: 'last-train.clock',
  type: 'object',
  group: 'object',
  layer: 'interactive',
  depth: 0.3,
  size: {width: 200, height: 200},
  animation: 'none',
  animationNote: 'Static; cracked glass. Hands frozen at 11:59 (the clue): the clock runs twelve minutes fast, so the true moment is 11:47.',
  description: 'The platform clock on the tower: blackened, cracked, stopped.',
  placeholder: [
    ...clockFace({size: 200, time: {hours: 11, minutes: 59}, rim: 'brass', face: 'paper', rimRatio: 0.06}),
    // Cracked glass: faint, jagged and off the hub, so it never reads as a hand.
    r(118, 128, 44, 2, 'shadow', {rotate: 38, opacity: 0.45, role: 'crack'}),
    r(138, 146, 30, 2, 'shadow', {rotate: -24, opacity: 0.4, role: 'crack'}),
    r(126, 150, 22, 2, 'shadow', {rotate: 70, opacity: 0.35, role: 'crack'}),
  ],
});

const NOTICE = asset({
  id: 'last-train.notice',
  type: 'object',
  group: 'object',
  layer: 'interactive',
  depth: 0.3,
  size: {width: 180, height: 120},
  animation: 'none',
  description: 'Company notice pinned beneath the clock.',
  placeholder: [r(0, 0, 180, 120, 'paper'), ...row(5, i => r(18, 18 + i * 18, i === 2 ? 144 : 110 + ((i * 17) % 30), 6, 'ink', {opacity: 0.6}))],
});

const WAITING_CLOCK = asset({
  id: 'last-train.waiting-room-clock',
  type: 'object',
  group: 'object',
  layer: 'interactive',
  depth: 0.3,
  size: {width: 90, height: 90},
  animation: 'loop',
  animationNote: 'Second hand ticking (optional).',
  description: 'The waiting-room wall clock, seen through the window. Still ticking.',
  // True time, still running: 11:53, a few minutes after it happened.
  placeholder: clockFace({size: 90, time: {hours: 11, minutes: 53, seconds: 20}, rim: 'woodLight', face: 'paper', rimRatio: 0.09, secondHand: true}),
});

const SUITCASE = asset({
  id: 'last-train.suitcase',
  type: 'object',
  group: 'object',
  layer: 'interactive',
  depth: 0.78,
  size: {width: 170, height: 120},
  animation: 'none',
  description: 'An abandoned suitcase on the platform, tagged for carriage B.',
  placeholder: [r(0, 20, 170, 100, 'woodLight', {radius: 10}), r(60, 0, 50, 26, 'iron', {radius: 8, stroke: 6}), r(10, 60, 150, 8, 'wood'), r(120, 70, 36, 24, 'paper')],
});

const NEWSPAPER = asset({
  id: 'last-train.newspaper',
  type: 'object',
  group: 'object',
  layer: 'interactive',
  depth: 0.76,
  size: {width: 150, height: 60},
  animation: 'none',
  description: "Tonight's evening paper, left on the bench.",
  // The print turns with the paper: everything pivots on the paper's centre.
  placeholder: (() => {
    const tilt = {rotate: -4, pivot: {x: 75, y: 35}};
    return [r(0, 10, 150, 50, 'paper', tilt), r(12, 20, 90, 8, 'ink', {...tilt, opacity: 0.7}), r(12, 36, 120, 5, 'ink', {...tilt, opacity: 0.4})];
  })(),
});

const TICKET = asset({
  id: 'last-train.ticket',
  type: 'object',
  group: 'object',
  layer: 'interactive',
  depth: 0.8,
  size: {width: 150, height: 80},
  animation: 'none',
  description: 'A torn ticket in a puddle on the platform.',
  // Fills its box so the focus frame hugs it. The print turns with the ticket (pivot: its centre).
  placeholder: [
    r(0, 50, 150, 30, 'lampGlow', {radius: 15, opacity: 0.15}),
    r(6, 5, 138, 70, 'paper', {rotate: 6, pivot: {x: 75, y: 40}}),
    r(22, 22, 80, 8, 'ink', {rotate: 6, pivot: {x: 75, y: 40}, opacity: 0.6}),
    r(22, 42, 54, 6, 'ink', {rotate: 6, pivot: {x: 75, y: 40}, opacity: 0.4}),
  ],
});

const DEPARTURE_BOARD = asset({
  id: 'last-train.departure-board',
  type: 'object',
  group: 'object',
  layer: 'interactive',
  depth: 0.45,
  size: {width: 420, height: 200},
  animation: 'none',
  description: 'Hanging departure board with four trains listed.',
  placeholder: [
    r(200, 0, 20, 40, 'iron'),
    r(0, 40, 420, 160, 'iron', {radius: 6}),
    ...row(4, i => r(20, 60 + i * 34, 380, 24, 'ink', {text: ['107 DEPARTED', '207 HELD 00:00', '307 CANCELLED', '407 MONDAYS'][i], textColor: 'lamp', textSize: 16})),
  ],
});

const CARRIAGE_PLAN = asset({
  id: 'last-train.carriage-plan',
  type: 'object',
  group: 'object',
  layer: 'interactive',
  depth: 0.6,
  size: {width: 120, height: 150},
  animation: 'none',
  description: 'Framed carriage plan fixed beside the door.',
  placeholder: [r(0, 0, 120, 150, 'brass', {radius: 4}), r(8, 8, 104, 134, 'paper'), ...row(4, i => r(18, 22 + i * 30, 84, 20, (['danger', 'window', 'trainBody', 'rail'] as const)[i]!, {opacity: 0.8}))],
});

const SEAT = asset({
  id: 'last-train.carriage.props',
  type: 'object',
  group: 'object',
  layer: 'midground',
  depth: 0.7,
  size: {width: 420, height: 300},
  animation: 'none',
  description: 'Sleeper compartment bench seat (reused for seats seven and eight).',
  placeholder: [r(0, 0, 420, 190, 'upholstery', {radius: 20}), r(0, 170, 420, 90, 'upholstery', {radius: 14, opacity: 0.85}), r(0, 250, 420, 50, 'coatDark')],
});

const LEDGER = asset({
  id: 'last-train.ledger',
  type: 'object',
  group: 'object',
  layer: 'interactive',
  depth: 0.72,
  size: {width: 170, height: 110},
  animation: 'none',
  description: "The conductor's ledger, left open on the seat.",
  placeholder: [r(0, 0, 170, 110, 'coatDark', {radius: 6}), r(8, 6, 76, 98, 'paper'), r(86, 6, 76, 98, 'paper'), ...row(4, i => r(16, 20 + i * 20, 58, 4, 'ink', {opacity: 0.6}))],
});

const POCKET_WATCH = asset({
  id: 'last-train.pocket-watch',
  type: 'object',
  group: 'object',
  layer: 'interactive',
  depth: 0.72,
  size: {width: 160, height: 90},
  animation: 'none',
  description: 'The gap beneath seat seven, where something brass catches the light.',
  // Stopped where it fell: 11:47, the moment itself.
  placeholder: [r(0, 0, 160, 90, 'shadow', {radius: 24, opacity: 0.6}), ...clockFace({x: 47, y: 12, size: 66, time: {hours: 11, minutes: 47}, rim: 'brass', face: 'paper', rimRatio: 0.1, marks: false})],
});

const SEAT_CARD = asset({
  id: 'last-train.seat-card',
  type: 'object',
  group: 'object',
  layer: 'interactive',
  depth: 0.7,
  size: {width: 110, height: 70},
  animation: 'none',
  description: 'Reservation card in the brass holder of seat eight.',
  placeholder: [r(0, 0, 110, 70, 'brass', {radius: 4}), r(8, 8, 94, 54, 'paper', {text: '8', textColor: 'ink', textSize: 28})],
});

const BRAKE = asset({
  id: 'last-train.brake',
  type: 'object',
  group: 'object',
  layer: 'interactive',
  depth: 0.7,
  size: {width: 100, height: 200},
  animation: 'none',
  description: 'Emergency brake handle in a red box on the corridor wall.',
  placeholder: [r(0, 0, 100, 200, 'danger', {radius: 6}), r(20, 30, 60, 30, 'paper', {text: 'PULL', textColor: 'ink', textSize: 18}), r(40, 80, 20, 90, 'iron'), r(20, 160, 60, 20, 'iron', {radius: 8})],
});

const SIGNAL_BOX = asset({
  id: 'last-train.signal-box.interior',
  type: 'background',
  group: 'environment',
  layer: 'background',
  depth: 0.35,
  size: {width: 2300, height: 1080},
  animation: 'none',
  description: 'Inside the signal box: timber walls, a long window over the tracks, the lamp-room door at the back.',
  placeholder: [
    r(0, 0, 2300, 1080, 'wood'),
    r(100, 140, 2100, 360, 'window', {radius: 8}),
    r(116, 156, 2068, 328, 'sky'),
    ...row(8, i => r(116 + i * 262, 156, 10, 328, 'wood')),
    r(0, 800, 2300, 280, 'brickDark'),
  ],
});

const LEVER_FRAME = asset({
  id: 'last-train.lever-frame',
  type: 'object',
  group: 'object',
  layer: 'interactive',
  depth: 0.7,
  size: {width: 900, height: 360},
  animation: 'none',
  description: 'The lever frame: a long brass row of numbered levers; one is marked BLACKWATER.',
  placeholder: [
    r(0, 300, 900, 60, 'iron'),
    // Levers hinge at the frame; the pulled one (BLACKWATER) leans back from its base.
    ...row(12, i => r(30 + i * 72, 40, 18, 270, i === 7 ? 'danger' : 'brass', {radius: 8, rotate: i === 7 ? -14 : 0, pivot: {x: 39 + i * 72, y: 305}})),
  ],
});

const LAMP_ROOM_DOOR = asset({
  id: 'last-train.lamp-room-door',
  type: 'object',
  group: 'object',
  layer: 'interactive',
  depth: 0.45,
  size: {width: 240, height: 440},
  animation: 'none',
  description: 'The bolted lamp-room door.',
  placeholder: [r(0, 0, 240, 440, 'woodLight', {radius: 4}), r(20, 20, 200, 180, 'wood'), r(20, 230, 200, 190, 'wood'), r(170, 210, 50, 20, 'iron', {radius: 6})],
});

// ── Effects (procedural renderers; final art optional) ────────────────

const effect = (id: string, desc: string, depth: number, layer: AssetDefinition['layer'] = 'effects', animation: AssetDefinition['animation'] = 'particles', note?: string): AssetDefinition =>
  asset({id, type: 'effect', group: 'effect', layer, depth, size: {width: 1920, height: 1080}, animation, animationNote: note, description: desc, placeholder: []});

export const lastTrainManifest: AssetManifest = {
  mysteryId: 'the-last-train',
  idPrefix: 'last-train.',
  basePath: 'mysteries/the-last-train',
  assets: [
    SKY,
    CITY,
    STATION,
    PLATFORM,
    TRACKS,
    LAMP,
    POLE,
    BENCH,
    TRAIN,
    TRAIN_WINDOWS,
    TRAIN_DOORS,
    TRAIN_DOORWAY,
    TRAIN_HEADLIGHTS,
    TRAIN_INTERIOR,
    VESTIBULE,
    DETECTIVE,
    CLOCK,
    NOTICE,
    WAITING_CLOCK,
    SUITCASE,
    NEWSPAPER,
    TICKET,
    DEPARTURE_BOARD,
    CARRIAGE_PLAN,
    SEAT,
    LEDGER,
    POCKET_WATCH,
    SEAT_CARD,
    BRAKE,
    SIGNAL_BOX,
    LEVER_FRAME,
    LAMP_ROOM_DOOR,
    effect('last-train.rain', 'Rain in three depth bands (far/mid/near), different speeds and lengths.', 1, 'effects', 'particles', '≤ 42 streaks total; loops only while visible.'),
    effect('last-train.fog', 'Low fog drifting along the platform.', 0.5, 'effects', 'loop'),
    effect('last-train.steam', 'Steam from under the train while it brakes and stands.', 0.6, 'effects', 'particles', 'Triggered by train state.'),
    effect('last-train.smoke', 'Smoke from the engine chimney.', 0.6, 'effects', 'particles'),
    effect('last-train.light', 'Lamp glow pools and flicker; window glow.', 0.75, 'effects', 'triggered'),
    effect('last-train.lightning', 'Sky-wide lightning flash.', 0, 'effects', 'triggered'),
  ],
};

export const TRAIN_SIZE = {width: TRAIN_W, height: TRAIN_H};
