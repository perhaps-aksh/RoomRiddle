import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {getEvidence} from '@roomriddle/game-engine';
import {ClueCard} from '../../components/ClueCard/ClueCard';
import {GameHeader} from '../../components/GameHeader/GameHeader';
import {TVButton} from '../../components/TVButton/TVButton';
import {useGame} from '../../game/GameContext';
import {px, theme} from '../../theme/theme';
import {Transition} from '../../ui/Transition';
import {ScreenProps} from '../types';

/**
 * The evidence board: every clue found so far, from every scene, numbered in
 * the order it was found. Focus an entry on the left to read the slip on the
 * right. Slots for evidence not yet found are shown as sealed, so the players
 * can see how much of the case is still out there without spoilers.
 */
export const EvidenceScreen = ({navigator}: ScreenProps) => {
  const {mystery, state} = useGame();
  const evidence = mystery && state ? getEvidence(mystery, state) : [];
  const [focusedId, setFocusedId] = useState<string | null>(evidence[evidence.length - 1]?.id ?? null);

  if (!mystery || !state) {
    return null;
  }
  const shown = evidence.find(c => c.id === focusedId) ?? evidence[evidence.length - 1];
  const sceneTitle = (sceneId: string) => mystery.scenes.find(s => s.id === sceneId)?.title ?? '';
  const numberOf = (id: string) => state.discoveredClueIds.indexOf(id) + 1;
  const sealed = Math.max(0, mystery.clues.length - evidence.length);

  return (
    <View style={styles.screen}>
      <GameHeader context={`Evidence · ${evidence.length} of ${mystery.clues.length} found`} />
      <View style={styles.body}>
        <View style={styles.list}>
          <View style={styles.listHead}>
            <Text style={styles.heading}>CASE FILE</Text>
            <Text style={styles.count}>
              {String(evidence.length).padStart(2, '0')}/{String(mystery.clues.length).padStart(2, '0')}
            </Text>
          </View>
          {evidence.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>NO EVIDENCE YET</Text>
              <Text style={styles.emptyText}>Nothing yet. Investigate the scene to find clues.</Text>
            </View>
          )}
          {evidence.map((clue, index) => (
            <TVButton
              key={clue.id}
              label={`#${String(numberOf(clue.id)).padStart(2, '0')}  ${clue.title}`}
              value={sceneTitle(clue.sceneId)}
              onPress={() => setFocusedId(clue.id)}
              onFocus={() => setFocusedId(clue.id)}
              preferredFocus={index === evidence.length - 1}
              accessibilityLabel={`Evidence ${numberOf(clue.id)}: ${clue.title}, found in ${sceneTitle(clue.sceneId)}`}
              testID={`evidence-${clue.id}`}
            />
          ))}
          {sealed > 0 && evidence.length > 0 && (
            <Text style={styles.sealed}>
              {'▪ '.repeat(Math.min(sealed, 12)).trim()} {sealed} SEALED
            </Text>
          )}
          <View style={styles.spacer} />
          <TVButton label="Back to scene" onPress={() => navigator.back()} preferredFocus={evidence.length === 0} testID="evidence-back" />
        </View>
        <View style={styles.detail}>
          {shown && (
            <Transition key={shown.id} preset="fade" motion="focusIn">
              <ClueCard clue={shown} index={numberOf(shown.id)} />
            </Transition>
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
    gap: px(2),
  },
  listHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
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
  empty: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
  },
  emptyTitle: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.textMuted,
  },
  emptyText: {
    ...theme.text.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  sealed: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
    marginLeft: theme.spacing.md,
  },
  spacer: {
    flex: 1,
  },
  detail: {
    flex: 1,
    justifyContent: 'center',
  },
});
