import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {getEvidence} from '@roomriddle/game-engine';
import {ClueCard} from '../../components/ClueCard/ClueCard';
import {GameHeader} from '../../components/GameHeader/GameHeader';
import {TVButton} from '../../components/TVButton/TVButton';
import {useGame} from '../../game/GameContext';
import {px, theme} from '../../theme/theme';
import {ScreenProps} from '../types';

/**
 * The evidence board: every clue found so far, from every scene.
 * Focus a title on the left to read it on the right.
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

  return (
    <View style={styles.screen}>
      <GameHeader context={`Evidence · ${evidence.length} of ${mystery.clues.length} found`} />
      <View style={styles.body}>
        <View style={styles.list}>
          <Text style={styles.heading}>EVIDENCE</Text>
          {evidence.length === 0 && (
            <Text style={styles.empty}>Nothing yet. Investigate the scene to find clues.</Text>
          )}
          {evidence.map((clue, index) => (
            <TVButton
              key={clue.id}
              label={clue.title}
              value={sceneTitle(clue.sceneId)}
              onPress={() => setFocusedId(clue.id)}
              onFocus={() => setFocusedId(clue.id)}
              preferredFocus={index === evidence.length - 1}
              testID={`evidence-${clue.id}`}
            />
          ))}
          <View style={styles.spacer} />
          <TVButton
            label="Back to scene"
            onPress={() => navigator.back()}
            preferredFocus={evidence.length === 0}
            testID="evidence-back"
          />
        </View>
        <View style={styles.detail}>{shown && <ClueCard clue={shown} />}</View>
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
    width: px(640),
    gap: px(2),
  },
  heading: {
    color: theme.colors.faintText,
    fontSize: theme.type.caption,
    letterSpacing: px(6),
    marginBottom: theme.spacing.sm,
  },
  empty: {
    color: theme.colors.mutedText,
    fontSize: theme.type.body,
  },
  spacer: {
    flex: 1,
  },
  detail: {
    flex: 1,
    justifyContent: 'center',
  },
});
