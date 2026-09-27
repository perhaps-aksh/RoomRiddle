import React, {useCallback, useEffect, useMemo, useReducer, useRef, useState} from 'react';
import {BackHandler, StyleSheet, View} from 'react-native';
import {Background} from './components/Background/Background';
import {ScreenTransition} from './components/Background/ScreenTransition';
import {DEFAULT_MYSTERY_ID} from './data/mysteries';
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
import {HomeScreen} from './screens/Home/HomeScreen';
import {JoinRoomScreen} from './screens/JoinRoom/JoinRoomScreen';
import {MysteriesScreen} from './screens/Mysteries/MysteriesScreen';
import {MysteryDetailsScreen} from './screens/MysteryDetails/MysteryDetailsScreen';
import {SettingsScreen} from './screens/Settings/SettingsScreen';
import {ScreenProps} from './screens/types';

/**
 * RoomRiddle TV shell (Phase 2). Local, deterministic state only: no networking,
 * no game engine, no AI.
 *
 * Replaces the Vega helloWorld template screen. The template's own files
 * (components/Tile.tsx, data/tiles.tsx, assets/) are left in place untouched.
 */
export const App = () => {
  const [stack, dispatch] = useReducer(navigationReducer, undefined, createInitialStack);
  const [selectedMysteryId, setSelectedMysteryId] = useState(DEFAULT_MYSTERY_ID);

  const navigator = useMemo<Navigator>(
    () => ({
      push: (route: Route, fromFocusKey?: string) =>
        dispatch({type: 'push', route, fromFocusKey}),
      back: () => dispatch({type: 'pop'}),
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
        <ScreenTransition key={`${stack.length}-${entry.route.name}`}>
          {renderScreen(entry.route, props)}
        </ScreenTransition>
      </View>
    </BackInterceptorContext.Provider>
  );
};

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
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
