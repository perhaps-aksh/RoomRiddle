import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {GameState, MysteryDefinition} from '@roomriddle/shared-types';
import {createInitialGameState} from './state';
import {activeGuardedTerms, lockedFacts, speakableFacts, spoilersIn} from './truth';
import {validateMysteryDefinition} from './validate-mystery';
import {fixtureMystery} from './test-fixtures';

const withTruth: MysteryDefinition = {
  ...fixtureMystery,
  truth: {
    narratorId: 'guide',
    solution: ['The butler hid the key under the note.'],
    characters: [
      {id: 'guide', name: 'Guide', role: 'Narrator', persona: 'Calm.', interviewable: false, facts: [{id: 'g1', kind: 'truth', text: 'We are in the hall.'}]},
      {
        id: 'butler',
        name: 'The Butler',
        role: 'Butler',
        persona: 'Stiff.',
        interviewable: true,
        facts: [
          {id: 'b-claim', kind: 'claim', false: true, text: 'I never touched the key.'},
          {id: 'b-secret', kind: 'secret', text: 'I hid the key under the note.', unlockedBy: {clueIds: ['note']}},
        ],
      },
    ],
    guarded: [{terms: ['under the note', '1234'], until: {clueIds: ['note']}}],
  },
};

const state = (found: string[] = []): GameState => ({...createInitialGameState(withTruth.summary.id), discoveredClueIds: found});

test('a secret is locked until its evidence is found, then speakable', () => {
  assert.deepEqual(speakableFacts(withTruth, state(), 'butler').map(f => f.id), ['b-claim']);
  assert.deepEqual(lockedFacts(withTruth, state(), 'butler').map(f => f.id), ['b-secret']);
  assert.deepEqual(speakableFacts(withTruth, state(['note']), 'butler').map(f => f.id), ['b-claim', 'b-secret']);
  assert.deepEqual(speakableFacts(withTruth, state(), 'nobody'), []);
});

test('guarded terms are spoilers until earned; matching ignores case and punctuation', () => {
  assert.deepEqual(activeGuardedTerms(withTruth, state()), ['under the note', '1234']);
  assert.deepEqual(spoilersIn(withTruth, state(), 'Look UNDER the note, dear.'), ['under the note']);
  assert.deepEqual(spoilersIn(withTruth, state(), 'The code is 1234!'), ['1234']);
  assert.deepEqual(spoilersIn(withTruth, state(), 'The code is 12345.'), []);
  assert.deepEqual(spoilersIn(withTruth, state(['note']), 'Look under the note.'), []);
});

test('validation catches broken truth tables', () => {
  assert.deepEqual(validateMysteryDefinition(withTruth), []);
  const broken: MysteryDefinition = {
    ...withTruth,
    truth: {
      ...withTruth.truth!,
      narratorId: 'ghost',
      characters: [
        {...withTruth.truth!.characters[1]!, facts: [
          {id: 'x', kind: 'secret', text: 'never locked'},
          {id: 'y', kind: 'truth', text: 'bad ref', unlockedBy: {clueIds: ['nope']}},
        ]},
      ],
      guarded: [{terms: ['a'], until: {}}],
    },
  };
  const problems = validateMysteryDefinition(broken);
  assert.ok(problems.some(p => p.includes('narrator "ghost"')));
  assert.ok(problems.some(p => p.includes('secret "x" is never locked')));
  assert.ok(problems.some(p => p.includes('unknown clue "nope"')));
  assert.ok(problems.some(p => p.includes('never unlocks')));
});
