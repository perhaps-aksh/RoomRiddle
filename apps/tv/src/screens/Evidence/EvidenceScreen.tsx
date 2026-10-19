import React, {useState} from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import {getEvidence} from '@roomriddle/game-engine';
import type {Clue} from '@roomriddle/shared-types';
import {FocusableCard} from '../../components/FocusableCard/FocusableCard';
import {GameHeader} from '../../components/GameHeader/GameHeader';
import {TVButton} from '../../components/TVButton/TVButton';
import {useGame} from '../../game/GameContext';
import {px, theme} from '../../theme/theme';
import {Transition} from '../../ui/Transition';
import {closeupFor} from '../../world/art';
import {ScreenProps} from '../types';

/** A slight, stable tilt per photo, so the page looks pinned by hand. */
const TILTS = ['-2.5deg', '1.8deg', '-1deg', '2.6deg', '-1.8deg', '1deg', '-2.2deg', '1.4deg'];
const PER_PAGE = 8;

/**
 * The evidence journal, after the "journal clues" reference: an open case
 * book. The right page holds a photo of every clue found (numbered in the
 * order found) and sealed slots for what is still out there; the left page
 * reads the photo in focus. No spoilers: sealed slots carry no titles.
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
  const onPage = evidence.slice(-PER_PAGE);
  const sealed = Math.max(0, Math.min(PER_PAGE, mystery.clues.length) - onPage.length);
  const tag = (n: number) => `#${String(n).padStart(2, '0')}`;

  return (
    <View style={styles.screen}>
      <GameHeader context={`Evidence · ${evidence.length} of ${mystery.clues.length} found`} />
      <View style={styles.book}>
        {/* Left page: the clue in focus. */}
        <View style={[styles.page, styles.leftPage]}>
          <Text style={styles.pageKicker}>CASE JOURNAL</Text>
          {shown ? (
            <Transition key={shown.id} preset="fade" motion="focusIn" style={styles.reading} testID="journal-reading">
              <Text style={styles.readTag}>
                EVIDENCE {tag(numberOf(shown.id))} · {sceneTitle(shown.sceneId).toUpperCase()}
                {shown.major ? '  ·  KEY' : ''}
              </Text>
              <Text style={styles.readTitle}>{shown.title}</Text>
              <View style={styles.inkRule} />
              {shown.description.map((line, i) => (
                <Text key={i} style={styles.readLine}>
                  {line}
                </Text>
              ))}
            </Transition>
          ) : (
            <View style={styles.reading}>
              <Text style={styles.readTitle}>No evidence yet</Text>
              <Text style={styles.readLine}>Nothing yet. Investigate the scene to find clues.</Text>
            </View>
          )}
          <View style={styles.back}>
            <TVButton variant="action" label="Back to scene" onPress={() => navigator.back()} preferredFocus={evidence.length === 0} testID="evidence-back" />
          </View>
        </View>

        <View style={styles.spine} />

        {/* Right page: the photos. */}
        <View style={[styles.page, styles.rightPage]}>
          <Text style={styles.pageKicker}>
            FOUND {String(evidence.length).padStart(2, '0')}/{String(mystery.clues.length).padStart(2, '0')}
          </Text>
          <View style={styles.grid}>
            {onPage.map((clue, index) => (
              <Photo
                key={clue.id}
                clue={clue}
                label={tag(numberOf(clue.id))}
                tilt={TILTS[index % TILTS.length]!}
                preferredFocus={index === onPage.length - 1}
                onFocus={() => setFocusedId(clue.id)}
                accessibilityLabel={`Evidence ${numberOf(clue.id)}: ${clue.title}, found in ${sceneTitle(clue.sceneId)}`}
              />
            ))}
            {Array.from({length: sealed}, (_, i) => (
              <View key={`sealed-${i}`} style={[styles.photo, styles.sealedPhoto, {transform: [{rotate: TILTS[(onPage.length + i) % TILTS.length]!}]}]}>
                <Text style={styles.sealedText}>?</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

const Photo = ({
  clue,
  label,
  tilt,
  preferredFocus,
  onFocus,
  accessibilityLabel,
}: {
  clue: Clue;
  label: string;
  tilt: string;
  preferredFocus: boolean;
  onFocus: () => void;
  accessibilityLabel: string;
}) => {
  const art = closeupFor(clue.id);
  return (
    <FocusableCard
      onPress={onFocus}
      onFocus={onFocus}
      preferredFocus={preferredFocus}
      accessibilityLabel={accessibilityLabel}
      focusScale={1.08}
      style={{transform: [{rotate: tilt}]}}
      testID={`evidence-${clue.id}`}>
      {() => (
        <View style={styles.photo}>
          <View style={styles.photoWindow}>
            {art ? <Image source={art} style={styles.photoImage} resizeMode="cover" /> : <Text style={styles.photoInitial}>{clue.title.slice(0, 1)}</Text>}
          </View>
          <Text style={styles.photoCaption} numberOfLines={1}>
            {label} {clue.title}
          </Text>
          {clue.major && <View style={styles.pin} />}
        </View>
      )}
    </FocusableCard>
  );
};

const PHOTO_W = px(200);
const LEATHER = '#3a2618';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: theme.spacing.screenX,
    paddingTop: theme.spacing.screenY - px(24),
    paddingBottom: theme.spacing.screenY - px(24),
    backgroundColor: theme.colors.background,
  },
  book: {
    flex: 1,
    flexDirection: 'row',
    marginTop: theme.spacing.md,
    borderRadius: theme.radii.md,
    overflow: 'hidden',
    borderWidth: px(10),
    borderColor: LEATHER,
  },
  page: {
    backgroundColor: theme.colors.paper,
    paddingHorizontal: px(44),
    paddingVertical: px(32),
  },
  leftPage: {
    width: px(680),
  },
  rightPage: {
    flex: 1,
  },
  spine: {
    width: px(14),
    backgroundColor: LEATHER,
  },
  pageKicker: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.ink,
    opacity: 0.6,
  },
  reading: {
    flex: 1,
    marginTop: theme.spacing.md,
  },
  readTag: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: '#8a2c1c',
  },
  readTitle: {
    ...theme.text.h1,
    color: theme.colors.ink,
    marginTop: px(6),
  },
  inkRule: {
    height: px(2),
    width: px(120),
    backgroundColor: theme.colors.ink,
    opacity: 0.5,
    marginVertical: theme.spacing.sm,
  },
  readLine: {
    ...theme.text.narration,
    color: theme.colors.ink,
    marginBottom: px(10),
  },
  back: {
    flexDirection: 'row',
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
    gap: px(28),
    marginTop: theme.spacing.md,
  },
  photo: {
    width: PHOTO_W,
    padding: px(12),
    paddingBottom: px(10),
    backgroundColor: '#f6f1e4',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: px(8),
    shadowOffset: {width: 0, height: px(4)},
    elevation: 6,
  },
  photoWindow: {
    height: PHOTO_W - px(24),
    backgroundColor: theme.colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoInitial: {
    ...theme.text.display,
    color: theme.colors.accent,
  },
  photoCaption: {
    ...theme.text.body,
    fontSize: px(20),
    lineHeight: px(28),
    color: theme.colors.ink,
    marginTop: px(8),
  },
  pin: {
    position: 'absolute',
    top: -px(8),
    alignSelf: 'center',
    width: px(18),
    height: px(18),
    borderRadius: px(9),
    backgroundColor: '#a3301f',
  },
  sealedPhoto: {
    height: PHOTO_W + px(36),
    backgroundColor: 'transparent',
    borderWidth: px(3),
    borderStyle: 'dashed',
    borderColor: 'rgba(40,30,20,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0,
    elevation: 0,
  },
  sealedText: {
    ...theme.text.display,
    color: 'rgba(40,30,20,0.3)',
  },
});
