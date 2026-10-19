import React, {useState} from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import {deskArt} from '../../ui/keyArt';
import {combinationAnswer, getPuzzleView, getSceneView} from '@roomriddle/game-engine';
import type {GameEvent, Puzzle, ScoreBreakdown} from '@roomriddle/shared-types';
import {applyDigitKey, DigitEntry} from '../../components/DigitEntry/DigitEntry';
import {GameHeader} from '../../components/GameHeader/GameHeader';
import {Narration} from '../../components/Narration/Narration';
import {OptionButton} from '../../components/OptionButton/OptionButton';
import {TVButton} from '../../components/TVButton/TVButton';
import {useGame} from '../../game/GameContext';
import {px, theme} from '../../theme/theme';
import {Feedback} from '../../ui/Feedback';
import {RRBadge} from '../../ui/RRBadge';
import {Transition} from '../../ui/Transition';
import {ScreenProps} from '../types';

/**
 * One puzzle, all of its states on a single screen:
 *   unanswered → (hint) → incorrect → … → solved (the result card).
 *
 * Layout: a case-file header (PUZZLE 01, title, worth), the authored prompt
 * and question on the left, the answer instrument (keypad / dials / accounts)
 * below, and revealed hints as numbered slips on the right.
 *
 * The screen only collects the players' entry and dispatches SUBMIT_ANSWER /
 * REQUEST_HINT. Whether an answer is right, and what it scores, is decided by
 * the engine and read back from its events. All numbers shown come from them.
 */
