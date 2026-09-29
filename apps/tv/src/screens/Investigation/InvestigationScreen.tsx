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
import {cue} from '../../ui/cues';
import {Feedback} from '../../ui/Feedback';
import {Transition} from '../../ui/Transition';
import {ScreenProps} from '../types';

/**
 * Investigate the current scene. Left: the things to examine, each marked
 * examined (✓) or not yet (◇). OK sends DISCOVER_CLUE; when the engine
 * confirms, the evidence slip is revealed on the right, numbered by the order
 * it was found. Unlocks come from the engine's events.
 */
export const InvestigationScreen = ({navigator}: ScreenProps) => {
  const {mystery, state, dispatch} = useGame();
  const [shownClueId, setShownClueId] = useState<string | null>(null);
  const [freshId, setFreshId] = useState<string | null>(null);
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
      setFreshId(null);
      setAnnouncement(null);
      return;
    }
    dispatch({type: 'DISCOVER_CLUE', clueId: clue.id}, events => {
      if (events.some(e => e.type === 'clue-discovered')) {
        setFreshId(clue.id);
        cue('discovery');
      }
      const unlocked = events.filter(e => e.type === 'puzzle-unlocked');
      if (unlocked.length > 0) {
        const titles = unlocked.map(e => (e.type === 'puzzle-unlocked' ? mystery.puzzles.find(p => p.id === e.puzzleId)?.title : '')).join(', ');
        setAnnouncement(`New puzzle unlocked: ${titles}`);
      } else {
        setAnnouncement(null);
      }
    });
  };

  const shown = view.clues.find(c => c.clue.id === shownClueId)?.clue;
  const shownIndex = shown ? state.discoveredClueIds.indexOf(shown.id) + 1 : 0;
  const found = view.clues.filter(c => c.discovered).length;
  const allFound = found === view.clues.length;

  return (
    <View style={styles.screen}>
      <GameHeader context={`${view.scene.title} · Investigate`} />
      <View style={styles.body}>
        <View style={styles.list}>
          <View style={styles.listHead}>
            <Text style={styles.heading}>EXAMINE</Text>
            <Text style={styles.count}>
              {found}/{view.clues.length}
            </Text>
          </View>
          {view.clues.map(({clue, discovered}, i) => (
            <Transition key={clue.id} preset="slide" delay={i * theme.motion.stagger.duration}>
              <OptionButton
                wide
                label={discovered ? `✓  ${clue.title}` : `◇  ${clue.prompt}`}
                selected={discovered}
                onPress={() => examine(clue, discovered)}
                preferredFocus={clue.id === initialFocusId}
                testID={`investigate-${clue.id}`}
              />
            </Transition>
          ))}
          <View style={styles.spacer} />
          <TVButton label="Back to scene" onPress={() => navigator.back()} preferredFocus={view.clues.length === 0} testID="investigation-back" />
        </View>

        <View style={styles.detail}>
          {shown ? (
            <ClueCard key={shown.id} clue={shown} index={shownIndex || undefined} fresh={freshId === shown.id} testID="investigation-clue" />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderGlyph}>◇</Text>
              <Text style={styles.placeholderText}>{allFound ? 'You have found everything here.' : 'Choose something to examine.'}</Text>
            </View>
          )}
          {announcement !== null && (
            <View style={styles.announcement} testID="investigation-unlocked">
              <Feedback kind="success" title="Lead unlocked" detail={announcement} playKey={announcement} />
            </View>
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
    width: px(700),
    gap: theme.spacing.sm,
  },
  listHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  heading: {
    ...theme.text.label,
    color: theme.colors.accent,
  },
  count: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.textMuted,
  },
  spacer: {
    flex: 1,
  },
  detail: {
    flex: 1,
    justifyContent: 'center',
  },
  placeholder: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
  },
  placeholderGlyph: {
    color: theme.colors.textMuted,
    fontSize: px(56),
  },
  placeholderText: {
    ...theme.text.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  announcement: {
    marginTop: theme.spacing.lg,
  },
});
