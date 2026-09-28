import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {getSceneView} from '@roomriddle/game-engine';
import {ConfirmPrompt} from '../../components/ConfirmPrompt/ConfirmPrompt';
import {GameHeader} from '../../components/GameHeader/GameHeader';
import {Narration} from '../../components/Narration/Narration';
import {TVButton} from '../../components/TVButton/TVButton';
import {useGame} from '../../game/GameContext';
import {useBackInterceptor} from '../../navigation/useBackInterceptor';
import {px, theme} from '../../theme/theme';
import {ScreenProps} from '../types';

/**
 * The hub of a scene: narration, then Investigate / Evidence / the scene's
 * puzzle / Continue. What is available comes from the engine's scene view.
 * Back asks before leaving the mystery.
 */
export const SceneScreen = ({navigator, initialFocusKey}: ScreenProps) => {
  const {mystery, state, dispatch} = useGame();
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useBackInterceptor(() => {
    setConfirmLeave(current => !current);
    return true;
  });

  if (!mystery || !state) {
    return null;
  }
  const view = getSceneView(mystery, state);
  if (!view) {
    return null;
  }
  const {scene} = view;
  const unfound = view.clues.filter(c => !c.discovered).length;
  const openPuzzle = view.puzzles.find(p => p.status !== 'solved');

  // Default focus: wherever the players most likely want to go next.
  const suggested = view.complete
    ? 'continue'
    : openPuzzle?.status === 'unlocked'
    ? `puzzle-${openPuzzle.puzzle.id}`
    : 'investigate';
  // Restore focus where the players left, unless that spot is exhausted: a
  // finished scene always offers Continue, and an emptied Investigate moves on.
  const focusKey =
    initialFocusKey === undefined ||
    view.complete ||
    (initialFocusKey === 'investigate' && unfound === 0)
      ? suggested
      : initialFocusKey;

  const continueStory = () => {
    const events = dispatch({type: 'ADVANCE_SCENE'});
    if (events.some(e => e.type === 'mystery-completed')) {
      navigator.reset([{name: 'ending'}]);
    } else if (events.some(e => e.type === 'scene-entered')) {
      navigator.replace({name: 'scene'});
    } else {
      setNotice('Solve this scene\'s puzzle before moving on.');
    }
  };

  const openPuzzleScreen = (puzzleId: string, locked: boolean) => {
    if (locked) {
      setNotice('Keep investigating. You haven\'t found what this puzzle needs yet.');
      return;
    }
    navigator.push({name: 'puzzle', puzzleId}, `puzzle-${puzzleId}`);
  };

  return (
    <View style={styles.screen}>
      <GameHeader context={`Scene ${view.number} of ${view.total}`} />

      <View style={styles.body}>
        <Text style={styles.subtitle}>{(scene.subtitle ?? '').toUpperCase()}</Text>
        <Text style={styles.title}>{scene.title.toUpperCase()}</Text>
        <View style={styles.rule} />
        <View style={styles.story}>
          <Narration lines={scene.narration} />
        </View>
      </View>

      <View style={styles.divider} />

      {confirmLeave ? (
        <ConfirmPrompt
          question="Leave the mystery?"
          detail="Your progress in this game will be lost."
          safeLabel="Keep Playing"
          onSafe={() => setConfirmLeave(false)}
          riskyLabel="Leave"
          onRisky={() => navigator.reset([{name: 'mysteries'}])}
          testIDPrefix="scene-leave"
        />
      ) : (
        <View>
          <View style={styles.actions}>
            <TVButton
              variant="action"
              label="Investigate"
              value={unfound > 0 ? String(unfound) : undefined}
              onPress={() => navigator.push({name: 'investigation'}, 'investigate')}
              preferredFocus={focusKey === 'investigate'}
              accessibilityHint={`${unfound} things left to examine here`}
              testID="scene-investigate"
            />
            <TVButton
              variant="action"
              label="Evidence"
              value={String(state.discoveredClueIds.length)}
              onPress={() => navigator.push({name: 'evidence'}, 'evidence')}
              preferredFocus={focusKey === 'evidence'}
              testID="scene-evidence"
            />
            {view.puzzles.map(({puzzle, status}) => (
              <TVButton
                key={puzzle.id}
                variant="action"
                label={status === 'solved' ? `✓ ${puzzle.title}` : puzzle.title}
                value={status === 'locked' ? 'Locked' : undefined}
                onPress={() =>
                  status === 'solved'
                    ? setNotice(`${puzzle.title}: solved.`)
                    : openPuzzleScreen(puzzle.id, status === 'locked')
                }
                preferredFocus={focusKey === `puzzle-${puzzle.id}`}
                testID={`scene-puzzle-${puzzle.id}`}
              />
            ))}
            {view.complete && (
              <TVButton
                variant="action"
                label={view.isFinal ? 'Finish' : 'Continue'}
                onPress={continueStory}
                preferredFocus={focusKey === 'continue'}
                testID="scene-continue"
              />
            )}
          </View>
          <Text style={styles.notice}>
            {notice ?? statusLine(view.complete, openPuzzle?.status, unfound)}
          </Text>
        </View>
      )}
    </View>
  );
};

function statusLine(
  complete: boolean,
  puzzleStatus: 'locked' | 'unlocked' | 'solved' | undefined,
  unfound: number,
): string {
  if (complete) {
    return 'The way ahead is open.';
  }
  if (puzzleStatus === 'unlocked') {
    return unfound > 0
      ? 'The puzzle is ready. There is still more to find here.'
      : 'The puzzle is ready.';
  }
  return 'Investigate the scene to find what the puzzle needs.';
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: theme.spacing.screenX,
    paddingTop: theme.spacing.screenY - px(24),
    paddingBottom: theme.spacing.screenY - px(16),
  },
  body: {
    flex: 1,
    justifyContent: 'center',
  },
  subtitle: {
    color: theme.colors.accent,
    fontSize: theme.type.caption,
    letterSpacing: px(6),
  },
  title: {
    marginTop: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: theme.type.title,
    fontWeight: '300',
    letterSpacing: px(10),
  },
  rule: {
    width: px(72),
    height: px(3),
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.accent,
  },
  story: {
    marginTop: theme.spacing.lg,
    maxWidth: px(1200),
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  notice: {
    marginTop: theme.spacing.md,
    color: theme.colors.mutedText,
    fontSize: theme.type.caption,
  },
});