export const PuzzleScreen = ({navigator, route}: ScreenProps & {route: {puzzleId: string}}) => {
  const {mystery, state, dispatch} = useGame();
  const [entry, setEntry] = useState<Entry>(() => emptyEntry(mystery?.puzzles.find(p => p.id === route.puzzleId)));
  const [feedback, setFeedback] = useState<Notice | null>(null);
  const [result, setResult] = useState<ScoreBreakdown | null>(null);
  const [unlockedAfter, setUnlockedAfter] = useState<string[]>([]);
  const [completed, setCompleted] = useState(false);

  if (!mystery || !state) {
    return null;
  }
  const view = getPuzzleView(mystery, state, route.puzzleId);
  if (!view) {
    return null;
  }
  const {puzzle} = view;
  const number = String(mystery.puzzles.findIndex(p => p.id === puzzle.id) + 1).padStart(2, '0');
  const next = (f: Omit<Notice, "key">) => setFeedback(current => ({...f, key: (current?.key ?? 0) + 1}));

  const submit = () => {
    dispatch({type: 'SUBMIT_ANSWER', puzzleId: puzzle.id, answer: toAnswer(puzzle, entry)}, handleSubmitEvents);
  };

  const handleSubmitEvents = (events: readonly GameEvent[]) => {
    const unlocked: string[] = [];
    for (const event of events) {
      if (event.type === 'answer-correct') {
        setResult(event.breakdown);
      } else if (event.type === 'answer-incorrect') {
        next({kind: 'failure', title: "That doesn't fit", text: `Not quite. −${event.penalty} points. Look at the evidence again.`});
      } else if (event.type === 'rejected' && event.reason === 'incomplete-answer') {
        next({kind: 'info', title: 'Incomplete', text: incompleteText(puzzle)});
      } else if (event.type === 'puzzle-unlocked') {
        unlocked.push(mystery.puzzles.find(p => p.id === event.puzzleId)?.title ?? '');
      }
      if (event.type === 'mystery-completed') {
        setCompleted(true);
      }
    }
    setUnlockedAfter(unlocked);
    // A game lost on this answer (too many wrong answers) is routed to the ending by the App shell.
  };

  const hint = () => {
    const worth = view.currentValue.awarded;
    dispatch({type: 'REQUEST_HINT', puzzleId: puzzle.id}, events => {
      const revealed = events.find(e => e.type === 'hint-revealed');
      next(
        revealed && revealed.type === 'hint-revealed'
          ? {kind: 'hint', title: 'Something was missed', text: `Hint ${revealed.hintNumber} revealed. This puzzle is now worth ${worth - revealed.penalty}.`, amount: `−${revealed.penalty}`}
          : {kind: 'info', title: 'No more hints', text: 'No more hints for this puzzle.'},
      );
    });
  };

  // Solved by someone else (a phone, in a room): show the same result card.
  const shownResult: ScoreBreakdown | null =
    result ?? (view.status === 'solved' ? {base: state.puzzlePoints[puzzle.id] ?? 0, hintDeduction: 0, awarded: state.puzzlePoints[puzzle.id] ?? 0} : null);
  const isCompleted = completed || state.status === 'completed';

  // ── Result ───────────────────────────────────────────────────────
  if (shownResult) {
    const scene = getSceneView(mystery, state);
    const onward = () => {
      if (isCompleted) {
        navigator.reset([{name: 'ending'}]);
      } else {
        navigator.back();
      }
    };
    const byPhone = result === null;
    return (
      <View style={styles.screen}>
        <Image source={deskArt} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <GameHeader context={`Puzzle ${number} · Solved`} />
        <View style={styles.resultBody}>
          <Feedback
            kind="success"
            layout="stack"
            title="SOLVED"
            detail={byPhone ? 'Solved by an investigator on their phone.' : undefined}
            testID="puzzle-success"
          />
          <Transition preset="rise" delay={240} style={styles.resultCard}>
            <View style={styles.resultHead}>
              <RRBadge label="Verified" glyph="✓" tone="success" />
              <Text style={styles.resultNo}>PUZZLE {number}</Text>
            </View>
            <Text style={styles.resultTitle}>{puzzle.title.toUpperCase()}</Text>
            <View style={styles.resultStory}>
              <Narration lines={puzzle.solvedText} size="body" style={styles.resultNarration} />
            </View>
            <View style={styles.pointsRow} testID="puzzle-result">
              <Points label="Puzzle" value={`${shownResult.base}`} />
              {shownResult.hintDeduction > 0 && <Points label="Hints" value={`−${shownResult.hintDeduction}`} />}
              <Points label="Awarded" value={`+${shownResult.awarded}`} strong />
            </View>
            {(unlockedAfter.length > 0 || scene?.complete) && (
              <Text style={styles.unlocked}>
                {unlockedAfter.length > 0 ? `◆ NEW LEAD UNLOCKED · ${unlockedAfter.join(', ').toUpperCase()}` : '◆ THE WAY AHEAD IS OPEN'}
              </Text>
            )}
          </Transition>
        </View>
        <View style={styles.footerRow}>
          <TVButton
            variant="action"
            tone="primary"
            label={isCompleted ? 'See the ending' : scene?.complete ? 'Continue' : 'Back to scene'}
            onPress={onward}
            preferredFocus
            testID="puzzle-result-continue"
          />
        </View>
      </View>
    );
  }

  // ── Unanswered / incorrect / hint ────────────────────────────────
  const attempts = state.incorrectAttempts[puzzle.id] ?? 0;
  return (
    <View style={styles.screen}>
      <Image source={deskArt} style={StyleSheet.absoluteFill} resizeMode="cover" testID="puzzle-desk" />
      <GameHeader context={`Puzzle ${number} · worth ${view.currentValue.awarded}`} />
      <View style={styles.main}>
        <View style={styles.left}>
          <View style={styles.fileRow}>
            <Text style={styles.fileNo}>PUZZLE {number}</Text>
            <View style={styles.fileDash} />
            <Text style={styles.fileWorth}>WORTH {view.currentValue.awarded}</Text>
            {attempts > 0 && <Text style={styles.fileAttempts}>· {attempts} WRONG</Text>}
          </View>
          <Text style={styles.title}>{puzzle.title.toUpperCase()}</Text>
          <View style={styles.rule} />
          <View style={styles.prompt}>
            <Narration lines={puzzle.prompt} size="body" />
          </View>
          <Text style={styles.question}>{puzzle.question}</Text>
        </View>

        {/* Revealed hints: numbered slips on the right, so they never push the input around. */}
        <View style={styles.hints}>
          {view.revealedHints.length > 0 ? (
            <View testID="puzzle-hints" style={styles.hintStack}>
              {view.revealedHints.map((h, index) => (
                <Transition key={h.id} preset="reveal" style={styles.hintSlip}>
                  <Text style={styles.hintNumber}>◇ HINT {index + 1}</Text>
                  <Text style={styles.hintText}>{h.text}</Text>
                </Transition>
              ))}
            </View>
          ) : (
            <View style={styles.hintEmpty}>
              <Text style={styles.hintNumber}>◇ HINTS</Text>
              <Text style={styles.hintEmptyText}>
                {view.hintsRemaining} available. Each one lowers the puzzle's value.
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.inputArea}>
        <AnswerInput
          puzzle={puzzle}
          entry={entry}
          onChange={e => {
            setFeedback(null);
            setEntry(e);
          }}
        />
      </View>

      <View style={styles.footer}>
        <View style={styles.feedbackSlot} testID="puzzle-feedback">
          {feedback && <Feedback kind={feedback.kind} title={feedback.title} detail={feedback.text} amount={feedback.amount} playKey={feedback.key} />}
        </View>
        <View style={styles.footerRow}>
          <TVButton variant="action" tone="primary" label="Confirm Answer" onPress={submit} testID="puzzle-submit" />
          <TVButton
            variant="action"
            label={view.hintsRemaining > 0 ? `Request Hint  −${view.nextHintCost}` : 'No hints left'}
            onPress={hint}
            testID="puzzle-hint"
          />
          <TVButton variant="action" label="Back" onPress={() => navigator.back()} testID="puzzle-back" />
        </View>
      </View>
    </View>
  );
};

// ── Answer entry ───────────────────────────────────────────────────

/** What the players have entered so far, per input kind. */
type Entry = {code: string; selections: (string | null)[]};

function emptyEntry(puzzle: Puzzle | undefined): Entry {
  const fields = puzzle?.input.kind === 'combination' ? puzzle.input.fields.length : 1;
  return {code: '', selections: Array.from({length: fields}, () => null)};
}

/** Turns an entry into the engine's answer format. No correctness check here. */
export function toAnswer(puzzle: Puzzle, entry: Entry): string {
  switch (puzzle.input.kind) {
    case 'digits':
    case 'text':
      return entry.code;
    case 'choice':
      return entry.selections[0] ?? '';
    case 'combination':
      return combinationAnswer(entry.selections.map(s => s ?? ''));
  }
}

function incompleteText(puzzle: Puzzle): string {
  switch (puzzle.input.kind) {
    case 'digits':
      return `Enter all ${puzzle.input.length} digits.`;
    case 'combination':
      return 'Choose one option in every row.';
    default:
      return 'Choose an answer first.';
  }
}

const AnswerInput = ({puzzle, entry, onChange}: {puzzle: Puzzle; entry: Entry; onChange: (entry: Entry) => void}) => {
  const {input} = puzzle;
  switch (input.kind) {
    case 'digits':
      return (
        <DigitEntry
          code={entry.code}
          length={input.length}
          onKey={key => onChange({...entry, code: applyDigitKey(entry.code, key, input.length)})}
          testIDPrefix="puzzle-key"
        />
      );
    case 'choice':
      return (
        <View style={styles.choiceList}>
          {input.options.map((option, index) => (
            <OptionButton
              key={option.id}
              wide
              label={option.label}
              selected={entry.selections[0] === option.id}
              onPress={() => onChange({...entry, selections: [option.id]})}
              preferredFocus={index === 0}
              testID={`puzzle-option-${option.id}`}
            />
          ))}
        </View>
      );
    case 'combination':
      return (
        <View style={styles.fields}>
          {input.fields.map((field, fieldIndex) => (
            <View key={field.id} style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{field.label.toUpperCase()}</Text>
              {field.options.map((option, optionIndex) => (
                <OptionButton
                  key={option.id}
                  label={option.label}
                  selected={entry.selections[fieldIndex] === option.id}
                  onPress={() => {
                    const selections = [...entry.selections];
                    selections[fieldIndex] = option.id;
                    onChange({...entry, selections});
                  }}
                  preferredFocus={fieldIndex === 0 && optionIndex === 0}
                  testID={`puzzle-${field.id}-${option.id}`}
                />
              ))}
            </View>
          ))}
        </View>
      );
    case 'text':
      // No TV-friendly free-text entry yet; The Last Train does not use it.
      return <Text style={styles.fieldLabel}>Text answers are entered on a phone (coming later).</Text>;
  }
};

const Points = ({label, value, strong}: {label: string; value: string; strong?: boolean}) => (
  <View>
    <Text style={styles.pointsLabel}>{label.toUpperCase()}</Text>
    <Text style={[styles.pointsValue, strong && styles.pointsStrong]}>{value}</Text>
  </View>
);

type Notice = {kind: 'failure' | 'info' | 'hint'; title: string; text: string; amount?: string; key: number};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    // Inside the desk's felt blotter (6–94 % of the width).
    paddingHorizontal: px(160),
    paddingTop: theme.spacing.screenY - px(24),
    paddingBottom: theme.spacing.screenY - px(24),
  },
  main: {
    flexDirection: 'row',
    marginTop: theme.spacing.lg,
    gap: theme.spacing.xl,
  },
  left: {
    flex: 1,
    maxWidth: px(920),
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileNo: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.textMuted,
  },
  fileDash: {
    width: px(36),
    height: 1,
    marginHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.textMuted,
  },
  fileWorth: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.accent,
  },
  fileAttempts: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.danger,
    marginLeft: theme.spacing.xs,
  },
  title: {
    ...theme.text.h1,
    letterSpacing: px(6),
    marginTop: theme.spacing.xs,
    color: theme.colors.textPrimary,
  },
  rule: {
    width: px(72),
    height: px(3),
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.accent,
  },
  prompt: {
    marginTop: theme.spacing.md,
  },
  question: {
    ...theme.text.h2,
    marginTop: theme.spacing.sm,
    color: theme.colors.textPrimary,
  },
  hints: {
    flex: 1,
    alignItems: 'flex-end',
  },
  hintStack: {
    width: px(700),
    gap: theme.spacing.sm,
  },
  hintSlip: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderLeftWidth: px(5),
    borderLeftColor: theme.colors.accentStrong,
  },
  hintEmpty: {
    width: px(560),
    padding: theme.spacing.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
  },
  hintEmptyText: {
    ...theme.text.body,
    fontSize: px(28),
    color: theme.colors.textSecondary,
    marginTop: px(4),
  },
  hintText: {
    ...theme.text.body,
    color: theme.colors.textPrimary,
    marginTop: px(4),
  },
  hintNumber: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.accentStrong,
  },
  // Anchored under the question: centring let a tall keypad ride up over it.
  inputArea: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: theme.spacing.lg,
  },
  choiceList: {
    gap: theme.spacing.sm,
    maxWidth: px(1500),
  },
  fields: {
    gap: theme.spacing.md,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  fieldLabel: {
    ...theme.text.label,
    width: px(190),
    color: theme.colors.textSecondary,
  },
  footer: {},
  feedbackSlot: {
    minHeight: px(92),
    justifyContent: 'flex-end',
    marginBottom: theme.spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  resultBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultCard: {
    marginTop: theme.spacing.lg,
    width: px(1300),
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderTopWidth: px(4),
    borderTopColor: theme.colors.success,
  },
  resultHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultNo: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.textMuted,
  },
  resultTitle: {
    ...theme.text.h1,
    letterSpacing: px(6),
    marginTop: theme.spacing.sm,
    color: theme.colors.textPrimary,
  },
  resultStory: {
    marginTop: theme.spacing.sm,
  },
  resultNarration: {
    color: theme.colors.textPrimary,
  },
  pointsRow: {
    flexDirection: 'row',
    gap: theme.spacing.xxl,
    marginTop: theme.spacing.lg,
  },
  pointsLabel: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.textMuted,
  },
  pointsValue: {
    ...theme.text.monoLarge,
    marginTop: px(4),
    color: theme.colors.textSecondary,
  },
  pointsStrong: {
    color: theme.colors.focus,
  },
  unlocked: {
    ...theme.text.label,
    fontFamily: theme.fonts.technical,
    color: theme.colors.accentStrong,
    marginTop: theme.spacing.md,
  },
});
