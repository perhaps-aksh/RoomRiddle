/**
 * The TV's connection to the RoomRiddle Mystery Engine.
 *
 * Screens never decide game rules. They read GameState (plus the engine's
 * selectors) and call `dispatch(action)`. The engine returns the next state
 * and a list of events for feedback. This provider is the only place the wall
 * clock is read: it stamps actions with `at` so the engine stays deterministic.
 *
 * Local play only for now. In the multiplayer phase the same actions go to
 * the server, which runs the same engine and sends GameState back.
 */
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import {applyAction, createInitialGameState, isTimeUp} from '@roomriddle/game-engine';
import {getMysteryDefinition} from '@roomriddle/mystery-data';
import type {
  GameAction,
  GameEvent,
  GameState,
  MysteryDefinition,
} from '@roomriddle/shared-types';

export interface GameSession {
  mystery: MysteryDefinition | null;
  state: GameState | null;
  /** Events produced by the most recent action. */
  lastEvents: readonly GameEvent[];
  /** The clock, for display only (countdown). */
  now: () => number;
  /** Start (or restart) a mystery from the beginning. */
  start(mysteryId: string): readonly GameEvent[];
  /** Send an action to the engine and return what happened. */
  dispatch(action: GameAction): readonly GameEvent[];
}

const NO_SESSION: GameSession = {
  mystery: null,
  state: null,
  lastEvents: [],
  now: Date.now,
  start: () => [],
  dispatch: () => [],
};

const GameContext = createContext<GameSession>(NO_SESSION);

export function useGame(): GameSession {
  return useContext(GameContext);
}

/** Actions that happen at a moment in time get stamped with it. */
export function stampAction(action: GameAction, at: number): GameAction {
  if (action.type === 'START_MYSTERY' || action.type === 'CLOSE_PUZZLE') {
    return action;
  }
  return action.at === undefined ? {...action, at} : action;
}

interface Session {
  mystery: MysteryDefinition | null;
  state: GameState | null;
  lastEvents: readonly GameEvent[];
}

export const GameProvider = ({
  children,
  clock = Date.now,
}: {
  children: ReactNode;
  /** Injected for tests. */
  clock?: () => number;
}) => {
  // Held in a ref so dispatch can return events synchronously; `render` redraws.
  const session = useRef<Session>({mystery: null, state: null, lastEvents: []});
  const [version, render] = useReducer((n: number) => n + 1, 0);

  const dispatch = useCallback(
    (action: GameAction): readonly GameEvent[] => {
      const {mystery, state} = session.current;
      if (!mystery || !state) {
        return [];
      }
      const result = applyAction(mystery, state, stampAction(action, clock()));
      session.current = {mystery, state: result.state, lastEvents: result.events};
      render();
      return result.events;
    },
    [clock],
  );

  const start = useCallback((mysteryId: string): readonly GameEvent[] => {
    const mystery = getMysteryDefinition(mysteryId);
    if (!mystery) {
      return [];
    }
    const result = applyAction(mystery, createInitialGameState(mysteryId), {
      type: 'START_MYSTERY',
      mysteryId,
    });
    session.current = {mystery, state: result.state, lastEvents: result.events};
    render();
    return result.events;
  }, []);

  // Watchdog: the engine ends the game when time runs out, but only when told
  // the time. One cheap check a second; it only re-renders when the game ends.
  useEffect(() => {
    const timer = setInterval(() => {
      const {state} = session.current;
      const now = clock();
      if (state && isTimeUp(state, now)) {
        dispatch({type: 'TICK', at: now});
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [clock, dispatch]);

  const value = useMemo<GameSession>(
    () => ({...session.current, now: clock, start, dispatch}),
    // `version` changes whenever the session ref changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version, clock, start, dispatch],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};
