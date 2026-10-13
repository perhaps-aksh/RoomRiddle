import React, {useMemo, useState} from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import {ScreenHeader} from '../../components/ScreenHeader/ScreenHeader';
import {TVButton} from '../../components/TVButton/TVButton';
import {
  AGE_LABEL,
  AgeFilter,
  TYPE_LABEL,
  TypeFilter,
  TVMystery,
  ageFilters,
  filterMysteries,
  findMystery,
  mysteries,
  typeFilters,
} from '../../data/mysteries';
import {px, theme} from '../../theme/theme';
import {Transition} from '../../ui/Transition';
import {cardArtFor, libraryArt} from '../../ui/keyArt';
import {ScreenProps} from '../types';

const ageName = (a: AgeFilter): string => (a === 'any' ? 'Any age' : AGE_LABEL[a]);
const typeName = (t: TypeFilter): string => (t === 'any' ? 'Any story' : TYPE_LABEL[t]);

/**
 * The case library, after the "cold cases" reference: two filter rows (age
 * group, story type) above a list of case files; the focused case shows its
 * painting, synopsis and facts on the right. Filters apply as soon as a chip
 * is pressed; Select on a case opens it.
 */
export const MysteriesScreen = ({navigator, initialFocusKey, selectedMysteryId}: ScreenProps) => {
  const [age, setAge] = useState<AgeFilter>('any');
  const [type, setType] = useState<TypeFilter>('any');
  const shown = useMemo(() => filterMysteries(mysteries, age, type), [age, type]);
  const [focusedId, setFocusedId] = useState<string>(selectedMysteryId ?? mysteries[0]!.id);
  const preview: TVMystery | undefined = shown.find(m => m.id === focusedId) ?? shown[0] ?? findMystery(focusedId);
  const focusKey = initialFocusKey ?? `mystery-${selectedMysteryId ?? shown[0]?.id}`;

  const chip = (key: string, label: string, on: boolean, press: () => void) => (
    <TVButton key={key} variant="action" compact tone={on ? 'primary' : undefined} label={label} onPress={press} accessibilityLabel={`${label}${on ? ', selected' : ''}`} testID={key} />
  );

  return (
    <View style={styles.screen}>
      <Image source={libraryArt} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <ScreenHeader eyebrow={`Case files · ${shown.length} of ${mysteries.length} match`} title="Choose a Case" />

      <View style={styles.filters}>
        <Text style={styles.filterLabel}>AGE</Text>
        {ageFilters().map(a => chip(`filter-age-${a}`, ageName(a), age === a, () => setAge(a)))}
      </View>
      <View style={styles.filters}>
        <Text style={styles.filterLabel}>STORY</Text>
        {typeFilters().map(t => chip(`filter-type-${t}`, typeName(t), type === t, () => setType(t)))}
      </View>

      <View style={styles.body}>
        <View style={styles.list}>
          {shown.length === 0 && (
            <Text style={styles.empty} testID="mysteries-empty">
              No case matches both filters. Try another story type.
            </Text>
          )}
          {shown.map((m, i) => {
            const key = `mystery-${m.id}`;
            return (
              <Transition key={m.id} preset="rise" motion="listItemEnter" delay={i * theme.motion.stagger.duration}>
                <TVButton
                  variant="menu"
                  label={m.title}
                  caption={`${AGE_LABEL[m.ageGroup]} · ${TYPE_LABEL[m.storyType]} · ${m.minPlayers}–${m.maxPlayers} players · ~${m.estimatedMinutes} min`}
                  value={m.availability === 'coming-soon' ? 'Soon' : undefined}
                  width={px(900)}
                  preferredFocus={key === focusKey}
                  onFocus={() => setFocusedId(m.id)}
                  onPress={() => navigator.push({name: 'mysteryDetails', mysteryId: m.id}, key)}
                  testID={key}
                />
              </Transition>
            );
          })}
          <View style={styles.back}>
            <TVButton variant="action" label="Back" onPress={() => navigator.back()} testID="mysteries-back" />
          </View>
        </View>

        {preview && (
          <View style={styles.preview} testID="mysteries-preview">
            {cardArtFor(preview.id) && <Image source={cardArtFor(preview.id)!} style={styles.previewArt} resizeMode="cover" />}
            <View style={styles.previewText}>
              <Text style={styles.previewKicker}>{preview.genre.toUpperCase()} · {preview.shortDescription.toUpperCase()}</Text>
              <Text style={styles.previewTitle}>{preview.title}</Text>
              <Text style={styles.previewBody} numberOfLines={4}>
                {preview.synopsis}
              </Text>
              <Text style={styles.previewFacts}>
                {AGE_LABEL[preview.ageGroup]} · {preview.minPlayers}–{preview.maxPlayers} players · ~{preview.estimatedMinutes} min
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: theme.spacing.screenX,
    paddingTop: theme.spacing.screenY - px(24),
  },
  filters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  filterLabel: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.textMuted,
    width: px(110),
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    gap: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  list: {
    width: px(900),
    gap: theme.spacing.xs,
  },
  empty: {
    ...theme.text.body,
    color: theme.colors.textSecondary,
  },
  back: {
    flexDirection: 'row',
    marginTop: theme.spacing.sm,
  },
  preview: {
    flex: 1,
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.overlay,
    borderTopWidth: px(3),
    borderTopColor: theme.colors.accent,
  },
  previewArt: {
    width: '100%',
    height: px(260),
  },
  previewText: {
    padding: theme.spacing.md,
  },
  previewKicker: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.accent,
  },
  previewTitle: {
    ...theme.text.h1,
    color: theme.colors.textPrimary,
    marginTop: px(4),
  },
  previewBody: {
    ...theme.text.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  previewFacts: {
    ...theme.text.label,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.sm,
    letterSpacing: px(1),
  },
});
