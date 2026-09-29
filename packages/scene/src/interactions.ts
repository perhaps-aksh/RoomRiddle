/**
 * InteractionManager: the only bridge from the 2.5D world to the game.
 *
 *   focus object → select → GameAction → engine/server → GameState → world reacts
 *
 * What an object can do is read from GameState via the engine's selectors
 * (the same view the P5 screens use). Selecting an object produces an
 * ordinary engine action (DISCOVER_CLUE); nothing here decides success.
 */
import {getSceneView, isRequirementMet} from '@roomriddle/game-engine';
import type {Clue, DialogueLine, GameAction, GameEvent, GameState, InteractiveObject, MysteryDefinition, WorldSet} from '@roomriddle/shared-types';

export type ObjectStatus =
  /** Not reachable yet (its requirement or its clue's requirement is unmet). */
  | 'unavailable'
  /** Can be examined; its clue hasn't been found. */
  | 'available'
  /** Its clue is in the evidence. */
  | 'examined'
  /** Scenery: examinable for flavour, never produces a clue. */
  | 'scenery';

export interface ObjectView {
  object: InteractiveObject;
  status: ObjectStatus;
  clue?: Clue;
  /** Short action line under the name, e.g. "INSPECT · Look up at the platform clock". */
  prompt: string;
}

const VERB: Record<InteractiveObject['interaction'], string> = {
  inspect: 'Inspect',
  pickup: 'Pick up',
  open: 'Open',
  read: 'Read',
  activate: 'Use',
};

export function verbFor(obj: InteractiveObject): string {
  return VERB[obj.interaction];
}

/** Every object of a set with what it can do right now, in set order. */
export function objectViews(set: WorldSet, mystery: MysteryDefinition, state: GameState): ObjectView[] {
  const scene = getSceneView(mystery, state);
  const available = new Map(scene?.clues.map(c => [c.clue.id, c]) ?? []);
  return set.objects.map(object => {
    if (!isRequirementMet(object.requires, state)) {
      return {object, status: 'unavailable' as const, prompt: object.prompt ?? ''};
    }
    if (object.clueId === undefined) {
      return {object, status: 'scenery' as const, prompt: object.prompt ?? verbFor(object)};
    }
    const cv = available.get(object.clueId);
    const clue = mystery.clues.find(c => c.id === object.clueId);
    if (state.discoveredClueIds.includes(object.clueId)) {
      return {object, status: 'examined' as const, clue, prompt: clue?.title ?? object.name};
    }
    if (!cv) {
      return {object, status: 'unavailable' as const, clue, prompt: object.prompt ?? clue?.prompt ?? ''};
    }
    return {object, status: 'available' as const, clue, prompt: object.prompt ?? clue?.prompt ?? verbFor(object)};
  });
}

/** The engine action for selecting an object, or null when there is nothing to send. */
export function actionFor(view: ObjectView): GameAction | null {
  if (view.status !== 'available' || view.object.clueId === undefined) {
    return null;
  }
  return {type: 'DISCOVER_CLUE', clueId: view.object.clueId};
}

/** Objects the players should be able to focus (unavailable ones stay hidden in the world). */
export function focusable(views: readonly ObjectView[]): ObjectView[] {
  return views.filter(v => v.status !== 'unavailable');
}

/**
 * Engine events → authored dialogue lines that should play, in order.
 * Works identically for local play and for state that arrived from the
 * server after another player acted.
 */
export function dialogueFor(events: readonly GameEvent[], lines: readonly DialogueLine[], alreadyPlayed: ReadonlySet<string> = new Set()): DialogueLine[] {
  const out: DialogueLine[] = [];
  for (const ev of events) {
    for (const line of lines) {
      if (alreadyPlayed.has(line.id) || out.includes(line)) {
        continue;
      }
      const t = line.trigger;
      const hit =
        (t.type === 'clue-discovered' && ev.type === 'clue-discovered' && ev.clueId === t.clueId) ||
        (t.type === 'puzzle-unlocked' && ev.type === 'puzzle-unlocked' && ev.puzzleId === t.puzzleId) ||
        (t.type === 'puzzle-solved' && ev.type === 'answer-correct' && ev.puzzleId === t.puzzleId) ||
        (t.type === 'scene-entered' && ev.type === 'scene-entered' && ev.sceneId === t.sceneId);
      if (hit) {
        out.push(line);
      }
    }
  }
  return out;
}

/**
 * What changed between two authoritative states, as the events a client
 * would have seen. Lets a TV react to things OTHER players did (their
 * phone sent the action; the server's snapshot is all we get).
 */
export function diffEvents(before: GameState | null, after: GameState): GameEvent[] {
  const events: GameEvent[] = [];
  const had = new Set(before?.discoveredClueIds ?? []);
  for (const id of after.discoveredClueIds) {
    if (!had.has(id)) {
      events.push({type: 'clue-discovered', clueId: id, points: 0});
    }
  }
  const unlocked = new Set(before?.unlockedPuzzleIds ?? []);
  for (const id of after.unlockedPuzzleIds) {
    if (!unlocked.has(id)) {
      events.push({type: 'puzzle-unlocked', puzzleId: id});
    }
  }
  const solved = new Set(before?.solvedPuzzleIds ?? []);
  for (const id of after.solvedPuzzleIds) {
    if (!solved.has(id)) {
      events.push({type: 'answer-correct', puzzleId: id, breakdown: {base: 0, hintDeduction: 0, awarded: 0}});
    }
  }
  if (after.currentSceneId !== null && after.currentSceneId !== (before?.currentSceneId ?? null)) {
    events.push({type: 'scene-entered', sceneId: after.currentSceneId});
  }
  return events;
}
