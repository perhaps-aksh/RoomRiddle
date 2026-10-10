import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {MysteryCard} from '../../components/MysteryCard/MysteryCard';
import {ScreenHeader} from '../../components/ScreenHeader/ScreenHeader';
import {TVButton} from '../../components/TVButton/TVButton';
import {mysteries} from '../../data/mysteries';
import {px, theme} from '../../theme/theme';
import {Transition} from '../../ui/Transition';
import {ScreenProps} from '../types';

export const MysteriesScreen = ({
  navigator,
  initialFocusKey,
  selectedMysteryId,
}: ScreenProps) => {
  const focusKey = initialFocusKey ?? `mystery-${mysteries[0].id}`;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Choose Your Mystery" subtitle={`${countWord(mysteries.length)} stories. One room. Tonight, who will find the truth?`} />

      <View style={styles.row}>
        {mysteries.map((mystery, index) => {
          const key = `mystery-${mystery.id}`;
          // Cards deal in one after another, like case files laid on a desk.
          return (
            <Transition key={mystery.id} preset="rise" motion="listItemEnter" delay={index * theme.motion.stagger.duration * 1.5}>
            <MysteryCard
              mystery={mystery}
              selected={mystery.id === selectedMysteryId}
              preferredFocus={key === focusKey}
              onPress={() =>
                navigator.push({name: 'mysteryDetails', mysteryId: mystery.id}, key)
              }
              testID={key}
            />
            </Transition>
          );
        })}
      </View>

      <View style={styles.footer}>
        <TVButton
          variant="action"
          label="Back"
          onPress={() => navigator.back()}
          preferredFocus={focusKey === 'back'}
          testID="mysteries-back"
        />
        <Text style={styles.hint}>◀ ▶ browse · OK details</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: theme.spacing.screenX,
    paddingTop: theme.spacing.screenY,
    paddingBottom: theme.spacing.screenY,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  hint: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    letterSpacing: px(2),
    color: theme.colors.textMuted,
  },
});

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
function countWord(n: number): string {
  return WORDS[n] ?? String(n);
}
