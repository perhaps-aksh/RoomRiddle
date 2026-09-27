import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {ScreenHeader} from '../../components/ScreenHeader/ScreenHeader';
import {TVButton} from '../../components/TVButton/TVButton';
import {MOCK_ROOM} from '../../data/mockRoom';
import {findMystery} from '../../data/mysteries';
import {useBackInterceptor} from '../../navigation/useBackInterceptor';
import {px, theme} from '../../theme/theme';
import {ScreenProps} from '../types';

/**
 * Create Room: UI PROTOTYPE. The room code is static mock data and nobody can join
 * yet; real rooms, QR joining and player lists arrive with multiplayer (Phase 4).
 */
export const CreateRoomScreen = ({navigator, selectedMysteryId}: ScreenProps) => {
  const [confirmClose, setConfirmClose] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const room = MOCK_ROOM;
  const mystery = findMystery(selectedMysteryId);

  // A room must never be closed by an accidental Back press.
  useBackInterceptor(() => {
    setNotice(null);
    setConfirmClose(current => !current);
    return true;
  });

  const players = room.playerCount === 1 ? '1 Player' : `${room.playerCount} Players`;

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Create Room"
        eyebrow={mystery?.title}
        subtitle="Your room is ready."
      />

      <View style={styles.body}>
        <View style={styles.codeColumn}>
          <Text style={styles.label}>ROOM CODE</Text>
          <Text
            style={styles.code}
            accessibilityLabel={`Room code ${room.code.split('').join(' ')}`}>
            {room.code}
          </Text>
          <View style={styles.waiting}>
            <View style={styles.pulseDot} />
            <Text style={styles.waitingText}>Waiting for players…</Text>
          </View>
          <Text style={styles.players}>{players}</Text>
        </View>

        <View style={styles.qrColumn}>
          <QrPlaceholder />
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
              <TVButton
                variant="action"
                label="Close Room"
                onPress={() => navigator.back()}
                testID="room-close"
              />
            </View>
          </>
        ) : (
          <>
            <Text style={styles.notice}>{notice ?? ' '}</Text>
            <View style={styles.actionRow}>
              <TVButton
                variant="action"
                label="Start"
                accessibilityHint="Starts the mystery once players have joined"
                onPress={() =>
                  setNotice(
                    room.playerCount < 2
                      ? 'At least 2 players are needed. Joining arrives in the multiplayer phase.'
                      : 'Gameplay arrives after the game engine phase.',
                  )
                }
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

/**
 * PLACEHOLDER, not a scannable code. Three finder squares and a label so it can't be
 * mistaken for a real QR code. The real one is generated from the room URL in Phase 4.
 */
const QrPlaceholder = () => (
  <View style={styles.qr} accessibilityLabel="QR code placeholder">
    <Finder style={styles.finderTL} />
    <Finder style={styles.finderTR} />
    <Finder style={styles.finderBL} />
    <Text style={styles.qrPlaceholderText}>QR CODE{'\n'}PLACEHOLDER</Text>
  </View>
);

const Finder = ({style}: {style: object}) => (
  <View style={[styles.finder, style]}>
    <View style={styles.finderCore} />
  </View>
);

const QR = px(300);
const FINDER = px(72);

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
  waitingText: {
    color: theme.colors.mutedText,
    fontSize: theme.type.body,
  },
  players: {
    marginTop: theme.spacing.xs,
    color: theme.colors.text,
    fontSize: theme.type.heading,
    fontWeight: '300',
  },
  qrColumn: {
    alignItems: 'center',
  },
  qr: {
    width: QR,
    height: QR,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finder: {
    position: 'absolute',
    width: FINDER,
    height: FINDER,
    borderWidth: px(10),
    borderColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finderCore: {
    width: px(26),
    height: px(26),
    backgroundColor: theme.colors.background,
  },
  finderTL: {top: px(22), left: px(22)},
  finderTR: {top: px(22), right: px(22)},
  finderBL: {bottom: px(22), left: px(22)},
  qrPlaceholderText: {
    color: theme.colors.background,
    fontSize: px(22),
    letterSpacing: px(3),
    textAlign: 'center',
    fontWeight: '600',
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
