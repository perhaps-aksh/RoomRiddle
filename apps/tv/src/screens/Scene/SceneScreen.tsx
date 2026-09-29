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
import {Feedback, FeedbackKind} from '../../ui/Feedback';
import {RRProgress} from '../../ui/RRProgress';
import {Transition} from '../../ui/Transition';
import {ScreenProps} from '../types';

/**
 * The hub of a scene. A title card (scene number, subtitle, title in the
 * cinematic voice), the narration, then the case actions: Investigate,
 * Evidence, the scene's puzzle(s), Continue. What is available comes from the
 * engine's scene view; this screen only presents it. Back asks before leaving.
 */
export const SceneScreen = ({navigator, initialFocusKey}: ScreenProps) => {
  const {mystery, state, dispatch, mode, closeRoom} = useGame();
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [notice, setNotice] = useState<{kind: FeedbackKind; title: string; text: string; key: number} | null>(null);

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

  const say = (kind: FeedbackKind, title: string, text: string) => setNotice(current => ({kind, title, text, key: (current?.key ?? 0) + 1}));

  // Default focus: wherever the players most likely want to go next.
  const suggested = view.complete ? 'continue' : openPuzzle?.status === 'unlocked' ? `puzzle-${openPuzzle.puzzle.id}` : 'investigate';
  // Restore focus where the players left, unless that spot is exhausted: a
  // finished scene always offers Continue, and an emptied Investigate moves on.
  const focusKey =
    initialFocusKey === undefined || view.complete || (initialFocusKey === 'investigate' && unfound === 0) ? suggested : initialFocusKey;

  const continueStory = () => {
    dispatch({type: 'ADVANCE_SCENE'}, events => {
      if (events.some(e => e.type === 'mystery-completed')) {
        navigator.reset([{name: 'ending'}]);
      } else if (events.some(e => e.type === 'scene-entered')) {
        navigator.replace({name: 'scene'});
      } else {
        say('failure', 'Not yet', "Solve this scene's puzzle before moving on.");
      }
    });
  };

  const openPuzzleScreen = (puzzleId: string, locked: boolean) => {
    if (locked) {
      say('info', 'Locked', "Keep investigating. You haven't found what this puzzle needs yet.");
      return;
    }
    navigator.push({name: 'puzzle', puzzleId}, `puzzle-${puzzleId}`);
  };

  const solvedCount = view.puzzles.filter(p => p.status === 'solved').length;

  return (
    <View style={styles.screen}>
      <GameHeader context={`Scene ${view.number} of ${view.total}`} />

      <View style={styles.body}>
        <Transition preset="fade" delay={80} style={styles.titleCard}>
          <Text style={styles.sceneNo}>SCENE {String(view.number).padStart(2, '0')}</Text>
          <View style={styles.titleDash} />
          <Text style={styles.subtitle}>{(scene.subtitle ?? '').toUpperCase()}</Text>
        </Transition>
        <Transition preset="cinematic" delay={160}>
          <Text style={styles.title}>{scene.title.toUpperCase()}</Text>
        </Transition>
        <View style={styles.rule} />
        <Transition preset="fade" motion="sceneReveal" delay={420} style={styles.story}>
          <Narration lines={scene.narration} />
        </Transition>
      </View>

      <View style={styles.statusRow}>
        <RRProgress total={view.total} done={view.number - 1} current={view.number - 1} label="Case" />
        <Text style={styles.statusText}>
          {`${view.clues.length - unfound}/${view.clues.length} EXAMINED · ${solvedCount}/${view.puzzles.length} SOLVED`}
        </Text>
      </View>
      <View style={styles.divider} />

      {confirmLeave ? (
        <ConfirmPrompt
          question="Leave the mystery?"
          detail={mode === 'room' ? 'The room closes and every phone is disconnected. Progress in this game will be lost.' : 'Your progress in this game will be lost.'}
          safeLabel="Keep Playing"
          onSafe={() => setConfirmLeave(false)}
          riskyLabel="Leave"
          onRisky={() => {
            if (mode === 'room') {
              closeRoom();
            }
            navigator.reset([{name: 'mysteries'}]);
          }}
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
                tone={status === 'unlocked' && !view.complete ? 'primary' : 'default'}
                label={status === 'solved' ? `✓ ${puzzle.title}` : status === 'locked' ? `🔒 ${puzzle.title}` : puzzle.title}
                onPress={() => (status === 'solved' ? say('success', 'Solved', `${puzzle.title} is solved.`) : openPuzzleScreen(puzzle.id, status === 'locked'))}
                preferredFocus={focusKey === `puzzle-${puzzle.id}`}
                accessibilityLabel={`${puzzle.title}, ${status}`}
                testID={`scene-puzzle-${puzzle.id}`}
              />
            ))}
            {view.complete && (
              <TVButton
                variant="action"
                tone="primary"
                label={view.isFinal ? 'Finish' : 'Continue'}
                onPress={continueStory}
                preferredFocus={focusKey === 'continue'}
                testID="scene-continue"
              />
            )}
          </View>
          <View style={styles.noticeSlot}>
            {notice ? (
              <Feedback kind={notice.kind} title={notice.title} detail={notice.text} playKey={notice.key} />
            ) : (
              <Text style={styles.hint}>{statusLine(view.complete, openPuzzle?.status, unfound)}</Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

function statusLine(complete: boolean, puzzleStatus: 'locked' | 'unlocked' | 'solved' | undefined, unfound: number): string {
  if (complete) {
    return 'The way ahead is open.';
  }
  if (puzzleStatus === 'unlocked') {
    return unfound > 0 ? 'The puzzle is ready. There is still more to find here.' : 'The puzzle is ready.';
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
  titleCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sceneNo: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.textMuted,
  },
  titleDash: {
    width: px(36),
    height: 1,
    marginHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.textMuted,
  },
  subtitle: {
    ...theme.text.label,
    color: theme.colors.accent,
  },
  title: {
    ...theme.text.display,
    marginTop: theme.spacing.sm,
    color: theme.colors.textPrimary,
  },
  rule: {
    width: px(72),
    height: px(3),
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.accent,
  },
  story: {
    marginTop: theme.spacing.lg,
    maxWidth: theme.measure.narration,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: theme.spacing.sm,
  },
  statusText: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.textMuted,
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
  noticeSlot: {
    marginTop: theme.spacing.md,
    minHeight: px(84),
    justifyContent: 'center',
  },
  hint: {
    ...theme.text.body,
    color: theme.colors.textSecondary,
  },
});
