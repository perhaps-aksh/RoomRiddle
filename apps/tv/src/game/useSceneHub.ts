import {useState} from 'react';
import {getSceneView, type SceneView} from '@roomriddle/game-engine';
import {useGame} from './GameContext';
import type {Navigator} from '../navigation/TVNavigation';
import type {FeedbackKind} from '../ui/Feedback';

export interface HubNotice {
  kind: FeedbackKind;
  title: string;
  text: string;
  key: number;
}

export interface SceneHub {
  view: SceneView;
  unfound: number;
  solvedCount: number;
  notice: HubNotice | null;
  say: (kind: FeedbackKind, title: string, text: string) => void;
  /** Where focus most likely wants to go next. */
  suggestedFocus: string;
  continueStory: () => void;
  openPuzzle: (puzzleId: string, locked: boolean) => void;
  confirmLeave: boolean;
  setConfirmLeave: (next: boolean | ((cur: boolean) => boolean)) => void;
  leave: () => void;
  mode: 'local' | 'room';
}

/**
 * The scene hub's behaviour, shared by the 2.5D world and the P5 case-file
 * screen: what the players can do in the current scene, straight from the
 * engine's scene view. Presentation lives in the screens.
 */
export function useSceneHub(navigator: Navigator, sceneRoute: 'scene' = 'scene'): SceneHub | null {
  const {mystery, state, dispatch, mode, closeRoom} = useGame();
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [notice, setNotice] = useState<HubNotice | null>(null);

  if (!mystery || !state) {
    return null;
  }
  const view = getSceneView(mystery, state);
  if (!view) {
    return null;
  }
  const unfound = view.clues.filter(c => !c.discovered).length;
  const openP = view.puzzles.find(p => p.status !== 'solved');
  const say = (kind: FeedbackKind, title: string, text: string) => setNotice(current => ({kind, title, text, key: (current?.key ?? 0) + 1}));

  return {
    view,
    unfound,
    solvedCount: view.puzzles.filter(p => p.status === 'solved').length,
    notice,
    say,
    suggestedFocus: view.complete ? 'continue' : openP?.status === 'unlocked' ? `puzzle-${openP.puzzle.id}` : 'investigate',
    continueStory: () => {
      dispatch({type: 'ADVANCE_SCENE'}, events => {
        if (events.some(e => e.type === 'mystery-completed')) {
          navigator.reset([{name: 'ending'}]);
        } else if (events.some(e => e.type === 'scene-entered')) {
          navigator.replace({name: sceneRoute});
        } else {
          say('failure', 'Not yet', "Solve this scene's puzzle before moving on.");
        }
      });
    },
    openPuzzle: (puzzleId, locked) => {
      if (locked) {
        say('info', 'Locked', "Keep investigating. You haven't found what this puzzle needs yet.");
        return;
      }
      navigator.push({name: 'puzzle', puzzleId}, `puzzle-${puzzleId}`);
    },
    confirmLeave,
    setConfirmLeave,
    leave: () => {
      if (mode === 'room') {
        closeRoom();
      }
      navigator.reset([{name: 'mysteries'}]);
    },
    mode,
  };
}

export function hubStatusLine(complete: boolean, puzzleStatus: 'locked' | 'unlocked' | 'solved' | undefined, unfound: number): string {
  if (complete) {
    return 'The way ahead is open.';
  }
  if (puzzleStatus === 'unlocked') {
    return unfound > 0 ? 'The puzzle is ready. There is still more to find here.' : 'The puzzle is ready.';
  }
  return 'Investigate the scene to find what the puzzle needs.';
}
