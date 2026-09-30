/**
 * @roomriddle/scene: the RoomRiddle 2.5D scene system (Phase 6).
 * Pure TypeScript. It presents game state and never decides it.
 */
export {AssetRegistry, AssetLoader, validateManifest, LAYER_ORDER} from './assets';
export type {ResolvedAsset, LoadStatus, AssetFetcher} from './assets';
export {
  VIEW,
  VIEW_CENTER,
  HOME_SHOT,
  CAMERA_EASINGS,
  layerTransform,
  projectPoint,
  projectBox,
  focusShot,
  frameShot,
  lookShot,
  occluders,
  ease,
  lerp,
  lerpShot,
  shakeOffset,
  CameraController,
} from './camera';
export type {LayerTransform} from './camera';
export {MODE_POLICY, accepts} from './modes';
export type {SceneInput, ModePolicy} from './modes';
export {TRAIN_SEQUENCE, canTransition, trainX, doorsOpen, headlightsOn, steaming} from './train';
export type {TrainMotion} from './train';
export {placeNode, placeSet, objectBounds, centerOf, assetsForSet} from './layout';
export type {PlacedNode} from './layout';
export {SceneDirector, tweenValue} from './director';
export type {PresentationState, Tween, Caption, DialogueRun, SetChange, CharacterPresence, DirectorOptions} from './director';
export {objectViews, actionFor, focusable, dialogueFor, diffEvents, verbFor} from './interactions';
export type {ObjectStatus, ObjectView} from './interactions';
export {validateWorld} from './validate';
