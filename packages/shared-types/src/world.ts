/**
 * The 2.5D world: how a mystery LOOKS, never how it plays.
 *
 * A world is pure data (manifest, sets, objects, timelines, dialogue) that the
 * TV renders as depth layers under a camera. It never decides anything: an
 * interaction becomes an ordinary GameAction for the engine/server, and the
 * world reacts to the resulting GameState like any other client.
 *
 * Coordinates are 1920×1080 design pixels. Each layer is a full-screen plane;
 * a node's x/y are in its layer's own space. The camera offset moves a layer by
 * `camera × depth`, so near layers (depth → 1) move more than far ones (→ 0).
 */
import type {Requirement} from './mystery';

// ── Assets ─────────────────────────────────────────────────────────────

export type AssetType = 'background' | 'foreground' | 'character' | 'object' | 'effect' | 'animation';
export type AssetGroup = 'environment' | 'train' | 'character' | 'object' | 'effect';
/** placeholder = drawn procedurally today; final = production art is bundled for this id. */
export type AssetStatus = 'placeholder' | 'final';
export type AssetFormat = 'webp' | 'png' | 'procedural';
export type AssetAnimation = 'none' | 'loop' | 'states' | 'particles' | 'triggered';

/** Back to front. The UI is a separate layer above all of these. */
export type LayerId = 'far' | 'background' | 'midground' | 'interactive' | 'character' | 'foreground' | 'effects';

/**
 * Colour keys of the world palette in `@roomriddle/ui` (colors.world). Data
 * never carries raw colours, so a palette change restyles every placeholder.
 */
export type WorldColor =
  | 'black'
  | 'sky'
  | 'skyLow'
  | 'cloud'
  | 'city'
  | 'cityLight'
  | 'brick'
  | 'brickDark'
  | 'stone'
  | 'stoneLight'
  | 'iron'
  | 'ironLight'
  | 'rail'
  | 'wood'
  | 'woodLight'
  | 'trainBody'
  | 'trainTrim'
  | 'trainDark'
  | 'window'
  | 'windowGlow'
  | 'lamp'
  | 'lampGlow'
  | 'headlight'
  | 'paper'
  | 'ink'
  | 'brass'
  | 'coat'
  | 'coatDark'
  | 'hat'
  | 'skin'
  | 'shadow'
  | 'fog'
  | 'steam'
  | 'rain'
  | 'danger'
  | 'upholstery';

/** One primitive of a procedural placeholder, in the asset's own box (0,0 = top-left). */
export interface PlaceholderShape {
  x: number;
  y: number;
  w: number;
  h: number;
  color: WorldColor;
  opacity?: number;
  /** Corner radius; ≥ min(w,h)/2 draws a circle or pill. */
  radius?: number;
  /** Degrees. */
  rotate?: number;
  /** Mono text drawn centred in the box (clock faces, signs). */
  text?: string;
  textColor?: WorldColor;
  textSize?: number;
  /** Named part a renderer can animate (train doors, headlights, windows…). */
  role?: string;
  /** Outline instead of fill. */
  stroke?: number;
}

export interface AssetDefinition {
  /** Stable forever: `<mystery>.<thing>[.<part>]`. Replacing art never changes it. */
  id: string;
  type: AssetType;
  group: AssetGroup;
  layer: LayerId;
  /** Parallax depth: 0 = fixed to the sky, 1 = moves with the camera. */
  depth: number;
  format: AssetFormat;
  /** Intended size of the FINAL asset in design px. Placeholders match it. */
  size: {width: number; height: number};
  animation: AssetAnimation;
  /** What the final asset must support (frames, states, loops). */
  animationNote?: string;
  status: AssetStatus;
  /** Final file, relative to the manifest's basePath. */
  source?: string;
  /** Asset id to use if this one cannot be shown. */
  fallback?: string;
  /** Load with the scene rather than on demand. */
  preload?: boolean;
  /** Procedural stand-in, drawn when no final art is available. */
  placeholder?: PlaceholderShape[];
  /** Light this asset casts (a glow pool drawn above the night overlay), in its own box. */
  light?: {x: number; y: number; radius: number; color: 'lampGlow' | 'windowGlow' | 'headlight'; strength?: number; flicker?: boolean};
  description: string;
}

export interface AssetManifest {
  mysteryId: string;
  /** Every asset id starts with this, e.g. `last-train.`. */
  idPrefix: string;
  /** Folder of final art, e.g. `mysteries/the-last-train`. */
  basePath: string;
  assets: AssetDefinition[];
}

// ── Camera ─────────────────────────────────────────────────────────────

/** Camera offset at depth 1 plus zoom (1 = none). */
export interface CameraShot {
  x: number;
  y: number;
  zoom: number;
}

export type CameraEasing = 'linear' | 'standard' | 'enter' | 'exit' | 'cinematic';

// ── Scene composition ──────────────────────────────────────────────────

export interface WorldNode {
  id: string;
  assetId: string;
  /** Defaults to the asset's layer and depth. */
  layer?: LayerId;
  depth?: number;
  x: number;
  y: number;
  /** Defaults to the asset's size. */
  width?: number;
  height?: number;
  /** Order within a layer (higher = in front). */
  z?: number;
  visible?: boolean;
  opacity?: number;
}

export type InteractionType = 'inspect' | 'pickup' | 'open' | 'read' | 'activate';

