import {test, describe} from 'node:test';
import assert from 'node:assert/strict';
import type {AnswerInput, Puzzle} from '@roomriddle/shared-types';
import {isCorrectAnswer, normalizeAnswer, normalizeText} from './validation';

describe('normalizeText', () => {
  test('ignores case and surrounding whitespace', () => {
    assert.equal(normalizeText('  The Conductor  '), 'the conductor');
  });

  test('collapses inner whitespace, tabs and newlines', () => {
    assert.equal(normalizeText('the \t last\n  train'), 'the last train');
  });

  test('folds Unicode compatibility forms (full-width digits)', () => {
    assert.equal(normalizeText('１１４７'), '1147');
  });

  test('does not forgive real differences', () => {
    assert.notEqual(normalizeText('1147'), normalizeText('1174'));
    assert.notEqual(normalizeText('caldwell'), normalizeText('caldwel'));
  });
});

const DIGITS: AnswerInput = {kind: 'digits', length: 4};
const TEXT: AnswerInput = {kind: 'text'};
const COMBO: AnswerInput = {
  kind: 'combination',
  fields: [
    {id: 'a', label: 'A', options: []},
    {id: 'b', label: 'B', options: []},
  ],
};

describe('normalizeAnswer', () => {
  test('digit codes: 11:47, 11 47, 11.47, 11-47 and 1147 are all 1147', () => {
    for (const raw of ['11:47', '11 47', '11.47', '11-47', '1147', ' 1147 ', '１１:４７']) {
      assert.equal(normalizeAnswer(raw, DIGITS), '1147', raw);
    }
  });

  test('digit codes reject letters, empty and incomplete entries', () => {
    assert.equal(normalizeAnswer('11:47pm', DIGITS), null);
    assert.equal(normalizeAnswer('eleven forty seven', DIGITS), null);
    assert.equal(normalizeAnswer('', DIGITS), null);
    assert.equal(normalizeAnswer(' : ', DIGITS), null);
    assert.equal(normalizeAnswer('114', DIGITS), null);
    assert.equal(normalizeAnswer('11470', DIGITS), null);
  });

  test('text: case, punctuation and spacing are forgiven', () => {
    assert.equal(normalizeAnswer("  Inspector  VOSS! ", TEXT), 'inspector voss');
    assert.equal(normalizeAnswer('the-guard’s van', TEXT), 'the guard s van');
  });

  test('combinations normalise each part and require every field', () => {
    assert.equal(normalizeAnswer(' Voss | Carriage-C ', COMBO), 'voss|carriage-c');
    assert.equal(normalizeAnswer('voss', COMBO), null);
    assert.equal(normalizeAnswer('voss|', COMBO), null);
    assert.equal(normalizeAnswer('a|b|c', COMBO), null);
  });
});

describe('isCorrectAnswer', () => {
  const puzzle = (input: AnswerInput, acceptedAnswers: string[]): Puzzle => ({
    id: 'p',
    sceneId: 's',
    title: 'P',
    prompt: [],
    question: '?',
    input,
    acceptedAnswers,
    hints: [],
    solvedText: [],
  });

  test('matches any explicitly authored answer after normalisation', () => {
    const clock = puzzle(DIGITS, ['11:47']);
    assert.ok(isCorrectAnswer(clock, '1147'));
    assert.ok(isCorrectAnswer(clock, '11 47'));
    assert.ok(!isCorrectAnswer(clock, '1174'));
    assert.ok(!isCorrectAnswer(clock, '114'));
  });

  test('never matches loosely: no substring or fuzzy matching', () => {
    const who = puzzle(TEXT, ['caldwell']);
    assert.ok(isCorrectAnswer(who, 'CALDWELL'));
    assert.ok(!isCorrectAnswer(who, 'probably caldwell did it'));
    assert.ok(!isCorrectAnswer(who, 'caldwel'));
    assert.ok(!isCorrectAnswer(who, ''));
  });

  test('choice answers compare option ids exactly', () => {
    const choice = puzzle({kind: 'choice', options: [{id: 'x', label: 'X'}]}, ['x']);
    assert.ok(isCorrectAnswer(choice, 'x'));
    assert.ok(!isCorrectAnswer(choice, 'y'));
  });
});
