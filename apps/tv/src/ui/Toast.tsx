import React, {createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';
import {px, theme} from '../theme/theme';
import {cue, type Cue} from './cues';
import {timing, useReducedMotion} from './motion';

export type ToastTone = 'join' | 'leave' | 'signal' | 'success' | 'warning';

export interface ToastInput {
  tone: ToastTone;
  /** Uppercase eyebrow, e.g. "INVESTIGATOR CONNECTED". */
  title: string;
  /** The subject, e.g. the player's name. */
  body?: string;
  /** Technical metadata, e.g. "INVESTIGATOR #03". */
  meta?: string;
}

interface ToastItem extends ToastInput {
  id: number;
}

const ToastContext = createContext<(toast: ToastInput) => void>(() => undefined);

const GLYPH: Record<ToastTone, string> = {join: '●', leave: '○', signal: '⌁', success: '✓', warning: '!'};
const COLOR: Record<ToastTone, string> = {
  join: theme.colors.success,
  leave: theme.colors.textSecondary,
  signal: theme.colors.signalStrong,
  success: theme.colors.success,
  warning: theme.colors.warning,
};
const CUE: Record<ToastTone, Cue> = {join: 'player-joined', leave: 'player-left', signal: 'transition', success: 'success', warning: 'error'};

/**
 * Unobtrusive notices in the top-right corner (players joining or leaving,
 * the connection coming back). They never take focus, and they stack
 * (newest on top) and leave on their own.
 */
export const ToastProvider = ({children}: {children: ReactNode}) => {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const push = useCallback((toast: ToastInput) => {
    const id = nextId.current++;
    cue(CUE[toast.tone]);
    setItems(current => [{...toast, id}, ...current].slice(0, 3));
  }, []);
  const remove = useCallback((id: number) => setItems(current => current.filter(t => t.id !== id)), []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <View pointerEvents="none" style={styles.stack}>
        {items.map(item => (
          <Toast key={item.id} item={item} onDone={remove} />
        ))}
      </View>
    </ToastContext.Provider>
  );
};

export function useToast(): (toast: ToastInput) => void {
  return useContext(ToastContext);
}

const Toast = ({item, onDone}: {item: ToastItem; onDone: (id: number) => void}) => {
  const reduced = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const seq = Animated.sequence([
      timing(progress, 1, 'toast', reduced),
      Animated.delay(theme.motion.toastHold.duration),
      timing(progress, 0, 'modalExit', reduced),
    ]);
    seq.start(({finished}) => finished && onDone(item.id));
    return () => seq.stop();
  }, [progress, reduced, item.id, onDone]);
  const color = COLOR[item.tone];
  const style = useMemo(
    () => ({
      opacity: progress,
      transform: reduced ? [] : [{translateX: progress.interpolate({inputRange: [0, 1], outputRange: [px(60), 0]})}],
    }),
    [progress, reduced],
  );
  return (
    <Animated.View style={[styles.toast, {borderLeftColor: color}, style]} accessibilityLiveRegion="polite" testID="toast">
      <Text style={[styles.glyph, {color}]}>{GLYPH[item.tone]}</Text>
      <View style={styles.text}>
        <Text style={[styles.title, {color}]}>{item.title.toUpperCase()}</Text>
        {item.body !== undefined && <Text style={styles.body}>{item.body}</Text>}
        {item.meta !== undefined && <Text style={styles.meta}>{item.meta.toUpperCase()}</Text>}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  stack: {
    position: 'absolute',
    top: theme.spacing.screenY,
    right: theme.spacing.screenX - px(40),
    gap: theme.spacing.sm,
    alignItems: 'flex-end',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: px(440),
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderLeftWidth: px(5),
  },
  glyph: {
    fontSize: px(30),
    marginRight: theme.spacing.sm,
  },
  text: {
    flexShrink: 1,
  },
  title: {
    ...theme.text.label,
  },
  body: {
    ...theme.text.h2,
    color: theme.colors.textPrimary,
    fontSize: px(34),
    lineHeight: px(42),
  },
  meta: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.textMuted,
  },
});
