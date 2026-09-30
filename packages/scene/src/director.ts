/**
 * SceneDirector: plays data-driven timelines against a presentation state.
 *
 * The director owns WHAT IS SHOWN (set, mode, train, effects, characters,
 * dialogue, captions, fades) and drives the camera. It owns nothing about the
 * game: it never sees answers, never changes GameState, and can be skipped or
 * replayed freely. Sequences are data (SceneTimeline); no component hard-codes one.
 *
 * Time is always passed in (`now`), so the director is deterministic and
 * testable without timers. Dialogue pauses the timeline until it is finished.
 */
import type {
  CharacterState,
  EffectId,
  SceneMode,
  SceneTimeline,
  SceneWorld,
  SetTransition,
  TimelineAction,
  TimelineEvent,
  TrainDefinition,
  TrainState,
} from '@roomriddle/shared-types';
import {CameraController, focusShot, VIEW_CENTER} from './camera';
import type {PlacedNode} from './layout';
import {centerOf} from './layout';
import {canTransition, trainX, type TrainMotion} from './train';

export interface Tween {
  from: number;
  to: number;
  start: number;
  duration: number;
}

export function tweenValue(t: Tween, now: number): number {
  if (t.duration <= 0 || now >= t.start + t.duration) {
    return t.to;
  }
  if (now <= t.start) {
    return t.from;
  }
  return t.from + (t.to - t.from) * ((now - t.start) / t.duration);
}

export interface CharacterPresence {
  state: CharacterState;
  nodeId?: string;
  since: number;
}

export interface Caption {
  text: string;
  style: 'time' | 'place' | 'title';
  start: number;
  until: number;
}

export interface DialogueRun {
  lineIds: string[];
  index: number;
  /** Mode to return to when the dialogue ends. */
  resume: SceneMode;
  /** Character that leaves when the dialogue ends (reactions). */
  exitAfter?: string;
}

export interface SetChange {
  from: string;
  to: string;
  transition: SetTransition;
  start: number;
  duration: number;
}

/** Everything the renderer needs besides the camera. Plain data. */
export interface PresentationState {
  setId: string;
  setChange: SetChange | null;
  mode: SceneMode;
  interactionEnabled: boolean;
  train: TrainMotion | null;
  effects: Partial<Record<EffectId, boolean>>;
  characters: Record<string, CharacterPresence>;
  dialogue: DialogueRun | null;
  caption: Caption | null;
  /** Black overlay opacity (1 = black screen). */
  fade: Tween;
  /** Night overlay opacity. */
  darkness: Tween;
  /** Node visibility overrides. */
  nodeVisibility: Record<string, Tween>;
  /** Custom events fired so far, in order (hooks for later phases, e.g. P7 audio). */
  customEvents: {name: string; payload?: Record<string, unknown>; at: number}[];
}

export interface DirectorOptions {
  world: SceneWorld;
  camera: CameraController;
  train?: TrainDefinition;
  /** Where nodes are (for camera focus and follow). */
  nodeOf: (setId: string, nodeId: string) => PlacedNode | undefined;
  now: number;
  /** Mode when no timeline is running. */
  initialMode?: SceneMode;
}

type Listener = (fired: readonly TimelineEvent[], state: PresentationState) => void;

export class SceneDirector {
  readonly camera: CameraController;
  private readonly world: SceneWorld;
  private readonly trainDef?: TrainDefinition;
  private readonly nodeOf: DirectorOptions['nodeOf'];
  private s: PresentationState;
  private timeline: SceneTimeline | null = null;
  private cursor = 0;
  private elapsed = 0;
  private lastNow: number;
  private listeners = new Set<Listener>();

  constructor(opts: DirectorOptions) {
    this.world = opts.world;
    this.camera = opts.camera;
    this.trainDef = opts.train;
    this.nodeOf = opts.nodeOf;
    this.lastNow = opts.now;
    const set = this.setById(opts.world.initialSetId);
    this.s = {
      setId: set.id,
      setChange: null,
      mode: opts.initialMode ?? 'investigation',
      interactionEnabled: true,
      train: set.train ? {from: set.train.state, to: set.train.state, startedAt: opts.now} : null,
      effects: Object.fromEntries(set.effects.map(e => [e, true])),
      characters: {},
      dialogue: null,
      caption: null,
      fade: {from: 0, to: 0, start: opts.now, duration: 0},
      darkness: {from: set.darkness, to: set.darkness, start: opts.now, duration: 0},
      nodeVisibility: {},
      customEvents: [],
    };
    this.camera.cut(set.camera);
  }

  get state(): Readonly<PresentationState> {
    return this.s;
  }

  get playing(): SceneTimeline | null {
    return this.timeline;
  }

