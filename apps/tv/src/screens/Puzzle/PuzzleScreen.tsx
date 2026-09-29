import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {combinationAnswer, getPuzzleView, getSceneView} from '@roomriddle/game-engine';
import type {GameEvent, Puzzle, ScoreBreakdown} from '@roomriddle/shared-types';
import {applyDigitKey, DigitEntry} from '../../components/DigitEntry/DigitEntry';
import {GameHeader} from '../../components/GameHeader/GameHeader';
import {Narration} from '../../components/Narration/Narration';
import {OptionButton} from '../../components/OptionButton/OptionButton';
import {TVButton} from '../../components/TVButton/TVButton';
import {useGame} from '../../game/GameContext';
import {px, theme} from '../../theme/theme';
import {ScreenProps} from '../types';

/**
 * One puzzle, all of its states on a single screen:
 *   unanswered → (hint) → incorrect → … → solved (the Puzzle Result panel).
 *
 * The screen only collects the players' entry and dispatches SUBMIT_ANSWER /
 * REQUEST_HINT. Whether an answer is right, and what it scores, is decided by
 * the engine and read back from its events.
 */
export const PuzzleScreen = ({navigator, route}: ScreenProps & {route: {puzzleId: string}}) => {
  const {mystery, state, dispatch} = useGame();
  const [entry, setEntry] = useState<Entry>(() => emptyEntry(mystery?.puzzles.find(p => p.id === route.puzzleId)));
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [result, setResult] = useState<ScoreBreakdown | null>(null);
  const [completed, setCompleted] = useState(false);

  if (!mystery || !state) {
    return null;
  }
  const view = getPuzzleView(mystery, state, route.puzzleId);
  if (!view) {
    return null;
  }
  const {puzzle} = view;

  const submit = () => {
    dispatch({type: 'SUBMIT_ANSWER', puzzleId: puzzle.id, answer: toAnswer(puzzle, entry)}, handleSubmitEvents);
  };

  const handleSubmitEvents = (events: readonly GameEvent[]) => {
    for (const event of events) {
      if (event.type === 'answer-correct') {
        setResult(event.breakdown);
      } else if (event.type === 'answer-incorrect') {
        setFeedback({kind: 'wrong', text: `Not quite. −${event.penalty} points. Look at the evidence again.`});
      } else if (event.type === 'rejected' && event.reason === 'incomplete-answer') {
        setFeedback({kind: 'info', text: incompleteText(puzzle)});
      }
      if (event.type === 'mystery-completed') {
        setCompleted(true);
      }
    }
    // A game lost on this answer (too many wrong answers) is routed to the ending by the App shell.
  };

  const hint = () => {
    const worth = view.currentValue.awarded;
    dispatch({type: 'REQUEST_HINT', puzzleId: puzzle.id}, events => {
      const revealed = events.find(e => e.type === 'hint-revealed');
      setFeedback(
        revealed && revealed.type === 'hint-revealed'
          ? {kind: 'info', text: `Hint ${revealed.hintNumber} revealed. This puzzle is now worth ${worth - revealed.penalty}.`}
          : {kind: 'info', text: 'No more hints for this puzzle.'},
      );
    });
  };

  // Solved by someone else (a phone, in a room): show the same result panel.
  const shownResult: ScoreBreakdown | null =
    result ??
    (view.status === 'solved'
      ? {base: state.puzzlePoints[puzzle.id] ?? 0, hintDeduction: 0, awarded: state.puzzlePoints[puzzle.id] ?? 0}
      : null);
  const isCompleted = completed || state.status === 'completed';

  // ── Puzzle Result ────────────────────────────────────────────────
  if (shownResult) {
    const scene = getSceneView(mystery, state);
    const next = () => {
      if (isCompleted) {
        navigator.reset([{name: 'ending'}]);
      } else {
        navigator.back();
      }
    };
    return (
      <View style={styles.screen}>
        <GameHeader context={`${puzzle.title} · Solved`} />
        <View style={styles.resultBody}>
          <Text style={styles.solvedEyebrow}>SOLVED</Text>
          <Text style={styles.title}>{puzzle.title.toUpperCase()}</Text>
          <View style={styles.rule} />
          <View style={styles.resultStory}>
            <Narration lines={puzzle.solvedText} />
          </View>
          <View style={styles.pointsRow} testID="puzzle-result">
            <Points label="Puzzle" value={`${shownResult.base}`} />
            {shownResult.hintDeduction > 0 && <Points label="Hints" value={`−${shownResult.hintDeduction}`} />}
            <Points label="Awarded" value={`+${shownResult.awarded}`} strong />
          </View>
        </View>
        <View style={styles.footerRow}>
          <TVButton
            variant="action"
            label={isCompleted ? 'See the ending' : scene?.complete ? 'Continue' : 'Back to scene'}
            onPress={next}
            preferredFocus
            testID="puzzle-result-continue"
          />
        </View>
      </View>
    );
  }

  // ── Unanswered / incorrect / hint ────────────────────────────────
  return (
    <View style={styles.screen}>
      <GameHeader context={`Puzzle · worth ${view.currentValue.awarded}`} />
      <View style={styles.body}>
        <View style={styles.left}>
          <Text style={styles.title}>{puzzle.title.toUpperCase()}</Text>
          <View style={styles.rule} />
          <View style={styles.prompt}>
            <Narration lines={puzzle.prompt} size="body" />
          </View>
          <Text style={styles.question}>{puzzle.question}</Text>
        </View>
      </View>

      <View style={styles.inputArea}>
        <AnswerInput puzzle={puzzle} entry={entry} onChange={e => {
          setFeedback(null);
          setEntry(e);
        }} />
      </View>

      {/* Revealed hints sit in their own panel on the right so they never push the input around. */}
      {view.revealedHints.length > 0 && (
        <View style={styles.hints} testID="puzzle-hints">
          {view.revealedHints.map((h, index) => (
            <View key={h.id} style={styles.hintRow}>
              <Text style={styles.hintNumber}>HINT {index + 1}</Text>
              <Text style={styles.hintText}>{h.text}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.footer}>
        <Text
          style={[styles.feedback, feedback?.kind === 'wrong' && styles.feedbackWrong]}
          testID="puzzle-feedback">
          {feedback?.text ?? ' '}
        </Text>
        <View style={styles.footerRow}>
          <TVButton variant="action" label="Submit" onPress={submit} testID="puzzle-submit" />
          <TVButton
            variant="action"
            label={view.hintsRemaining > 0 ? `Hint  −${view.nextHintCost}` : 'No hints left'}
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

const AnswerInput = ({
  puzzle,
  entry,
  onChange,
}: {
  puzzle: Puzzle;
  entry: Entry;
  onChange: (entry: Entry) => void;
}) => {
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

type Feedback = {kind: 'wrong' | 'info'; text: string};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: theme.spacing.screenX,
    paddingTop: theme.spacing.screenY - px(24),
    paddingBottom: theme.spacing.screenY - px(24),
  },
  body: {
    marginTop: theme.spacing.lg,
  },
  left: {
    maxWidth: px(880),
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.type.heading,
    fontWeight: '300',
    letterSpacing: px(8),
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
    marginTop: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: theme.type.nav,
    fontWeight: '400',
  },
  hints: {
    position: 'absolute',
    right: theme.spacing.screenX,
    top: px(190),
    width: px(760),
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    borderRadius: theme.radii.lg,
    borderWidth: px(2),
    borderColor: theme.colors.accentSoft,
    backgroundColor: theme.colors.surface,
  },
  hintRow: {
    gap: px(4),
  },
  hintText: {
    color: theme.colors.text,
    fontSize: theme.type.caption,
    lineHeight: px(34),
  },
  hintNumber: {
    color: theme.colors.accent,
    fontSize: px(20),
    letterSpacing: px(4),
  },
  inputArea: {
    flex: 1,
    justifyContent: 'center',
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
    width: px(170),
    color: theme.colors.faintText,
    fontSize: theme.type.caption,
    letterSpacing: px(4),
  },
  footer: {},
  feedback: {
    marginBottom: theme.spacing.sm,
    color: theme.colors.accent,
    fontSize: theme.type.caption,
  },
  feedbackWrong: {
    color: theme.colors.danger,
  },
  footerRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  resultBody: {
    flex: 1,
    justifyContent: 'center',
  },
  solvedEyebrow: {
    color: theme.colors.success,
    fontSize: theme.type.caption,
    letterSpacing: px(8),
    marginBottom: theme.spacing.sm,
  },
  resultStory: {
    marginTop: theme.spacing.lg,
    maxWidth: px(1300),
  },
  pointsRow: {
    flexDirection: 'row',
    gap: theme.spacing.xxl,
    marginTop: theme.spacing.xl,
  },
  pointsLabel: {
    color: theme.colors.faintText,
    fontSize: px(20),
    letterSpacing: px(4),
  },
  pointsValue: {
    marginTop: px(4),
    color: theme.colors.mutedText,
    fontSize: theme.type.heading,
    fontWeight: '300',
  },
  pointsStrong: {
    color: theme.colors.focus,
  },
});
