import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {GameHeader} from '../../components/GameHeader/GameHeader';
import {Narration} from '../../components/Narration/Narration';
import {SceneActions} from '../../components/SceneActions/SceneActions';
import {useGame} from '../../game/GameContext';
import {useSceneHub} from '../../game/useSceneHub';
import {useBackInterceptor} from '../../navigation/useBackInterceptor';
import {px, theme} from '../../theme/theme';
import {RRProgress} from '../../ui/RRProgress';
import {Transition} from '../../ui/Transition';
import {ScreenProps} from '../types';

/**
 * The hub of a scene as a case file: a title card (scene number, subtitle,
 * title in the cinematic voice), the narration, then the case actions. Used
 * for mysteries without a 2.5D world, and as the world's "case notes" view.
 * What is available comes from the engine's scene view (useSceneHub).
 */
export const SceneScreen = ({navigator, initialFocusKey}: ScreenProps) => {
  const {state} = useGame();
  const hub = useSceneHub(navigator);

  useBackInterceptor(() => {
    hub?.setConfirmLeave(current => !current);
    return true;
  });

  if (!hub || !state) {
    return null;
  }
  const {view, unfound, solvedCount} = hub;
  const {scene} = view;
  // Restore focus where the players left, unless that spot is exhausted: a
  // finished scene always offers Continue, and an emptied Investigate moves on.
  const focusKey =
    initialFocusKey === undefined || view.complete || (initialFocusKey === 'investigate' && unfound === 0) ? hub.suggestedFocus : initialFocusKey;

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

      <SceneActions hub={hub} navigator={navigator} focusKey={focusKey} evidenceCount={state.discoveredClueIds.length} />
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
});