  /** ms into the running timeline (paused while dialogue is open). */
  get position(): number {
    return this.elapsed;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Start a timeline from its beginning. */
  play(timelineId: string, now: number): void {
    const tl = this.world.timelines.find(t => t.id === timelineId);
    if (!tl) {
      throw new Error(`Unknown timeline ${timelineId}`);
    }
    this.timeline = {...tl, events: [...tl.events].sort((a, b) => a.at - b.at)};
    this.cursor = 0;
    this.elapsed = 0;
    this.lastNow = now;
    this.s = {...this.s, mode: 'cinematic', interactionEnabled: false};
    this.update(now);
  }

  /** Advance to `now`, firing every event that is due. Returns what fired. */
  update(now: number): TimelineEvent[] {
    const dt = Math.max(0, now - this.lastNow);
    this.lastNow = now;
    const fired: TimelineEvent[] = [];
    if (this.timeline && !this.s.dialogue) {
      this.elapsed += dt;
      const events = this.timeline.events;
      while (this.cursor < events.length && events[this.cursor]!.at <= this.elapsed) {
        const ev = events[this.cursor]!;
        this.cursor += 1;
        // Fire at the event's own moment so durations line up exactly.
        this.apply(ev, now - (this.elapsed - ev.at));
        fired.push(ev);
        if (this.s.dialogue) {
          break; // dialogue holds the timeline here
        }
      }
      if (this.cursor >= events.length && !this.s.dialogue) {
        this.finish();
      }
    }
    if (this.s.caption && now >= this.s.caption.until) {
      this.s = {...this.s, caption: null};
    }
    if (this.s.setChange && now >= this.s.setChange.start + this.s.setChange.duration) {
      this.s = {...this.s, setChange: null};
    }
    if (fired.length > 0) {
      for (const l of this.listeners) {
        l(fired, this.s);
      }
    }
    return fired;
  }

  /**
   * Jump to the end of the running timeline: every remaining state change is
   * applied instantly (no tweens), the camera cuts to where it would end, and
   * any dialogue in it is skipped.
   */
  skip(now: number): void {
    if (!this.timeline) {
      return;
    }
    const events = this.timeline.events;
    this.s = {...this.s, dialogue: null};
    while (this.cursor < events.length) {
      const ev = events[this.cursor]!;
      this.cursor += 1;
      if (ev.type === 'dialogue' || ev.type === 'caption' || ev.type === 'camera.shake') {
        continue;
      }
      this.apply(ev, now, true);
    }
    this.s = {...this.s, caption: null, setChange: null, fade: {from: 0, to: 0, start: now, duration: 0}};
    this.lastNow = now;
    this.finish();
  }

  /** Show dialogue outside a timeline (e.g. the detective reacting to a clue). */
  say(lineIds: readonly string[], characterId: string | undefined, now: number, opts: {nodeId?: string; exitAfter?: boolean} = {}): void {
    if (lineIds.length === 0) {
      return;
    }
    const resume = this.s.dialogue?.resume ?? this.s.mode;
    const characters = characterId ? {...this.s.characters, [characterId]: this.presence(characterId, 'react', now, opts.nodeId)} : this.s.characters;
    const exitAfter = opts.exitAfter && characterId ? characterId : undefined;
    this.s = {...this.s, characters, dialogue: {lineIds: [...lineIds], index: 0, resume, exitAfter}, mode: 'dialogue'};
  }

  /** OK during dialogue. Returns false once the dialogue is over. */
  advanceDialogue(now: number): boolean {
    const d = this.s.dialogue;
    if (!d) {
      return false;
    }
    if (d.index + 1 < d.lineIds.length) {
      this.s = {...this.s, dialogue: {...d, index: d.index + 1}};
      return true;
    }
    // Dialogue over: the speaker settles back to idle.
    const characters = Object.fromEntries(
      Object.entries(this.s.characters).map(([id, c]) => [
        id,
        id === d.exitAfter ? {...c, state: 'exit' as const, since: now} : c.state === 'talk' || c.state === 'react' ? {...c, state: 'idle' as const, since: now} : c,
      ]),
    );
    this.s = {...this.s, dialogue: null, characters, mode: this.timeline ? 'cinematic' : d.resume};
    this.lastNow = now;
    if (this.timeline) {
      this.update(now);
    }
    return false;
  }

  /** Inspection is entered/left by the interaction layer, not by timelines. */
  setMode(mode: SceneMode): void {
    this.s = {...this.s, mode};
  }

  /** Change the train state directly (e.g. when a scene is re-entered). */
  setTrain(state: TrainState, now: number, instant = false): void {
    const cur = this.s.train;
    const from = instant || !cur ? state : cur.to;
    if (cur && !instant && !canTransition(cur.to, state)) {
      return;
    }
    this.s = {...this.s, train: {from, to: state, startedAt: now}};
  }

  /** Where the train's centre is right now (midground space). */
  trainCenter(now: number): {x: number; y: number} | null {
    const def = this.trainDef;
    const set = this.setById(this.s.setId);
    if (!def || !this.s.train || !set.train) {
      return null;
    }
    const w = this.nodeOf(set.id, 'train')?.width ?? 1600;
    const h = this.nodeOf(set.id, 'train')?.height ?? 360;
    return {x: trainX(def, this.s.train, now) + w / 2, y: set.train.y + h / 2};
  }

  nodeVisible(nodeId: string, fallback: boolean, now: number): number {
    const t = this.s.nodeVisibility[nodeId];
    return t ? tweenValue(t, now) : fallback ? 1 : 0;
  }

  private finish(): void {
    const end = this.timeline?.endMode ?? 'investigation';
    this.timeline = null;
    this.s = {...this.s, mode: this.s.dialogue ? 'dialogue' : end, interactionEnabled: true};
    if (this.s.dialogue) {
      this.s = {...this.s, dialogue: {...this.s.dialogue, resume: end}};
    }
  }

  private presence(id: string, state: CharacterState, now: number, nodeId?: string): CharacterPresence {
    return {state, nodeId: nodeId ?? this.s.characters[id]?.nodeId, since: now};
  }

  private setById(id: string) {
    const set = this.world.sets.find(s => s.id === id);
    if (!set) {
      throw new Error(`Unknown set ${id}`);
    }
    return set;
  }

  private apply(a: TimelineAction, at: number, instant = false): void {
    const d = (ms: number) => (instant ? 0 : ms);
    switch (a.type) {
      case 'camera.cut':
        this.camera.cut(a.shot);
        break;
      case 'camera.move':
        this.camera.moveTo(a.shot, d(a.duration), a.easing ?? 'cinematic', at);
        break;
      case 'camera.focus': {
        const node = this.nodeOf(this.s.setId, a.nodeId);
        if (node) {
          const shot = focusShot(centerOf(node), node.depth, a.zoom ?? 1.4);
          this.camera.moveTo(shot, d(a.duration), a.easing ?? 'cinematic', at);
        }
        break;
      }
      case 'camera.follow': {
        if (instant) {
          const c = this.trainCenter(at);
          if (c) {
            this.camera.cut({...focusShot({x: c.x, y: VIEW_CENTER.y}, this.nodeOf(this.s.setId, 'train')?.depth ?? 0.5, this.camera.sample(at, false).zoom)});
          }
          break;
        }
        const depth = this.nodeOf(this.s.setId, 'train')?.depth ?? 0.5;
        this.camera.startFollow(now => this.trainCenter(now) ?? VIEW_CENTER, depth, at, Math.min(a.duration, 900));
        break;
      }
      case 'camera.release':
        this.camera.release(at);
        break;
      case 'camera.shake':
        if (!instant) {
          this.camera.startShake(a.intensity, a.duration, at);
        }
        break;
      case 'camera.reset':
        // Back to the current set's resting shot (where players get control).
        this.camera.moveTo(this.setById(this.s.setId).camera, d(a.duration), 'standard', at);
        break;
      case 'train.state':
        this.setTrain(a.state, at, instant);
        break;
      case 'effect':
        this.s = {...this.s, effects: {...this.s.effects, [a.effect]: a.on}};
        break;
      case 'fade':
        this.s = {...this.s, fade: {from: this.currentFade(at), to: a.to, start: at, duration: d(a.duration)}};
        break;
      case 'darkness':
        this.s = {...this.s, darkness: {from: tweenValue(this.s.darkness, at), to: a.to, start: at, duration: d(a.duration)}};
        break;
      case 'caption':
        this.s = {...this.s, caption: {text: a.text, style: a.style, start: at, until: at + a.duration}};
        break;
      case 'set': {
        const to = this.setById(a.setId);
        const change: SetChange | null = instant || a.transition === 'cut' ? null : {from: this.s.setId, to: to.id, transition: a.transition, start: at, duration: a.duration};
        this.s = {
          ...this.s,
          setId: to.id,
          setChange: change,
          effects: Object.fromEntries(to.effects.map(e => [e, true])),
          darkness: {from: to.darkness, to: to.darkness, start: at, duration: 0},
          train: to.train ? {from: to.train.state, to: to.train.state, startedAt: at} : null,
          nodeVisibility: {},
        };
        // Arriving in a set frames its own resting shot; timelines move from there.
        this.camera.cut(to.camera);
        break;
      }
      case 'node.visible': {
        const cur = this.nodeVisible(a.nodeId, true, at);
        this.s = {...this.s, nodeVisibility: {...this.s.nodeVisibility, [a.nodeId]: {from: cur, to: a.visible ? 1 : 0, start: at, duration: d(a.duration ?? 0)}}};
        break;
      }
      case 'character':
        this.s = {...this.s, characters: {...this.s.characters, [a.characterId]: this.presence(a.characterId, a.state, at, a.nodeId)}};
        break;
      case 'dialogue':
        if (!instant && a.lineIds.length > 0) {
          this.s = {...this.s, dialogue: {lineIds: [...a.lineIds], index: 0, resume: 'cinematic'}, mode: 'dialogue'};
        }
        break;
      case 'mode':
        this.s = {...this.s, mode: a.mode};
        break;
      case 'interaction':
        this.s = {...this.s, interactionEnabled: a.enabled};
        break;
      case 'custom':
        this.s = {...this.s, customEvents: [...this.s.customEvents, {name: a.name, payload: a.payload, at}]};
        break;
    }
  }

  private currentFade(now: number): number {
    return tweenValue(this.s.fade, now);
  }
}
