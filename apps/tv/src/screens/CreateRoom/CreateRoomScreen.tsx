import React, {useEffect, useRef, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {errorText} from '@roomriddle/client';
import {QrCode} from '../../components/QrCode/QrCode';
import {ScreenHeader} from '../../components/ScreenHeader/ScreenHeader';
import {TVButton} from '../../components/TVButton/TVButton';
import {findMystery} from '../../data/mysteries';
import {useGame} from '../../game/GameContext';
import {useBackInterceptor} from '../../navigation/useBackInterceptor';
import {px, theme} from '../../theme/theme';
import {ScreenProps} from '../types';

/**
 * Create Room (Phase 4, functional; the designed lobby is Phase 5).
 *
 * On entry the TV asks the server for a room and becomes its host. It shows
 * the server's room code and QR code, lists phones as they join (live), and
 * starts the mystery with START_GAME. The server decides who may start and
 * when; this screen only shows its answer.
 */
export const CreateRoomScreen = ({navigator, selectedMysteryId}: ScreenProps) => {
  const {room: view, createRoom, closeRoom, start, state} = useGame();
  const [confirmClose, setConfirmClose] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const mystery = findMystery(selectedMysteryId);
  const requested = useRef(false);

  // One room per visit. Opening the screen creates it; leaving closes it.
  useEffect(() => {
    if (!requested.current) {
      requested.current = true;
      createRoom(selectedMysteryId);
    }
  }, [createRoom, selectedMysteryId]);

  // The server started the game (our START_GAME, or a replay): go play.
  const started = view.room?.status === 'playing' && state !== null;
  useEffect(() => {
    if (started) {
      navigator.replace({name: 'gameIntro'});
    }
  }, [started, navigator]);

  // Errors from the server (e.g. not enough players) show as a notice.
  useEffect(() => {
    if (view.error) {
      setNotice(errorText(view.error.code));
    }
  }, [view.error]);

  // A room must never be closed by an accidental Back press.
  useBackInterceptor(() => {
    setNotice(null);
    setConfirmClose(current => !current);
    return true;
  });

  const room = view.room;
  const players = room?.players.filter(p => p.role === 'player') ?? [];
  const online = players.filter(p => p.connected).length;
  const enough = room !== null && online >= room.minPlayers;
  const offline = view.connection === 'reconnecting' || view.connection === 'closed';

  const close = () => {
    closeRoom();
    navigator.back();
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Join the Investigation" eyebrow={mystery?.title} subtitle={subtitleFor(view.connection, room !== null)} />

      <View style={styles.body}>
        <View style={styles.codeColumn}>
          <Text style={styles.label}>ROOM CODE</Text>
          <Text
            style={styles.code}
            testID="room-code"
            accessibilityLabel={room ? `Room code ${room.code.split('').join(' ')}` : 'Creating room'}>
            {room?.code ?? '····'}
          </Text>
          <Text style={styles.joinHint}>Scan the QR code or enter the code at</Text>
          <Text style={styles.joinUrl} testID="room-join-url">
            {room ? room.joinUrl.replace(/\/join\/\d+$/, '') : ' '}
          </Text>
          <View style={styles.waiting}>
            <View style={[styles.pulseDot, offline && styles.dotOffline]} />
            <Text style={styles.waitingText}>
              {offline ? 'Reconnecting to the server…' : enough ? 'Ready when you are.' : 'Waiting for players…'}
            </Text>
          </View>
          <Text style={styles.players} testID="room-player-count">
            {players.length === 1 ? '1 PLAYER' : `${players.length} PLAYERS`}
          </Text>
          <View style={styles.playerList}>
            {players.map(p => (
              <Text key={p.id} style={[styles.playerName, !p.connected && styles.playerOffline]} testID={`room-player-${p.name}`}>
                {p.name}
                {p.connected ? '' : ' (offline)'}
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.qrColumn}>
          {view.qr ? (
            <QrCode matrix={view.qr} size={QR} testID="room-qr" />
          ) : (
            <View style={[styles.qrPending, {width: QR, height: QR}]} />
          )}
          <Text style={styles.qrCaption}>Scan to join</Text>
        </View>
      </View>

      <View style={styles.actions}>
        {confirmClose ? (
          <>
            <Text style={styles.confirmText}>Close this room?</Text>
            <View style={styles.actionRow}>
              <TVButton
                variant="action"
                label="Keep Room"
                onPress={() => setConfirmClose(false)}
                preferredFocus
                testID="room-keep"
              />
              <TVButton variant="action" label="Close Room" onPress={close} testID="room-close" />
            </View>
          </>
        ) : (
          <>
            <Text style={styles.notice} testID="room-notice">
              {notice ?? (room ? `At least ${room.minPlayers} players are needed to start.` : ' ')}
            </Text>
            <View style={styles.actionRow}>
              <TVButton
                variant="action"
                label="Start"
                accessibilityHint="Starts the mystery once players have joined"
                onPress={() => {
                  if (!room) {
                    setNotice('Still connecting to the server…');
                    return;
                  }
                  setNotice(null);
                  start(selectedMysteryId);
                }}
                preferredFocus
                testID="room-start"
              />
              <TVButton
                variant="action"
                label="Back"
                onPress={() => {
                  setNotice(null);
                  setConfirmClose(true);
                }}
                testID="room-back"
              />
            </View>
          </>
        )}
      </View>
    </View>
  );
};

function subtitleFor(connection: string, hasRoom: boolean): string {
  if (hasRoom) {
    return 'Your room is open.';
  }
  return connection === 'reconnecting' || connection === 'closed'
    ? 'Cannot reach the game server. Retrying…'
    : 'Opening a room…';
}

const QR = px(340);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: theme.spacing.screenX,
    paddingTop: theme.spacing.screenY,
    paddingBottom: theme.spacing.screenY,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: theme.spacing.xxl,
  },
  codeColumn: {
    alignItems: 'flex-start',
  },
  label: {
    color: theme.colors.faintText,
    fontSize: theme.type.caption,
    letterSpacing: px(6),
  },
  code: {
    color: theme.colors.focus,
    fontSize: theme.type.roomCode,
    fontWeight: '200',
    letterSpacing: px(36),
  },
  joinHint: {
    color: theme.colors.mutedText,
    fontSize: theme.type.caption,
  },
  joinUrl: {
    color: theme.colors.text,
    fontSize: theme.type.body,
    letterSpacing: px(1),
  },
  waiting: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  pulseDot: {
    width: px(12),
    height: px(12),
    borderRadius: px(6),
    backgroundColor: theme.colors.accent,
    marginRight: theme.spacing.sm,
  },
  dotOffline: {
    backgroundColor: theme.colors.danger,
  },
  waitingText: {
    color: theme.colors.mutedText,
    fontSize: theme.type.body,
  },
  players: {
    marginTop: theme.spacing.xs,
    color: theme.colors.text,
    fontSize: theme.type.heading,
    fontWeight: '300',
    letterSpacing: px(4),
  },
  playerList: {
    marginTop: theme.spacing.xs,
    flexDirection: 'row',
    flexWrap: 'wrap',
    maxWidth: px(900),
    gap: theme.spacing.md,
  },
  playerName: {
    color: theme.colors.accent,
    fontSize: theme.type.body,
  },
  playerOffline: {
    color: theme.colors.faintText,
  },
  qrColumn: {
    alignItems: 'center',
  },
  qrPending: {
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
  },
  qrCaption: {
    marginTop: theme.spacing.md,
    color: theme.colors.mutedText,
    fontSize: theme.type.body,
    letterSpacing: px(2),
  },
  actions: {
    alignItems: 'flex-start',
  },
  actionRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  notice: {
    color: theme.colors.accent,
    fontSize: theme.type.caption,
    marginBottom: theme.spacing.md,
  },
  confirmText: {
    color: theme.colors.text,
    fontSize: theme.type.heading,
    fontWeight: '300',
    marginBottom: theme.spacing.md,
  },
});
