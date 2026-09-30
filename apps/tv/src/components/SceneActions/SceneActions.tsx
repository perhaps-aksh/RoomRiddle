import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {ConfirmPrompt} from '../ConfirmPrompt/ConfirmPrompt';
import {TVButton} from '../TVButton/TVButton';
import {hubStatusLine, type SceneHub} from '../../game/useSceneHub';
import type {Navigator} from '../../navigation/TVNavigation';
import {px, theme} from '../../theme/theme';
import {Feedback} from '../../ui/Feedback';

/**
 * The case actions of a scene: Investigate (case notes), Evidence, the
 * scene's puzzle(s), Continue, plus the feedback line and the leave
 * confirmation. Used by the P5 scene screen and by the 2.5D world HUD.
 */
export const SceneActions = ({
  hub,
  navigator,
  focusKey,
  investigateLabel = 'Investigate',
  evidenceCount,
  compact,
}: {
  hub: SceneHub;
  navigator: Navigator;
  focusKey?: string;
  investigateLabel?: string;
  evidenceCount: number;
  compact?: boolean;
}) => {
  const {view, unfound, notice} = hub;
  const openPuzzle = view.puzzles.find(p => p.status !== 'solved');

  if (hub.confirmLeave) {
    return (
      <ConfirmPrompt
        question="Leave the mystery?"
        detail={hub.mode === 'room' ? 'The room closes and every phone is disconnected. Progress in this game will be lost.' : 'Your progress in this game will be lost.'}
        safeLabel="Keep Playing"
        onSafe={() => hub.setConfirmLeave(false)}
        riskyLabel="Leave"
        onRisky={hub.leave}
        testIDPrefix="scene-leave"
      />
    );
  }

  return (
    <View>
      <View style={styles.actions}>
        <TVButton
          variant="action"
          label={investigateLabel}
          value={unfound > 0 ? String(unfound) : undefined}
          onPress={() => navigator.push({name: 'investigation'}, 'investigate')}
          preferredFocus={focusKey === 'investigate'}
          accessibilityHint={`${unfound} things left to examine here`}
          testID="scene-investigate"
        />
        <TVButton
          variant="action"
          label="Evidence"
          value={String(evidenceCount)}
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
            onPress={() => (status === 'solved' ? hub.say('success', 'Solved', `${puzzle.title} is solved.`) : hub.openPuzzle(puzzle.id, status === 'locked'))}
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
            onPress={hub.continueStory}
            preferredFocus={focusKey === 'continue'}
            testID="scene-continue"
          />
        )}
      </View>
      <View style={[styles.noticeSlot, compact && styles.noticeCompact]}>
        {notice ? (
          <Feedback kind={notice.kind} title={notice.title} detail={notice.text} playKey={notice.key} />
        ) : (
          <Text style={styles.hint}>{hubStatusLine(view.complete, openPuzzle?.status, unfound)}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
  noticeCompact: {
    marginTop: theme.spacing.sm,
    minHeight: px(64),
  },
  hint: {
    ...theme.text.body,
    color: theme.colors.textSecondary,
  },
});
