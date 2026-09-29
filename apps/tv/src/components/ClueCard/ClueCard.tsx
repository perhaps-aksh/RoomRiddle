import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import type {Clue} from '@roomriddle/shared-types';
import {px, theme} from '../../theme/theme';
import {Transition} from '../../ui/Transition';

/**
 * A discovered clue, presented as a found document: a paper slip with an
 * evidence number tab. Key evidence carries a stamp. `fresh` plays the
 * discovery reveal (scale up out of the dark) once, for a clue just found.
 */
export const ClueCard = ({
  clue,
  compact,
  index,
  fresh,
  testID,
}: {
  clue: Clue;
  compact?: boolean;
  /** 1-based evidence number, shown as "EVIDENCE #02". */
  index?: number;
  /** Just discovered: play the discovery reveal. */
  fresh?: boolean;
  testID?: string;
}) => {
  const number = index !== undefined ? `#${String(index).padStart(2, '0')}` : '';
  const body = (
    <View style={[styles.card, compact && styles.compact]} testID={testID}>
      <View style={styles.tabRow}>
        <Text style={styles.tab}>EVIDENCE {number}</Text>
        {clue.major && (
          <View style={styles.stamp}>
            <Text style={styles.stampText}>KEY</Text>
          </View>
        )}
        {fresh && <Text style={styles.fresh}>● NEW</Text>}
      </View>
      <Text style={[styles.title, compact && styles.titleCompact]}>{clue.title}</Text>
      <View style={styles.rule} />
      {clue.description.map((line, i) => (
        <Text key={i} style={[styles.line, compact && styles.lineCompact]}>
          {line}
        </Text>
      ))}
    </View>
  );
  return fresh ? (
    <Transition preset="reveal" testID={testID ? `${testID}-reveal` : undefined}>
      {body}
    </Transition>
  ) : (
    body
  );
};

const styles = StyleSheet.create({
  card: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.paper,
    borderLeftWidth: px(8),
    borderLeftColor: theme.colors.accentSoft,
  },
  compact: {
    padding: theme.spacing.md,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  tab: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.ink,
    opacity: 0.75,
  },
  stamp: {
    paddingHorizontal: px(10),
    borderWidth: px(2),
    borderColor: theme.colors.ink,
    transform: [{rotate: '-4deg'}],
  },
  stampText: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.ink,
  },
  fresh: {
    ...theme.text.label,
    color: theme.colors.ink,
    marginLeft: 'auto',
  },
  title: {
    ...theme.text.h1,
    fontSize: px(44),
    lineHeight: px(54),
    marginTop: theme.spacing.xs,
    color: theme.colors.ink,
  },
  titleCompact: {
    fontSize: px(34),
    lineHeight: px(42),
  },
  rule: {
    width: px(56),
    height: px(2),
    marginVertical: theme.spacing.sm,
    backgroundColor: theme.colors.ink,
    opacity: 0.4,
  },
  line: {
    ...theme.text.narration,
    fontSize: px(30),
    lineHeight: px(44),
    color: theme.colors.ink,
  },
  lineCompact: {
    fontSize: px(26),
    lineHeight: px(36),
  },
});
