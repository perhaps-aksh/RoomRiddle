import type {
  Choice,
  Clue,
  GameState,
  MysteryDefinition,
  Puzzle,
  Requirement,
  Scene,
} from '@roomriddle/shared-types';

/** Lookups into mystery data. The engine only ever reads mysteries through these. */
export function findScene(mystery: MysteryDefinition, id: string | null): Scene | undefined {
  return id === null ? undefined : mystery.scenes.find((scene) => scene.id === id);
}

export function findClue(mystery: MysteryDefinition, id: string): Clue | undefined {
  return mystery.clues.find((clue) => clue.id === id);
}

export function findPuzzle(mystery: MysteryDefinition, id: string | null): Puzzle | undefined {
  return id === null ? undefined : mystery.puzzles.find((puzzle) => puzzle.id === id);
}

export function findChoice(mystery: MysteryDefinition, id: string): Choice | undefined {
  return (mystery.choices ?? []).find((choice) => choice.id === id);
}

export function majorClueIds(mystery: MysteryDefinition): string[] {
  return mystery.clues.filter((clue) => clue.major).map((clue) => clue.id);
}

export function isRequirementMet(requirement: Requirement | undefined, state: GameState): boolean {
  if (!requirement) return true;
  const clues = requirement.clueIds ?? [];
  const puzzles = requirement.puzzleIds ?? [];
  return (
    clues.every((id) => state.discoveredClueIds.includes(id)) &&
    puzzles.every((id) => state.solvedPuzzleIds.includes(id))
  );
}

/** Scenes in story order, following nextSceneId from the start scene. */
export function sceneSequence(mystery: MysteryDefinition): Scene[] {
  const ordered: Scene[] = [];
  let scene = findScene(mystery, mystery.startSceneId);
  while (scene && !ordered.includes(scene)) {
    ordered.push(scene);
    scene = findScene(mystery, scene.nextSceneId ?? null);
  }
  return ordered;
}
