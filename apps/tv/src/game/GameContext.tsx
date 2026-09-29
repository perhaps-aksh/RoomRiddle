/**
 * The TV's connection to the RoomRiddle Mystery Engine.
 *
 * Screens never decide game rules. They read GameState (plus the engine's
 * selectors) and call `dispatch(action, onEvents?)`. Two modes, same API:
 *
 * - local: the engine runs on the TV (Phase 3 single-screen play, and tests).
 * - room (Phase 4): the TV hosts a server room. Actions go to the server as
 *   intents; the server runs the engine and broadcasts the authoritative
 *   GameState, which replaces ours. Phones act on the same room, so the TV
 *   re-renders whenever anyone moves the game on.
 *
 * `onEvents` receives what happened: synchronously in local mode, when the
 * server replies in room mode. A server rejection arrives as a `rejected`
 * event, so screens handle both modes the same way.
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
import {
  initialRoomView,
  memorySessionStore,
  reduceRoomView,
  RoomClient,
  withConnection,
  type RoomView,
  type SocketLike,
} from '@roomriddle/client';
import type {
  ClientMessage,
  GameAction,
  GameActionMessage,
  GameEvent,
  GameState,
  MysteryDefinition,
  RejectionReason,
  ServerMessage,
} from '@roomriddle/shared-types';
import {SERVER_URL} from '../config/server';

export type EventsHandler = (events: readonly GameEvent[]) => void;

export interface GameSession {
  mode: 'local' | 'room';
  mystery: MysteryDefinition | null;
  state: GameState | null;
  /** Events produced by the most recent action (anyone's, in room mode). */
  lastEvents: readonly GameEvent[];
  /** Who caused `lastEvents` in room mode (a player name, or 'TV'). */
  lastActor: string | null;
  /** The clock, for display only (countdown). Server-corrected in room mode. */
  now: () => number;
  /** Start (or restart) a mystery. Local: from the beginning. Room: asks the server (host only). */
  start(mysteryId: string): void;
  /** Send an action. `onEvents` gets the resulting events (see above). */
  dispatch(action: GameAction, onEvents?: EventsHandler): void;
  /** The multiplayer room this TV hosts (initialRoomView when none). */
  room: RoomView;
  /** Open a room on the server for this mystery; the TV becomes its host. */
  createRoom(mysteryId: string): void;
  /** Close the hosted room and go back to local mode. */
  closeRoom(): void;
  /** Retry the server connection now (RETRY on the connection screen). */
  reconnect(): void;
}

