import React, {useEffect, useRef, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {errorExperience} from '@roomriddle/client';
import type {Player} from '@roomriddle/shared-types';
import {ConfirmPrompt} from '../../components/ConfirmPrompt/ConfirmPrompt';
import {QrCode} from '../../components/QrCode/QrCode';
import {TVButton} from '../../components/TVButton/TVButton';
import {findMystery} from '../../data/mysteries';
import {useGame} from '../../game/GameContext';
import {useBackInterceptor} from '../../navigation/useBackInterceptor';
import {useSettings} from '../../settings/SettingsContext';
import {px, theme} from '../../theme/theme';
import {Feedback} from '../../ui/Feedback';
import {LoadingState} from '../../ui/LoadingState';
import {StatusDot} from '../../ui/RRBadge';
import {Transition} from '../../ui/Transition';
import {ScreenProps} from '../types';

/**
 * The lobby, designed as an investigation briefing.
 *
 * Left: how to get in (room code in the technical voice, QR, address).
 * Right: the roster, one seat per possible investigator. Seats fill as
 * phones join (each arrival slides in and the shell shows a toast); a
 * dropped phone keeps its seat, marked offline. Bottom: host controls.
 *
 * On entry the TV asks the server for a room and becomes its host. The server
 * decides who may start and when; this screen only shows its answer.
 */
export const CreateRoomScreen = ({navigator, selectedMysteryId}: ScreenProps) => {
  const {room: view, createRoom, closeRoom, start, state} = useGame();
  const [confirmClose, setConfirmClose] = useState(false);
  const [refusal, setRefusal] = useState<{title: string; detail: string; key: number} | null>(null);
  const mystery = findMystery(selectedMysteryId);
  const requested = useRef(false);
  const {settings, update} = useSettings();

  // One room per visit. Opening the screen creates it; leaving closes it.
  useEffect(() => {
    if (!requested.current) {
      requested.current = true;
      createRoom(selectedMysteryId);
      // Having opened a room, this TV knows how it works: Home shows tonight's case from now on.
      if (!settings.onboarded) {
        update({onboarded: true});
      }
    }
  }, [createRoom, selectedMysteryId, settings.onboarded, update]);

  // The server started the game (our START_GAME, or a replay): go play.
  const started = view.room?.status === 'playing' && state !== null;
  useEffect(() => {
    if (started) {
      navigator.replace({name: 'gameIntro'});
    }
  }, [started, navigator]);

  // Refusals from the server (e.g. not enough players) show as feedback.
  useEffect(() => {
    if (view.error) {
      const x = errorExperience(view.error.code);
      setRefusal(current => ({title: x.title, detail: x.message, key: (current?.key ?? 0) + 1}));
    }
  }, [view.error]);

  // A room must never be closed by an accidental Back press.
  useBackInterceptor(() => {
    setRefusal(null);
    setConfirmClose(current => !current);
    return true;
  });

  const room = view.room;
  const players = room?.players.filter(p => p.role === 'player') ?? [];
  const online = players.filter(p => p.connected).length;
  const seats = room?.maxPlayers ?? 6;
  const enough = room !== null && online >= room.minPlayers;

  const close = () => {
    closeRoom();
    navigator.back();
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header} accessibilityRole="header">
        <Text style={styles.eyebrow}>INVESTIGATION ROOM</Text>
        <View style={styles.headerDash} />
        <Text style={styles.caseTitle}>{(mystery?.title ?? 'Unknown case').toUpperCase()}</Text>
      </View>

      <View style={styles.body}>
        {/* ── Access: code, QR, address ─────────────────────────── */}
        <View style={styles.access}>
          {room ? (
            <Transition preset="reveal" style={styles.accessInner}>
              <Text style={styles.label}>ROOM CODE</Text>
              <Text style={styles.code} testID="room-code" accessibilityLabel={`Room code ${room.code.split('').join(' ')}`}>
                {room.code}
              </Text>
              <View style={styles.qrRow}>
                <View style={styles.qrFrame}>{view.qr && <QrCode matrix={view.qr} size={QR} testID="room-qr" />}</View>
                <View style={styles.howTo}>
                  <Step n="01" text="Scan the code with your phone camera" />
                  <Step n="02" text="Or open this address and enter the code" />
                  <Text style={styles.joinUrl} testID="room-join-url">
                    {room.joinUrl.replace(/^https?:\/\//, '').replace(/\/join\/\d+$/, '')}
                  </Text>
                  <Step n="03" text="Pick your investigator name" />
                </View>
              </View>
            </Transition>
          ) : (
            <View style={styles.accessPending}>
              <LoadingState kind="connecting" title="OPENING INVESTIGATION ROOM" testID="room-opening" />
            </View>
          )}
        </View>

        {/* ── Roster ────────────────────────────────────────────── */}
        <View style={styles.roster}>
          <View style={styles.rosterHead}>
            <Text style={styles.label}>INVESTIGATORS</Text>
            <Text style={styles.count} testID="room-player-count">
              {players.length === 1 ? '1 PLAYER' : `${players.length} PLAYERS`}
            </Text>
          </View>
          <View style={styles.seats}>
            {Array.from({length: seats}, (_, i) => {
              const p = players[i];
              return p ? <Seat key={p.id} player={p} index={i} /> : <EmptySeat key={`empty-${i}`} index={i} />;
            })}
          </View>
          <View style={styles.readiness}>
            <StatusDot online={enough} label={enough ? 'Ready to begin' : room ? `${room.minPlayers - online} more needed to begin` : 'Waiting for the server'} />
            <Text style={styles.readyCount}>
              {online}/{seats} ONLINE
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        {confirmClose ? (
          <ConfirmPrompt
            question="Close this room?"
            detail="Every connected phone will be sent back to the join screen."
            safeLabel="Keep Room"
            onSafe={() => setConfirmClose(false)}
            riskyLabel="Close Room"
            onRisky={close}
            testIDPrefix="room-confirm"
            safeTestID="room-keep"
            riskyTestID="room-close"
          />
        ) : (
          <>
            <View style={styles.feedbackSlot} testID="room-notice">
              {refusal && <Feedback kind="failure" title={refusal.title} detail={refusal.detail} playKey={refusal.key} autoHideMs={0} />}
            </View>
            <View style={styles.actionRow}>
              <TVButton
                variant="action"
                tone="primary"
                label="Start Investigation"
                accessibilityHint="Starts the mystery once enough investigators have joined"
                onPress={() => {
                  if (!room) {
                    setRefusal(current => ({title: 'STILL CONNECTING', detail: 'The room is still opening. One moment.', key: (current?.key ?? 0) + 1}));
                    return;
                  }
                  setRefusal(null);
                  start(selectedMysteryId);
                }}
                preferredFocus
                testID="room-start"
              />
              <TVButton
                variant="action"
                label="Back"
                onPress={() => {
                  setRefusal(null);
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

const Step = ({n, text}: {n: string; text: string}) => (
  <View style={styles.step}>
    <Text style={styles.stepN}>{n}</Text>
    <Text style={styles.stepText}>{text}</Text>
  </View>
);

const seatNumber = (i: number) => String(i + 1).padStart(2, '0');

/** A filled seat. Slides in when the investigator arrives. */
const Seat = ({player, index}: {player: Player; index: number}) => (
  <Transition preset="slide" from="right" motion="listItemEnter" style={[styles.seat, styles.seatFilled, !player.connected && styles.seatOffline]}>
    <Text style={styles.seatN}>{seatNumber(index)}</Text>
    <Text style={[styles.seatGlyph, !player.connected && styles.seatGlyphOff]}>{player.connected ? '●' : '○'}</Text>
    <Text style={[styles.seatName, !player.connected && styles.seatNameOff]} testID={`room-player-${player.name}`} numberOfLines={1}>
      {player.name.toUpperCase()}
    </Text>
    <Text style={[styles.seatState, !player.connected && styles.seatStateOff]}>{player.connected ? (player.ready ? 'READY' : 'CONNECTED') : 'OFFLINE'}</Text>
  </Transition>
);

const EmptySeat = ({index}: {index: number}) => (
  <View style={[styles.seat, styles.seatEmpty]}>
    <Text style={styles.seatN}>{seatNumber(index)}</Text>
    <Text style={styles.seatEmptyText}>AWAITING INVESTIGATOR</Text>
  </View>
);

const QR = px(300);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: theme.spacing.screenX,
    paddingTop: theme.spacing.screenY,
    paddingBottom: theme.spacing.screenY - px(24),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyebrow: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.textMuted,
  },
  headerDash: {
    width: px(40),
    height: 1,
    marginHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.textMuted,
  },
  caseTitle: {
    ...theme.text.label,
    color: theme.colors.accent,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xl,
  },
  access: {
    flex: 1.1,
  },
  accessInner: {
    alignItems: 'flex-start',
  },
  accessPending: {
    height: px(560),
    justifyContent: 'center',
  },
  label: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.textMuted,
  },
  code: {
    ...theme.text.roomCode,
    color: theme.colors.focus,
    marginLeft: -px(6),
  },
  qrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    gap: theme.spacing.lg,
  },
  qrFrame: {
    padding: px(10),
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
  },
  howTo: {
    gap: theme.spacing.sm,
    maxWidth: px(420),
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepN: {
    ...theme.text.mono,
    color: theme.colors.accent,
    width: px(56),
  },
  stepText: {
    ...theme.text.body,
    fontSize: px(28),
    lineHeight: px(36),
    color: theme.colors.textSecondary,
    flexShrink: 1,
  },
  joinUrl: {
    ...theme.text.mono,
    color: theme.colors.textPrimary,
    marginLeft: px(56),
  },
  roster: {
    flex: 1,
    paddingLeft: theme.spacing.lg,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.hairline,
  },
  rosterHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: theme.spacing.sm,
  },
  count: {
    ...theme.text.mono,
    color: theme.colors.textPrimary,
  },
  seats: {
    gap: px(10),
  },
  seat: {
    flexDirection: 'row',
    alignItems: 'center',
    height: px(64),
    paddingHorizontal: theme.spacing.sm,
    borderWidth: 1,
  },
  seatFilled: {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderLeftWidth: px(4),
    borderLeftColor: theme.colors.success,
  },
  seatOffline: {
    borderLeftColor: theme.colors.textMuted,
    backgroundColor: theme.colors.surfaceSunken,
  },
  seatEmpty: {
    borderColor: theme.colors.hairline,
    borderStyle: 'dashed',
  },
  seatN: {
    ...theme.text.mono,
    color: theme.colors.textMuted,
    width: px(60),
  },
  seatGlyph: {
    color: theme.colors.success,
    fontSize: px(22),
    width: px(40),
  },
  seatGlyphOff: {
    color: theme.colors.textMuted,
  },
  seatName: {
    ...theme.text.h2,
    fontSize: px(32),
    lineHeight: px(40),
    letterSpacing: px(4),
    color: theme.colors.textPrimary,
    flex: 1,
  },
  seatNameOff: {
    color: theme.colors.textSecondary,
  },
  seatState: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.success,
  },
  seatStateOff: {
    color: theme.colors.textMuted,
  },
  seatEmptyText: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.textMuted,
    opacity: 0.7,
  },
  readiness: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  readyCount: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.textSecondary,
  },
  actions: {
    alignItems: 'flex-start',
  },
  feedbackSlot: {
    minHeight: px(92),
    justifyContent: 'flex-end',
    marginBottom: theme.spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
});