/** Something the players can focus and select inside the world. */
export interface InteractiveObject {
  id: string;
  /** The node that draws it (its bounds are the interaction bounds unless `bounds` is set). */
  nodeId: string;
  name: string;
  interaction: InteractionType;
  /** Engine clue this object reveals. Absent = scenery with flavour text only. */
  clueId?: string;
  /** Shown before the object is examined (defaults to the clue's prompt). */
  prompt?: string;
  /** Scenery objects only: what the detective notices. */
  flavor?: string[];
  /** Game state required before the object can be interacted with. */
  requires?: Requirement;
  /** Interaction bounds in the node's layer space (defaults to the node box). */
  bounds?: {x: number; y: number; width: number; height: number};
  /** Zoom used when the camera inspects it. */
  inspectZoom?: number;
}

export type EffectId = 'rain' | 'fog' | 'steam' | 'smoke' | 'flicker' | 'headlights' | 'windowGlow' | 'lightning';

export interface WorldSet {
  id: string;
  label: string;
  nodes: WorldNode[];
  objects: InteractiveObject[];
  /** Camera shot when the set is shown and players have control. */
  camera: CameraShot;
  /** Effects running when the set is entered. */
  effects: EffectId[];
  /** 0–1: how dark the set is (a night overlay over the world, below lights). */
  darkness: number;
  /** Where the train sits in this set, if it appears. */
  train?: {y: number; state: TrainState};
}

// ── Train ──────────────────────────────────────────────────────────────

export type TrainState = 'far' | 'approaching' | 'arriving' | 'stopped' | 'doors-opening' | 'boarding' | 'departing';

export interface TrainDefinition {
  assetId: string;
  depth: number;
  /** Train x (its left edge, midground space) at rest in each state. */
  positions: Record<TrainState, number>;
  /** How long moving INTO each state takes (ms). */
  durations: Record<TrainState, number>;
  easing: Partial<Record<TrainState, CameraEasing>>;
  /** Parts that belong to the train, drawn with it. */
  parts: {doorsAssetId: string; windowsAssetId: string; headlightsAssetId: string; doorwayAssetId: string};
}

// ── Characters & dialogue ──────────────────────────────────────────────

export type CharacterState = 'hidden' | 'enter' | 'idle' | 'talk' | 'react' | 'exit';

export interface CharacterDefinition {
  id: string;
  name: string;
  assetId: string;
}

export type DialogueTrigger =
  | {type: 'timeline'}
  | {type: 'scene-entered'; sceneId: string}
  | {type: 'clue-discovered'; clueId: string}
  | {type: 'puzzle-unlocked'; puzzleId: string}
  | {type: 'puzzle-solved'; puzzleId: string};

export interface DialogueLine {
  id: string;
  characterId: string;
  text: string;
  trigger: DialogueTrigger;
  /** Phase 7 hook: the voice line for this text. Nothing plays it yet. */
  audioId?: string;
}

// ── Timelines ──────────────────────────────────────────────────────────

/** SceneModes decide what input is accepted (see @roomriddle/scene modes). */
export type SceneMode = 'cinematic' | 'exploration' | 'investigation' | 'inspection' | 'dialogue' | 'transition';

export type SetTransition = 'cut' | 'fade' | 'crossfade' | 'push' | 'pull' | 'depth';

export type TimelineAction =
  | {type: 'camera.cut'; shot: CameraShot}
  | {type: 'camera.move'; shot: CameraShot; duration: number; easing?: CameraEasing}
  | {type: 'camera.focus'; nodeId: string; zoom?: number; duration: number; easing?: CameraEasing}
  | {type: 'camera.follow'; target: 'train'; duration: number}
  | {type: 'camera.release'}
  | {type: 'camera.shake'; intensity: number; duration: number}
  /** Ease back to the current set's resting shot. */
  | {type: 'camera.reset'; duration: number}
  | {type: 'train.state'; state: TrainState}
  | {type: 'effect'; effect: EffectId; on: boolean}
  | {type: 'fade'; to: number; duration: number}
  | {type: 'darkness'; to: number; duration: number}
  | {type: 'caption'; text: string; style: 'time' | 'place' | 'title'; duration: number}
  | {type: 'set'; setId: string; transition: SetTransition; duration: number}
  | {type: 'node.visible'; nodeId: string; visible: boolean; duration?: number}
  | {type: 'character'; characterId: string; state: CharacterState; nodeId?: string}
  | {type: 'dialogue'; lineIds: string[]}
  | {type: 'mode'; mode: SceneMode}
  | {type: 'interaction'; enabled: boolean}
  | {type: 'custom'; name: string; payload?: Record<string, unknown>};

export type TimelineEvent = TimelineAction & {
  /** ms from the start of the timeline. */
  at: number;
};

export interface SceneTimeline {
  id: string;
  label: string;
  events: TimelineEvent[];
  /** Mode handed to the players when the timeline ends. */
  endMode: SceneMode;
}

export type SceneTemplate = 'cinematic' | 'investigation' | 'inspection' | 'dialogue' | 'transition';

/** The 2.5D presentation of one engine scene. */
export interface SceneWorld {
  /** Engine scene id this world presents. */
  sceneId: string;
  /** Templates this scene uses, in order of appearance. */
  templates: SceneTemplate[];
  initialSetId: string;
  sets: WorldSet[];
  /** Played the first time the players arrive (skippable). */
  entryTimelineId?: string;
  timelines: SceneTimeline[];
}

export interface MysteryWorld {
  mysteryId: string;
  manifest: AssetManifest;
  train?: TrainDefinition;
  characters: CharacterDefinition[];
  dialogue: DialogueLine[];
  scenes: SceneWorld[];
}
