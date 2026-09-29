import React, {useEffect, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import type {Player} from '@roomriddle/shared-types';
import {useGame} from './GameContext';
import {theme} from '../theme/theme';
import {ErrorState} from '../ui/ErrorState';
import {LoadingState} from '../ui/LoadingState';
import {useToast} from '../ui/Toast';

/** How long a dropped connection may retry quietly before we ask the host what to do. */
export const QUIET_RECONNECT_MS = 6000;

/**
 * Watches the hosted room and turns changes into feedback. It renders
 * nothing of its own except connection trouble:
 *
 * - players connecting, dropping and returning → toasts
 * - connection dropped → a small "RECONNECTING" strip (the game is paused by
 *   the server meanwhile, so nothing is lost)
 * - still down after QUIET_RECONNECT_MS → a blocking "CONNECTION INTERRUPTED"
 *   with RETRY and RETURN HOME. `onBlockingChange` lets the shell hide the
 *   screen underneath, so the D-pad can't wander behind the error.
 * - back → "CONNECTION RESTORED"
 */
export const RoomWatcher = ({onBlockingChange, onReturnHome}: {onBlockingChange: (blocking: boolean) => void; onReturnHome: () => void}) => {
  const {mode, room, reconnect, closeRoom} = useGame();
  const toast = useToast();
  const known = useRef(new Map<string, Player>());
  const [interrupted, setInterrupted] = useState(false);
  const wasDown = useRef(false);

  // Players: diff the list the server sends against what we've seen.
  const players = room.room?.players;
  useEffect(() => {
    if (!players) {
      known.current.clear();
      return;
    }
    const seats = players.filter(p => p.role === 'player');
    seats.forEach((p, i) => {
      const before = known.current.get(p.id);
      const seat = `Investigator #${String(i + 1).padStart(2, '0')}`;
      if (!before) {
        toast({tone: 'join', title: 'Investigator connected', body: p.name, meta: seat});
      } else if (before.connected && !p.connected) {
        toast({tone: 'leave', title: 'Signal lost', body: p.name, meta: 'Their seat is held'});
      } else if (!before.connected && p.connected) {
        toast({tone: 'join', title: 'Investigator back', body: p.name, meta: seat});
      }
    });
    for (const [id, p] of known.current) {
      if (!seats.some(s => s.id === id)) {
        toast({tone: 'leave', title: 'Investigator left', body: p.name});
      }
    }
    known.current = new Map(seats.map(p => [p.id, p]));
  }, [players, toast]);

  // Connection.
  const down = mode === 'room' && room.connection === 'reconnecting';
  useEffect(() => {
    if (!down) {
      if (wasDown.current && mode === 'room' && room.connection === 'open') {
        toast({tone: 'signal', title: 'Connection restored', body: 'Investigation resumed'});
      }
      wasDown.current = false;
      setInterrupted(false);
      return;
    }
    wasDown.current = true;
    const timer = setTimeout(() => setInterrupted(true), QUIET_RECONNECT_MS);
    return () => clearTimeout(timer);
  }, [down, mode, room.connection, toast]);

  const blocking = down && interrupted;
  useEffect(() => onBlockingChange(blocking), [blocking, onBlockingChange]);

  if (!down) {
    return null;
  }
  if (!blocking) {
    return (
      <View pointerEvents="none" style={styles.strip} testID="connection-reconnecting">
        <LoadingState kind="reconnecting" compact />
      </View>
    );
  }
  return (
    <View style={styles.blocking} testID="connection-interrupted">
      <ErrorState
        code="CONNECTION_FAILED"
        message="The investigation server could not be reached. The game is paused and your progress is safe."
        actions={{
          retry: () => {
            setInterrupted(false);
            reconnect();
          },
          'return-home': () => {
            closeRoom();
            onReturnHome();
          },
        }}
        testIDPrefix="connection"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  strip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: theme.spacing.md,
    alignItems: 'center',
  },
  blocking: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    backgroundColor: theme.colors.overlay,
  },
});
