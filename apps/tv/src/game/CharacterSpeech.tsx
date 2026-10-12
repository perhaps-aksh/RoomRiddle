import React, {useEffect, useRef, useState} from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';
import type {CharacterReply} from '@roomriddle/shared-types';
import {useAudio} from '../audio/AudioContext';
import {px, theme} from '../theme/theme';
import {timing, useReducedMotion} from '../ui/motion';
import {useGame} from './GameContext';

/** How long a reply may wait for its voice before the subtitle shows anyway. */
export const VOICE_WAIT_MS = 3500;
/** On screen for about as long as it takes to say, within limits. */
export function holdMsFor(text: string): number {
  return Math.min(16_000, Math.max(5000, 2200 + text.length * 70));
}

export function initials(name: string): string {
  return name
    .replace(/^(Inspector|Detective|The)\s+/i, '')
    .split(/\s+/)
    .map(w => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

type Shown = {reply: CharacterReply; voiced: boolean};

/**
 * The TV half of questioning: who is thinking, then the reply in a parchment
 * bubble with the speaker's name, spoken in their voice when it arrives.
 * Presentation only; it never takes focus, so the D-pad is never trapped.
 */
export const CharacterSpeech = () => {
  const {mode, room, mystery, serverBase} = useGame();
  const audio = useAudio();
  const reduced = useReducedMotion();
  const [shown, setShown] = useState<Shown | null>(null);
  const queue = useRef<CharacterReply[]>([]);
  const seen = useRef(new Set<string>());
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const fade = useRef(new Animated.Value(0)).current;

  const conversation = room.conversation;

  // New replies join the queue (oldest first); voices attach as they arrive.
  useEffect(() => {
    for (const r of conversation) {
      if (!seen.current.has(r.id)) {
        seen.current.add(r.id);
        queue.current.push(r);
      }
    }
    queue.current = queue.current.map(q => conversation.find(r => r.id === q.id) ?? q);
    pump();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation]);

  // A voice that lands while its reply is still on screen is played then.
  useEffect(() => {
    if (!shown || shown.voiced) return;
    const now = conversation.find(r => r.id === shown.reply.id);
    if (now?.audioUrl) {
      audio.speakUrl(`reply.${now.id}`, serverBase + now.audioUrl);
      setShown({reply: now, voiced: true});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (mode !== 'room') {
      queue.current = [];
      setShown(null);
    }
  }, [mode]);

  const later = (ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  };

  function pump() {
    if (shownRef.current || queue.current.length === 0) return;
    const next = queue.current[0]!;
    // Give the voice a moment so speech and subtitle start together.
    const started = Date.now();
    const wait = () => {
      const fresh = queue.current[0];
      if (!fresh) return;
      if (fresh.audioUrl || Date.now() - started >= VOICE_WAIT_MS) {
        queue.current.shift();
        present(fresh);
      } else {
        later(150, wait);
      }
    };
    if (next.audioUrl) {
      queue.current.shift();
      present(next);
    } else {
      later(150, wait);
    }
  }

  const shownRef = useRef<Shown | null>(null);
  function present(reply: CharacterReply) {
    const voiced = !!reply.audioUrl;
    if (voiced) audio.speakUrl(`reply.${reply.id}`, serverBase + reply.audioUrl);
    shownRef.current = {reply, voiced};
    setShown(shownRef.current);
    timing(fade, 1, 'modalEnter', reduced).start();
    later(holdMsFor(reply.text), () => {
      timing(fade, 0, 'modalExit', reduced).start(() => {
        shownRef.current = null;
        setShown(null);
        pump();
      });
    });
  }

  if (mode !== 'room') return null;
  const thinking = room.thinking;
  const thinker = thinking && !shown ? mystery?.truth?.characters.find(c => c.id === thinking.characterId) : undefined;
  if (!shown && !thinker) return null;

  if (!shown && thinker) {
    return (
      <View pointerEvents="none" style={styles.dock} testID="speech-thinking">
        <View style={[styles.bubble, styles.thinkingBubble]}>
          <Portrait name={thinker.name} />
          <View style={styles.body}>
            <Text style={styles.name}>{thinker.name.toUpperCase()}</Text>
            <Text style={styles.asked}>{thinking!.askedBy ? `${thinking!.askedBy} asks…` : 'The TV asks…'}</Text>
            <Text style={styles.thinkingText}>is thinking…</Text>
          </View>
        </View>
      </View>
    );
  }

  const {reply} = shown!;
  const evidence = reply.evidenceClueId ? mystery?.clues.find(c => c.id === reply.evidenceClueId)?.title : undefined;
  return (
    <Animated.View pointerEvents="none" style={[styles.dock, {opacity: fade}]} testID="speech-bubble">
      <View style={styles.bubble}>
        <Portrait name={reply.characterName} />
        <View style={styles.body}>
          <Text style={styles.name}>{reply.characterName.toUpperCase()}</Text>
          <Text style={styles.asked} numberOfLines={1}>
            {reply.askedBy ?? 'TV'}: “{reply.question}”{evidence ? `  ·  shows ${evidence}` : ''}
          </Text>
          <Text style={styles.line} testID="speech-text">
            {reply.text}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

const Portrait = ({name}: {name: string}) => (
  // Placeholder until the painted character portraits land (Asset List §characters).
  <View style={styles.portrait}>
    <Text style={styles.portraitText}>{initials(name)}</Text>
  </View>
);

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: theme.spacing.screenX,
    right: theme.spacing.screenX,
    // Above the footer line most screens keep at the bottom edge.
    bottom: theme.spacing.screenY + px(84),
    // Right side: screens keep their primary buttons bottom-left, so the bubble never covers focus.
    alignItems: 'flex-end',
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: px(820),
    paddingVertical: px(28),
    paddingHorizontal: px(36),
    columnGap: px(32),
    backgroundColor: theme.colors.paper,
    borderRadius: theme.radii.md,
    borderWidth: px(3),
    borderColor: theme.colors.accentSoft,
  },
  thinkingBubble: {
    width: px(760),
    opacity: 0.94,
  },
  portrait: {
    width: px(132),
    height: px(132),
    borderRadius: px(66),
    backgroundColor: theme.colors.ink,
    borderWidth: px(4),
    borderColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portraitText: {
    ...theme.text.h2,
    color: theme.colors.accent,
  },
  body: {
    flex: 1,
    rowGap: px(6),
  },
  name: {
    ...theme.text.label,
    fontSize: px(24),
    letterSpacing: px(3),
    color: theme.colors.ink,
  },
  asked: {
    ...theme.text.body,
    fontSize: px(26),
    color: theme.colors.ink,
    opacity: 0.7,
  },
  line: {
    ...theme.text.narration,
    color: theme.colors.ink,
    marginTop: px(6),
  },
  thinkingText: {
    ...theme.text.narration,
    color: theme.colors.ink,
    fontStyle: 'italic',
    opacity: 0.75,
  },
});
