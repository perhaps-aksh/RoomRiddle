import type {MysteryDefinition} from '@roomriddle/shared-types';
import {findScene, sceneSequence} from './mystery';
import {normalizeAnswer} from './validation';

/**
 * Structural checks for authored mystery data. Returns a list of problems
 * (empty = valid). Run in tests for every playable mystery, so a typo in an
 * id or an unreachable scene fails the build instead of the game night.
 */
export function validateMysteryDefinition(mystery: MysteryDefinition): string[] {
  const problems: string[] = [];
  const dupes = (label: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) problems.push(`duplicate ${label} id "${id}"`);
      seen.add(id);
    }
  };

  const sceneIds = mystery.scenes.map((s) => s.id);
  const clueIds = mystery.clues.map((c) => c.id);
  const puzzleIds = mystery.puzzles.map((p) => p.id);
  const choiceIds = (mystery.choices ?? []).map((c) => c.id);
  dupes('scene', sceneIds);
  dupes('clue', clueIds);
  dupes('puzzle', puzzleIds);
  dupes('choice', choiceIds);
  dupes('hint', mystery.puzzles.flatMap((p) => p.hints.map((h) => h.id)));
  dupes('ending', mystery.endings.map((e) => e.id));

  if (!findScene(mystery, mystery.startSceneId)) {
    problems.push(`startSceneId "${mystery.startSceneId}" is not a scene`);
  }
  const reachable = new Set(sceneSequence(mystery).map((s) => s.id));
  for (const scene of mystery.scenes) {
    if (!reachable.has(scene.id)) problems.push(`scene "${scene.id}" is unreachable`);
    if (scene.nextSceneId && !sceneIds.includes(scene.nextSceneId)) {
      problems.push(`scene "${scene.id}" → unknown next scene "${scene.nextSceneId}"`);
    }
    for (const id of scene.clueIds) {
      const clue = mystery.clues.find((c) => c.id === id);
      if (!clue) problems.push(`scene "${scene.id}" lists unknown clue "${id}"`);
      else if (clue.sceneId !== scene.id) problems.push(`clue "${id}" belongs to "${clue.sceneId}", not "${scene.id}"`);
    }
    for (const id of scene.puzzleIds) {
      const puzzle = mystery.puzzles.find((p) => p.id === id);
      if (!puzzle) problems.push(`scene "${scene.id}" lists unknown puzzle "${id}"`);
      else if (puzzle.sceneId !== scene.id) problems.push(`puzzle "${id}" belongs to "${puzzle.sceneId}", not "${scene.id}"`);
    }
  }

  for (const clue of mystery.clues) {
    if (!mystery.scenes.some((s) => s.id === clue.sceneId && s.clueIds.includes(clue.id))) {
      problems.push(`clue "${clue.id}" is not listed in its scene`);
    }
    for (const id of clue.requires?.clueIds ?? []) {
      if (!clueIds.includes(id)) problems.push(`clue "${clue.id}" requires unknown clue "${id}"`);
    }
  }

  for (const puzzle of mystery.puzzles) {
    if (!mystery.scenes.some((s) => s.id === puzzle.sceneId && s.puzzleIds.includes(puzzle.id))) {
      problems.push(`puzzle "${puzzle.id}" is not listed in its scene`);
    }
    if (puzzle.acceptedAnswers.length === 0) {
      problems.push(`puzzle "${puzzle.id}" has no accepted answers`);
    }
    if (puzzle.hints.length === 0) problems.push(`puzzle "${puzzle.id}" has no hints`);
    for (const id of puzzle.requires?.clueIds ?? []) {
      if (!clueIds.includes(id)) problems.push(`puzzle "${puzzle.id}" requires unknown clue "${id}"`);
    }
    for (const id of puzzle.requires?.puzzleIds ?? []) {
      if (!puzzleIds.includes(id)) problems.push(`puzzle "${puzzle.id}" requires unknown puzzle "${id}"`);
    }
    for (const answer of puzzle.acceptedAnswers) {
      const normalized = normalizeAnswer(answer, puzzle.input);
      if (normalized === null) {
        problems.push(`puzzle "${puzzle.id}" answer "${answer}" is malformed for its input`);
        continue;
      }
      const {input} = puzzle;
      if (input.kind === 'choice' && !input.options.some((o) => o.id === normalized)) {
        problems.push(`puzzle "${puzzle.id}" answer "${answer}" is not an option`);
      }
      if (input.kind === 'combination') {
        normalized.split('|').forEach((part, i) => {
          if (!input.fields[i]?.options.some((o) => o.id === part)) {
            problems.push(`puzzle "${puzzle.id}" answer "${answer}" field ${i + 1} is not an option`);
          }
        });
      }
    }
  }

  const finalScene = mystery.scenes.find((s) => reachable.has(s.id) && !s.nextSceneId);
  const finisher = mystery.puzzles.some((p) => p.completesMystery) ||
    (mystery.choices ?? []).some((c) => c.options.some((o) => o.completesMystery));
  if (!finalScene && !finisher) problems.push('the mystery can never be completed');

  const last = mystery.endings[mystery.endings.length - 1];
  if (!last) problems.push('no endings');
  else if (last.when.length > 0) problems.push(`last ending "${last.id}" must be an unconditional fallback`);

  return problems;
}