const NO_SESSION: GameSession = {
  mode: 'local',
  mystery: null,
  state: null,
  lastEvents: [],
  lastActor: null,
  now: Date.now,
  start: () => {},
  dispatch: () => {},
  room: initialRoomView,
  createRoom: () => {},
  closeRoom: () => {},
  reconnect: () => {},
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

/** Engine action → protocol intent (the server adds the time). Null = not a client intent. */
export function toIntent(action: GameAction): GameActionMessage | null {
  switch (action.type) {
    case 'DISCOVER_CLUE':
      return {type: 'DISCOVER_CLUE', clueId: action.clueId};
    case 'OPEN_PUZZLE':
      return {type: 'OPEN_PUZZLE', puzzleId: action.puzzleId};
    case 'CLOSE_PUZZLE':
      return {type: 'CLOSE_PUZZLE'};
    case 'SUBMIT_ANSWER':
      return {type: 'SUBMIT_ANSWER', puzzleId: action.puzzleId, answer: action.answer};
    case 'REQUEST_HINT':
      return {type: 'REQUEST_HINT', puzzleId: action.puzzleId};
    case 'ADVANCE_SCENE':
      return {type: 'ADVANCE_SCENE'};
    case 'MAKE_CHOICE':
      return {type: 'MAKE_CHOICE', choiceId: action.choiceId, optionId: action.optionId};
    default:
      return null;
  }
}

interface Local {
  mystery: MysteryDefinition | null;
  state: GameState | null;
  lastEvents: readonly GameEvent[];
}

export interface GameProviderProps {
  children: ReactNode;
  /** Injected for tests. */
  clock?: () => number;
  /** Injected for tests: WebSocket factory and server URL. */
  createSocket?: (url: string) => SocketLike;
  serverUrl?: string;
}

export const GameProvider = ({children, clock = Date.now, createSocket, serverUrl = SERVER_URL}: GameProviderProps) => {
  // Held in refs so callbacks see the latest values; `render` redraws.
  const local = useRef<Local>({mystery: null, state: null, lastEvents: []});
  const roomView = useRef<RoomView>(initialRoomView);
  const roomEvents = useRef<{events: readonly GameEvent[]; actor: string | null}>({events: [], actor: null});
  const pending = useRef(new Map<string, {type: GameAction['type'] | ClientMessage['type']; onEvents?: EventsHandler}>());
  const clientRef = useRef<RoomClient | null>(null);
  const [version, render] = useReducer((n: number) => n + 1, 0);

  const inRoom = useCallback(() => clientRef.current !== null, []);

  const onServerMessage = useCallback(
    (message: ServerMessage) => {
      roomView.current = reduceRoomView(roomView.current, message, clock());
      if (message.type === 'GAME_STATE_UPDATED') {
        roomEvents.current = {events: message.update.events, actor: message.update.actorName};
      } else if (message.type === 'GAME_STARTED') {
        roomEvents.current = {events: [], actor: null};
      }
      const waiting = message.requestId ? pending.current.get(message.requestId) : undefined;
      if (waiting && message.requestId) {
        pending.current.delete(message.requestId);
        if (message.type === 'GAME_STATE_UPDATED') {
          waiting.onEvents?.(message.update.events);
        } else if (message.type === 'ERROR') {
          const reason = (message.code === 'INVALID_ACTION' && message.detail ? message.detail : 'not-playing') as RejectionReason;
          waiting.onEvents?.([{type: 'rejected', action: waiting.type as GameAction['type'], reason}]);
        }
      }
      render();
    },
    [clock],
  );

  const client = useCallback((): RoomClient => {
    if (!clientRef.current) {
      const c = new RoomClient({url: serverUrl, store: memorySessionStore(), createSocket});
      c.onMessage(onServerMessage);
      c.onStatus(status => {
        roomView.current = withConnection(roomView.current, status);
        render();
      });
      clientRef.current = c;
    }
    return clientRef.current;
  }, [serverUrl, createSocket, onServerMessage]);

  const nextRequest = useRef(1);
  const send = useCallback(
    (message: ClientMessage, onEvents?: EventsHandler) => {
      // Register before sending: a reply may arrive before send() returns.
      const requestId = `tv${nextRequest.current++}`;
      pending.current.set(requestId, {type: message.type, onEvents});
      client().send({...message, requestId});
    },
    [client],
  );

  const dispatch = useCallback(
    (action: GameAction, onEvents?: EventsHandler): void => {
      if (inRoom()) {
        const intent = toIntent(action);
        if (intent) {
          send(intent, onEvents);
        }
        return;
      }
      const {mystery, state} = local.current;
      if (!mystery || !state) {
        return;
      }
      const result = applyAction(mystery, state, stampAction(action, clock()));
      local.current = {mystery, state: result.state, lastEvents: result.events};
      render();
      onEvents?.(result.events);
    },
    [clock, send, inRoom],
  );

  const start = useCallback(
    (mysteryId: string): void => {
      if (inRoom()) {
        send({type: 'START_GAME'});
        return;
      }
      const mystery = getMysteryDefinition(mysteryId);
      if (!mystery) {
        return;
      }
      const result = applyAction(mystery, createInitialGameState(mysteryId), {
        type: 'START_MYSTERY',
        mysteryId,
      });
      local.current = {mystery, state: result.state, lastEvents: result.events};
      render();
    },
    [send, inRoom],
  );

  const createRoom = useCallback(
    (mysteryId: string) => {
      roomView.current = initialRoomView;
      roomEvents.current = {events: [], actor: null};
      send({type: 'CREATE_ROOM', mysteryId});
      render();
    },
    [send],
  );

  const closeRoom = useCallback(() => {
    const c = clientRef.current;
    clientRef.current = null;
    if (c) {
      if (roomView.current.session) {
        c.send({type: 'LEAVE_ROOM'});
      }
      // Let LEAVE_ROOM flush before the socket closes.
      setTimeout(() => c.close(), 200);
    }
    pending.current.clear();
    roomView.current = initialRoomView;
    render();
  }, []);

  const reconnect = useCallback(() => clientRef.current?.reconnectNow(), []);

  useEffect(() => () => clientRef.current?.close(), []);

  // Local watchdog: the engine ends a game when time runs out, but only when
  // told the time. In room mode the server's clock does this.
  useEffect(() => {
    const timer = setInterval(() => {
      if (inRoom()) {
        return;
      }
      const {state} = local.current;
      const now = clock();
      if (state && isTimeUp(state, now)) {
        dispatch({type: 'TICK', at: now});
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [clock, dispatch, inRoom]);

  const value = useMemo<GameSession>(() => {
    const room = roomView.current;
    const shared = {start, dispatch, room, createRoom, closeRoom, reconnect};
    if (inRoom()) {
      const mysteryId = room.room?.mysteryId;
      return {
        ...shared,
        mode: 'room',
        mystery: mysteryId ? getMysteryDefinition(mysteryId) ?? null : null,
        state: room.room?.gameState ?? null,
        lastEvents: roomEvents.current.events,
        lastActor: roomEvents.current.actor,
        now: () => clock() + room.clockOffset,
      };
    }
    return {...shared, mode: 'local', ...local.current, lastActor: null, now: clock};
    // `version` changes whenever a ref changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, clock, start, dispatch, createRoom, closeRoom, reconnect, inRoom]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};
