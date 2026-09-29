/**
 * RoomRiddle TV UI kit: primitives built on the shared design system.
 * Screens compose these instead of styling from scratch.
 */
export {RRText} from './RRText';
export {RRPanel} from './RRPanel';
export {RRBadge, StatusDot} from './RRBadge';
export {RRProgress} from './RRProgress';
export {RRModal} from './RRModal';
export {Transition} from './Transition';
export type {TransitionPreset} from './Transition';
export {LoadingState} from './LoadingState';
export {ErrorState} from './ErrorState';
export {Feedback} from './Feedback';
export type {FeedbackKind} from './Feedback';
export {ToastProvider, useToast} from './Toast';
export {FocusFrame, useFocusAnimation} from './focus';
export {MotionProvider, useMotionPrefs, useReducedMotion, useEntrance, timing} from './motion';
export {cue, setCueHandler} from './cues';
export type {Cue} from './cues';
