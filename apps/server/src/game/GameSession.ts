import {applyAction, createInitialGameState, isTimeUp} from '@roomriddle/game-engine';
import type {
  ActionResult,
  GameAction,
  GameActionMessage,
  GameReveals,
  GameState,
  MysteryDefinition,
  PublicMystery,
} from '@roomriddle/shared-types';

/**
 * One room's playthrough, run by the Phase 3 engine. The only place the server
 * touches game rules, and it adds none of its own: it only supplies the time
 * and hands intents to `applyAction`. Correctness, score, unlocks, hints,
 * scenes and endings all come from the engine.
 */
export class GameSession {
  private current: GameState;

  constructor(readonly mystery: MysteryDefinition) {
    this.current = createInitialGameState(mystery.summary.id);
  }

  get state(): GameState {
    return this.current;
  }

  /**
   * START_MYSTERY, then straight into the first scene: in multiplayer the TV
   * shows the intro while everyone is already in, so the clock starts now.
   */
  start(at: number): ActionResult {
    const started = applyAction(this.mystery, this.current, {
      type: 'START_MYSTERY',
      mysteryId: this.mystery.summary.id,
    });
    const entered = applyAction(this.mystery, started.state, {type: 'ADVANCE_SCENE', at});
    this.current = entered.state;
    return {state: entered.state, events: [...started.events, ...entered.events]};
  }

  /** A player or host intent, stamped with the server clock. */
  dispatch(message: GameActionMessage, at: number): ActionResult {
    return this.apply(toEngineAction(message, at));
  }

  /** Server-driven transitions (timer, pause/resume). */
  apply(action: GameAction): ActionResult {
    const result = applyAction(this.mystery, this.current, action);
    this.current = result.state;
    return result;
  }

  isTimeUp(now: number): boolean {
    return isTimeUp(this.current, now);
  }
}

/** Intent → engine action. The only mapping between the protocol and the engine. */
export function toEngineAction(message: GameActionMessage, at: number): GameAction {
  switch (message.type) {
    case 'DISCOVER_CLUE':
      return {type: 'DISCOVER_CLUE', clueId: message.clueId, at};
    case 'OPEN_PUZZLE':
      return {type: 'OPEN_PUZZLE', puzzleId: message.puzzleId, at};
    case 'CLOSE_PUZZLE':
      return {type: 'CLOSE_PUZZLE'};
    case 'SUBMIT_ANSWER':
      return {type: 'SUBMIT_ANSWER', puzzleId: message.puzzleId, answer: message.answer, at};
    case 'REQUEST_HINT':
      return {type: 'REQUEST_HINT', puzzleId: message.puzzleId, at};
    case 'ADVANCE_SCENE':
      return {type: 'ADVANCE_SCENE', at};
    case 'MAKE_CHOICE':
      return {type: 'MAKE_CHOICE', choiceId: message.choiceId, optionId: message.optionId, at};
  }
}

/** Mystery content for phones: answer keys, hint text and spoilers removed. */
export function toPublicMystery(mystery: MysteryDefinition): PublicMystery {
  const {puzzles, endings, clues, scoring: _scoring, ...rest} = mystery;
  return {
    ...rest,
    clues: clues.map(({description: _d, ...clue}) => clue),
    puzzles: puzzles.map(({acceptedAnswers: _a, hints, solvedText: _s, ...puzzle}) => ({
      ...puzzle,
      hintCount: hints.length,
    })),
    endings: endings.map(({id, title, tone}) => ({id, title, tone})),
  };
}

/** The text players have earned so far, derived purely from GameState. */
export function revealsFor(mystery: MysteryDefinition, state: GameState): GameReveals {
  const clues: GameReveals['clues'] = {};
  for (const clue of mystery.clues) {
    if (state.discoveredClueIds.includes(clue.id)) clues[clue.id] = clue.description;
  }
  const hints: GameReveals['hints'] = {};
  const solvedText: GameReveals['solvedText'] = {};
  for (const puzzle of mystery.puzzles) {
    for (const hint of puzzle.hints) {
      if (state.usedHintIds.includes(hint.id)) hints[hint.id] = hint.text;
    }
    if (state.solvedPuzzleIds.includes(puzzle.id)) solvedText[puzzle.id] = puzzle.solvedText;
  }
  const ending = state.endingId === null ? undefined : mystery.endings.find(e => e.id === state.endingId);
  return {
    clues,
    hints,
    solvedText,
    ending: ending
      ? {id: ending.id, title: ending.title, tone: ending.tone, narration: ending.narration}
      : null,
  };
}
