import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {getSceneView} from '@roomriddle/game-engine';
import type {Clue} from '@roomriddle/shared-types';
import {ClueCard} from '../../components/ClueCard/ClueCard';
import {GameHeader} from '../../components/GameHeader/GameHeader';
import {OptionButton} from '../../components/OptionButton/OptionButton';
import {TVButton} from '../../components/TVButton/TVButton';
import {useGame} from '../../game/GameContext';
import {px, theme} from '../../theme/theme';
import {ScreenProps} from '../types';

/**
 * Investigate the current scene. Each row is an action ("Look up at the
 * platform clock"). OK sends DISCOVER_CLUE to the engine, and the clue opens
 * on the right. Anything that unlocks (a puzzle, or a hidden clue) comes from
 * the engine's events and state.
 */
export const InvestigationScreen = ({navigator}: ScreenProps) => {
  const {mystery, state, dispatch} = useGame();
  const [shownClueId, setShownClueId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  // Initial focus is decided once. On Vega, a changing preferredFocus moves
  // focus, which would jump the cursor after every discovery.
  const [initialFocusId] = useState<string | null>(() => {
    if (!mystery || !state) {
      return null;
    }
    const clues = getSceneView(mystery, state)?.clues ?? [];
    return (clues.find(c => !c.discovered) ?? clues[0])?.clue.id ?? null;
  });

  if (!mystery || !state) {
    return null;
  }
  const view = getSceneView(mystery, state);
  if (!view) {
    return null;
  }

  const examine = (clue: Clue, discovered: boolean) => {
    setShownClueId(clue.id);
    if (discovered) {
      setAnnouncement(null);
      return;
    }
    const events = dispatch({type: 'DISCOVER_CLUE', clueId: clue.id});
    const unlocked = events.filter(e => e.type === 'puzzle-unlocked');
    if (unlocked.length > 0) {
      const titles = unlocked
        .map(e => (e.type === 'puzzle-unlocked' ? mystery.puzzles.find(p => p.id === e.puzzleId)?.title : ''))
        .join(', ');
      setAnnouncement(`New puzzle unlocked: ${titles}`);
    } else {
      setAnnouncement(null);
    }
  };

  const shown = view.clues.find(c => c.clue.id === shownClueId)?.clue;
  const firstUnfound = view.clues.find(c => !c.discovered)?.clue.id;
  const allFound = firstUnfound === undefined;

  return (
    <View style={styles.screen}>
      <GameHeader context={`${view.scene.title} · Investigate`} />
      <View style={styles.body}>
        <View style={styles.list}>
          <Text style={styles.heading}>INVESTIGATE</Text>
          {view.clues.map(({clue, discovered}) => (
            <OptionButton
              key={clue.id}
              wide
              label={discovered ? clue.title : clue.prompt}
              selected={discovered}
              onPress={() => examine(clue, discovered)}
              preferredFocus={clue.id === initialFocusId}
              testID={`investigate-${clue.id}`}
            />
          ))}
          <View style={styles.spacer} />
          <TVButton
            label="Back to scene"
            onPress={() => navigator.back()}
            preferredFocus={view.clues.length === 0}
            testID="investigation-back"
          />
        </View>

        <View style={styles.detail}>
          {shown ? (
            <ClueCard clue={shown} testID="investigation-clue" />
          ) : (
            <Text style={styles.placeholder}>
              {allFound
                ? 'You have found everything here.'
                : 'Choose something to examine.'}
            </Text>
          )}
          {announcement !== null && (
            <Text style={styles.announcement} testID="investigation-unlocked">
              {announcement}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: theme.spacing.screenX,
    paddingTop: theme.spacing.screenY - px(24),
    paddingBottom: theme.spacing.screenY - px(16),
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    marginTop: theme.spacing.xl,
    gap: theme.spacing.xl,
  },
  list: {
    width: px(680),
    gap: theme.spacing.sm,
  },
  heading: {
    color: theme.colors.faintText,
    fontSize: theme.type.caption,
    letterSpacing: px(6),
    marginBottom: theme.spacing.sm,
  },
  spacer: {
    flex: 1,
  },
  detail: {
    flex: 1,
    justifyContent: 'center',
  },
  placeholder: {
    color: theme.colors.faintText,
    fontSize: theme.type.body,
  },
  announcement: {
    marginTop: theme.spacing.lg,
    color: theme.colors.focus,
    fontSize: theme.type.body,
    letterSpacing: 1,
  },
});
