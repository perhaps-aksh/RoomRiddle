import React, {useCallback, useEffect, useMemo, useReducer, useRef, useState} from 'react';
import {BackHandler, StyleSheet, View} from 'react-native';
import {Background, BackgroundMood} from './components/Background/Background';
import {ScreenTransition} from './components/Background/ScreenTransition';
import {DEFAULT_MYSTERY_ID} from './data/mysteries';
import {GameProvider, GameProviderProps, useGame} from './game/GameContext';
import {RoomWatcher} from './game/RoomWatcher';
import {ToastProvider} from './ui/Toast';
import type {TransitionPreset} from './ui/Transition';
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
import {SceneRoute} from './world/SceneRoute';
import {useWorldSession, WorldSessionProvider} from './world/WorldSession';
import {SettingsProvider, SettingsStore} from './settings/SettingsContext';
import {AudioPlace, AudioProvider, useAudioPlace} from './audio/AudioContext';
import {SettingsScreen} from './screens/Settings/SettingsScreen';
import {ScreenProps} from './screens/types';

/**
 * RoomRiddle TV app. The shell (Phase 2), local play of the mystery engine
 * (Phase 3), and hosting a multiplayer room on the RoomRiddle server
 * (Phase 4), presented through the RoomRiddle design system (Phase 5:
 * packages/ui tokens + src/ui primitives). No AI: every game rule lives in `@roomriddle/game-engine` (run by
 * the server in a room), and the content in `@roomriddle/mystery-data`.
 *
 * Replaces the Vega helloWorld template screen. The template's own files
 * (components/Tile.tsx, data/tiles.tsx, assets/) are left in place untouched.
 */
export const App = ({
  clock,
  createSocket,
  serverUrl,
  reducedMotion,
  cinematicWorld,
  settingsStore,
}: {
  clock?: () => number;
  /** Tests inject a fake WebSocket and URL. */
  createSocket?: GameProviderProps['createSocket'];
  serverUrl?: string;
  /** Start with reduced motion (a saved setting; also switchable in Settings). */
  reducedMotion?: boolean;
  /** Scenes as the 2.5D world (default) or as P5 case files (a saved setting; also switchable in Settings). */
  cinematicWorld?: boolean;
  /** Where settings are saved (AsyncStorage on the TV). */
  settingsStore?: SettingsStore;
}) => (
  <SettingsProvider
    store={settingsStore}
    initial={{
      ...(reducedMotion === undefined ? {} : {motion: reducedMotion ? 'reduced' : 'full'}),
      ...(cinematicWorld === undefined ? {} : {scenes: cinematicWorld ? 'cinematic' : 'casefile'}),
    }}>
    <WorldSessionProvider>
      <GameProvider clock={clock} createSocket={createSocket} serverUrl={serverUrl}>
        <AudioProvider>
          <ToastProvider>
            <Shell />
          </ToastProvider>
        </AudioProvider>
      </GameProvider>
    </WorldSessionProvider>
  </SettingsProvider>
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

  // Transition by kind of move: story beats reveal cinematically, going back fades.
  const depth = useRef(stack.length);
  const goingBack = stack.length < depth.current;
  useEffect(() => {
    depth.current = stack.length;
  }, [stack.length]);

  const [blocked, setBlocked] = useState(false);
  const returnHome = useCallback(() => dispatch({type: 'reset'}), []);

  const entry = currentEntry(stack);
  useAudioPlace(audioPlaceFor(entry.route));
  // The 2.5D world paints the whole screen: animating the backdrop under it
  // only costs frames (on its own the drift measured ~45% VVD CPU on Home).
  const {enabled: worldOn} = useWorldSession();
  const covered = worldOn && entry.route.name === 'scene';
  const props: ScreenProps = {
    navigator,
    initialFocusKey: entry.focusKey,
    selectedMysteryId,
    onSelectMystery,
  };

  return (
    <BackInterceptorContext.Provider value={registry}>
      <View style={styles.root}>
        <Background mood={moodFor(entry.route)} still={covered} />
        {/* Hidden (not unmounted) behind a blocking connection error: keeps the
            players' entry, and display:none takes it out of D-pad focus. */}
        <View style={[styles.root, blocked && styles.hidden]}>
          {/* New key per stack depth + route: replays the entrance and re-applies initial focus. */}
          <ScreenTransition key={`${stack.length}-${routeKey(entry.route)}`} preset={goingBack ? 'fade' : presetFor(entry.route)}>
            {renderScreen(entry.route, props)}
          </ScreenTransition>
        </View>
        <RoomWatcher onBlockingChange={setBlocked} onReturnHome={returnHome} />
      </View>
    </BackInterceptorContext.Provider>
  );
};

function presetFor(route: Route): TransitionPreset {
  switch (route.name) {
    case 'gameIntro':
    case 'scene':
    case 'ending':
      return 'cinematic';
    case 'evidence':
    case 'puzzle':
      return 'reveal';
    default:
      return 'rise';
  }
}

function moodFor(route: Route): BackgroundMood {
  switch (route.name) {
    case 'ending':
      return 'warm';
    case 'gameIntro':
      return 'dim';
    case 'scene':
    case 'investigation':
    case 'evidence':
    case 'puzzle':
      return 'cool';
    default:
      return 'default';
  }
}

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
      return <SceneRoute {...props} />;
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
  hidden: {
    display: 'none',
  },
});

/** Where the players are, for music and ambience (the audio manager decides what that sounds like). */
function audioPlaceFor(route: Route): Partial<AudioPlace> {
  switch (route.name) {
    case 'mysteries':
    case 'mysteryDetails':
    case 'gameIntro':
      return {place: 'selection'};
    case 'scene':
    case 'investigation':
    case 'evidence':
      return {place: 'game', screen: 'scene', puzzleId: null};
    case 'puzzle':
      return {place: 'game', screen: 'puzzle', puzzleId: route.puzzleId};
    case 'ending':
      return {place: 'ending'};
    default:
      return {place: 'menu'};
  }
}
