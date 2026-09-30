import React from 'react';
import {getMysteryWorld} from '@roomriddle/mystery-data';
import {useGame} from '../game/GameContext';
import {SceneScreen} from '../screens/Scene/SceneScreen';
import type {ScreenProps} from '../screens/types';
import {WorldScreen} from './WorldScreen';
import {useWorldSession} from './WorldSession';

/**
 * The 'scene' route: the 2.5D world when this mystery has one for the
 * current scene (and Settings → Scenes is Cinematic), otherwise the P5
 * case-file scene. Both run the same scene hub, so the game is identical.
 */
export const SceneRoute = (props: ScreenProps) => {
  const {mystery, state} = useGame();
  const {enabled} = useWorldSession();
  const world = enabled && mystery ? getMysteryWorld(mystery.summary.id) : undefined;
  const scene = world?.scenes.find(s => s.sceneId === state?.currentSceneId);
  if (world && scene) {
    return <WorldScreen key={scene.sceneId} navigator={props.navigator} initialFocusKey={props.initialFocusKey} world={world} scene={scene} />;
  }
  return <SceneScreen {...props} />;
};
