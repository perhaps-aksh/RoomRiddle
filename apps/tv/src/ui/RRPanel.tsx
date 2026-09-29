import React, {ReactNode} from 'react';
import {StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {px, theme} from '../theme/theme';

export type PanelVariant = 'surface' | 'elevated' | 'paper' | 'signal' | 'success' | 'danger';

export interface RRPanelProps {
  children: ReactNode;
  variant?: PanelVariant;
  /** Case-file tab above the panel, e.g. "EVIDENCE 02". Technical voice. */
  tab?: string;
  /** Right-aligned metadata in the tab row, e.g. "11:47 PM". */
  meta?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const EDGE: Record<PanelVariant, string> = {
  surface: theme.colors.border,
  elevated: theme.colors.borderStrong,
  paper: theme.colors.paper,
  signal: theme.colors.signalSoft,
  success: theme.colors.success,
  danger: theme.colors.danger,
};

/**
 * The case-file panel: squared, with an index tab and a coloured spine on the
 * left edge. The spine tells you what kind of thing this is (evidence, system,
 * success) and the tab says it in words, so colour is never the only signal.
 */
export const RRPanel = ({children, variant = 'surface', tab, meta, style, testID}: RRPanelProps) => {
  const paper = variant === 'paper';
  return (
    <View style={style} testID={testID}>
      {(tab !== undefined || meta !== undefined) && (
        <View style={styles.tabRow}>
          {tab !== undefined && (
            <View style={[styles.tab, {borderColor: EDGE[variant]}]}>
              <Text style={[styles.tabText, paper && styles.tabTextPaper]}>{tab.toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.tabRule} />
          {meta !== undefined && <Text style={styles.meta}>{meta}</Text>}
        </View>
      )}
      <View style={[styles.panel, paper ? styles.paper : variant === 'elevated' ? styles.elevated : styles.surface, {borderColor: paper ? theme.colors.paper : theme.colors.border}]}>
        <View style={[styles.spine, {backgroundColor: EDGE[variant]}]} />
        <View style={styles.body}>{children}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  tab: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: px(6),
    borderTopWidth: theme.borders.thin,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  tabText: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.textSecondary,
  },
  tabTextPaper: {
    color: theme.colors.paper,
  },
  tabRule: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.hairline,
  },
  meta: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.textMuted,
    marginLeft: theme.spacing.sm,
    marginBottom: px(4),
  },
  panel: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: theme.radii.none,
    overflow: 'hidden',
  },
  surface: {
    backgroundColor: theme.colors.surface,
  },
  elevated: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  paper: {
    backgroundColor: theme.colors.paper,
  },
  spine: {
    width: px(6),
  },
  body: {
    flex: 1,
    padding: theme.spacing.lg,
  },
});
