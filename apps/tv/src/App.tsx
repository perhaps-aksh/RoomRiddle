import React, {useCallback, useEffect, useMemo, useReducer, useRef, useState} from 'react';
import {BackHandler, StyleSheet, View} from 'react-native';
import {Background} from './components/Background/Background';
import {ScreenTransition} from './components/Background/ScreenTransition';
import {DEFAULT_MYSTERY_ID} from './data/mysteries';
import {GameProvider, GameProviderProps, useGame} from './game/GameContext';
import {
  BackInterceptorContext,
  BackInterceptorRegistry,
  canGoBack,
  createInitialStack,
  currentEntry,
  navigationReducer,
  Navigator,
  Route,
} from './navigation/TVNavigation';
import {CreateRoomScreen} from './screens/CreateRoom/CreateRoomScreen';
import {EndingScreen} from './screens/Ending/EndingScreen';
import {EvidenceScreen} from './screens/Evidence/EvidenceScreen';
import {GameIntroScreen} from './screens/GameIntro/GameIntroScreen';
import {HomeScreen} from './screens/Home/HomeScreen';
import {InvestigationScreen} from './screens/Investigation/InvestigationScreen';
import {JoinRoomScreen} from './screens/JoinRoom/JoinRoomScreen';
import {MysteriesScreen} from './screens/Mysteries/MysteriesScreen';
import {MysteryDetailsScreen} from './screens/MysteryDetails/MysteryDetailsScreen';
import {PuzzleScreen} from './screens/Puzzle/PuzzleScreen';
import {SceneScreen} from './screens/Scene/SceneScreen';
import {SettingsScreen} from './screens/Settings/SettingsScreen';
import {ScreenProps} from './screens/types';

/**
 * RoomRiddle TV app. The shell (Phase 2), local play of the mystery engine
 * (Phase 3), and hosting a multiplayer room on the RoomRiddle server
 * (Phase 4). No AI: every game rule lives in `@roomriddle/game-engine` (run by
 * the server in a room), and the content in `@roomriddle/mystery-data`.
 *
 * Replaces the Vega helloWorld template screen. The template's own files
 * (components/Tile.tsx, data/tiles.tsx, assets/) are left in place untouched.
 */
export const App = ({
  clock,
  createSocket,
  serverUrl,
}: {
  clock?: () => number;
  /** Tests inject a fake WebSocket and URL. */
  createSocket?: GameProviderProps['createSocket'];
  serverUrl?: string;
}) => (
  <GameProvider clock={clock} createSocket={createSocket} serverUrl={serverUrl}>
    <Shell />
  </GameProvider>
);

const Shell = () => {
  const [stack, dispatch] = useReducer(navigationReducer, undefined, createInitialStack);
  const [selectedMysteryId, setSelectedMysteryId] = useState(DEFAULT_MYSTERY_ID);

  const navigator = useMemo<Navigator>(
    () => ({
      push: (route: Route, fromFocusKey?: string) =>
        dispatch({type: 'push', route, fromFocusKey}),
      back: () => dispatch({type: 'pop'}),
      replace: (route: Route) => dispatch({type: 'replace', route}),
      reset: (routes?: readonly Route[]) => dispatch({type: 'reset', routes}),
    }),
    [],
  );

  // Screens can take over Back (e.g. "Close this room?"). Held in a ref so
  // registering a handler never re-renders the tree.
  const interceptorRef = useRef<(() => boolean) | null>(null);
  const registry = useMemo<BackInterceptorRegistry>(
    () => ({
      set: handler => {
        interceptorRef.current = handler;
      },
    }),
    [],
  );

  const stackRef = useRef(stack);
  stackRef.current = stack;

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (interceptorRef.current?.()) {
        return true;
      }
      if (canGoBack(stackRef.current)) {
        dispatch({type: 'pop'});
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, []);

  const onSelectMystery = useCallback((id: string) => setSelectedMysteryId(id), []);

  // A game can end away from a puzzle's result panel: the clock runs out, or
  // too many wrong answers, or (in a room) a phone solves the last puzzle.
  // Whenever the engine says so, show the ending.
  const {state: game, mode} = useGame();
  const lostReason =
    game?.status === 'completed' &&
    (mode === 'room' || game.completionReason === 'time-expired' || game.completionReason === 'too-many-attempts');
  useEffect(() => {
    const here = currentEntry(stackRef.current).route.name;
    // In a room the TV's own last answer shows its result panel first.
    if (lostReason && here !== 'ending' && !(mode === 'room' && here === 'puzzle')) {
      dispatch({type: 'reset', routes: [{name: 'ending'}]});
    }
  }, [lostReason, mode]);

  const entry = currentEntry(stack);
  const props: ScreenProps = {
    navigator,
    initialFocusKey: entry.focusKey,
    selectedMysteryId,
    onSelectMystery,
  };

  return (
    <BackInterceptorContext.Provider value={registry}>
      <View style={styles.root}>
        <Background />
        {/* New key per stack depth + route: replays the entrance and re-applies initial focus. */}
        <ScreenTransition key={`${stack.length}-${routeKey(entry.route)}`}>
          {renderScreen(entry.route, props)}
        </ScreenTransition>
      </View>
    </BackInterceptorContext.Provider>
  );
};

function routeKey(route: Route): string {
  return route.name === 'puzzle' ? `puzzle-${route.puzzleId}` : route.name;
}

function renderScreen(route: Route, props: ScreenProps) {
  switch (route.name) {
    case 'home':
      return <HomeScreen {...props} />;
    case 'createRoom':
      return <CreateRoomScreen {...props} />;
    case 'joinRoom':
      return <JoinRoomScreen {...props} />;
    case 'mysteries':
      return <MysteriesScreen {...props} />;
    case 'mysteryDetails':
      return <MysteryDetailsScreen {...props} route={route} />;
    case 'settings':
      return <SettingsScreen {...props} />;
    case 'gameIntro':
      return <GameIntroScreen {...props} />;
    case 'scene':
      return <SceneScreen {...props} />;
    case 'investigation':
      return <InvestigationScreen {...props} />;
    case 'evidence':
      return <EvidenceScreen {...props} />;
    case 'puzzle':
      return <PuzzleScreen {...props} route={route} />;
    case 'ending':
      return <EndingScreen {...props} />;
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
