import type {MysteryDefinition} from '@roomriddle/shared-types';
import {clues} from './clues';
import {endings} from './endings';
import {intro, theLastTrain} from './mystery';
import {puzzles} from './puzzles';
import {scenes} from './scenes';

/**
 * The Last Train, assembled for the RoomRiddle Mystery Engine.
 * Ends in failure (Too Late) if the midnight clock runs out or after too many wrong answers.
 */
export const theLastTrainMystery: MysteryDefinition = {
  summary: theLastTrain,
  intro,
  startSceneId: 'station',
  scenes,
  clues,
  puzzles,
  endings,
  scoring: {
    puzzlePoints: 100,
    hintPenalty: 25,
    incorrectAttemptPenalty: 10,
    minPuzzlePoints: 25,
    clueDiscoveryPoints: 10,
    timeBonusPerMinute: 5,
  },
  failure: {
    timeLimitMinutes: 20,
    maxIncorrectAttempts: 8,
  },
};

export {theLastTrain};
